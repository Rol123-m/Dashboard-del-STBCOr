/* Service worker · STBCOr PWA
   Incrementa CACHE_VERSION cuando publiques cambios en los archivos de la app. */
const CACHE_NAME = 'stbcor-shell-v2';
const BASE = self.registration.scope;
const CORE_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/plataforma.css',
  './js/config.js',
  './js/app.js',
  './js/pwa.js',
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
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/pwa-512.svg'
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
    await Promise.all(keys.filter(key => key.startsWith('stbcor-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)));
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

  // No almacenar respuestas de Apps Script ni información de cuentas/sesiones.
  if (url.pathname.includes('/macros/') || url.pathname.includes('/exec')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      return cached || new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
