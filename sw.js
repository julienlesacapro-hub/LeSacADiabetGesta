// Service worker : l'application fonctionne entièrement hors connexion.
// © 2026 LESACA Julien. Tous droits réservés.
// Pensez à incrémenter VERSION à chaque mise à jour des fichiers.
const VERSION = 'lsadg-v1.3.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/advice.js',
  './js/analysis.js',
  './js/chart.js',
  './js/csv.js',
  './js/dates.js',
  './js/guidelines.js',
  './js/pdf.js',
  './js/pregnancy.js',
  './js/store.js',
  './js/ui.js',
  './js/units.js',
  './js/version.js',
  './js/viewport.js',
  './js/install.js',
  './js/views/components.js',
  './js/views/entry.js',
  './js/views/export.js',
  './js/views/home.js',
  './js/views/install.js',
  './js/views/journal.js',
  './js/views/learn.js',
  './js/views/onboarding.js',
  './js/views/profile.js',
  './vendor/jspdf/jspdf.umd.min.js',
  './assets/icons/favicon-48.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' : on contourne le cache HTTP pour récupérer à coup sûr les fichiers de la nouvelle version.
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Stratégie « cache d'abord, puis mise à jour en arrière-plan » pour les fichiers de l'application.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      const fresh = await network;
      if (fresh) return fresh;
      if (request.mode === 'navigate') return cache.match('./index.html');
      return Response.error();
    }),
  );
});
