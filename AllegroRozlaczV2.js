// ==UserScript==
// @name         Restore allegro ROZŁĄCZ V2
// @namespace    http://filipgil.xyz/
// @version      2026-05-14_17-26
// @description  try to take over Allegro.pl
// @author       You
// @match        https://allegro.pl/kategoria/*
// @match        https://allegro.pl/listing*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=allegro.pl
// @grant        GM_xmlhttpRequest
// @connect      allegrolokalnie.pl
// ==/UserScript==

// enable to speed up the script at a cost of being blocked
const fastMode = false;
// enable to show only offers that have your keywords in the title
const cleanOffers = false;
// enable to persist blacklist across page reloads (localStorage), false = reset on reload
const persistBlacklist = true;
// enable to filter blacklisted offers BEFORE fetching nested pages (saves requests)
const earlyBlacklist = true;

let articleList = [];

// Blacklist management
const BLACKLIST_KEY = "allegro_rozlacz_blacklist";
const BLACKLIST_ENABLED_KEY = "allegro_rozlacz_blacklist_enabled";
let _sessionBlacklist = [];
let _sessionBlacklistEnabled = true;
const getBlacklist = () => persistBlacklist ? JSON.parse(localStorage.getItem(BLACKLIST_KEY) || "[]") : _sessionBlacklist;
const saveBlacklist = list => { if (persistBlacklist) localStorage.setItem(BLACKLIST_KEY, JSON.stringify(list)); else _sessionBlacklist = list; };
const isBlacklistEnabled = () => persistBlacklist ? localStorage.getItem(BLACKLIST_ENABLED_KEY) !== "false" : _sessionBlacklistEnabled;
const setBlacklistEnabled = val => { if (persistBlacklist) localStorage.setItem(BLACKLIST_ENABLED_KEY, val ? "true" : "false"); else _sessionBlacklistEnabled = val; };

const openBlacklistPopup = () => {
  if (document.getElementById("blacklistPopup")) return;
  const overlay = document.createElement("div");
  overlay.id = "blacklistPopup";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;";
  const popup = document.createElement("div");
  popup.style.cssText = "background:#222;color:#fff;border-radius:12px;padding:24px;min-width:360px;max-width:500px;max-height:80vh;display:flex;flex-direction:column;font-family:Open Sans,sans-serif;";
  popup.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h3 style="margin:0;font-size:1.1rem;">Blacklista fraz</h3>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;">
        <span style="font-size:13px;color:#aaa;" id="blacklistToggleLabel">${isBlacklistEnabled() ? "Włączona" : "Wyłączona"}</span>
        <div style="position:relative;width:40px;height:22px;">
          <input id="blacklistToggle" type="checkbox" ${isBlacklistEnabled() ? "checked" : ""} style="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;margin:0;z-index:1;" />
          <div id="blacklistToggleTrack" style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:11px;background:${isBlacklistEnabled() ? "#2ab9a3" : "#555"};transition:background .2s;"></div>
          <div id="blacklistToggleThumb" style="position:absolute;top:2px;left:${isBlacklistEnabled() ? "20px" : "2px"};width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s;"></div>
        </div>
      </label>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <input id="blacklistInput" type="text" placeholder="Wpisz frazę do zablokowania..." style="flex:1;padding:8px 12px;border-radius:6px;border:1px solid #555;background:#333;color:#fff;font-size:14px;" />
      <button id="blacklistAdd" style="padding:8px 16px;border-radius:6px;border:none;background:#2ab9a3;color:#fff;font-weight:600;cursor:pointer;">Dodaj</button>
    </div>
    <ul id="blacklistItems" style="list-style:none;padding:0;margin:0;overflow-y:auto;max-height:300px;"></ul>
    <button id="blacklistClose" style="margin-top:16px;padding:10px;border-radius:6px;border:none;background:#555;color:#fff;font-weight:600;cursor:pointer;">Zamknij</button>
  `;
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const renderItems = () => {
    const list = getBlacklist();
    const ul = document.getElementById("blacklistItems");
    ul.innerHTML = list.length === 0
      ? '<li style="color:#999;padding:8px 0;">Brak fraz na blackliście</li>'
      : list.map((phrase, i) => `<li style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #333;"><span>${phrase}</span><button data-idx="${i}" style="background:#c0392b;border:none;color:#fff;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;">Usuń</button></li>`).join("");
    ul.querySelectorAll("button[data-idx]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"));
        const current = getBlacklist();
        current.splice(idx, 1);
        saveBlacklist(current);
        renderItems();
      });
    });
  };

  document.getElementById("blacklistToggle").addEventListener("change", e => {
    const enabled = e.target.checked;
    setBlacklistEnabled(enabled);
    document.getElementById("blacklistToggleLabel").textContent = enabled ? "Włączona" : "Wyłączona";
    document.getElementById("blacklistToggleTrack").style.background = enabled ? "#2ab9a3" : "#555";
    document.getElementById("blacklistToggleThumb").style.left = enabled ? "20px" : "2px";
  });

  document.getElementById("blacklistAdd").addEventListener("click", () => {
    const input = document.getElementById("blacklistInput");
    const val = input.value.trim();
    if (!val) return;
    const current = getBlacklist();
    current.push(val);
    saveBlacklist(current);
    input.value = "";
    renderItems();
  });

  document.getElementById("blacklistInput").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("blacklistAdd").click();
  });

  document.getElementById("blacklistClose").addEventListener("click", () => {
    overlay.remove();
  });
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.remove();
  });

  renderItems();
};

