import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import { Zap } from 'lucide-react';

import Home from './pages/Home';
import Cliente from './pages/Cliente';
import Motorista from './pages/Motorista';
import Admin from './pages/Admin';

import LandingCliente from './pages/LandingCliente';
import LandingMotorista from './pages/LandingMotorista';

// Proteção simples para clientes com pedido ativo
const HomeGuard = ({ children }: { children: ReactNode }) => {
  const hasActiveOrder = localStorage.getItem('fretogo_current_order');

  // Se existir pedido ativo, envia direto para o radar
  if (hasActiveOrder) {
    return <Navigate to="/simular" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

        <main className="flex-1 w-full relative">

          <Routes>

            {/* HOME PRINCIPAL */}
            <Route
              path="/"
              element={
                <HomeGuard>
                  <Home />
                </HomeGuard>
              }
            />

            {/* LANDING CLIENTE */}
            <Route
              path="/cliente"
              element={<LandingCliente />}
            />

            {/* LANDING MOTORISTA */}
            <Route
              path="/parceiros"
              element={<LandingMotorista />}
            />

            {/* APP CLIENTE */}
            <Route
              path="/simular"
              element={<Cliente />}
            />

            {/* APP MOTORISTA */}
            <Route
              path="/motorista"
              element={<Motorista />}
            />

            {/* ADMIN */}
            <Route
              path="/admin"
              element={<Admin />}
            />

            {/* FALLBACK */}
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />

          </Routes>
        </main>

        {/* FOOTER GLOBAL */}
        <footer className="bg-slate-950 py-8 text-center border-t border-slate-900">

          <div className="flex justify-center gap-2 mb-4">
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
