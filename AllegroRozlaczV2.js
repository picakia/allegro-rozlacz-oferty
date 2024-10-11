// ==UserScript==
// @name         Restore allegro ROZŁĄCZ V2
// @namespace    http://filipgil.xyz/
// @version      2024-10-11_17-13
// @description  try to take over Allegro.pl
// @author       You
// @match        https://allegro.pl/kategoria/*
// @match        https://allegro.pl/listing*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=allegro.pl
// @grant        GM_xmlhttpRequest
// ==/UserScript==

let progressPercent = 0;
let articleList = [];
const getDOM = () => {
  return {
    progressBar: {
      box: document.querySelector('[data-box-name="premium.with.dfp"]'),
      div: document.getElementById('myProgress'),
      bar: document.getElementById('myBar'),
      text: document.getElementById('progressText'),
    },
    rozlaczButton: document.getElementById('myButton'),
    mainArticles: document.querySelector('.opbox-listing > div'),
    pagination: document.querySelector('[aria-label="paginacja"] > span'),
  };
};

const getOpboxJSON = async (link) => {
  // Find
  let mainOpboxRes;
  try {
    mainOpboxRes = await fetch(link, {
      headers: {
        accept: 'application/vnd.opbox-web.v2+json',
      },
    });
    if (mainOpboxRes.status != 200) {
      console.error(
        `Failed to get Opbox json - STATUS: ${mainOpboxRes.status}`
      );
      console.error(mainOpboxRes.text());
      // TODO: Create retry
    }
    const mainOpbox = await mainOpboxRes.json();
    return mainOpbox;
  } catch (err) {
    console.error(`Failed to get offers for ${link}`);
    console.error(err.message);
    return {};
  }
};
const daysTillEnd = (endDate) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(endDate) - new Date()) / millisecondsPerDay);
};
// Custom format for product
const generateProduct = (listingData) => {
  //console.log(listingData);
  if (listingData.isLocal) {
    return {};
  }
  let parsedProduct = {};
  try {
    parsedProduct = {
      url: new URL(listingData.url).pathname,
      name: listingData.name,
      mainImg: listingData.mainThumbnail,
      seller: {
        isCompany: listingData.seller.company,
        isSuperSeller: listingData.seller.superSeller,
        login: listingData.seller.login,
        positiveFeedbackPercent: listingData.seller.positiveFeedbackPercent,
        positiveFeedbackCount:
          listingData.seller.positiveFeedbackCount || 'brak',
      },
      isSmart: listingData.freebox ? true : false,
      productState: listingData.parameters[0].values[0],
      whenDelivery:
        listingData.badges?.logistics?.additionalInfo?.text ||
        listingData.shipping.summary?.labels[0]?.text,
      priceShipping:
        listingData.shipping.itemWithDelivery?.amount ||
        listingData.sellingMode.buyNow?.price?.amount,
      popularityLabel: listingData.sellingMode.popularityLabel,
      isBidding: listingData.sellingMode.auction ? true : false,
      price: listingData.sellingMode.buyNow?.price?.amount || '0.0',
      isBiddingBuyNow: false,
      biddingBuyNowPrice: 0,
      biddingTimeLeft: 0,
      endingTime: listingData.publication?.endingTime,
    };
    if (parsedProduct.whenDelivery.includes('jutro')) {
      parsedProduct.whenDelivery = `${
        parsedProduct.whenDelivery.split('dostawa jutro')[0]
      }<span class="mli2_0" style="color: rgb(27, 184, 40); font-weight: bold; text-decoration: none;">dostawa jutro</span>`;
    }
    if (parsedProduct.isBidding) {
      parsedProduct.isBiddingBuyNow = listingData.sellingMode.buyNow
        ? true
        : false;
      parsedProduct.biddingBuyNowPrice =
        listingData.sellingMode.buyNow?.price?.amount || '0.0';
      parsedProduct.price = listingData.sellingMode.auction.price.amount;
      parsedProduct.biddingTimeLeft = daysTillEnd(
        listingData.publication.endingTime
      );
    }
  } catch (err) {
    console.log(listingData);
    console.error('Error when parsing article: ', err);
    getDOM().progressBar.text.innerText = `Error when parsing article ${err.message}`;
  }
  //console.log({ parsedProduct });
  return parsedProduct;
};

