const STATIC_CACHE = "bonus-cache-v3"; // bump this

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([
        "./",
        "./index.html",
        "./app.js",
        "./manifest.webmanifest",
        "./icons/icon-192.png",
        "./icons/icon-512.png",
        "./icons/maskable-512.png"
        // DO NOT add tiers.json here
      ])
    )
  );
});

// Network-first for tiers.json
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith("/tiers.json")) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});