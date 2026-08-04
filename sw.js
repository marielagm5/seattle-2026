const CACHE_NAME = "roadtrip-shell-v2.1";

const APP_SHELL = [
  "./",
  "./index-v2.html",
  "./manifest.json",
  "./performance-patch.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // API y clima: siempre intenta traer información nueva
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("script.googleusercontent.com") ||
    url.hostname.includes("api.open-meteo.com")
  ) {

    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );

    return;
  }

  // Imágenes
  if (event.request.destination === "image") {

    event.respondWith(

      caches.match(event.request).then(cache => {

        if (cache) return cache;

        return fetch(event.request).then(response => {

          if (response.ok) {

            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(c =>
                c.put(event.request, copy)
              );

          }

          return response;

        });

      })

    );

    return;

  }

  // HTML, CSS y JS
  event.respondWith(

    caches.match(event.request).then(cache => {

      return (
        cache ||
        fetch(event.request)
      );

    })

  );

});