const processProductPage = async (
  DOM,
  productLink,
  currentPage,
  productName
) => {
  let opbox = await getOpboxJSON(productLink);
  if (!opbox.dataSources?.['listing-api-v3:allegro.listing:3.0']) {
    console.error(`No listings from Opbox api for ${productLink}`);
    return;
  }
  const pagination =
    opbox.dataSources['listing-api-v3:allegro.listing:3.0'].metadata.Pageable;
  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
  for (let i = 1; i <= totalPages; i++) {
    DOM.progressBar.text.innerText = `[PAGE ${currentPage}] Restoring offers for ${productName} - nested level ${i}`;
    console.log(DOM.progressBar.text.innerText);
    if (i > 1) {
      const nextLink = new URL(productLink);
      nextLink.searchParams.set('p', i);
      opbox = await getOpboxJSON(nextLink);
    }
    const nestedProducts = opbox.dataSources[
      'listing-api-v3:allegro.listing:3.0'
    ].data.elements.filter((el) => el.type != 'label' && el.type != 'banner');

    for (const nestedArticle of nestedProducts) {
      const parsedProduct = generateProduct(nestedArticle);
      articleList.push(parsedProduct);
    }
  }
};

const processSearchResults = async (
  DOM,
  queryParams,
  nextLink,
  pageCount,
  currentPage
) => {
  const progressSplit = Math.floor(100 / pageCount);
  const opbox = await getOpboxJSON(nextLink);
  if (!opbox.dataSources?.['listing-web-bff:allegro.listing:3.0']) {
    console.error(`No search results from Opbox api for ${nextLink}`);
    return;
  }
  const productsToProcess = opbox.dataSources[
    'listing-web-bff:allegro.listing:3.0'
  ].data.elements.filter((el) => el.type != 'label' && el.type != 'banner');

  const productsCount = productsToProcess.length;

  // loop through each article
  let promiseArrayPrd = [];
  for (const [index, article] of productsToProcess.entries()) {
    // Loading Bar management
    const progressPercent =
      progressSplit * (currentPage - 1) +
      Math.floor((progressSplit / productsToProcess.length) * index);
    DOM.progressBar.bar.style.width = progressPercent + '%';
    DOM.progressBar.bar.innerText = progressPercent + '%';
    console.log(`Bar width: ${progressPercent}%`);
    DOM.progressBar.text.innerText = `[PAGE ${currentPage}] Restoring offers for ${article.name} - nested level 0`;
    console.log(DOM.progressBar.text.innerText);

    const articleLink = article.links?.[0]?.url;
    if (!articleLink) {
      // Article does not have "Porównaj x ofert" button
      const isLocal = article.url.includes('https://allegrolokalnie.pl/');
      if (isLocal) {
        continue;
        console.log(`LOCAL OFFER: article.url`);
      }

      const parsedProduct = generateProduct(article);

      // Add product to array
      articleList.push(parsedProduct);
      continue;
    }

    // Generate link for product page
    let fetchLink = `${articleLink}&${queryParams}`;
    if (!articleLink.includes('?')) {
      fetchLink = `${articleLink}?${queryParams}`;
    }

    // Get products using recursive fn
    await processProductPage(DOM, fetchLink, currentPage, article.name);

    // Experimental - 429
    /*promiseArrayPrd.push(
      processProductPage(DOM, fetchLink, currentPage, article.name)
    );*/
  }
  //await Promise.all(promiseArrayPrd);
};