const getDOM = () => {
  return {
    progressBar: {
      box: document.querySelector('[data-box-name="premium.with.dfp"]'),
      div: document.getElementById("myProgress"),
      bar: document.getElementById("myBar"),
      text: document.getElementById("progressText"),
    },
    rozlaczButton: document.getElementById("myButton"),
    mainArticles: document.querySelector(".opbox-listing ul"),
    pagination: document.querySelector('[aria-label="paginacja"] > span'),
    aiShit: document.querySelector(
      '[data-box-name="allegro.dynamicQueryNarrowing"]',
    ),
  };
};

const getOpboxJSON = async link => {
  // Find
  let mainOpboxRes;
  try {
    mainOpboxRes = await fetch(link, {
      headers: {
        accept: "application/vnd.opbox-web.v2+json",
      },
    });
    if (mainOpboxRes.status != 200) {
      console.error(
        `Failed to get Opbox json - STATUS: ${mainOpboxRes.status}`,
      );
      console.error(await mainOpboxRes.text());
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
const gmFetch = url =>
  new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      onload: res => resolve(res.responseText),
      onerror: err => reject(err),
    });
  });

const buildLokalnieURL = mainURL => {
  const keyword = mainURL.searchParams.get("string");
  if (!keyword) return null;

  // Extract category from /kategoria/.../slug-12345 path
  const pathSegments = mainURL.pathname.replace(/^\/kategoria\//, "").split("/");
  const lastSegment = pathSegments[pathSegments.length - 1];
  const hasCategory = /\d+$/.test(lastSegment);

  const basePath = hasCategory
    ? `https://allegrolokalnie.pl/oferty/${lastSegment}/q/${encodeURIComponent(keyword)}`
    : `https://allegrolokalnie.pl/oferty/q/${encodeURIComponent(keyword)}`;
  const lokalnieURL = new URL(basePath);
  lokalnieURL.searchParams.set("zrodlo", "lokalnie");

  // Mapping: allegro order -> lokalnie sort
  const orderMap = {
    p: "price-asc",
    pd: "price-desc",
    n: "startingTime-desc",
  };
  const order = mainURL.searchParams.get("order");
  if (order && orderMap[order]) {
    lokalnieURL.searchParams.set("sort", orderMap[order]);
  }

  // Price range
  const priceFrom = mainURL.searchParams.get("price_from");
  const priceTo = mainURL.searchParams.get("price_to");
  if (priceFrom) lokalnieURL.searchParams.set("price_from", priceFrom);
  if (priceTo) lokalnieURL.searchParams.set("price_to", priceTo);

  // Smart
  if (mainURL.searchParams.get("sm") === "1") {
    lokalnieURL.searchParams.set("dostawa_smart", "1");
  }

  return lokalnieURL.href;
};

const parseLokalnieHTML = html => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Pagination
  const paginationEl = doc.querySelector("[data-mlc-listing-bottom-pagination]");
  let pagesCount = 1;
  if (paginationEl) {
    try {
      const paginationData = JSON.parse(paginationEl.getAttribute("data-mlc-listing-bottom-pagination"));
      pagesCount = paginationData.pages_count || 1;
    } catch (e) {}
  }
  const articles = doc.querySelectorAll("article.mlc-itembox__container");
  const items = Array.from(articles).map(article => {
    const link = article.querySelector("a.mlc-card[itemprop='url']");
    const href = link?.getAttribute("href") || "";
    const img = article.querySelector("img[itemprop='image']");
    const title = article.querySelector("h3.mlc-itembox__title");
    const priceEl = article.querySelector(".ml-offer-price__dollars");
    const centsEl = article.querySelector(".ml-offer-price__cents");
    const price = (priceEl?.textContent?.trim() || "0") + "." + (centsEl?.textContent?.trim() || "00");

    // Offer type: buy_now, classified, bidding
    const offerTypeEl = article.querySelector(".mlc-itembox__offer-type");
    const offerTypeClass = offerTypeEl?.className || "";
    const isBidding = offerTypeClass.includes("--bidding");
    const offerTypeText = offerTypeEl?.textContent?.trim() || "";

    // Parameters
    const paramEls = article.querySelectorAll(".mlc-itembox__params__param .ml-text-small");
    const parameters = Array.from(paramEls).map(el => {
      const text = el.textContent.trim();
      const colonIdx = text.indexOf(":");
      if (colonIdx === -1) return { name: text, values: [""] };
      return {
        name: text.substring(0, colonIdx).trim(),
        values: [text.substring(colonIdx + 1).trim()],
      };
    });

    // Smart
    const isSmart = !!article.querySelector(".mlc-smart-icon");

    // Location
    const locationEl = article.querySelector("address[itemprop='address']");
    const location = locationEl?.textContent?.trim() || null;

    // Badges
    const badgeEls = article.querySelectorAll(".ml-badges__badge");
    const badges = Array.from(badgeEls).map(b => b.textContent.trim());

    // Auction info
    let endingTime = null;
    let popularityLabel = null;
    if (isBidding) {
      const timeEl = article.querySelector("[data-mlc-itembox-bidding-remaining-time]");
      if (timeEl) {
        try {
          const timeData = JSON.parse(timeEl.getAttribute("data-mlc-itembox-bidding-remaining-time"));
          endingTime = timeData.endingAt;
        } catch (e) {}
      }
      const biddingProps = article.querySelectorAll(".mlc-itembox__bidding-props__prop");
      if (biddingProps.length >= 2) {
        popularityLabel = biddingProps[1].textContent.trim();
      }
    }

    return {
      href: href.startsWith("/") ? "https://allegrolokalnie.pl" + href : href,
      name: title?.textContent?.trim() || "",
      image: img?.getAttribute("src") || "",
      price,
      isBidding,
      offerType: offerTypeText,
      parameters,
      isSmart,
      location,
      badges,
      endingTime,
      popularityLabel,
    };
  });
  return { items, pagesCount };
};

