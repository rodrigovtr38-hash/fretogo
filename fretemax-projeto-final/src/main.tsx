import React from 'react';

import ReactDOM from 'react-dom/client';

import App from './App.tsx';

import './index.css';

/* =========================================================
   GLOBAL RUNTIME FLAGS
========================================================= */

declare global {
  interface Window {
    __FRETOGO_ROOT__?: boolean;

    __FRETOGO_BOOTSTRAP__?: boolean;

    __FRETOGO_SW_REGISTERED__?: boolean;
  }
}

/* =========================================================
   ROOT ELEMENT VALIDATION
========================================================= */

const rootElement =
  document.getElementById('root');

if (!rootElement) {
  throw new Error(
    '❌ Root element não encontrado.',
  );
}

/* =========================================================
   BOOTSTRAP GUARD
========================================================= */

if (window.__FRETOGO_ROOT__) {
  console.warn(
    '⚠️ React root já inicializado.',
  );
} else {
  window.__FRETOGO_ROOT__ = true;
}

/* =========================================================
   MOBILE / DESKTOP NORMALIZATION
========================================================= */

function setupRuntimeEnvironment() {
  try {
    // Viewport já definido no index.html - não modificar

    document.documentElement.style.setProperty(
      '--vh',
      `${window.innerHeight * 0.01}px`,
    );

    window.addEventListener(
      'resize',
      () => {
        document.documentElement.style.setProperty(
          '--vh',
          `${window.innerHeight * 0.01}px`,
        );
      },
      {
        passive: true,
      },
    );

    console.log(
      '✅ Runtime environment inicializado.',
    );
  } catch (error) {
    console.error(
      '❌ Erro ao preparar runtime:',
      error,
    );
  }
}

/* =========================================================
   SERVICE WORKER
========================================================= */

async function registerServiceWorker() {
  if (
    window.__FRETOGO_SW_REGISTERED__
  ) {
    return;
  }

  if (
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  if (!import.meta.env.PROD) {
    return;
  }

  try {
    const registration =
      await navigator.serviceWorker.register(
        '/sw.js',
      );

    window.__FRETOGO_SW_REGISTERED__ =
      true;

    console.log(
      '✅ FRETOGO SW registrado:',
      registration.scope,
    );

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

/* =========================================================
   APP STARTUP
========================================================= */

async function bootstrapApplication() {
  if (
    window.__FRETOGO_BOOTSTRAP__
  ) {
    console.warn(
      '⚠️ Bootstrap já executado.',
    );

    return;
  }

  window.__FRETOGO_BOOTSTRAP__ =
    true;

  try {
    setupRuntimeEnvironment();

    window.addEventListener(
      'load',
      () => {
        registerServiceWorker();
      },
      {
        once: true,
      },
    );

    const root =
      ReactDOM.createRoot(
        rootElement,
      );

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );

    console.log(
      '✅ FRETOGO bootstrap inicializado.',
    );
  } catch (error) {
    console.error(
      '❌ Falha crítica no bootstrap:',
      error,
    );
  }
}

/* =========================================================
   START
========================================================= */

void bootstrapApplication();
