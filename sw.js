/* ============================================================
   Karyana POS — Service Worker
   Caches all assets for 100% offline operation.
   Versioned cache: bump CACHE_VERSION when deploying updates.
   ============================================================ */

const CACHE_VERSION = 'karyana-v1.0.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DATA_CACHE    = `${CACHE_VERSION}-data`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/db.js',
  '/gst.js',
  '/sync.js',
  '/print.js',
  '/sms.js',
  '/i18n.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  /* Dexie.js — IndexedDB wrapper (loaded from CDN, cached here) */
  'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.min.js',
  /* Noto Nastaliq Urdu font */
  'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;700&display=swap',
];

/* ── Install: pre-cache all static assets ─────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

/* ── Activate: delete old cache versions ─────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())  // take control of all tabs
  );
});

/* ── Fetch: serve from cache, fall back to network ───────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Navigation requests → always serve index.html (SPA) */
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then(r => r || fetch(request))
    );
    return;
  }

  /* Static assets → cache-first */
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        /* Only cache successful GET responses */
        if (!response || response.status !== 200 || request.method !== 'GET') {
          return response;
        }
        const clone = response.clone();
        caches.open(STATIC_CACHE).then(c => c.put(request, clone));
        return response;
      }).catch(() => {
        /* Completely offline and not cached: return offline page for HTML */
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

/* ── Message: force update from app code ─────────────────── */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
