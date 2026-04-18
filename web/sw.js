const CACHE = 'prestamos-v1';
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

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (!res || res.status !== 200) return res;
      const c = res.clone();
      caches.open(CACHE).then(cache => cache.put(e.request, c));
      return res;
    })).catch(() => caches.match('/index.html'))
  );
});
