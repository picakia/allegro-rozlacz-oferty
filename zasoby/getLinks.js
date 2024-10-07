import opboxJSON from './zasoby/opbox.json';
const getLinks = () => {
  //const opbox = JSON.parse(opboxJSON);
  //const listings = opboxJSON.dataSources['listing-web-bff:allegro.listing:3.0'];
  const listings = opboxJSON.dataSources['listing-api-v3:allegro.listing:3.0'];
  const offers = listings.data.elements;
  const meta = listings.metadata;
  const filtered = offers.filter((el) => el.type != 'label');
  const pageCount = Math.ceil(
    meta.Pageable.totalCount / meta.Pageable.pageSize
  );
  console.log(pageCount);
  console.log(filtered.length);
  console.log(meta);
  for (const off of filtered) {
    const readyListing = genListing(off);
    console.log(off.name);
    //console.log(readyListing);
  }
};
const daysTillEnd = (endDate) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(endDate) - new Date()) / millisecondsPerDay);
};

const genListing = (listingData, isLocal) => {
  const offerLink = listingData.url;
  const offerTitle = listingData.name;
  const imgLink = listingData.mainThumbnail; //s120
  const imgLinkBig = listingData.mainThumbnailSizes.large.url || ''; //s720
  const isCompany = listingData.seller.company;
  const isSuperSeller = listingData.seller.superSeller;
  const sellerName = listingData.seller.login;
  const sellerRecommendPercent = listingData.seller.positiveFeedbackPercent;
  const sellerReviewCount = listingData.seller.positiveFeedbackCount || 'brak';
  const isSmart = listingData.freebox ? true : false;
  const productState = listingData.parameters[0].values[0];
  const whenDelivery = listingData.badges.logistics.additionalInfo.text;
  const priceShipping = listingData.shipping.itemWithDelivery.amount;
  const isBidding = listingData.sellingMode.auction ? true : false;
  let price = listingData.sellingMode.buyNow?.price?.amount || '0.0';
  let isBiddingBuyNow = false;
  let biddingBuyNowPrice = 0;
  let biddingTimeLeft = 0;
  let biddingCount = 0;
  if (isBidding) {
    isBiddingBuyNow = listingData.sellingMode.buyNow ? true : false;
    biddingBuyNowPrice = listingData.sellingMode.buyNow?.price?.amount || '0.0';
    price = listingData.sellingMode.auction.price.amount;
    biddingTimeLeft = daysTillEnd(listingData.publication.endingTime);
    biddingCount = listingData.sellingMode.popularityLabel;
  }
  console.log({ isBidding, offerTitle, price, productState });
  return `<article class="mx7m_1 mnyp_co mlkp_ag _1e32a_kdIMd">
  <div
    class="mpof_ki mp7g_oh mh36_16 mh36_24_l mvrt_16 mvrt_24_l mg9e_8 mj7a_8 m7er_k4 mjyo_6x mgmw_3z m0ux_vh mp5q_jr m31c_kb _1e32a_-EkD5"
  >
    <div>
      <div class="mpof_ki myre_zn m389_6m mse2_56 _1e32a_Q0tfR">
        <div class="mpof_ki mp7g_oh">
          <a
            href="${offerLink}"
            rel="nofollow"
            aria-hidden="true"
            tabindex="-1"
            class="msts_9u mg9e_0 mvrt_0 mj7a_0 mh36_0 mpof_ki m389_6m mx4z_6m m7f5_6m _1e32a_7ZEQF"
            ><img
              alt="${offerTitle}"
              loading="lazy"
              src="${imgLink}"
              srcset="
                ${imgLink} 1x,
                ${imgLinkBig} 2x
              "
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
              href="${offerLink}"
              class="mgn2_14 mp0t_0a mgmw_wo mj9z_5r mli8_k4 mqen_m6 lsaqd lvg0h meqh_en mpof_z0 mqu1_16 m6ax_n4 _1e32a_f18Kx"
              >${offerTitle}</a
            >
          </h2>
          <div class="mpof_ki mwdn_1 m389_6m m389_a6_m">
            <div class="mpof_ki m389_6m msa3_z4 mgn2_12">
              od
              ${
                isSuperSeller
                  ? '<div class="mpof_ki mp7g_oh msa3_ae _1e32a_cwPPZ"><div class="mp7g_oh mpof_ki"><picture><source media="(prefers-color-scheme: dark)" srcset="https://a.allegroimg.com/original/34e1bf/82d1aebc4a9db9bef96345fd1e99/dark-information-common-super-seller-236577cfa7" /><img src="https://a.allegroimg.com/original/34dd95/40d81c26458ca692070c8ed7eae5/information-common-super-seller-236577cfa7" alt="Super Sprzedawcy" class="m7er_56 _1e32a_97Mma"/></picture><div class="mpof_5r mpof_3f_l"><div class="mjyo_6x mp7g_f6 mjb5_w6 msbw_2 mldj_2 mtag_2 mm2b_2 mgmw_wo msts_n6 m7er_k4 ti1554 ti1nw9 mpof_5r undefined"></div></div></div></div>Super Sprzedawcy</div><div class="mh36_4 mvrt_4 mpof_z0">|</div>'
                  : ''
              }
							<div class="m3h2_8">
								<div class="mgn2_12">
									<span class="mgmw_wo">${sellerName}</span>
								</div>
							</div>
							<div class="m3h2_8">
								<div class="mgn2_12">
									Poleca sprzedającego: <span class="mgmw_wo">${sellerRecommendPercent}%</span>
								</div>
							</div>
							<div class="mgn2_12">${sellerReviewCount} ocen</div>
            </div>
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
                >dostawa ${whenDelivery}</span
              >
              <div class="mp7g_oh">
                <picture
                  ><source
                    media="(prefers-color-scheme: dark)"
                    srcset="
                      https://assets.allegrostatic.com/fast-delivery-icons/information-dark.svg
                    " />
                  <img
                    src="https://assets.allegrostatic.com/fast-delivery-icons/information.svg"
                    alt=""
                    class="mpof_z0 _1e32a_ELS6C"
                /></picture>
                <div class="mpof_5r mpof_3f_l mpof_3f">
                  <div
                    class="mjyo_6x mp7g_f6 mjb5_w6 msbw_2 mldj_2 mtag_2 mm2b_2 mgmw_wo msts_n6 m7er_k4 ti1554 ti1nw9 mpof_5r ti7yw2"
                    style="top: -16px; left: 24px; width: 296px"
                  >
                    <div
                      class="mg9e_16 mvrt_16 mh36_16 mgn2_14 mp0t_0a mqu1_21 mgmw_wo mli8_k4 mj7a_16"
                    >
                      <button
                        type="button"
                        class="mgn2_14 mp0t_0a m9qz_yp mse2_40 mqu1_40 mtsp_ib mli8_k4 mp4t_0 m3h2_0 mryx_0 munh_0 m911_5r mefy_5r mnyp_5r mdwl_5r msbw_rf mldj_rf mtag_rf mm2b_rf mqvr_2 msa3_z4 mqen_m6 meqh_en m0qj_5r msts_n7 mg9e_0 mj7a_0 mjir_sv m2ha_2 m8qd_vz mjt1_n2 b1kk0 mgmw_u5g mrmn_qo mrhf_u8 m31c_kb m0ux_fp b1g6n mpof_5r_m mvrt_0 mh36_0 mp7g_f6 mnjl_0 mq1m_0"
                      >
                        <img
                          src="https://a.allegroimg.com/original/34f3f5/bf439aab49d0a78bcd7501d51697/action-common-x-6c70096572"
                          alt="close"
                          class="mse2_40 mjyo_6x meqh_en msa3_z4 mg9e_4 mvrt_4 mj7a_4 mh36_4 mhd5_0m i1vy1"
                        />
                      </button>
                      <div class="mgn2_14 mp0t_0a mqu1_21 mgmw_wo mli8_k4 mvrt_24 mvrt_0_m">
                        Przewidywany przez Allegro czas dostawy na podstawie wcześniejszych
                        dostaw sprzedającego.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mg9e_4 mj7a_8 mpof_ki myre_zn m389_a6 m7f5_0a _1e32a_DNkZz"><div class="mpof_vs mgn2_12 mqu1_g3 mgmw_3z mg9e_2"><span>${biddingCount}</span></div><div class="mpof_ki mp4t_16"></div></div>
      </div>
    </div>
  </div>
</article>`;
};

getLinks();