const restore = async () => {
  let DOM = getDOM();
  // ProgressBar95
  DOM.progressBar.box.innerHTML =
    '<div id="myProgress" style="padding: 1vh;height: 100%;font-weight: 600;text-align: center;color: #ffffffde;font-family: Open Sans, sans-serif;font-size: .875rem;background-color: #222;display: none;"><div id="myBar" style="width: 0%; height: 2vh; background-color: #2ab9a380;">0%</div><div id="progressText" style="padding-top: 1vh;padding-left: 10px;padding-right: 10px;padding-bottom: 1vh;"></div></div>';
  DOM = getDOM();
  DOM.progressBar.div.style.display = 'block';
  DOM.rozlaczButton.style.display = 'none';

  // Get sorting option
  /*
  m - trafność: największa, qd - popularność: największa
  p - cena: od najniższej, pd - cena: od najwyższej
  d - cena z dostawą: od najniższej, dd - cena z dostawą: od najwyższej
  t - czas do końca: najmniej, n - czas dodania: najnowsze
  prd - ocena produktu: najwyższa
  */

  const mainURL = new URL(window.location.href);
  const mainURLQuery = new URLSearchParams(window.location.search);
  mainURLQuery.delete('string');
  const queryParams = mainURLQuery.toString();
  const pageCount = parseInt(DOM.pagination.innerText);

  console.log(
    `Sorting set to ${mainURLQuery.get('order')} - Page count ${pageCount}`
  );

  // Get all listings
  let promiseArray = [];
  for (let i = 1; i <= pageCount; i++) {
    DOM.progressBar.text.innerText = `Processing page ${i}`;
    console.log(DOM.progressBar.text.innerText);
    let nextLink = mainURL.href;
    if (i > 1) {
      nextLink = new URL(mainURL.href);
      nextLink.searchParams.set('p', i);
    }

    await processSearchResults(DOM, queryParams, nextLink, pageCount, i);
    // Experimental - 429
    /*promiseArray.push(
      processSearchResults(DOM, queryParams, nextLink, pageCount, i)
    );*/
  }
  //await Promise.all(promiseArray);
  // De duplicate by URL
  DOM.progressBar.text.innerText = `Removing duplicates...`;
  console.log(
    DOM.progressBar.text.innerText,
    `from ${articleList.length} articles`
  );
  await new Promise((r) => setTimeout(r, 1));
  //let uniqueProducts = [];
  const uniqueProducts = articleList.filter(
    (value, index, self) => index === self.findIndex((t) => t.url === value.url)
  );

  // Sorting
  DOM.progressBar.text.innerText = `Sorting by ${
    mainURL.searchParams.get('order')
      ? mainURL.searchParams.get('order')
      : 'lowest price'
  }...`;
  console.log(DOM.progressBar.text.innerText);
  await new Promise((r) => setTimeout(r, 1));

  // sort price asc for now
  switch (mainURL.searchParams.get('order')) {
    case 'pd':
      uniqueProducts.sort((a, b) => b.price - a.price);
      break;
    default:
      uniqueProducts.sort((a, b) => a.price - b.price);
      break;
  }

  let everyArticle = '';
  for (const article of uniqueProducts) {
    everyArticle += genListing(article);
  }
  //console.log(everyArticle);
  // sort and push all articles to main page

  DOM.mainArticles.innerHTML = everyArticle;
  document.querySelector('[data-role="paginationBottom"]').innerHTML =
    '<div class="m9vn_d2" data-role="paginationBottom"><div data-box-name="pagination bottom" data-box-id="xiI_xzzDRBaVlh7UFNK77w==" data-prototype-id="allegro.pagination" data-prototype-version="2.8" data-civ="222" data-analytics-enabled="" data-analytics-category="allegro.pagination"><div class="mpof_ki m7f5_6m m7f5_sf_s" data-param="p" data-one-based="true" data-listing-id="-11176257601724423245020" data-without-better-sort="true"><div class="mpof_ki munh_16 m3h2_16 mt1t_fz munh_56_s"><div class="mpof_ki m389_6m" role="navigation" aria-label="paginacja"><a href="https://allegro.pl/kategoria/akcesoria-gsm-etui-i-pokrowce-353?string=iphone%207&amp;order=p&amp;typ=plecki&amp;stan=nowe&amp;offerTypeAuction=2&amp;kolor=bezbarwny" data-page="1" class="l8c4v l195b mh36_8 mvrt_8 l1tbk _6d89c_N3YpX l97x9" aria-current="page">1</a><div class="munh_8 m3h2_8 msa3_z4 mgmw_wo _1h7wt">z</div><span class="_1h7wt mgmw_wo mh36_8 mvrt_8">1</span></div></div></div></div></div>';

  DOM.progressBar.bar.style.width = '100%';
  DOM.progressBar.bar.innerText = '100%';
  DOM.progressBar.text.innerText = `Finished! Total offers = ${uniqueProducts.length}`;
  console.log(DOM.progressBar.text.innerText);
};

