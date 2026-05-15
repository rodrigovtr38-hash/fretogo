/* =========================================================
   FRETOGO PWA SERVICE WORKER
========================================================= */

const VERSION = 'fretogo-v1.0.0';

/* =========================================================
   STATIC CACHE
========================================================= */

const STATIC_CACHE = [
  '/',
  '/manifest.json',
];

/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
  'install',
  (event) => {
    console.log(
      '✅ FRETOGO PWA instalado',
    );

    self.skipWaiting();

    event.waitUntil(
      caches
        .open(VERSION)
        .then((cache) =>
          cache.addAll(
            STATIC_CACHE,
          ),
        ),
    );
  },
);

/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener(
  'activate',
  (event) => {
    console.log(
      '✅ FRETOGO PWA ativo',
    );

    event.waitUntil(
      (async () => {
        const keys =
          await caches.keys();

        await Promise.all(
          keys.map((key) => {
            if (
              key !== VERSION
            ) {
              return caches.delete(
                key,
              );
            }

            return null;
          }),
        );

        await self.clients.claim();
      })(),
    );
  },
);

/* =========================================================
   FETCH
========================================================= */

self.addEventListener(
  'fetch',
  (event) => {
    const req =
      event.request;

    const url =
      new URL(req.url);

    /* =====================================================
       IGNORE NON-GET
    ===================================================== */

    if (
      req.method !== 'GET'
    ) {
      return;
    }

    /* =====================================================
       IGNORE FIREBASE
    ===================================================== */

    if (
      url.hostname.includes(
        'firestore.googleapis.com',
      ) ||
      url.hostname.includes(
        'googleapis.com',
      ) ||
      url.hostname.includes(
        'gstatic.com',
      )
    ) {
      return;
    }

    /* =====================================================
       HTML PAGES
    ===================================================== */

    if (
      req.headers.get(
        'accept',
      )?.includes(
        'text/html',
      )
    ) {
      event.respondWith(
        networkFirst(req),
      );

      return;
    }

    /* =====================================================
       STATIC ASSETS
    ===================================================== */

    event.respondWith(
      staleWhileRevalidate(
        req,
      ),
    );
  },
);

/* =========================================================
   NETWORK FIRST
========================================================= */

async function networkFirst(
  request,
) {
  const cache =
    await caches.open(
      VERSION,
    );

  try {
    const fresh =
      await fetch(
        request,
      );

    cache.put(
      request,
      fresh.clone(),
    );

    return fresh;
  } catch {
    const cached =
      await cache.match(
        request,
      );

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
    await caches.open(
      VERSION,
    );

  const cached =
    await cache.match(
      request,
    );

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
