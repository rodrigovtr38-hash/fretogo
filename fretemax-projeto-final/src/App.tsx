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
const LandingCliente = lazy(() => import('./pages/LandingCliente'));
const LandingMotorista = lazy(() => import('./pages/LandingMotorista'));

/* ======================================================
   HOME GUARD
====================================================== */
const HomeGuard = ({ children }: { children: ReactNode }) => {
  const hasActiveOrder = localStorage.getItem('fretogo_current_order');
  if (hasActiveOrder) {
    return <Navigate to="/simular" replace />;
  }
  return <>{children}</>;
};

/* ======================================================
   GLOBAL LOADER (CINEMATIC)
====================================================== */
const GlobalLoader = () => {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-slate-900/80 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <Zap className="h-7 w-7 fill-cyan-400 text-cyan-400 animate-pulse" />
          </div>
          <span className="text-4xl font-black italic tracking-tighter text-white drop-shadow-md">
            FRETOGO
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cyan-500/10 bg-slate-900/70 px-5 py-2.5 shadow-inner">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
            Iniciando Ecossistema
          </p>
        </div>
      </div>
    </div>
  );
};

/* ======================================================
   APP SHELL ORCHESTRATION (ESTRUTURA DEFINITIVA)
====================================================== */
export default function App() {
  return (
    <Router>
      <div className="relative flex min-h-screen w-full flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-50 font-sans antialiased overflow-x-hidden">
        
        {/* GLOBAL BACKGROUND LAYER */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.08),transparent_40%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.05),transparent_40%)]" />
        </div>

        {/* VIEWPORT CONTENT LAYER */}
        <div className="relative z-10 flex flex-1 flex-col w-full min-h-screen">
          
          {/* MAIN ROUTING AREA */}
          <main className="flex-1 w-full flex flex-col relative">
            <Suspense fallback={<GlobalLoader />}>
              <Routes>
                <Route path="/" element={<HomeGuard><Home /></HomeGuard>} />
                <Route path="/contratar" element={<LandingCliente />} />
                <Route path="/cliente" element={<Navigate to="/contratar" replace />} />
                <Route path="/parceiros" element={<LandingMotorista />} />
                <Route path="/motorista-landing" element={<Navigate to="/parceiros" replace />} />
                <Route path="/simular" element={<Cliente />} />
                <Route path="/radar" element={<Motorista />} />
                <Route path="/motorista" element={<Navigate to="/radar" replace />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          {/* GLOBAL FOOTER (ISOLATED) */}
          <footer className="relative z-20 w-full border-t border-slate-800/60 bg-slate-950/90 backdrop-blur-md mt-auto">
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-6 py-8 text-center">
              <div className="mb-4 flex items-center justify-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/20 bg-slate-900/70">
                  <Zap className="h-4 w-4 fill-cyan-400 text-cyan-400" />
                </div>
                <span className="text-sm font-black uppercase tracking-tight text-white italic">
                  FRETOGO
                </span>
              </div>
              <p className="w-full text-center text-[10px] font-bold uppercase tracking-[0.30em] text-slate-500">
                © 2026 FRETOGO TECNOLOGIA LTDA • TECNOLOGIA AUTÔNOMA DE LOGÍSTICA
              </p>
            </div>
          </footer>

        </div>
      </div>
    </Router>
  );
}
