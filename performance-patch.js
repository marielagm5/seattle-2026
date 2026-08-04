(() => {
  "use strict";

  const VERSION = "roadtrip-perf-2.1";
  const API_TTL = 12 * 60 * 60 * 1000;
  const WEATHER_TTL = 30 * 60 * 1000;
  const DATA_SAVER_KEY = "roadtrip_data_saver";

  const originalFetch = window.fetch.bind(window);

  function isApiRequest(url) {
    return (
      url.includes("script.google.com/macros/") &&
      url.includes("format=json")
    );
  }

  function isWeatherRequest(url) {
    return url.includes("api.open-meteo.com/v1/forecast");
  }

  function ttlFor(url) {
    return isWeatherRequest(url)
      ? WEATHER_TTL
      : API_TTL;
  }

  function storageKey(url) {
    const clean = url
      .replace(/([?&])t=\d+/g, "$1")
      .replace(/[?&]$/, "");

    return VERSION + "::" + clean;
  }

  function readStored(url) {
    try {
      const raw =
        localStorage.getItem(storageKey(url));

      if (!raw) {
        return null;
      }

      const entry =
        JSON.parse(raw);

      if (
        !entry ||
        Date.now() - entry.savedAt > ttlFor(url)
      ) {
        return null;
      }

      return entry;
    } catch {
      return null;
    }
  }

  function writeStored(
    url,
    responseText,
    contentType
  ) {
    try {
      localStorage.setItem(
        storageKey(url),
        JSON.stringify({
          savedAt: Date.now(),
          body: responseText,
          contentType:
            contentType ||
            "application/json"
        })
      );
    } catch {
      // Si Safari bloquea localStorage,
      // la app sigue funcionando normalmente.
    }
  }

  function responseFromEntry(entry) {
    return new Response(
      entry.body,
      {
        status: 200,
        headers: {
          "Content-Type":
            entry.contentType ||
            "application/json",

          "X-Roadtrip-Cache":
            "localStorage"
        }
      }
    );
  }

  window.fetch =
    async function patchedFetch(
      input,
      init = {}
    ) {
      const url =
        typeof input === "string"
          ? input
          : input.url;

      const cacheable =
        isApiRequest(url) ||
        isWeatherRequest(url);

      if (!cacheable) {
        return originalFetch(
          input,
          init
        );
      }

      const forceRefresh =
        /[?&]t=\d+/.test(url) ||
        init.cache === "reload" ||
        init.cache === "no-store";

      if (!forceRefresh) {
        const cached =
          readStored(url);

        if (cached) {
          return responseFromEntry(
            cached
          );
        }
      }

      try {
        const response =
          await originalFetch(
            input,
            init
          );

        if (response.ok) {
          const clone =
            response.clone();

          const text =
            await clone.text();

          writeStored(
            url,
            text,
            clone.headers.get(
              "content-type"
            )
          );
        }

        return response;
      } catch (error) {
        let stale = null;

        try {
          stale =
            JSON.parse(
              localStorage.getItem(
                storageKey(url)
              )
            );
        } catch {
          stale = null;
        }

        if (
          stale &&
          stale.body
        ) {
          return responseFromEntry(
            stale
          );
        }

        throw error;
      }
    };

  function dataSaverEnabled() {
    return (
      localStorage.getItem(
        DATA_SAVER_KEY
      ) !== "0"
    );
  }

  function isHeroImage(img) {
    return (
      img.classList.contains(
        "hero-image"
      ) ||
      img.classList.contains(
        "detail-image"
      )
    );
  }

  function prepareImage(img) {
    if (
      !(
        img instanceof
        HTMLImageElement
      )
    ) {
      return;
    }

    img.decoding = "async";

    img.referrerPolicy =
      "no-referrer";

    if (isHeroImage(img)) {
      img.loading = "eager";
      img.fetchPriority = "high";
      return;
    }

    img.loading = "lazy";
    img.fetchPriority = "low";

    if (
      dataSaverEnabled() &&
      img.src
    ) {
      img.dataset.originalSrc =
        img.src;

      img.removeAttribute(
        "src"
      );

      img.style.background =
        "linear-gradient(135deg,#eaf1f3,#d7e3e8)";
    }
  }

  function prepareExistingImages(
    root = document
  ) {
    root
      .querySelectorAll("img")
      .forEach(prepareImage);
  }

  const imageObserver =
    new MutationObserver(
      mutations => {
        for (
          const mutation of
          mutations
        ) {
          for (
            const node of
            mutation.addedNodes
          ) {
            if (
              !(
                node instanceof
                Element
              )
            ) {
              continue;
            }

            if (
              node.matches("img")
            ) {
              prepareImage(node);
            }

            prepareExistingImages(
              node
            );
          }
        }
      }
    );

  imageObserver.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  function restoreVisibleImages() {
    document
      .querySelectorAll(
        "img[data-original-src]"
      )
      .forEach(img => {
        const rect =
          img.getBoundingClientRect();

        const nearViewport =
          rect.top <
            window.innerHeight +
              250 &&
          rect.bottom > -250;

        if (nearViewport) {
          img.src =
            img.dataset.originalSrc;

          delete img.dataset.originalSrc;
        }
      });
  }

  let scrollTimer = null;

  window.addEventListener(
    "scroll",
    () => {
      clearTimeout(
        scrollTimer
      );

      scrollTimer =
        setTimeout(
          restoreVisibleImages,
          80
        );
    },
    {
      passive: true
    }
  );

  window.addEventListener(
    "load",
    () => {
      prepareExistingImages();
      restoreVisibleImages();

      if (
        "serviceWorker" in
        navigator
      ) {
        navigator
          .serviceWorker
          .register("./sw.js")
          .catch(() => {});
      }
    }
  );

  window.roadtripSetDataSaver =
    enabled => {
      localStorage.setItem(
        DATA_SAVER_KEY,
        enabled
          ? "1"
          : "0"
      );

      if (!enabled) {
        document
          .querySelectorAll(
            "img[data-original-src]"
          )
          .forEach(img => {
            img.src =
              img.dataset.originalSrc;

            delete img.dataset.originalSrc;
          });
      } else {
        prepareExistingImages();
      }

      updateSaverButton();
    };

  function updateSaverButton() {
    const button =
      document.getElementById(
        "roadtripDataSaver"
      );

    if (!button) {
      return;
    }

    const enabled =
      dataSaverEnabled();

    button.textContent =
      enabled
        ? "⚡ Ahorro activo"
        : "🖼️ Fotos activas";

    button.setAttribute(
      "aria-pressed",
      String(enabled)
    );
  }

  function installSaverButton() {
    if (
      document.getElementById(
        "roadtripDataSaver"
      )
    ) {
      return;
    }

    const button =
      document.createElement(
        "button"
      );

    button.id =
      "roadtripDataSaver";

    button.type =
      "button";

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

    button.addEventListener(
      "click",
      () => {
        window
          .roadtripSetDataSaver(
            !dataSaverEnabled()
          );
      }
    );

    document.body.appendChild(
      button
    );

    updateSaverButton();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      installSaverButton
    );
  } else {
    installSaverButton();
  }
})();