const generateLokalnieProduct = item => {
  return {
    url: item.href,
    name: item.name,
    mainImg: item.image,
    offerType: item.offerType,
    seller: {
      isCompany: false,
      isSuperSeller: false,
      login: item.location || "Allegro Lokalnie",
      positiveFeedbackPercent: null,
      positiveFeedbackCount: null,
    },
    isLokalnie: true,
    isSmart: item.isSmart,
    parameters: item.parameters,
    productState: item.parameters.find(p => p.name === "Stan")?.values?.[0] || null,
    whenDelivery: null,
    whenDeliveryColor: null,
    priceShipping: null,
    popularityLabel: item.popularityLabel,
    isBidding: item.isBidding,
    price: item.price,
    isBiddingBuyNow: false,
    biddingBuyNowPrice: 0,
    biddingTimeLeft: item.endingTime ? daysTillEnd(item.endingTime) : 0,
    endingTime: item.endingTime,
  };
};

const daysTillEnd = endDate => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(endDate) - new Date()) / millisecondsPerDay);
};
// Custom format for product
const generateProduct = listingData => {
  //console.log(listingData);
  let parsedProduct = {};
  try {
    const parsedUrl = new URL(listingData.url);
    let offerUrl;
    if (parsedUrl.pathname === "/events/clicks") {
      const redirect = parsedUrl.searchParams.get("redirect");
      if (redirect) {
        const redirectUrl = new URL(decodeURIComponent(redirect));
        //console.log(`[EVENTS CLICKS] Redirect decoded: ${redirectUrl}`);
        offerUrl = redirectUrl.pathname;
      } else {
        //console.log(`[EVENTS CLICKS] NO Redirect decoded: ${parsedUrl}`);
        offerUrl = parsedUrl.pathname;
      }
    } else {
      offerUrl = parsedUrl.pathname + parsedUrl.search;
      // console.log(`[NORMAL LINK] Parsed URL: ${parsedUrl}`);
    }
    //console.log(`[FINAL URL] Generated offer URL: ${offerUrl}`);

    parsedProduct = {
      offerId: listingData.offerId || listingData.id,
      url: offerUrl,
      name: listingData.name,
      mainImg: listingData.mainThumbnail,
      seller: {
        isCompany: listingData.seller.company,
        isSuperSeller: listingData.seller.superSeller,
        login: listingData.seller.login,
        positiveFeedbackPercent: listingData.seller.positiveFeedbackPercent,
        positiveFeedbackCount:
          listingData.seller.positiveFeedbackCount || "brak",
      },
      isSmart: listingData.freebox ? true : false,
      parameters: listingData.parameters || [],
      productState: listingData.parameters[0]?.values?.[0] || "Nowy",
      whenDelivery:
        listingData.badges?.logistics?.labels?.[0]?.labelParts?.[0]?.text ||
        listingData.shipping.summary?.labels[0]?.text,
      whenDeliveryColor:
        listingData.badges?.logistics?.labels?.[0]?.labelParts?.[0]?.style
          ?.themes?.light?.textColor || null,
      priceShipping:
        listingData.shipping.itemWithDelivery?.amount ||
        listingData.sellingMode.buyNow?.price?.amount,
      popularityLabel: listingData.sellingMode.popularityLabel,
      isBidding: listingData.sellingMode.auction ? true : false,
      price: listingData.sellingMode.buyNow?.price?.amount || "0.0",
      isBiddingBuyNow: false,
      biddingBuyNowPrice: 0,
      biddingTimeLeft: 0,
      endingTime: listingData.publication?.endingTime,
    };

    if (parsedProduct.isBidding) {
      parsedProduct.isBiddingBuyNow = listingData.sellingMode.buyNow
        ? true
        : false;
      parsedProduct.biddingBuyNowPrice =
        listingData.sellingMode.buyNow?.price?.amount || "0.0";
      parsedProduct.price = listingData.sellingMode.auction.price.amount;
      parsedProduct.biddingTimeLeft = daysTillEnd(
        listingData.publication.endingTime,
      );
    }
  } catch (err) {
    console.log(listingData);
    console.error("Error when parsing article: ", err);
    getDOM().progressBar.text.innerText = `Error when parsing article ${err.message}`;
  }
  //console.log({ parsedProduct });
  return parsedProduct;
};

const processProductPage = async (
  DOM,
  productLink,
  currentPage,
  productName,
) => {
  let opbox = await getOpboxJSON(productLink);
  if (!opbox.dataSources?.["listing-api-v3:allegro.listing:3.0"]) {
    console.error(`No listings from Opbox api for ${productLink}`);
    return;
  }
  const pagination =
    opbox.dataSources["listing-api-v3:allegro.listing:3.0"].metadata.Pageable;
  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
  for (let i = 1; i <= totalPages; i++) {
    DOM.progressBar.text.innerText = `[PAGE ${currentPage}] Restoring offers for ${productName} - nested level ${i}`;
    console.log(DOM.progressBar.text.innerText);
    if (i > 1) {
      const nextLink = new URL(decodeURIComponent(productLink));
      //console.log(nextLink);
      nextLink.searchParams.set("p", i);
      opbox = await getOpboxJSON(nextLink);
    }
    const nestedProducts = opbox.dataSources[
      "listing-api-v3:allegro.listing:3.0"
    ].data.elements.filter(
      el =>
        el.type != "label" &&
        el.type != "banner" &&
        el.type != "slotInterline" &&
        el.type != "carousel",
    );

    for (const nestedArticle of nestedProducts) {
      const parsedProduct = generateProduct(nestedArticle);
      if (!parsedProduct.url) continue;
      articleList.push(parsedProduct);
    }
  }
};

