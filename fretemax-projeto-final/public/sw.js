self.addEventListener('install', () => {
  console.log('✅ FRETOGO PWA instalado');

  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('✅ FRETOGO PWA ativo');
});

self.addEventListener('fetch', () => {});
