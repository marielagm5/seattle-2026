const CACHE_NAME = "roadtrip-shell-v2.3";

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

  // Apps Script y clima: red primero.
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("script.googleusercontent.com") ||
    url.hostname.includes("api.open-meteo.com")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );

    return;
  }

  // Páginas HTML: buscar siempre la versión más reciente.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put("./index-v2.html", copy).catch(() => {});
            });
          }

          return response;
        })
        .catch(() => caches.match("./index-v2.html"))
    );

    return;
  }

  // JS, manifest e imágenes: caché primero, red como respaldo.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, copy).catch(() => {});
            });
          }

          return response;
        })
        .catch(() => {
          return new Response("", {
            status: 503,
            statusText: "Sin conexión"
          });
        });
    })
  );
});
