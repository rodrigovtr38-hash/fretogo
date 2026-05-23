import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';

import './index.css';

/* =========================================================
   ROOT
========================================================= */

const rootElement =
  document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Root element não encontrado.',
  );
}

/* =========================================================
   SERVICE WORKER
========================================================= */

async function registerServiceWorker() {
  if (
    'serviceWorker' in navigator &&
    import.meta.env.PROD
  ) {
    try {
      const registration =
        await navigator.serviceWorker.register(
          '/sw.js',
        );

      console.log(
        '✅ FRETOGO SW registrado:',
        registration.scope,
      );

      /* ===============================================
         FORCE UPDATE
      =============================================== */

      registration.addEventListener(
        'updatefound',
        () => {
          console.log(
            '♻️ Nova versão encontrada.',
          );
        },
      );
    } catch (error) {
      console.error(
        '❌ Erro ao registrar SW:',
        error,
      );
    }
  }
}

window.addEventListener(
  'load',
  registerServiceWorker,
);

/* =========================================================
   RENDER
========================================================= */

ReactDOM.createRoot(
  rootElement,
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
