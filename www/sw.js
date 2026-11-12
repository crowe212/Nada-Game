// Offline cache. Bump VERSION whenever game files change.
const VERSION = 'c2c-v17';
const FILES = ['./', 'index.html', 'style.css?v=17', 'game.js?v=17', 'manifest.webmanifest', 'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-italic.woff2', 'fonts/barlow-condensed-latin-800-italic.woff2', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.headers.has('range') || new URL(e.request.url).origin !== location.origin) return; // let audio and other sites go straight to the network
  // Network first so updates show up; fall back to cache when offline.
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((res) => { // always check for a newer copy so updates show up straight away
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
