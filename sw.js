/* MITHQAL service worker — pages: network first, then cache (works offline once visited);
   static files: cache first, refreshed in the background. Third-party requests (ads) are never touched. */
const V = 'mq-2026-11-27b';
const CORE = ['/assets/site.css', '/assets/fonts/readex-pro-latin-wght-normal.woff2', '/assets/img/icon-192.png', '/assets/img/icon-512.png',
  '/assets/engine/rules.js', '/assets/engine/payroll.js', '/assets/engine/jobloss.js', '/assets/engine/retire.js', '/assets/engine/work.js',
  '/assets/calc.js', '/assets/grow.js', '/assets/tools.js', '/assets/track.js', '/assets/search.js', '/assets/pwa.js',
  '/fr/', '/en/', '/ar/', '/fr/tools/salary-calculator/', '/en/tools/salary-calculator/', '/ar/tools/salary-calculator/'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('/' + (url.pathname.split('/')[1] || 'fr') + '/tools/salary-calculator/') || caches.match('/fr/'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
