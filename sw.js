// Service worker de la app de Terreno.
// Estrategia a propósito: SIEMPRE intenta la red primero. Solo usa lo guardado
// en caché si de verdad no hay señal — así nunca vuelve a pasar lo que costó
// tanto encontrar hoy: quedarse pegado con una versión vieja de la app.
const CACHE = 'terreno-sj-v1';

self.addEventListener('install', e => {
  self.skipWaiting(); // la versión nueva toma el control apenas se instala
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Borra cualquier caché de una versión anterior del service worker.
    const nombres = await caches.keys();
    await Promise.all(nombres.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Los scripts de otros dominios (Supabase, jsPDF, etc.) no se tocan —
  // que el navegador los maneje directo, como siempre.
  if (url.origin !== self.location.origin) return;

  // Solo se cachean pedidos normales (GET); todo lo demás pasa directo.
  if (e.request.method !== 'GET') return;

  e.respondWith((async () => {
    try {
      const respuestaRed = await fetch(e.request);
      const cache = await caches.open(CACHE);
      cache.put(e.request, respuestaRed.clone());
      return respuestaRed;
    } catch (err) {
      // Sin señal: se usa lo último que quedó guardado, si existe.
      const enCache = await caches.match(e.request);
      if (enCache) return enCache;
      throw err;
    }
  })());
});