const zNode = document.createElement('div');
zNode.className = 'mpof_5r mpof_vs_s mp4t_8 m3h2_16 mse2_40';
zNode.innerHTML =
  '<button id="myButton" class="mgn2_14 mp0t_0a m9qz_yp mp7g_oh mse2_40 mqu1_40 mtsp_ib mli8_k4 mp4t_0 m3h2_0 mryx_0 munh_0 msbw_rf mldj_rf mtag_rf mm2b_rf msa3_z4 mqen_m6 meqh_en m0qj_5r msts_n7 mh36_16 mvrt_16 mg9e_0 mj7a_0 mjir_sv m2ha_2 m8qd_vz mjt1_n2 b1kk0 mgmw_u5g mrmn_qo mrhf_u8 m31c_kb m0ux_fp b1g6n mx7m_1 m911_co mefy_co mnyp_co mdwl_co mlkp_6x mqvr_g3 _1405b_ZtYZA">Rozłącz te same oferty</button>';

function runWhenReady(readySelector, callback) {
  var numAttempts = 0;
  var tryNow = function () {
    var elem = document.querySelector(readySelector);
    if (elem) {
      callback(elem);
    } else {
      numAttempts++;
      if (numAttempts >= 34) {
        console.warn(
          'Giving up after 34 attempts. Could not find: ' + readySelector
        );
      } else {
        setTimeout(tryNow, 250 * Math.pow(1.1, numAttempts));
      }
    }
  };
  tryNow();
}

runWhenReady('[data-role="aboveItems"]', () => {
  document.querySelector('[data-role="aboveItems"]').appendChild(zNode);
  document.getElementById('myButton').addEventListener('click', restore, false);
});