const processSearchResults = async (
  DOM,
  queryParams,
  nextLink,
  pageCount,
  currentPage,
) => {
  const progressSplit = Math.round((100 / pageCount) * 10) / 10;
  const opbox = await getOpboxJSON(nextLink);
  if (!opbox.dataSources?.["listing-web-bff:allegro.listing:3.0"]) {
    console.error(`No search results from Opbox api for ${nextLink}`);
    return;
  }
  const productsToProcess = opbox.dataSources[
    "listing-web-bff:allegro.listing:3.0"
  ].data.elements.filter(
    el =>
      el.type != "label" &&
      el.type != "banner" &&
      el.type != "slotInterline" &&
      el.type != "carousel",
  );
  //console.log(productsToProcess);

  // loop through each article
  let promiseArrayPrd = [];
  for (const [index, article] of productsToProcess.entries()) {
    // Loading Bar management
    const progressPercent =
      Math.round(
        (progressSplit * (currentPage - 1) +
          (progressSplit / productsToProcess.length) * index) *
          10,
      ) / 10;
    DOM.progressBar.bar.style.width = progressPercent + "%";
    DOM.progressBar.bar.innerText = progressPercent + "%";
    console.log(`Bar width: ${progressPercent}%`);
    DOM.progressBar.text.innerText = `[PAGE ${currentPage}] Restoring offers for ${article.name} - nested level 0`;
    console.log(DOM.progressBar.text.innerText);

    if (article.url.includes("https://allegrolokalnie.pl/")) {
      continue;
      //console.log(`LOCAL OFFER: article.url`);
    }

    // Early blacklist filtering - skip fetching nested pages for blacklisted titles
    if (earlyBlacklist && isBlacklistEnabled()) {
      const blacklist = getBlacklist();
      const nameLower = article.name.toLowerCase();
      if (blacklist.some(phrase => nameLower.includes(phrase.toLowerCase()))) {
        console.log(`Early blacklist: "${article.name}" skipped`);
        continue;
      }
    }

    const articleLink = article.productizationLinks?.productPage?.url;
    if (!articleLink) {
      // Article does not have "Porównaj x ofert" button
      //console.log(article);

      const parsedProduct = generateProduct(article);
      if (!parsedProduct.url) continue;

      // Add product to array
      articleList.push(parsedProduct);
      continue;
    }

    // Generate link for product page
    let fetchLink = `${articleLink}&${queryParams}`;
    if (!articleLink.includes("?")) {
      fetchLink = `${articleLink}?${queryParams}`;
    }

    if (fastMode) {
      // Experimental - 429/403
      /*let timeout = {
            max: 500,
            min: 250
        };

        if(currentPage % 2 == 0) {
            timeout.max = 500;
            timeout.min = 350;
        } else {
            timeout.max = 200;
            timeout.min = 100;
        }
        await new Promise(r => setTimeout(r, Math.random() * (timeout.max - timeout.min) + timeout.min));*/
      promiseArrayPrd.push(
        processProductPage(DOM, fetchLink, currentPage, article.name),
      );
      if (promiseArrayPrd.length == 20) {
        await Promise.all(promiseArrayPrd);
        promiseArrayPrd = [];
      }
    } else {
      // Get products using recursive fn
      await processProductPage(DOM, fetchLink, currentPage, article.name);
    }
  }
  if (fastMode) {
    await Promise.all(promiseArrayPrd);
  }
};

