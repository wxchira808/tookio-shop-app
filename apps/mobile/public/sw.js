// Tookio Shop PWA Service Worker
// Caches core app shell to satisfy PWA installability requirements
// and provide offline capability.

const CACHE_NAME = 'tookio-shop-v1';

// Core app shell files to pre-cache
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
];

// ---- Install: pre-cache app shell ----
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL);
    }).then(() => self.skipWaiting())
  );
});

// ---- Activate: clean up old caches ----
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ---- Fetch: network-first for API calls, cache-first for static assets ----
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always go to network for API calls to Frappe
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/files/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first strategy for everything else (static assets)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // Not in cache — fetch from network and cache it
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
