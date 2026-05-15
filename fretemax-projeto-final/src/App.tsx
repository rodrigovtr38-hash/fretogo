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

// ======================================================
// LAZY LOAD PAGES
// ======================================================

const Home = lazy(() => import('./pages/Home'));

const Cliente = lazy(() => import('./pages/Cliente'));

const Motorista = lazy(() => import('./pages/Motorista'));

const Admin = lazy(() => import('./pages/Admin'));

const LandingCliente = lazy(() => import('./pages/LandingCliente'));

const LandingMotorista = lazy(() => import('./pages/LandingMotorista'));

// ======================================================
// HOME GUARD
// ======================================================

const HomeGuard = ({
  children,
}: {
  children: ReactNode;
}) => {
  const hasActiveOrder = localStorage.getItem(
    'fretogo_current_order',
  );

  // TEMPORÁRIO:
  // posteriormente isso deve vir do Firestore/Auth realtime

  if (hasActiveOrder) {
    return <Navigate to="/simular" replace />;
  }

  return <>{children}</>;
};

// ======================================================
// GLOBAL LOADER
// ======================================================

const GlobalLoader = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">

      {/* Glow */}
      <div className="absolute w-[420px] h-[420px] rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Radar Pulse */}
      <div className="absolute w-64 h-64 border border-cyan-400/20 rounded-full animate-ping" />

      <div className="relative z-10 flex flex-col items-center gap-5">

        <div className="flex items-center gap-3">

          <div className="relative">
            <Zap className="w-7 h-7 text-yellow-400 fill-yellow-400" />
          </div>

          <span className="text-2xl font-black tracking-tight text-white italic">
            FRETOGO
          </span>

        </div>

        <div className="flex items-center gap-2">

          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />

          <p className="text-xs uppercase tracking-[0.35em] text-slate-400 font-bold">
            Inicializando ecossistema logístico
          </p>

        </div>

      </div>

    </div>
  );
};

// ======================================================
// APP
// ======================================================

export default function App() {
  return (
    <Router>

      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden">

        <main className="flex-1 w-full relative">

          <Suspense fallback={<GlobalLoader />}>

            <Routes>

              {/* =====================================================
                  HOME PRINCIPAL
              ===================================================== */}

              <Route
                path="/"
                element={
                  <HomeGuard>
                    <Home />
                  </HomeGuard>
                }
              />

              {/* =====================================================
                  LANDING CLIENTE
              ===================================================== */}

              <Route
                path="/contratar"
                element={<LandingCliente />}
              />

              {/* Compatibilidade antiga */}

              <Route
                path="/cliente"
                element={<Navigate to="/contratar" replace />}
              />

              {/* =====================================================
                  LANDING MOTORISTA
              ===================================================== */}

              <Route
                path="/parceiros"
                element={<LandingMotorista />}
              />

              {/* Compatibilidade antiga */}

              <Route
                path="/motorista-landing"
                element={<Navigate to="/parceiros" replace />}
              />

              {/* =====================================================
                  APP CLIENTE
              ===================================================== */}

              <Route
                path="/simular"
                element={<Cliente />}
              />

              {/* =====================================================
                  APP MOTORISTA / RADAR
              ===================================================== */}

              <Route
                path="/radar"
                element={<Motorista />}
              />

              {/* Compatibilidade antiga */}

              <Route
                path="/motorista"
                element={<Navigate to="/radar" replace />}
              />

              {/* =====================================================
                  ADMIN
              ===================================================== */}

              <Route
                path="/admin"
                element={<Admin />}
              />

              {/* =====================================================
                  FALLBACK
              ===================================================== */}

              <Route
                path="*"
                element={<Navigate to="/" replace />}
              />

            </Routes>

          </Suspense>

        </main>

        {/* =====================================================
            FOOTER GLOBAL
        ===================================================== */}

        <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center">

          <div className="flex justify-center items-center gap-2 mb-4">

            <Zap className="text-yellow-400 w-4 h-4 fill-yellow-400" />

            <span className="font-black text-sm italic tracking-tighter uppercase text-white">
              FRETOGO
            </span>

          </div>

          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em]">
            © 2026 FRETOGO TECNOLOGIA LTDA • TECNOLOGIA AUTÔNOMA DE LOGÍSTICA
          </p>

        </footer>

      </div>

    </Router>
  );
}
