const CACHE_NAME = 'noa-shell-v19';
const SCREENSAVER_CACHE_NAME = 'noa-grocery-screensavers-v1';
const SHELL_ASSETS = [
  '/',
  '/grocery-list',
  '/map-display',
  '/manifest.webmanifest',
  '/icons/noa-icon-180.png',
  '/icons/noa-icon-192.png',
  '/icons/noa-icon-512.png',
  '/icons/noa-icon-maskable-192.png',
  '/icons/noa-icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => ![CACHE_NAME, SCREENSAVER_CACHE_NAME].includes(key)).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.includes('/storage/v1/object/public/noa-screensavers/')) {
    event.respondWith(
      caches.open(SCREENSAVER_CACHE_NAME).then((cache) => (
        cache.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
          if (response.ok || response.type === 'opaque') cache.put(event.request, response.clone());
          return response;
        }))
      ))
    );
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});
