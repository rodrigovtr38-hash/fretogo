/* =========================================================
   FRETOGO PWA SERVICE WORKER
========================================================= */

const VERSION = 'fretogo-v3';

/* =========================================================
   INSTALL
========================================================= */

self.addEventListener('install', (event) => {
  console.log('✅ FRETOGO SW instalado');

  self.skipWaiting();
});

/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener('activate', (event) => {
  console.log('✅ FRETOGO SW ativado');

  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => {
          if (key !== VERSION) {
            return caches.delete(key);
          }

          return null;
        }),
      );

      await self.clients.claim();
    })(),
  );
});

/* =========================================================
   FETCH
========================================================= */

self.addEventListener('fetch', (event) => {
  const req = event.request;

  /* =====================================================
     IGNORA NÃO GET
  ===================================================== */

  if (req.method !== 'GET') {
    return;
  }

  /* =====================================================
     IGNORA FIREBASE / APIs
  ===================================================== */

  const url = new URL(req.url);

  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  /* =====================================================
     HTML = NETWORK FIRST
  ===================================================== */

  if (
    req.headers
      .get('accept')
      ?.includes('text/html')
  ) {
    event.respondWith(networkFirst(req));

    return;
  }

  /* =====================================================
     ASSETS VITE
  ===================================================== */

  if (
    req.url.includes('/assets/')
  ) {
    event.respondWith(staleWhileRevalidate(req));

    return;
  }
});

/* =========================================================
   NETWORK FIRST
========================================================= */

async function networkFirst(request) {
  const cache = await caches.open(VERSION);

  try {
    const fresh = await fetch(request);

    cache.put(
      request,
      fresh.clone(),
    );

    return fresh;
  } catch {
    const cached =
      await cache.match(request);

    return (
      cached ||
      caches.match('/')
    );
  }
}

/* =========================================================
   STALE WHILE REVALIDATE
========================================================= */

async function staleWhileRevalidate(
  request,
) {
  const cache =
    await caches.open(VERSION);

  const cached =
    await cache.match(request);

  const fetchPromise =
    fetch(request)
      .then(
        (
          networkResponse,
        ) => {
          cache.put(
            request,
            networkResponse.clone(),
          );

          return networkResponse;
        },
      )
      .catch(() => cached);

  return (
    cached ||
    fetchPromise
  );
}
