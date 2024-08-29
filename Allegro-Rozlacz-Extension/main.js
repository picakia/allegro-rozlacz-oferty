console.log("Allegro-Rozlacz-Extension loaded");
let restore = async () => {
  document.querySelector('[data-box-name="premium.with.dfp"]').innerHTML =
    '<div id="myProgress" style="padding: 1vh;height: 100%;font-weight: 600;text-align: center;color: #ffffffde;font-family: Open Sans, sans-serif;font-size: .875rem;background-color: #222;display: none;"><div id="myBar" style="width: 0%; height: 2vh; background-color: #2ab9a380;">0%</div><div id="progressText" style="padding-top: 1vh;padding-left: 10px;padding-right: 10px;padding-bottom: 1vh;"></div></div>';
  document.getElementById("myButton").style.display = "none";
  document.getElementById("myProgress").style.display = "block";
  const bar = document.getElementById("myBar");
  const barText = document.getElementById("progressText");
  let progressPercent = 0;
  // Get sorting option
  /*
  m - trafność: największa
  p - cena: od najniższej
  pd - cena: od najwyższej
  d - cena z dostawą: od najniższej
  dd - cena z dostawą: od najwyższej
  qd - popularność: największa
  t - czas do końca: najmniej
  n - czas dodania: najnowsze
  prd - ocena produktu: najwyższa
   */
  // TODO: Need to scroll through more pages in nested offers
  const mainURL = new URL(window.location.href);
  const mainURLQuery = new URL(window.location.href);
  mainURLQuery.searchParams.delete("string");
  const queryParams = mainURLQuery.searchParams.toString();
  const pageCount = parseInt(
    document.querySelector('[aria-label="paginacja"] > span').innerText
  );
  const mainArticles = document.querySelector(".opbox-listing > div");
  console.log(
    `Sorting set to ${mainURL.searchParams.get(
      "order"
    )} - Page count ${pageCount}`
  );

  let everyArticle = "";

  const progressSplit = Math.floor(100 / pageCount);
  for (let i = 1; i <= pageCount; i++) {
    if (i > 1) {
      //await new Promise(r => setTimeout(r, Math.random() * (1000 - 200) + 200));
    }
    console.log(`Processing page ${i}`);
    barText.innerText = `Processing page ${i}`;

    let articlesDiv;
    if (i == 1) {
      articlesDiv = mainArticles;
    } else {
      const nextPageLink = `${mainURL.href}&p=${i}`;
      if (!mainURL.href.includes("?")) {
        nextPageLink = `${mainURL.href}?p=${i}`;
      }
      const nextPage = await fetch(nextPageLink, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36  (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
        },
      });
      if (nextPage.status != 200) {
        console.error(
          `Failed to get Offers page ${i} - STATUS: ${nextPage.status}`
        );
        console.error(nextPage.text());
        // TODO: Create retry
        continue;
      }
      const nextPageDOM = new DOMParser().parseFromString(
        await nextPage.text(),
        "text/html"
      );
      articlesDiv = nextPageDOM.querySelector(".opbox-listing > div");
    }
    // get all offers without garbage
    articlesDiv.querySelectorAll(":scope > h2").forEach(e => e.remove());
    articlesDiv.querySelectorAll(":scope > div").forEach(e => e.remove());
    articlesDiv.querySelectorAll(":scope > script").forEach(e => e.remove());

    const currentPageArticles = articlesDiv.querySelectorAll("article");
    // loop through each article
    for (const [index, article] of currentPageArticles.entries()) {
      progressPercent =
        progressSplit * (i - 1) +
        Math.floor((progressSplit / currentPageArticles.length) * index);
      bar.style.width = progressPercent + "%";
      bar.innerText = progressPercent + "%";
      console.log(`Bar width: ${progressPercent}%`);
      //console.log(article);
      const articleName = article.querySelector("h2 > a").innerText;
      const linkElement = article.querySelector(
        '[data-role-type="product-fiche-link"]'
      );
      if (linkElement == null) {
        everyArticle += article.outerHTML;
        continue;
      }
      const link = linkElement.href;
      if (link.includes("https://allegrolokalnie.pl/")) {
        if (i !== 1) continue;
        // TODO: FIX nested page
        console.log(
          `[PAGE ${i}] Restoring offers for ${articleName} - nested page 1`
        );
        barText.innerText = `[PAGE ${i}] Restoring offers for ${articleName} - nested page 1`;

        let fetchLink = `${link}&${queryParams}`;
        if (!link.includes("?")) {
          fetchLink = `${link}?${queryParams}`;
        }
        console.log(`Lokalnie link: ${fetchLink}`);
        // get the page and parse offers as dom
        let offerData;
        try {
          offerData = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
              //goes to bg_page.js
              fetchLink,
              data => resolve(data) //your callback
            );
          });
        } catch (e) {
          console.error(`Failed to get offers for ${fetchLink}`);
          console.error(e.message);
          continue;
        }
        const nestedPage = new DOMParser().parseFromString(
          await offerData,
          "text/html"
        );
        const nestedArticles = nestedPage.querySelectorAll(
          '[data-testid="offers-list"] > article'
        );
        for (const nestedArticle of nestedArticles) {
          const offerTitle = nestedArticle.querySelector("h3").innerText;
          const offerImg = nestedArticle.querySelector("img").src;
          const offerLink = nestedArticle.querySelector("a").href;
          const offerPrice = nestedArticle
            .querySelector(".mlc-itembox__price")
            .innerText.replaceAll("\n", "")
            .split(/\xA0/)[0]
            .trim()
            .replaceAll(" ", "");
          let offerType = "KUP TERAZ";
          if (
            nestedArticle.querySelector(".mlc-itembox__offer-type--bidding") !==
            null
          )
            offerType = "LICYTACJA";
          if (
            nestedArticle.querySelector(
              ".mlc-itembox__offer-type--classified"
            ) !== null
          )
            offerType = "OGŁOSZENIE";

          const offerCondition =
            nestedArticle.querySelector(
              '[data-tip="Ten przedmiot jest fabrycznie nowy, nigdy nie był używany."]'
            ) == null
              ? "Używany"
              : "Nowy";

          const offerSmart =
            nestedArticle.querySelector(".mlc-itembox__smart-icon") == null
              ? false
              : true;

          const localArticle = `<article class="mx7m_1 mnyp_co mlkp_ag"><div class="mqen_m6 mjyo_6x mgmw_3z mpof_ki mwdn_0 mp7g_oh mj7a_16 mg9e_16 mh36_8 m7er_k4 m0ux_vh mp5q_jr m31c_kb _1e32a_3Yx4X"><div class="mvrt_8 mse2_k4"><div><div class="mp7g_oh"><a href="${offerLink}" rel="nofollow" aria-hidden="true" tabindex="-1" class="msts_9u mg9e_0 mvrt_0 mj7a_0 mh36_0 mpof_ki m389_6m mx4z_6m m7f5_6m _1e32a_7ZEQF"><img alt="${offerTitle}" loading="lazy" src="${offerImg}"></a></div></div></div><div class="mpof_ki mr3m_1 myre_zn myre_8v_l _1e32a_pAK3c"><div class="mjyo_6x mpof_ki myre_zn mj7a_8 mj7a_0_l mvrt_8_l m7er_k4 _1e32a_PH-oM"><div class="_1e32a_ThNEQ mryx_16"><h2 class="mgn2_14 m9qz_yp mqu1_16 mp4t_0 m3h2_0 mryx_0 munh_0"><a href="${offerLink}" class="mgn2_14 mp0t_0a mgmw_wo mj9z_5r mli8_k4 mqen_m6 lsaqd lvg0h meqh_en mpof_z0 mqu1_16 m6ax_n4 _1e32a_f18Kx ">${offerTitle}</a></h2><picture><source media="(prefers-color-scheme: dark)" srcset="https://a.allegroimg.com/original/34cfc8/10ec4f874e53943e4874ec35cf46/dark-brand-subbrand-allegro-lokalnie-9ec666e2c7"><img src="https://a.allegroimg.com/original/34a54b/cf0e78534a3db96bc835307f3006/brand-subbrand-allegro-lokalnie-9d019981af" alt="Allegro Lokalnie"></picture></div></div><div class="m911_co mpof_ki myre_zn m7f5_5x mg9e_8 mg9e_0_l mh36_16_l mx7m_1 mlkp_ag m7er_k4 _1e32a_WSqB7"><div class="mpof_ki"><div class="_1e32a_ThNEQ mzaq_56"><div class="mj7a_4 mg9e_4 _1e32a_B-L3c"><div class="mpof_ki m389_0a mwdn_1"><div class="msa3_z4 m3h2_8"><span aria-label="${offerPrice}&nbsp;zł aktualna cena" tabindex="0"><span class="mli8_k4 msa3_z4 mqu1_1 mp0t_ji m9qz_yo mgmw_qw mgn2_27 mgn2_30_s">${offerPrice}&nbsp;<span class="mgn2_19 mgn2_21_s m9qz_yq">zł</span></span></span></div>${
            offerSmart
              ? '<span class="mpof_92 mp7g_oh"><div class="mp7g_oh "><div class="mgn2_12 mpof_ki m389_6m mwdn_1"><div class="mpof_ki m389_6m mwdn_1 _1e32a_x7RE- m3h2_0"><picture><source media="(prefers-color-scheme: dark)" srcset="https://a.allegroimg.com/original/34611c/c433ab0c4bf9a76e4f1f15b5dd1f/dark-brand-subbrand-smart-2ecf1fa38c.svg"><img src="https://a.allegroimg.com/original/343b4d/ed3f5c04412ab7bd70dd0a34f0cd/brand-subbrand-smart-d8bfa93f10.svg" alt="" class="mpof_z0 _1e32a_ELS6C"></picture></div></div></div></span>'
              : ""
          }</div></div></div></div><div class="_1e32a_ThNEQ mg9e_4"><div><div class="mgn2_12"><div><span class="mgmw_3z _1e32a_XFNn4">Stan</span> <span class="mgmw_wo mvrt_8 ">${offerCondition}</span> </div></div></div><div class="mpof_ki mwdn_1"><div class="mpof_uk"><span>${offerType} z Allegro Lokalnie</span></div></div></div></div></div></div></article>`;

          everyArticle += localArticle;
        }

        /*await new Promise(r =>
          setTimeout(r, Math.random() * (1000 - 200) + 200)
        );*/
        continue;
      }

      console.log(
        `[PAGE ${i}] Restoring offers for ${articleName} - nested page 1`
      );
      barText.innerText = `[PAGE ${i}] Restoring offers for ${articleName} - nested page 1`;
      let fetchLink = `${link}&${queryParams}`;
      if (!link.includes("?")) {
        fetchLink = `${link}?${queryParams}`;
      }

      // get the page and parse offers as dom
      let offerData;
      try {
        offerData = await fetch(fetchLink, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36  (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
          },
        });
        if (offerData.status != 200) {
          console.error(
            `Failed to get offers for ${fetchLink} - STATUS: ${offerData.status}`
          );
          console.error(offerData.text());
          // Create retry
          continue;
        }
      } catch (e) {
        console.error(`Failed to get offers for ${fetchLink}`);
        console.error(e.message);
        continue;
      }
      const nestedPage = new DOMParser().parseFromString(
        await offerData.text(),
        "text/html"
      );
      const nestedOffersDiv = nestedPage.querySelector(".opbox-listing > div");
      nestedOffersDiv.querySelectorAll(":scope > h2").forEach(e => e.remove());
      nestedOffersDiv.querySelectorAll(":scope > div").forEach(e => e.remove());
      nestedOffersDiv
        .querySelectorAll(":scope > script")
        .forEach(e => e.remove());
      const nestedArticles = nestedOffersDiv.querySelectorAll("article");
      for (const [index, nestedArticle] of nestedArticles.entries()) {
        if (index == 0) continue;
        everyArticle += nestedArticle.outerHTML;
      }

      //await new Promise(r => setTimeout(r, Math.random() * (1000 - 200) + 200));
    }
  }
  // sort and push all articles to main page
  const unsortedArticlesDOM = new DOMParser().parseFromString(
    `<div>${everyArticle}</div>`,
    "text/html"
  );
  const unsortedArticles = unsortedArticlesDOM.querySelector("div");

  if (unsortedArticles.children.length > 1) {
    console.log(`Sorting by ${mainURL.searchParams.get("order")}`);
    barText.innerText = `Sorting by ${mainURL.searchParams.get("order")}`;

    [...unsortedArticles.children]
      .sort((a, b) => {
        const priceAraw = a.querySelectorAll('[aria-label$="aktualna cena"]');
        if (priceAraw.length == 0) {
          console.error(`Missing price for item ${a.outerHTML}, skipping`);
          return 1;
        }
        const priceA = parseFloat(
          priceAraw[priceAraw.length - 1]
            .getAttribute("aria-label")
            .split(/\xA0/)[0]
            .replace(",", ".")
        );

        const priceBraw = b.querySelectorAll('[aria-label$="aktualna cena"]');
        if (priceBraw.length == 0) {
          console.error(`Missing price for item ${b.outerHTML}, skipping`);
          return 1;
        }
        const priceB = parseFloat(
          priceBraw[priceBraw.length - 1]
            .getAttribute("aria-label")
            .split(/\xA0/)[0]
            .replace(",", ".")
        );
        switch (mainURL.searchParams.get("order")) {
          case "pd":
            if (priceA < priceB) return 1;
            else return -1;
          default:
            if (priceA > priceB) return 1;
            else return -1;
        }
      })
      .forEach(node => unsortedArticles.appendChild(node));
  } else console.log(`Not sorting`);
  mainArticles.innerHTML = unsortedArticles.innerHTML;
  document.querySelector('[data-role="paginationBottom"]').innerHTML =
    '<div class="m9vn_d2" data-role="paginationBottom"><div data-box-name="pagination bottom" data-box-id="xiI_xzzDRBaVlh7UFNK77w==" data-prototype-id="allegro.pagination" data-prototype-version="2.8" data-civ="222" data-analytics-enabled="" data-analytics-category="allegro.pagination"><div class="mpof_ki m7f5_6m m7f5_sf_s" data-param="p" data-one-based="true" data-listing-id="-11176257601724423245020" data-without-better-sort="true"><div class="mpof_ki munh_16 m3h2_16 mt1t_fz munh_56_s"><div class="mpof_ki m389_6m" role="navigation" aria-label="paginacja"><a href="https://allegro.pl/kategoria/akcesoria-gsm-etui-i-pokrowce-353?string=iphone%207&amp;order=p&amp;typ=plecki&amp;stan=nowe&amp;offerTypeAuction=2&amp;kolor=bezbarwny" data-page="1" class="l8c4v l195b mh36_8 mvrt_8 l1tbk _6d89c_N3YpX l97x9" aria-current="page">1</a><div class="munh_8 m3h2_8 msa3_z4 mgmw_wo _1h7wt">z</div><span class="_1h7wt mgmw_wo mh36_8 mvrt_8">1</span></div></div></div></div></div>';
  console.log(`Finished! Total offers = ${unsortedArticles.children.length}`);
  bar.style.width = "100%";
  bar.innerText = "100%";
  barText.innerText = `Finished! Total offers = ${unsortedArticles.children.length}`;
};

const zNode = document.createElement("div");
zNode.className = "mpof_5r mpof_vs_s mp4t_8 m3h2_16 mse2_40";
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
          "Giving up after 34 attempts. Could not find: " + readySelector
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
  document.getElementById("myButton").addEventListener("click", restore, false);
  Object.defineProperty(navigator, "userAgent", {
    value:
      "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36  (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    configurable: false,
  });
});
