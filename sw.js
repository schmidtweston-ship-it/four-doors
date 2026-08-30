const CACHE = "four-doors-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./go.html",
  "./hold.html",
  "./about.html",
  "./styles.css",
  "./app.js",
  "./audio.js",
  "./hold.js",
  "./companion.js",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try {
    url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
  } catch (err) {
    return;
  }
  const isNav = req.mode === "navigate" || /\.html$/i.test(url.pathname) || /\/$/.test(url.pathname);
  if (isNav) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./go.html") || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((cached) => {
      const live = fetch(req)
        .then((res) => {
          if (res && res.ok && url.origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || live;
    })
  );
});
