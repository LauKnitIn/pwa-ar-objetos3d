const CACHE_NAME = 'gestor-tareas-v1';
const CORE_ASSETS = [
  '/index.html',
  '/src/styles.css',
  '/src/main.ts',
  '/manifest.json',
  '/sw.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(
      encontrado => encontrado || fetch(event.request)
    )
  );
});