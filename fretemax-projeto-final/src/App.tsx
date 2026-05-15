import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import {
  lazy,
  Suspense,
  type ReactNode,
} from 'react';

import { Zap } from 'lucide-react';

/* ======================================================
   LAZY LOAD PAGES
====================================================== */

const Home = lazy(() => import('./pages/Home'));

const Cliente = lazy(() => import('./pages/Cliente'));

const Motorista = lazy(() => import('./pages/Motorista'));

const Admin = lazy(() => import('./pages/Admin'));

const LandingCliente = lazy(
  () => import('./pages/LandingCliente'),
);

const LandingMotorista = lazy(
  () => import('./pages/LandingMotorista'),
);

/* ======================================================
   HOME GUARD
====================================================== */

const HomeGuard = ({
  children,
}: {
  children: ReactNode;
}) => {
  const hasActiveOrder =
    localStorage.getItem(
      'fretogo_current_order',
    );

  if (hasActiveOrder) {
    return (
      <Navigate
        to="/simular"
        replace
      />
    );
  }

  return <>{children}</>;
};

/* ======================================================
   GLOBAL LOADER
====================================================== */

const GlobalLoader = () => {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950">

      {/* ===================================================
          GLOBAL AMBIENT
      =================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/8 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />

        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/5" />

      </div>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <div className="relative z-10 flex flex-col items-center justify-center gap-5 px-6 text-center">

        <div className="flex items-center gap-3">

          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/15 bg-slate-900/80">

            <Zap className="h-6 w-6 fill-yellow-400 text-yellow-400" />

          </div>

          <span className="text-3xl font-black italic tracking-tight text-white">
            FRETOGO
          </span>

        </div>

        <div className="flex items-center gap-2 rounded-full border border-cyan-500/10 bg-slate-900/70 px-4 py-2">

          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />

          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
            Inicializando ecossistema operacional
          </p>

        </div>

      </div>

    </div>
  );
};

/* ======================================================
   APP
====================================================== */

export default function App() {
  return (
    <Router>

      {/* ===================================================
          ROOT STRUCTURE
      =================================================== */}

      <div className="relative isolate flex min-h-screen w-full flex-col overflow-x-clip bg-slate-950 text-slate-100">

        {/* ===================================================
            GLOBAL BACKGROUND
        =================================================== */}

        <div className="pointer-events-none fixed inset-0 overflow-hidden">

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.10),transparent_28%)]" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_30%)]" />

        </div>

        {/* ===================================================
            APP CONTAINER
        =================================================== */}

        <div className="relative z-10 flex min-h-screen w-full flex-col">

          {/* =================================================
              MAIN
          ================================================= */}

          <main className="relative flex w-full flex-1 flex-col overflow-x-clip">

            <div className="relative flex w-full flex-1 flex-col">

              <Suspense
                fallback={
                  <GlobalLoader />
                }
              >

                <Routes>

                  {/* =========================================
                      HOME
                  ========================================= */}

                  <Route
                    path="/"
                    element={
                      <HomeGuard>
                        <Home />
                      </HomeGuard>
                    }
                  />

                  {/* =========================================
                      LANDING CLIENTE
                  ========================================= */}

                  <Route
                    path="/contratar"
                    element={
                      <LandingCliente />
                    }
                  />

                  <Route
                    path="/cliente"
                    element={
                      <Navigate
                        to="/contratar"
                        replace
                      />
                    }
                  />

                  {/* =========================================
                      LANDING MOTORISTA
                  ========================================= */}

                  <Route
                    path="/parceiros"
                    element={
                      <LandingMotorista />
                    }
                  />

                  <Route
                    path="/motorista-landing"
                    element={
                      <Navigate
                        to="/parceiros"
                        replace
                      />
                    }
                  />

                  {/* =========================================
                      CLIENTE
                  ========================================= */}

                  <Route
                    path="/simular"
                    element={<Cliente />}
                  />

                  {/* =========================================
                      MOTORISTA
                  ========================================= */}

                  <Route
                    path="/radar"
                    element={
                      <Motorista />
                    }
                  />

                  <Route
                    path="/motorista"
                    element={
                      <Navigate
                        to="/radar"
                        replace
                      />
                    }
                  />

                  {/* =========================================
                      ADMIN
                  ========================================= */}

                  <Route
                    path="/admin"
                    element={<Admin />}
                  />

                  {/* =========================================
                      FALLBACK
                  ========================================= */}

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

              </Suspense>

            </div>

          </main>

          {/* =================================================
              FOOTER
          ================================================= */}

          <footer className="relative z-10 mt-auto border-t border-slate-800/60 bg-slate-950/90">

            <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-center px-6 py-8 text-center">

              <div className="mb-4 flex items-center justify-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-yellow-400/15 bg-slate-900/70">

                  <Zap className="h-4 w-4 fill-yellow-400 text-yellow-400" />

                </div>

                <span className="text-sm font-black uppercase tracking-tight text-white italic">
                  FRETOGO
                </span>

              </div>

              <p className="max-w-[900px] text-center text-[9px] font-bold uppercase tracking-[0.30em] text-slate-600">
                © 2026 FRETOGO TECNOLOGIA LTDA • TECNOLOGIA AUTÔNOMA DE LOGÍSTICA
              </p>

            </div>

          </footer>

        </div>

      </div>

    </Router>
  );
}
