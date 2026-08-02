// Service worker minimal — hanya untuk memenuhi syarat "installable" PWA di Android/Chrome.
// Tidak melakukan caching agresif supaya data selalu fresh dari server.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // pass-through biasa, tidak meng-cache apapun
  event.respondWith(fetch(event.request));
});
