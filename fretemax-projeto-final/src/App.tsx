import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { Zap } from 'lucide-react';

/* ======================================================
   LAZY LOAD PAGES
====================================================== */
const Home = lazy(() => import('./pages/Home'));
const Cliente = lazy(() => import('./pages/Cliente'));
const Motorista = lazy(() => import('./pages/Motorista'));
const Admin = lazy(() => import('./pages/Admin'));

/* ======================================================
   HOME GUARD
====================================================== */
const HomeGuard = ({ children }: { children: ReactNode }) => {
  const hasActiveOrder = localStorage.getItem('fretogo_current_order');

  if (hasActiveOrder) {
    return <Navigate to="/cliente" replace />;
  }

  return <>{children}</>;
};

/* ======================================================
   GLOBAL LOADER
====================================================== */
const GlobalLoader = () => {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-slate-900/80 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <Zap className="h-7 w-7 fill-cyan-400 text-cyan-400 animate-pulse" />
          </div>

          <span className="text-4xl font-black italic tracking-tight text-white">
            FRETOGO
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-cyan-500/10 bg-slate-900/70 px-5 py-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />

          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
            Inicializando Sistema
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
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-950 text-slate-100">

        {/* BACKGROUND */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.08),transparent_40%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.05),transparent_40%)]" />
        </div>

        {/* CONTENT */}
        <div className="relative z-10 flex min-h-screen flex-col">

          <main className="flex-1">
            <Suspense fallback={<GlobalLoader />}>
              <Routes>

                {/* HOME */}
                <Route
                  path="/"
                  element={
                    <HomeGuard>
                      <Home />
                    </HomeGuard>
                  }
                />

                {/* CLIENTE */}
                <Route path="/cliente" element={<Cliente />} />

                {/* MOTORISTA */}
                <Route path="/motorista" element={<Motorista />} />

                {/* RADAR */}
                <Route path="/radar" element={<Navigate to="/motorista" replace />} />

                {/* SIMULAR */}
                <Route path="/simular" element={<Navigate to="/cliente" replace />} />

                {/* ADMIN */}
                <Route path="/admin" element={<Admin />} />

                {/* FALLBACK */}
                <Route path="*" element={<Navigate to="/" replace />} />

              </Routes>
            </Suspense>
          </main>

          {/* FOOTER */}
          <footer className="relative z-20 border-t border-slate-800/60 bg-slate-950/90 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-6 py-8 text-center">

              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/20 bg-slate-900/70">
                  <Zap className="h-4 w-4 fill-cyan-400 text-cyan-400" />
                </div>

                <span className="text-sm font-black uppercase italic tracking-tight text-white">
                  FRETOGO
                </span>
              </div>

              <p className="text-[10px] font-bold uppercase tracking-[0.30em] text-slate-500">
                © 2026 FRETOGO TECNOLOGIA LTDA • TECNOLOGIA AUTÔNOMA DE LOGÍSTICA
              </p>

            </div>
          </footer>

        </div>
      </div>
    </Router>
  );
}
