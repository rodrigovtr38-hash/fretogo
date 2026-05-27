import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import ErrorBoundary from './components/ErrorBoundary';

import AppShell from './layouts/AppShell';

import Home from './pages/Home';

import Cliente from './pages/Cliente';

import Motorista from './pages/Motorista';

import Admin from './pages/Admin';

/* =========================================================
   RUNTIME TYPES
========================================================= */

type AppRuntimeStatus =
  | 'booting'
  | 'ready'
  | 'error';

/* =========================================================
   APP COMPONENT
========================================================= */

export default function App() {
  const [
    runtimeStatus,
    setRuntimeStatus,
  ] =
    useState<AppRuntimeStatus>(
      'booting',
    );

  /* =====================================================
     BOOTSTRAP GATE
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    async function initializeCore() {
      try {
        /*
         * IMPORTANTE:
         * Não inicializar:
         * - realtime
         * - maps
         * - listeners
         * - tracking
         * aqui no root.
         *
         * O root apenas estabiliza o runtime.
         */

        await Promise.resolve();

        if (!mounted) {
          return;
        }

        setRuntimeStatus('ready');

        console.log(
          '✅ CORE runtime estabilizado.',
        );
      } catch (error) {
        console.error(
          '❌ Erro no CORE runtime:',
          error,
        );

        if (mounted) {
          setRuntimeStatus('error');
        }
      }
    }

    void initializeCore();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================================================
     RUNTIME FLAGS
  ===================================================== */

  const isReady = useMemo(
    () => runtimeStatus === 'ready',
    [runtimeStatus],
  );

  /* =====================================================
     FALLBACKS
  ===================================================== */

  if (
    runtimeStatus === 'booting'
  ) {
    return (
      <div
        className="
          min-h-screen
          w-full
          flex
          items-center
          justify-center
          bg-black
          text-white
        "
      >
        <div
          className="
            flex
            flex-col
            items-center
            gap-4
          "
        >
          <div
            className="
              h-12
              w-12
              rounded-full
              border-4
              border-zinc-700
              border-t-white
              animate-spin
            "
          />

          <p
            className="
              text-sm
              tracking-wide
              uppercase
              text-zinc-400
            "
          >
            Inicializando plataforma...
          </p>
        </div>
      </div>
    );
  }

  if (
    runtimeStatus === 'error'
  ) {
    return (
      <div
        className="
          min-h-screen
          w-full
          flex
          items-center
          justify-center
          bg-black
          text-red-500
          p-6
          text-center
        "
      >
        <div>
          <h1
            className="
              text-2xl
              font-bold
              mb-4
            "
          >
            Erro ao iniciar plataforma
          </h1>

          <p
            className="
              text-zinc-400
            "
          >
            Ocorreu uma falha crítica no
            bootstrap do sistema.
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return null;
  }

  /* =====================================================
     APP ROUTER
  ===================================================== */

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppShell>
          <Routes>

            {/* ======================================================
                HOME
            ====================================================== */}

            <Route
              path="/"
              element={<Home />}
            />

            {/* ======================================================
                CLIENTE
            ====================================================== */}

            <Route
              path="/cliente"
              element={<Cliente />}
            />

            {/* ======================================================
                MOTORISTA
            ====================================================== */}

            <Route
              path="/motorista"
              element={<Motorista />}
            />

            {/* ======================================================
                ADMIN
            ====================================================== */}

            <Route
              path="/admin"
              element={<Admin />}
            />

            {/* ======================================================
                REDIRECTS SEO / ADS
            ====================================================== */}

            <Route
              path="/contratar"
              element={
                <Navigate
                  to="/cliente"
                  replace
                />
              }
            />

            <Route
              path="/simular"
              element={
                <Navigate
                  to="/cliente"
                  replace
                />
              }
            />

            <Route
              path="/frete"
              element={
                <Navigate
                  to="/cliente"
                  replace
                />
              }
            />

            <Route
              path="/cargas"
              element={
                <Navigate
                  to="/cliente"
                  replace
                />
              }
            />

            <Route
              path="/parceiros"
              element={
                <Navigate
                  to="/motorista"
                  replace
                />
              }
            />

            <Route
              path="/motoristas"
              element={
                <Navigate
                  to="/motorista"
                  replace
                />
              }
            />

            <Route
              path="/radar"
              element={
                <Navigate
                  to="/motorista"
                  replace
                />
              }
            />

            {/* ======================================================
                FALLBACK
            ====================================================== */}

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Routes>
        </AppShell>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
