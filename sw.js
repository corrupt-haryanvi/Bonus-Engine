self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('bonus-cache-v1').then(cache => cache.addAll([
      './',
      './index.html',
      './app.js',
      './tiers.json',
      './manifest.webmanifest',
      './icons/icon-192.png',
      './icons/icon-512.png',
      './icons/maskable-512.png'
    ]))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
