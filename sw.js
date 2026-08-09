const CACHE_NAME = "roadtrip-v3.1";
const OFFLINE_PREFIX = "__roadtrip_offline__";

const APP_SHELL = [
  "./index-v2.html",
  "./manifest.json",
  "./performance-patch.js?v=31",
  "./shopping-hours.js?v=24"
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
    caches.keys()
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

function isAppsScript(url) {
  return (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("script.googleusercontent.com")
  );
}

function isWeather(url) {
  return url.hostname.includes("api.open-meteo.com");
}

function apiBackupKey(url) {
  const day = url.searchParams.get("day") || "unknown";
  return new Request(
    new URL(`${OFFLINE_PREFIX}/itinerary-day-${day}.json`, self.registration.scope)
  );
}

function weatherBackupKey(url) {
  const lat = url.searchParams.get("latitude") || "0";
  const lon = url.searchParams.get("longitude") || "0";
  return new Request(
    new URL(
      `${OFFLINE_PREFIX}/weather-${encodeURIComponent(lat)}-${encodeURIComponent(lon)}.json`,
      self.registration.scope
    )
  );
}

async function networkFirstWithBackup(request, backupKey) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "no-store" });

    if (response && response.ok) {
      await cache.put(backupKey, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(backupKey);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Google Sheets / Apps Script: SIEMPRE red cuando hay internet.
  // La copia guardada se usa solo si no hay conexión.
  if (isAppsScript(url)) {
    event.respondWith(
      networkFirstWithBackup(event.request, apiBackupKey(url))
    );
    return;
  }

  // Clima: misma estrategia.
  if (isWeather(url)) {
    event.respondWith(
      networkFirstWithBackup(event.request, weatherBackupKey(url))
    );
    return;
  }

  // HTML: GitHub primero; caché solo si no hay conexión.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(async response => {
          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put("./index-v2.html", response.clone());
          }
          return response;
        })
        .catch(() => caches.match("./index-v2.html"))
    );
    return;
  }

  // JS/manifest propios: red primero para ver cambios de GitHub al momento.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request, { cache: "no-cache" })
        .then(async response => {
          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Imágenes y recursos externos: red primero, copia guardada si están offline.
  event.respondWith(
    fetch(event.request, { cache: "no-cache" })
      .then(async response => {
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
