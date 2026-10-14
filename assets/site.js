// Language switch (one URL per page, as the App Store needs) and cookieless page counts.
(function () {
  var supported = ["en", "es", "pt"];
  var params = new URLSearchParams(location.search);

  function pick() {
    var forced = (params.get("lang") || "").slice(0, 2);
    if (supported.indexOf(forced) >= 0) return forced;
    try {
      var saved = localStorage.getItem("lang");
      if (supported.indexOf(saved) >= 0) return saved;
    } catch (e) {}
    var langs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < langs.length; i++) {
      var code = String(langs[i]).slice(0, 2).toLowerCase();
      if (supported.indexOf(code) >= 0) return code;
    }
    return "en";
  }

  function apply(lang) {
    var root = document.documentElement;
    supported.forEach(function (l) { root.classList.remove("l-" + l); });
    root.classList.add("l-" + lang);
    root.lang = lang === "pt" ? "pt-BR" : lang;
    var title = document.querySelector('meta[name="title-' + lang + '"]');
    if (title) document.title = title.content;
    document.querySelectorAll(".langs button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
    // Localised App Store badge.
    document.querySelectorAll("img[data-badge]").forEach(function (img) {
      img.src = img.dataset["badge" + lang.toUpperCase()] || img.src;
    });
  }

  var lang = pick();
  apply(lang);
  document.addEventListener("DOMContentLoaded", function () {
    apply(lang);
    document.querySelectorAll(".langs button").forEach(function (b) {
      b.addEventListener("click", function () {
        lang = b.dataset.lang;
        try { localStorage.setItem("lang", lang); } catch (e) {}
        apply(lang);
      });
    });
    document.querySelectorAll("[data-track]").forEach(function (el) {
      el.addEventListener("click", function () { track(el.dataset.track); });
    });
    if (document.querySelector(".qr")) document.querySelector(".qr").classList.add("show");
    track("web_page_viewed");
  });

  // Anonymous counts to PostHog (EU), the same contract as the app: no cookies, no stored id,
  // no person profile, no GeoIP; the project discards IPs. Only the page, the campaign and the language.
  function track(event, extra) {
    var cfg = window.SITE || {};
    if (!cfg.posthogKey || location.hostname === "localhost" || location.protocol === "file:") return;
    var props = {
      $process_person_profile: false,
      $geoip_disable: true,
      page: cfg.page || location.pathname,
      ref: (params.get("ref") || "").slice(0, 40),
      lang: lang,
      ios: /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    };
    for (var k in extra || {}) props[k] = extra[k];
    var body = JSON.stringify({
      api_key: cfg.posthogKey,
      event: event,
      distinct_id: "web-" + Math.random().toString(36).slice(2),
      properties: props
    });
    var url = cfg.posthogHost + "/i/v0/e/";
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
    else fetch(url, { method: "POST", body: body, keepalive: true });
  }
  window.trackEvent = track;
})();
