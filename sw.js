const CACHE = "gestion-playas-1.0.16";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/estilos.css",
  "./js/version.js",
  "./js/app.js",
  "./js/modules/excel.js",
  "./js/modules/exporter.js",
  "./js/modules/validator.js",
  "./js/modules/barcode.js",
  "./config/columnas.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Handle Share Target POSTs sent to /share-target by installed PWAs
self.addEventListener('fetch', event => {
  try {
    const url = new URL(event.request.url);
    // If this is a share-target POST, handle it specially
    if (url.pathname === '/share-target' && event.request.method === 'POST') {
      // Redirect the navigation to the app so the PWA opens (HTTP 303 See Other)
      event.respondWith(Response.redirect('./?shared=1', 303));

      // Process the incoming files and forward them to the client via postMessage
      event.waitUntil((async () => {
        try {
          const form = await event.request.formData();
          const fileFields = form.getAll('files');
          if (!fileFields || !fileFields.length) return;

          const filesPayload = [];
          for (const f of fileFields) {
            try {
              const buf = await f.arrayBuffer();
              filesPayload.push({ name: f.name, type: f.type, buffer: buf });
            } catch (err) {
              console.warn('Error leyendo archivo de share-target:', err);
            }
          }

          if (!filesPayload.length) return;

          const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
          let target = allClients[0];
          if (!target) {
            // No window client — open the app
            try {
              target = await clients.openWindow('./?shared=1');
              // openWindow may return null in some contexts
            } catch (err) {
              console.warn('No se pudo abrir la ventana cliente desde share-target:', err);
            }
          }

          if (target) {
            // Transfer ArrayBuffers for efficiency
            const transfer = filesPayload.map(p => p.buffer);
            // Post a message with the files (buffers are transferred)
            target.postMessage({ type: 'share-target', files: filesPayload }, transfer);
          }
        } catch (err) {
          console.error('Error en el handler de share-target:', err);
        }
      })());

      return; // already handled
    }
  } catch (_) {
    // ignore URL parsing errors and continue to default fetch handler
  }

  // Default fetch handler (original behavior)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() =>
      caches.match(event.request).then(r => r || caches.match("./index.html"))
    )
  );
});
