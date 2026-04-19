const CACHE = 'prestamos-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(names => {
    return Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // No cachear llamadas al API externo (Google Apps Script, etc.)
  if (url.origin !== self.location.origin) return;

  // Network-first: siempre intenta traer la ultima version, usa cache solo si falla la red
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const c = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, c));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});
