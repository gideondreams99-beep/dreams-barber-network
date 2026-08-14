const CACHE_NAME = 'sjs-saloon-cache-v2.0.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. Install Service Worker & Pre-cache Core Offline Assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// 2. Activate & Clean Up Old Caches
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

// 3. Intercept Network Fetch Requests
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Direct bypass for Firestore DB, Firebase Auth API, and Cloudinary uploads
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('cloudinary.com')
  ) {
    return;
  }

  const isHtmlRequest = request.mode === 'navigate' || 
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

  // NETWORK-FIRST STRATEGY FOR HTML (Always pulls latest app code online, falls back offline)
  if (isHtmlRequest) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback to cached index.html
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // CACHE-FIRST STRATEGY FOR STATIC ASSETS (Manifest, icons, CSS) WITH NETWORK FALLBACK
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response('Offline resource unavailable', { status: 503, statusText: 'Offline' });
        });
    })
  );
});

// 4. Handle System Device Notification Taps
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
