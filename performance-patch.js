(() => {
  "use strict";

  const VERSION = "roadtrip-perf-3.1";
  const DATA_SAVER_KEY = "roadtrip_data_saver";

  // Elimina el viejo caché de 12 horas de Apps Script/Open-Meteo.
  try {
    const oldPrefixes = [
      "roadtrip-perf-2.1::",
      "roadtrip-perf-2.2::",
      "roadtrip-perf-2.3::"
    ];

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && oldPrefixes.some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) {}

  function dataSaverEnabled() {
    return localStorage.getItem(DATA_SAVER_KEY) !== "0";
  }

  function isHeroImage(img) {
    return img.classList.contains("hero-image") ||
      img.classList.contains("detail-image");
  }

  function prepareImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.roadtripPrepared === VERSION) return;

    img.dataset.roadtripPrepared = VERSION;
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    if (isHeroImage(img)) {
      img.loading = "eager";
      img.fetchPriority = "high";
      return;
    }

    img.loading = "lazy";
    img.fetchPriority = "low";

    if (dataSaverEnabled() && img.src) {
      img.dataset.originalSrc = img.src;
      img.removeAttribute("src");
      img.style.background = "linear-gradient(135deg,#eaf1f3,#d7e3e8)";
    }
  }

  function prepareExistingImages(root = document) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("img").forEach(prepareImage);
  }

  function restoreVisibleImages() {
    document.querySelectorAll("img[data-original-src]").forEach(img => {
      const rect = img.getBoundingClientRect();
      const nearViewport =
        rect.top < window.innerHeight + 300 &&
        rect.bottom > -300;

      if (nearViewport) {
        img.src = img.dataset.originalSrc;
        delete img.dataset.originalSrc;
      }
    });
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches("img")) prepareImage(node);
        prepareExistingImages(node);
      }
    }
    restoreVisibleImages();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  let scrollTimer = null;
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(restoreVisibleImages, 80);
  }, { passive: true });

  window.roadtripSetDataSaver = enabled => {
    localStorage.setItem(DATA_SAVER_KEY, enabled ? "1" : "0");

    if (!enabled) {
      document.querySelectorAll("img[data-original-src]").forEach(img => {
        img.src = img.dataset.originalSrc;
        delete img.dataset.originalSrc;
      });
    } else {
      document.querySelectorAll("img").forEach(img => {
        delete img.dataset.roadtripPrepared;
      });
      prepareExistingImages();
      restoreVisibleImages();
    }

    updateSaverButton();
  };

  function updateSaverButton() {
    const button = document.getElementById("roadtripDataSaver");
    if (!button) return;

    const enabled = dataSaverEnabled();
    button.textContent = enabled ? "⚡ Ahorro activo" : "🖼️ Fotos activas";
    button.setAttribute("aria-pressed", String(enabled));
  }

  function installSaverButton() {
    if (document.getElementById("roadtripDataSaver")) return;

    const button = document.createElement("button");
    button.id = "roadtripDataSaver";
    button.type = "button";
    button.style.cssText = [
      "position:fixed",
      "z-index:80",
      "right:14px",
      "bottom:calc(82px + env(safe-area-inset-bottom))",
      "padding:10px 13px",
      "border:1px solid rgba(32,35,33,.12)",
      "border-radius:18px",
      "background:rgba(255,255,255,.94)",
      "color:#202321",
      "box-shadow:0 8px 24px rgba(38,45,41,.14)",
      "font:700 12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
    ].join(";");

    button.addEventListener("click", () => {
      window.roadtripSetDataSaver(!dataSaverEnabled());
    });

    document.body.appendChild(button);
    updateSaverButton();
  }

  window.addEventListener("load", async () => {
    prepareExistingImages();
    restoreVisibleImages();

    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          "./sw.js?v=31",
          { updateViaCache: "none" }
        );
        registration.update().catch(() => {});
      } catch (_) {}
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installSaverButton);
  } else {
    installSaverButton();
  }
})();