const restore = async () => {
  let DOM = getDOM();
  if (DOM.aiShit) DOM.aiShit.style.display = "none";
  // ProgressBar95
  DOM.progressBar.box.innerHTML =
    '<div id="myProgress" style="padding: 1vh;height: 100%;font-weight: 600;text-align: center;color: #ffffffde;font-family: Open Sans, sans-serif;font-size: .875rem;background-color: #222;display: none;"><div id="myBar" style="width: 0%; height: 2vh; background-color: #2ab9a380;">0%</div><div id="progressText" style="padding-top: 1vh;padding-left: 10px;padding-right: 10px;padding-bottom: 1vh;"></div></div>';
  DOM = getDOM();
  DOM.progressBar.div.style.display = "block";
  DOM.rozlaczButton.style.display = "none";

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
  mainURLQuery.delete("string");
  const queryParams = mainURLQuery.toString();
  const pageCount = parseInt(DOM.pagination.innerText);

  console.log(
    `Sorting set to ${mainURLQuery.get("order")} - Page count ${pageCount}`,
  );

  // Get all listings
  let promiseArray = [];
  for (let i = 1; i <= pageCount; i++) {
    DOM.progressBar.text.innerText = `Processing page ${i}`;
    console.log(DOM.progressBar.text.innerText);
    let nextLink = mainURL.href;
    if (i > 1) {
      nextLink = `${mainURL.href}&p=${i}`;
      if (!nextLink.includes("?")) {
        nextLink = `${mainURL.href}?p=${i}`;
      }
    }

    if (fastMode) {
      // Experimental - 429/403
      /*promiseArray.push(
      processSearchResults(DOM, queryParams, nextLink, pageCount, i)
    );*/
      // the same strategy as slow for now
      await processSearchResults(DOM, queryParams, nextLink, pageCount, i);
    } else {
      await processSearchResults(DOM, queryParams, nextLink, pageCount, i);
    }
  }
  if (fastMode) {
    // not working for now
    //await Promise.all(promiseArray);
  }

  // Fetch Allegro Lokalnie offers
  DOM.progressBar.text.innerText = `Fetching Allegro Lokalnie offers...`;
  console.log(DOM.progressBar.text.innerText);
  await new Promise(r => setTimeout(r, 1));
  const lokalnieURL = buildLokalnieURL(mainURL);
  console.log(`Lokalnie URL: ${lokalnieURL}`);
  if (lokalnieURL) {
    try {
      const lokalnieHTML = await gmFetch(lokalnieURL);
      const { items: lokalnieItems, pagesCount: lokalniePages } = parseLokalnieHTML(lokalnieHTML);
      console.log(`Allegro Lokalnie: found ${lokalnieItems.length} offers on page 1/${lokalniePages}`);
      for (const item of lokalnieItems) {
        articleList.push(generateLokalnieProduct(item));
      }
      for (let lp = 2; lp <= lokalniePages; lp++) {
        DOM.progressBar.text.innerText = `Fetching Allegro Lokalnie page ${lp}/${lokalniePages}...`;
        console.log(DOM.progressBar.text.innerText);
        const pageURL = new URL(lokalnieURL);
        pageURL.searchParams.set("page", lp);
        console.log(`Lokalnie URL page ${lp}: ${pageURL}`);
        const nextHTML = await gmFetch(pageURL.href);
        const { items: nextItems } = parseLokalnieHTML(nextHTML);
        console.log(`Allegro Lokalnie: found ${nextItems.length} offers on page ${lp}/${lokalniePages}`);
        for (const item of nextItems) {
          articleList.push(generateLokalnieProduct(item));
        }
      }
    } catch (err) {
      console.error("Failed to fetch Allegro Lokalnie", err);
    }
  }

  let toDeduplicate = [];

  // Clean results

  if (cleanOffers) {
    DOM.progressBar.text.innerText = `Cleaning up irrevelant offers...`;
    console.log(
      DOM.progressBar.text.innerText,
      `from ${articleList.length} articles`,
    );
    await new Promise(r => setTimeout(r, 1));
    const keywords = mainURL.searchParams
      .get("string")
      .split(" ")
      .map(e => e.toLowerCase());
    toDeduplicate = articleList.filter(item => {
      const itemNameLower = item.name.toLowerCase();
      for (const keyword of keywords) {
        if (!itemNameLower.includes(keyword)) {
          console.log(
            `Item: "${item.name}" does not include word ${keyword}, removing...`,
          );
          return false;
        }
      }
      return true;
    });
  } else {
    toDeduplicate = articleList;
  }
  console.log(toDeduplicate.length);
  // De duplicate by URL
  DOM.progressBar.text.innerText = `Removing duplicates...`;
  console.log(
    DOM.progressBar.text.innerText,
    `from ${articleList.length} articles`,
  );
  await new Promise(r => setTimeout(r, 1));
  //let uniqueProducts = [];
  let uniqueProducts = toDeduplicate.filter(
    (value, index, self) =>
      index ===
      self.findIndex(t =>
        t.offerId && value.offerId
          ? t.offerId === value.offerId
          : t.url === value.url,
      ),
  );

  // Blacklist filtering
  const blacklist = getBlacklist();
  if (blacklist.length > 0 && isBlacklistEnabled()) {
    DOM.progressBar.text.innerText = `Filtering blacklisted phrases (${blacklist.length})...`;
    console.log(DOM.progressBar.text.innerText);
    await new Promise(r => setTimeout(r, 1));
    const beforeCount = uniqueProducts.length;
    uniqueProducts = uniqueProducts.filter(item => {
      const titleLower = item.name.toLowerCase();
      for (const phrase of blacklist) {
        if (titleLower.includes(phrase.toLowerCase())) {
          console.log(`Blacklist: "${item.name}" contains "${phrase}", removing...`);
          return false;
        }
      }
      return true;
    });
    console.log(`Blacklist removed ${beforeCount - uniqueProducts.length} offers`);
  }

  // Sorting
  DOM.progressBar.text.innerText = `Sorting by ${
    mainURL.searchParams.get("order")
      ? mainURL.searchParams.get("order")
      : "lowest price"
  }...`;
  console.log(DOM.progressBar.text.innerText);
  await new Promise(r => setTimeout(r, 1));

  // sort price asc for now
  switch (mainURL.searchParams.get("order")) {
    case "pd":
      uniqueProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      break;
    default:
      uniqueProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      break;
  }

  let everyArticle = "";
  for (const article of uniqueProducts) {
    everyArticle += genListing(article);
  }
  //console.log(everyArticle);
  // sort and push all articles to main page

  DOM.mainArticles.innerHTML = everyArticle;
  const paginationUrl = window.location.href.replace(/&p=\d+/, "");
  document.querySelector('[data-role="paginationBottom"]').innerHTML =
    `<div class="m9vn_d2" data-role="paginationBottom"><div data-box-name="pagination bottom"><div class="mpof_ki m7f5_6m m7f5_sf_s" data-param="p" data-one-based="true"><div class="mpof_ki munh_16 m3h2_16 mt1t_fz munh_56_s"><div class="mpof_ki m389_6m" role="navigation" aria-label="paginacja"><a href="${paginationUrl}" data-page="1" class="l8c4v l195b mh36_8 mvrt_8 l1tbk _6d89c_N3YpX l97x9" aria-current="page">1</a><div class="munh_8 m3h2_8 msa3_z4 mgmw_wo _1h7wt">z</div><span class="_1h7wt mgmw_wo mh36_8 mvrt_8">1</span></div></div></div></div></div>`;

  DOM.progressBar.bar.style.width = "100%";
  DOM.progressBar.bar.innerText = "100%";
  DOM.progressBar.text.innerText = `Finished! Total offers = ${uniqueProducts.length}`;
  console.log(DOM.progressBar.text.innerText);
};

