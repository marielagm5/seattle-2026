const CACHE_NAME = 'roadtrip-v1';
const DATA_CACHE = 'roadtrip-data-v1';

const STATIC_FILES = [
  '/seattle-2026/',
  '/seattle-2026/index.html',
  '/seattle-2026/manifest.json'
];

// Instalar: cachear archivos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: estrategia mixta
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Datos de la API: Network first, fallback a cache
  if (url.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(DATA_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Fuentes de Google Fonts: cache first
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Imágenes de Unsplash: cache first, sin error si falla
  if (url.includes('unsplash.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
            return response;
          })
          .catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // Todo lo demás: cache first, luego red
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
