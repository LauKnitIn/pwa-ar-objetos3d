const CACHE_NAME = 'atlas3d-v2';
const CORE_ASSETS = [
  '/index.html',
  '/src/styles.css',
  '/src/main.ts',
  '/manifest.json',
  '/sw.js'
];

const ICON_ASSETS = [
  '/src/assets/icon-192.png',
  '/src/assets/icon-512-maskable.png',
  '/src/assets/icon-512.png'
]

async function guardarIconos(cache) {
  for(const url of ICON_ASSETS) {
    const respuesta = await fetch(url);
    await cache.put(url, respuesta);
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(CORE_ASSETS);
      await guardarIconos(cache);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nombres =>
      Promise.all(
        nombres
          .filter(nombre => nombre !== CACHE_NAME)
          .map(nombre => caches.delete(nombre))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(
      encontrado => encontrado || fetch(event.request)
    )
  );
});