const CACHE_NAME = 'sjs-saloon-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install the Service Worker and cache the core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Serve cached files when offline
self.addEventListener('fetch', event => {
  // Only intercept GET requests. Let Firestore handle database requests directly.
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firestore.googleapis.com')) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if found, otherwise fetch from the network
        return response || fetch(event.request).catch(() => {
          // If the network fails and it's an HTML page request, load the offline index.html
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Clean up old caches when the app updates
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