const zNode = document.createElement("div");
zNode.className = "mpof_5r mpof_vs_s mp4t_8 m3h2_16 mse2_40";
zNode.style.cssText = "display:flex;gap:8px;align-items:center;";
zNode.innerHTML =
  '<button id="blacklistButton" class="mgn2_14 mp0t_0a m9qz_yp mp7g_oh mse2_40 mqu1_40 mtsp_ib mli8_k4 mp4t_0 m3h2_0 mryx_0 munh_0 msbw_rf mldj_rf mtag_rf mm2b_rf msa3_z4 mqen_m6 meqh_en m0qj_5r msts_n7 mh36_16 mvrt_16 mg9e_0 mj7a_0 mjir_sv m2ha_2 m8qd_vz mjt1_n2 b1kk0 mgmw_u5g mrmn_qo mrhf_u8 m31c_kb m0ux_fp b1g6n mx7m_1 m911_co mefy_co mnyp_co mdwl_co mlkp_6x mqvr_g3 _1405b_ZtYZA" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="3" y1="1" x2="21" y2="23" stroke-width="2.5"/></svg></button>' +
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
          "Giving up after 34 attempts. Could not find: " + readySelector,
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
  document.getElementById("blacklistButton").addEventListener("click", openBlacklistPopup, false);
});

