const CACHE_NAME = "roadtrip-shell-v2.2";

const APP_SHELL = [
  "./",
  "./index-v2.html",
  "./manifest.json",
  "./performance-patch.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // API y clima: red primero; caché si no hay conexión.
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("script.googleusercontent.com") ||
    url.hostname.includes("api.open-meteo.com")
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request)
      )
    );

    return;
  }

  // HTML: buscar primero la versión nueva.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put("./index-v2.html", copy);
          });

          return response;
        })
        .catch(() =>
          caches.match("./index-v2.html")
        )
    );

    return;
  }

  // Imágenes: reutilizar las ya descargadas.
  if (event.request.destination === "image") {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        return fetch(event.request).then(response => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, copy).catch(() => {});
            });
          }

          return response;
        });
      })
    );

    return;
  }

  // JS, manifest y otros archivos.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkRequest = fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copy).catch(() => {});
          });
        }

        return response;
      });

      return cached || networkRequest;
    })
  );
});