const genListing = (listingData) => {
  if (!listingData) return;
  const {
    url,
    name,
    mainImg,
    seller,
    isSmart,
    productState,
    whenDelivery,
    priceShipping,
    popularityLabel,
    isBidding,
    price,
    isBiddingBuyNow,
    biddingBuyNowPrice,
    biddingTimeLeft,
    endingTime,
  } = listingData;
  const {
    isCompany,
    isSuperSeller,
    login,
    positiveFeedbackPercent,
    positiveFeedbackCount,
  } = seller;
  return `<article class="mx7m_1 mnyp_co mlkp_ag _1e32a_kdIMd">
  <div
    class="mpof_ki mp7g_oh mh36_16 mh36_24_l mvrt_16 mvrt_24_l mg9e_8 mj7a_8 m7er_k4 mjyo_6x mgmw_3z m0ux_vh mp5q_jr m31c_kb _1e32a_-EkD5"
  >
    <div>
      <div class="mpof_ki myre_zn m389_6m mse2_56 _1e32a_Q0tfR">
        <div class="mpof_ki mp7g_oh">
          <a
            href="${url}"
            rel="nofollow"
            aria-hidden="true"
            tabindex="-1"
            class="msts_9u mg9e_0 mvrt_0 mj7a_0 mh36_0 mpof_ki m389_6m mx4z_6m m7f5_6m _1e32a_7ZEQF"
            ><img
              alt="${name}"
              loading="lazy"
              src="${mainImg}"
          /></a>
        </div>
      </div>
    </div>
    <div class="mh36_8 mjyo_6x _1e32a_2Cd7P">
      <div class="_1e32a_yFdue">
        ${
          isCompany
            ? '<div class="mzmg_f9 _1e32a_v6GqI"><div><div class="mzmg_f9"><span class="mgmw_3z mpof_z0 mgn2_12">Firma</span></div></div></div>'
            : ''
        }
        <div class="_1e32a_meWPT _1e32a_WrGF-">
        ${
          isBidding
            ? '<div class="mpof_ki mwdn_1 mgn2_12 _1e32a_PUyXs"><div class="mpof_uk">LICYTACJA</div></div><span class="mg9e_0 mvrt_0 mj7a_0 mh36_0 mpof_uk mgn2_12 _1e32a_erOaA">' +
              biddingTimeLeft +
              ' dni</span>'
            : ''
        }
          <h2 class="mgn2_14 m9qz_yp mqu1_16 mp4t_0 m3h2_0 mryx_0 munh_0">
            <a
              href="${url}"
              class="mgn2_14 mp0t_0a mgmw_wo mj9z_5r mli8_k4 mqen_m6 lsaqd lvg0h meqh_en mpof_z0 mqu1_16 m6ax_n4 _1e32a_f18Kx"
              >${name}</a
            >
          </h2>
          <div class="mpof_ki mwdn_1 m389_6m m389_a6_m">
            ${
              isSuperSeller
                ? '<div class="mpof_ki m389_6m msa3_z4 mgn2_12">od <div class="mpof_ki mp7g_oh msa3_ae _1e32a_cwPPZ"><div class="mp7g_oh mpof_ki"><picture><source media="(prefers-color-scheme: dark)" srcset="https://a.allegroimg.com/original/34e1bf/82d1aebc4a9db9bef96345fd1e99/dark-information-common-super-seller-236577cfa7"><img src="https://a.allegroimg.com/original/34dd95/40d81c26458ca692070c8ed7eae5/information-common-super-seller-236577cfa7" alt="Super Sprzedawcy" class="m7er_56 _1e32a_97Mma "></picture><div class="mpof_5r mpof_3f_l "><div class="mjyo_6x mp7g_f6 mjb5_w6 msbw_2 mldj_2 mtag_2 mm2b_2 mgmw_wo msts_n6 m7er_k4 ti1554 ti1nw9 mpof_5r undefined"></div></div></div></div> Super Sprzedawcy</div><div class="mh36_4 mvrt_4 mpof_z0">|</div>'
                : '<div class="m3h2_4 mgn2_12">od</div>'
            }
            <div class="m3h2_8">
              <div class="mgn2_12">
                <span class="mgmw_wo">${login}</span>
              </div>
            </div>
            <div class="m3h2_8">
              <div class="mgn2_12">
                Poleca sprzedającego: <span class="mgmw_wo">${positiveFeedbackPercent}%</span>
              </div>
            </div>
            <div class="mgn2_12">${positiveFeedbackCount} ocen</div>
          </div>
          <div>
            <div class="mgn2_12">
              <div>
                <span class="mgmw_3z _1e32a_XFNn4">Stan</span>
                <span class="mgmw_wo mvrt_8">${productState}</span>
              </div>
            </div>
          </div>
          <div class="mj7a_4 mg9e_4 _1e32a_IAwmj">
            <div class="mpof_ki m389_0a mwdn_1">
              <div class="msa3_z4 m3h2_8">
                <span aria-label="${price}&nbsp;zł aktualna cena" tabindex="0"
                  ><span
                    class="mli8_k4 msa3_z4 mqu1_1 mp0t_ji m9qz_yo mgmw_qw mgn2_27 mgn2_30_s"
                    >${
                      price.split('.')[0]
                    },<span class="mgn2_19 mgn2_21_s m9qz_yq">${
                      price.split('.')[1]
                    }</span
                    >&nbsp;<span class="mgn2_19 mgn2_21_s m9qz_yq"
                      >zł</span
                    ></span
                  ></span
                >
              </div>
  ${
    isSmart
      ? '<span class="mpof_92 mp7g_oh"><div class="mp7g_oh"><div class="mgn2_12 mpof_ki m389_6m mwdn_1"><div class="mpof_ki m389_6m mwdn_1 _1e32a_x7RE- m3h2_0"><picture><source media="(prefers-color-scheme: dark)" srcset=" https://a.allegroimg.com/original/34611c/c433ab0c4bf9a76e4f1f15b5dd1f/dark-brand-subbrand-smart-2ecf1fa38c.svg" /><img src="https://a.allegroimg.com/original/343b4d/ed3f5c04412ab7bd70dd0a34f0cd/brand-subbrand-smart-d8bfa93f10.svg" alt="Smart!" class="mpof_z0 _1e32a_ELS6C"/></picture></div></div></div></span>'
      : ''
  }
            </div>
          </div>
          ${
            isBiddingBuyNow
              ? '<span class="mh36_0 mvrt_0 mgn2_12 mqu1_g3 mpof_z0 mgmw_qw"><span class="msa3_z4 m9qz_yq m3h2_4">' +
                biddingBuyNowPrice +
                '&nbsp;zł</span><span class="m9qz_yp">kup teraz</span></span>'
              : ''
          }
          <div class="mqu1_g3 mgn2_12">${priceShipping}&nbsp;zł z dostawą</div>
          <div class="mgn2_12 mpof_ki m389_6m mwdn_1">
            <div class="mpof_ki m389_6m mwdn_1 _1e32a_x7RE- m3h2_0">
              <span
                class="mli2_0"
                style="
                  color: var(--m-color-text-secondary, #656565);
                  font-weight: bold;
                  text-decoration: none;
                "
                >${whenDelivery}</span
              >
            </div>
          </div>
        </div>
        <div class="mg9e_4 mj7a_8 mpof_ki myre_zn m389_a6 m7f5_0a _1e32a_DNkZz">
          <div class="mpof_vs mgn2_12 mqu1_g3 mgmw_3z mg9e_2">
            <div class="mp7g_oh">
              <span>${popularityLabel ? popularityLabel : ''}</span>
              <div class="mpof_5r mpof_3f_l mpof_3f">
                <div
                  class="mjyo_6x mp7g_f6 mjb5_w6 msbw_2 mldj_2 mtag_2 mm2b_2 mgmw_wo msts_n6 m7er_k4 ti1554 ti1nw9 mpof_5r undefined"
                ></div>
              </div>
            </div>
          </div>
          <div class="mpof_ki mp4t_16">
            <button
              data-role-type="add-to-cart-button"
              class="mgn2_14 mp0t_0a m9qz_yp mp7g_oh mse2_40 mqu1_40 mtsp_ib mli8_k4 mp4t_0 mryx_0 m911_5r mefy_5r mnyp_5r mdwl_5r msbw_rf mldj_rf mtag_rf mm2b_rf mqvr_2 msa3_z4 mqen_m6 meqh_en m0qj_5r msts_n7 mh36_16 mvrt_16 mg9e_0 mj7a_0 mjir_sv m2ha_2 m8qd_vz mjt1_n2 b1kk0 mgmw_u5g mrmn_qo mrhf_u8 m31c_kb m0ux_fp bmh99 b3dfm munh_0 munh_16_l m3h2_0 m3h2_8_m"
            >
              <span>dodaj do koszyka</span></button
            ><button
              class="m7er_40 mp0t_0a m9qz_yp mp7g_oh mse2_40 mtsp_ib mli8_k4 mp4t_0 m3h2_0 mryx_0 munh_0 m911_5r mefy_5r mnyp_5r mdwl_5r msbw_rf mldj_rf mtag_rf mm2b_rf mqvr_2 msa3_z4 mqen_m6 meqh_en m0qj_5r msts_n7 mg9e_0 mj7a_0 mjir_sv m2ha_2 m8qd_vz mjt1_n2 b1kk0 mgmw_u5g mrmn_qo mrhf_u8 m31c_kb m0ux_fp b1g6n mqu1_1 mgn2_13 mvrt_0 mh36_0"
            >
              <picture
                ><source
                  media="(prefers-color-scheme: dark)"
                  srcset="
                    https://a.allegroimg.com/original/34da48/7daf74174cbab949125433930aba/dark-action-common-heart-d21a0d364b
                  " />
                <img
                  src="https://a.allegroimg.com/original/342704/5df50ccf415c9dc190264897d100/action-common-heart-322d64f02b"
                  alt="Dodaj do ulubionych"
                  class="mse2_40 mjyo_6x meqh_en msa3_z4 mg9e_4 mvrt_4 mj7a_4 mh36_4 mhd5_0m i1vy1 m0s5_ki"
              /></picture>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</article>`;
};
