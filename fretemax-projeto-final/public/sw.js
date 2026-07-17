/* =========================================================
   FRETOGO PWA SERVICE WORKER — BLINDAGEM DE ESCALA
   CTO-Log: 
   1. Cache robusto para áreas de sombra (sem 4G).
   2. Bypass agressivo para APIs do Firebase Firestore.
========================================================= */

const VERSION = 'fretogo-v4-stable'; // Versão incrementada para forçar atualização no celular dos motoristas

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
  console.log('✅ FRETOGO SW instalado (V4)');
  
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => {
        console.log('📦 FRETOGO: Armazenando infraestrutura crítica...');
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
            console.log('🗑️ FRETOGO: Removendo cache obsoleto:', key);
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
   FETCH (INTERCEPTADOR DE REQUISIÇÕES)
========================================================= */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  /* 1. IGNORA MUTAÇÕES (Apenas armazena GET) */
  if (req.method !== 'GET') return;

  /* 2. CTO BYPASS: Ignora Firebase, Auth e APIs externas para não bugar o Realtime */
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('firebaseio.com') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/__/') // Ignora scripts internos do Firebase Hosting
  ) {
    return;
  }

  /* 3. HTML = NETWORK FIRST (Busca a versão mais nova, se cair o 4G, usa o Cache) */
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  /* 4. ASSETS (CSS, JS, Imagens) = STALE WHILE REVALIDATE (Rápido na tela, atualiza no fundo) */
  if (req.url.includes('/assets/') || req.url.includes('.png') || req.url.includes('.svg')) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
});

/* =========================================================
   ESTRATÉGIAS DE CACHE
========================================================= */

async function networkFirst(request) {
  const cache = await caches.open(VERSION);

  try {
    const fresh = await fetch(request);
    // Só guarda no cache se a resposta for bem-sucedida (Evita guardar página de erro)
    if (fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (error) {
    console.warn('⚠️ FRETOGO: Rede caiu. Servindo HTML do Cache.');
    const cached = await cache.match(request);
    // Se não achar a página exata, força o index.html principal para o PWA não quebrar
    return cached || await cache.match('/index.html') || await cache.match('/');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
       console.warn(`⚠️ FRETOGO: Falha ao revalidar asset no fundo: ${request.url}`);
       return cached; // Retorna o velho se a rede falhar silenciosamente
    });

  return cached || fetchPromise;
}
