/* tracKYOU service worker: offline app shell + push notifications */
const CACHE = "trackyou-v4";
const CORE = [
  "./", "./index.html", "./manifest.webmanifest", "./vendor/supabase.js",
  "./fonts/bricolage-grotesque-latin-600-normal.woff2", "./fonts/bricolage-grotesque-latin-700-normal.woff2",
  "./fonts/figtree-latin-400-normal.woff2", "./fonts/figtree-latin-500-normal.woff2",
  "./fonts/figtree-latin-600-normal.woff2", "./fonts/figtree-latin-700-normal.woff2",
  "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/icon-maskable-512.png", "./icons/favicon-32.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(
    CORE.map(u => cache.add(u).catch(() => {}))   // one missing file must not block install
  )));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(request, ms) {
  return new Promise(resolve => {
    let settled = false;
    const fromCache = () => caches.match(request, { ignoreSearch: true }).then(r => { if (r && !settled) { settled = true; resolve(r); } return r; });
    const timer = setTimeout(fromCache, ms);              // slow/no network: fall back to cache
    fetch(request).then(resp => {
      clearTimeout(timer);
      if (resp && resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(request, copy)); }
      if (!settled) { settled = true; resolve(resp); }
    }).catch(() => { clearTimeout(timer); fromCache().then(r => { if (!r && !settled) { settled = true; resolve(Response.error()); } }); });
  });
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;         // Supabase etc. go straight to the network
  if (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    event.respondWith(networkFirst(req, 3000));            // pick up new versions, but never hang offline
    return;
  }
  event.respondWith(                                       // assets: cache first, refresh in background
    caches.match(req).then(hit => {
      const net = fetch(req).then(resp => {
        if (resp && resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return resp;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || "tracKYOU";
  const options = {
    body: data.body || "You have a reminder.",
    icon: "./icons/icon-192.png",
    badge: "./icons/favicon-32.png",
    tag: data.reminderId ? "trackyou-" + data.reminderId : undefined,
    data: { url: data.url || "./" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "./", self.registration.scope).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