const genListing = listingData => {
  if (!listingData || !listingData.seller) return;
  const {
    url,
    name,
    mainImg,
    seller,
    isSmart,
    isLokalnie,
    parameters,
    productState,
    whenDelivery,
    whenDeliveryColor,
    priceShipping,
    popularityLabel,
    isBidding,
    price,
    isBiddingBuyNow,
    biddingBuyNowPrice,
    biddingTimeLeft,
    endingTime,
    offerType,
  } = listingData;
  const {
    isCompany,
    isSuperSeller,
    login,
    positiveFeedbackPercent,
    positiveFeedbackCount,
  } = seller;
  return `<li class="mb54_5r mg9e_0 mvrt_0 mj7a_0 mh36_0 mp4t_0 m3h2_0 mryx_0 munh_0 mh85_56 mr3m_0 mli2_0 m7er_k4"><article class="mx7m_1 mnyp_co mlkp_ag mjyo_6x mse2_k4 _1e32a_kdIMd">
  <div
    class="mpof_ki mp7g_oh mh36_16 mh36_24_l mvrt_16 mvrt_24_l mg9e_8 mj7a_8 m7er_k4 mjyo_6x mgmw_3z m0ux_vh mp5q_jr m31c_kb _1e32a_R3NBG"
  >
    <div class="mpof_ki myre_zn m389_6m">
      <div class="mpof_ki myre_zn m389_6m mse2_56 _1e32a_aUcl-">
        <div class="mpof_ki mp7g_oh">
          <div aria-hidden="true">
            <a
              href="${url}"
              rel="nofollow"
              tabindex="-1"
              class="msts_9u mg9e_0 mvrt_0 mj7a_0 mh36_0 mpof_ki m389_6m mx4z_6m m7f5_6m _1e32a_JQ-zn _1e32a_pBYpQ"
              ><img
                alt="${name}"
                loading="lazy"
                src="${mainImg}"
            /></a>
          </div>
        </div>
      </div>
    </div>
    <div class="mh36_8 mjyo_6x _1e32a_2Cd7P" style="width: 100%;">
      <div class="_1e32a_qDdj-">
        ${
          isLokalnie
            ? '<div class="mzmg_f9 _1e32a_v6GqI"><div><div class="mzmg_f9"><p class="mgmw_3z mpof_z0 mgn2_12 mp4t_0 mryx_0">Prywatny sprzedawca</p></div></div></div>'
            : isCompany
              ? '<div class="mzmg_f9 _1e32a_v6GqI"><div><div class="mzmg_f9"><p class="mgmw_3z mpof_z0 mgn2_12 mp4t_0 mryx_0">Firma</p></div></div></div>'
              : ""
        }
        <div class="_1e32a_meWPT _1e32a_WrGF-">
        ${
          isLokalnie && offerType
            ? '<div class="mpof_ki mwdn_1 mgn2_12 m389_6m"><p class="mpof_uk mryx_0 mp4t_0">' + offerType.toUpperCase() + '</p></div>' +
              (isBidding && biddingTimeLeft != null
                ? '<p class="mg9e_0 mvrt_0 mj7a_0 mh36_0 mpof_uk mgn2_12 mp4t_0 m3h2_0 mryx_0 munh_0 _1e32a_LO84T">' + biddingTimeLeft + (biddingTimeLeft === 1 ? " dzień</p>" : " dni</p>")
                : '')
            : isBidding
              ? '<div class="mpof_ki mwdn_1 mgn2_12 m389_6m"><p class="mpof_uk mryx_0 mp4t_0">LICYTACJA</p></div><p class="mg9e_0 mvrt_0 mj7a_0 mh36_0 mpof_uk mgn2_12 mp4t_0 m3h2_0 mryx_0 munh_0 _1e32a_LO84T">' +
                biddingTimeLeft +
                (biddingTimeLeft === 1 ? " dzień</p>" : " dni</p>")
              : ""
        }
          <h2 class="m9qz_yp mqu1_16 mp4t_0 m3h2_0 mryx_0 munh_0">
            <a
              href="${url}"
              class="mgn2_14 mp0t_0a mgmw_wo mli8_k4 mqen_m6 l1o8h mj9z_5r l5s4b mpof_z0 mqu1_16 _1e32a_zIS-q"
              >${name}</a
            >
          </h2>
          ${
            isLokalnie
              ? `<div class="mpof_ki mwdn_1 m389_6m m389_a6_m">
            <p class="mgn2_12 mp4t_0 m3h2_0 mryx_0 munh_0"><span class="mgmw_wo">${login}</span></p>
          </div>`
              : `<div class="mpof_ki mwdn_1 m389_6m m389_a6_m">
            ${
              isSuperSeller
                ? '<p class="mpof_ki m389_6m msa3_z4 mgn2_12 mryx_0 mp4t_0">od <span class="mpof_ki mp7g_oh msa3_ae _1e32a_cwPPZ"><span class="mp7g_oh mpof_ki"><button aria-label="Super Sprzedawca zobacz szczegóły" aria-expanded="false" class="mgn2_12 mp0t_0a mqu1_g3 mli8_k4 mgmw_3z mx7m_0 mp4t_0 m3h2_0 mryx_0 munh_0 mg9e_0 mvrt_0 mj7a_0 mh36_0 mzmg_7i msts_n7"><picture><source media="(prefers-color-scheme: dark)" srcset="https://a.allegroimg.com/original/34e1bf/82d1aebc4a9db9bef96345fd1e99/dark-information-common-super-seller-236577cfa7"><img src="https://a.allegroimg.com/original/34dd95/40d81c26458ca692070c8ed7eae5/information-common-super-seller-236577cfa7" alt="Super Sprzedawcy" class="m7er_56 _1e32a_97Mma mpof_ki _1e32a_Do2eA"></picture></button><span class="mpof_5r mpof_3f_l mpof_3f"><span class="mjyo_6x mp7g_f6 mjb5_w6 msbw_2 mldj_2 mtag_2 mm2b_2 mgmw_wo msts_n6 m7er_k4 ti1554 ti1nw9 mpof_5r ti7yw2"></span></span></span></span> Super Sprzedawcy</p><div class="mh36_4 mvrt_4 mpof_z0">|</div>'
                : '<div class="m3h2_4 mgn2_12">od</div>'
            }
            <div class="m3h2_8">
              <p class="mgn2_12 mp4t_0 m3h2_0 mryx_0 munh_0">
                <span class="mgmw_wo">${login}</span>
              </p>
            </div>
            ${
              positiveFeedbackPercent
                ? '<div class="m3h2_8"><p class="mgn2_12 mp4t_0 m3h2_0 mryx_0 munh_0">Poleca sprzedającego: <span class="mgmw_wo">' +
                  positiveFeedbackPercent +
                  "%</span></p></div>"
                : ""
            }
            <p class="mgn2_12 mp4t_0 m3h2_0 mryx_0 munh_0">${positiveFeedbackCount} ocen</p>
          </div>`
          }
          <div>
            <dl class="mgn2_12 mp4t_0 m3h2_0 mryx_0 munh_0 mjru_k4 meqh_en msa3_ae m6ax_n4 mqu1_g3 _1e32a_hUR4a _1e32a_LsWHh">
              ${parameters.map(p => `<dt class="mpof_uk mp4t_0 m3h2_0 mryx_0 munh_0 mgmw_3z _1e32a_bkpJC">${p.name}</dt> <dd class="mpof_uk mp4t_0 m3h2_0 mryx_0 munh_0 mgmw_wo mvrt_8">${p.values.join(", ")}</dd>`).join("")}
            </dl>
          </div>
          <div class="mj7a_4 mg9e_4 _1e32a_IAwmj">
            <div class="mpof_ki m389_0a mwdn_1 _1e32a_ZDCQ-">
              <div class="msa3_z4 m3h2_8">
                <p aria-label="${price}&nbsp;zł aktualna cena" tabindex="0" class="mp4t_0 m3h2_0 mryx_0 munh_0 mpof_uk">
                  <span
                    class="mli8_k4 msa3_z4 mqu1_1 mp0t_ji m9qz_yo mgmw_qw mgn2_27 mgn2_30_s"
                    >${price.split(".")[0]},<span class="mgn2_19 mgn2_21_s m9qz_yq">${price.split(".")[1] || "00"}</span
                    >&nbsp;<span class="mgn2_19 mgn2_21_s m9qz_yq"
                      >zł</span
                    ></span
                  >
                </p>
              </div>
  ${
    isSmart
      ? '<span class="mpof_92 mp7g_oh"><span class="mp7g_oh"><button aria-label="Allegro Smart! zobacz szczegóły" aria-expanded="false" class="mgn2_12 mp0t_0a mqu1_g3 mli8_k4 mgmw_3z mx7m_0 mp4t_0 m3h2_0 mryx_0 munh_0 mg9e_0 mvrt_0 mj7a_0 mh36_0 mzmg_7i msts_n7"><span class="mgn2_12 mpof_z0 mp4t_0 m3h2_0 mryx_0 munh_0"><span class="mpof_uk mryx_0 mp4t_0 _1e32a_sjD6n"><picture><source media="(prefers-color-scheme: dark)" srcset="https://a.allegroimg.com/original/34611c/c433ab0c4bf9a76e4f1f15b5dd1f/dark-brand-subbrand-smart-2ecf1fa38c.svg"><img src="https://a.allegroimg.com/original/343b4d/ed3f5c04412ab7bd70dd0a34f0cd/brand-subbrand-smart-d8bfa93f10.svg" alt="Smart!" class="mupj_ka mpof_vs _1e32a_joQWU"></picture></span></span></button><span class="mpof_5r mpof_3f_l"><span class="mjyo_6x mp7g_f6 mjb5_w6 msbw_2 mldj_2 mtag_2 mm2b_2 mgmw_wo msts_n6 m7er_k4 ti1554 ti1nw9 mpof_5r ti7yw2"></span></span></span></span>'
      : ""
  }
            </div>
          </div>
          ${
            isBiddingBuyNow
              ? '<p class="mh36_0 mvrt_0 mp4t_0 m3h2_0 mryx_0 munh_0 mgn2_12 mqu1_g3 mpof_z0 mgmw_qw"><span class="msa3_z4 m9qz_yq m3h2_4">' +
                biddingBuyNowPrice +
                '&nbsp;zł</span><span class="m9qz_yp">kup teraz</span></p>'
              : ""
          }
          ${
            priceShipping
              ? `<p class="mqu1_g3 mgn2_12 mp4t_0 m3h2_0 mryx_0 munh_0">
            ${priceShipping}&nbsp;zł z dostawą
          </p>`
              : ""
          }
          ${
            whenDelivery
              ? `<span class="mgn2_12 mpof_z0 mp4t_0 m3h2_0 mryx_0 munh_0">
            <span class="mpof_uk mryx_0 mp4t_0 _1e32a_sjD6n">
              <span
                style="
                  color: ${whenDeliveryColor || "var(--m-color-text-secondary, #656565)"};
                  font-weight: bold;
                  text-decoration: none;
                "
                >${whenDelivery}</span
              >
            </span>
          </span>`
              : ""
          }
          ${isLokalnie ? '<span class="mqu1_1"><picture><source media="(prefers-color-scheme: dark)" srcset="https://a.allegroimg.com/original/34cfc8/10ec4f874e53943e4874ec35cf46/dark-brand-subbrand-allegro-lokalnie-9ec666e2c7"><img src="https://a.allegroimg.com/original/34a54b/cf0e78534a3db96bc835307f3006/brand-subbrand-allegro-lokalnie-9d019981af" alt="Allegro Lokalnie"></picture></span>' : ""}
        </div>
        <div class="mg9e_4 mj7a_8 mpof_ki myre_zn myre_8v_l m389_a6 m389_6m_l m7f5_0a mp4t_0 mp4t_16_l _1e32a_orZUV">
          ${popularityLabel ? '<div class="mpof_vs mgn2_12 mqu1_1 mgmw_3z"><span>' + popularityLabel + "</span></div>" : ""}
          <div class="mpof_ki m389_6m mp4t_16 mp4t_0_l">
            ${
              isLokalnie
                ? '<a href="' +
                  url +
                  '" target="_blank" rel="noreferrer" class="mgn2_16 mp0t_0a m9qz_yq mp7g_oh mtsp_ib mli8_k4 mp4t_0 mryx_0 m911_5r mefy_5r mnyp_5r mdwl_5r msbw_rf mldj_rf mtag_rf mm2b_rf mqvr_2 mqen_m6 meqh_en m0qj_5r msts_n7 mh36_16 mvrt_16 mg9e_8 mj7a_8 mjir_sv m2ha_2 m8qd_vz mjt1_n2 m09p_40 b89vd mgmw_u5g mrmn_qo mrhf_u8 m31c_kb m0ux_fp btnch b8x7t munh_0 munh_16_l m3h2_0 m3h2_8_m" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;"><span>Zobacz ogłoszenie</span></a>'
                : !isBidding || isBiddingBuyNow
                  ? '<button data-role-type="add-to-cart-button" class="mgn2_16 mp0t_0a m9qz_yq mp7g_oh mtsp_ib mli8_k4 mp4t_0 mryx_0 m911_5r mefy_5r mnyp_5r mdwl_5r msbw_rf mldj_rf mtag_rf mm2b_rf mqvr_2 mqen_m6 meqh_en m0qj_5r msts_n7 mh36_16 mvrt_16 mg9e_8 mj7a_8 mjir_sv m2ha_2 m8qd_vz mjt1_n2 m09p_40 b89vd mgmw_u5g mrmn_qo mrhf_u8 m31c_kb m0ux_fp btnch b8x7t munh_0 munh_16_l m3h2_0 m3h2_8_m"><span>dodaj do koszyka</span></button>'
                  : ""
            }<button
              title="Dodaj do ulubionych"
              aria-label="Dodaj do ulubionych ${name}"
              class="m7er_40 mp0t_0a m9qz_yq mp7g_oh mtsp_ib mli8_k4 mp4t_0 m3h2_0 mryx_0 munh_0 m911_5r mefy_5r mnyp_5r mdwl_5r msbw_rf mldj_rf mtag_rf mm2b_rf mqvr_2 mqen_m6 meqh_en m0qj_5r msts_n7 mjir_sv m2ha_2 m8qd_vz mjt1_n2 m09p_40 b89vd mqu1_1 mgn2_13 mg9e_0 mvrt_0 mj7a_0 mh36_0 mse2_40 mgmw_u5g mrmn_qo mrhf_u8 m31c_kb m0ux_fp b2mt3"
            >
              <picture
                ><source
                  media="(prefers-color-scheme: dark)"
                  srcset="
                    https://a.allegroimg.com/original/34da48/7daf74174cbab949125433930aba/dark-action-common-heart-d21a0d364b
                  " />
                <img
                  src="https://a.allegroimg.com/original/342704/5df50ccf415c9dc190264897d100/action-common-heart-322d64f02b"
                  alt=""
                  aria-hidden="true"
                  class="mjyo_6x meqh_en msa3_z4 mhd5_0m i29rk mse2_40 mg9e_4 mvrt_4 mj7a_4 mh36_4 m0s5_ki"
              /></picture>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</article></li>`;
};
