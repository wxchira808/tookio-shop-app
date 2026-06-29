// Basic Service Worker to satisfy PWA installability requirements
self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through fetch handler
  // A fetch event handler is REQUIRED by Chrome to show the PWA install prompt!
  event.respondWith(fetch(event.request));
});
