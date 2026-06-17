/* =========================================================
   FRETOGO PWA SERVICE WORKER — BLINDAGEM DE ESCALA
========================================================= */

const VERSION = 'fretogo-v3';

// // AJUSTE CTO: Matriz de Precache de rotas críticas e assets essenciais de renderização síncrona
const PRECACHE_ASSETS = [
  '/',
  '/motorista',
  '/cliente',
  '/index.html'
];

/* =========================================================
   INSTALL
========================================================= */
self.addEventListener('install', (event) => {
  console.log('✅ FRETOGO SW instalado');
  
  // // AJUSTE CTO: Força o cache síncrono dos entry-points vitais antes de liberar o worker para a thread ativa
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => {
        console.log('📦 FRETOGO: Armazenando infraestrutura crítica em cache offline...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
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
            console.log('🗑️ FRETOGO: Removendo cache obsoleto antigo:', key);
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
     IGNORA NÃO GET (Operações de Mutação e Escrita)
  ===================================================== */
  if (req.method !== 'GET') {
    return;
  }

  /* =====================================================
     IGNORA FIREBASE / APIs OFICIAIS (Transações Realtime)
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
     HTML = NETWORK FIRST (Garante a última versão se houver rede)
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
     ASSETS VITE / COMPILADOS COMPRESSOS
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
    cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    return cached || caches.match('/');
  }
}

/* =========================================================
   STALE WHILE REVALIDATE
========================================================= */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
