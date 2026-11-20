/* Service worker · STBCOr PWA */
const CACHE_NAME = 'stbcor-shell-v3';
const BASE = self.registration.scope;
const CORE_FILES = [
  './','./index.html','./manifest.webmanifest','./css/plataforma.css',
  './js/config.js','./js/app.js','./js/pwa.js',
  './vendor/fonts/fonts.css',
  './vendor/fonts/merriweather-latin-400-normal.woff2',
  './vendor/fonts/merriweather-latin-700-normal.woff2',
  './vendor/fonts/open-sans-latin-400-normal.woff2',
  './vendor/fonts/open-sans-latin-600-normal.woff2',
  './vendor/fonts/open-sans-latin-700-normal.woff2',
  './vendor/fa/all.min.css',
  './vendor/fa/webfonts/fa-brands-400.woff2',
  './vendor/fa/webfonts/fa-regular-400.woff2',
  './vendor/fa/webfonts/fa-solid-900.woff2',
  './assets/logo.png','./assets/icon-192.png','./assets/pwa-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_FILES.map(path => new URL(path, BASE).href));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('stbcor-shell-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Nunca guardar respuestas de Apps Script, autenticación o sesiones.
  if (url.pathname.includes('/macros/') || url.pathname.includes('/exec')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // Network-first: recoge recursos nuevos al publicar, con fallback offline.
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        return (await caches.match(new URL('./index.html', BASE).href)) ||
          (await caches.match(new URL('./', BASE).href));
      }
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data ? event.data.text() : 'Hay novedades en la plataforma.' }; }
  const title = data.title || 'Seminario Teológico Bautista';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || 'Hay novedades en la plataforma académica.',
    icon: new URL('./assets/icon-192.png', BASE).href,
    badge: new URL('./assets/icon-192.png', BASE).href,
    data: { url: data.url || './#/anuncios' },
    tag: data.tag || 'stbcor-aviso'
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data && event.notification.data.url || './#/anuncios', BASE).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
