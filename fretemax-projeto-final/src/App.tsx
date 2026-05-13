import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import Home from './pages/Home';
import Cliente from './pages/Cliente';
import Motorista from './pages/Motorista';
import Admin from './pages/Admin';
import LandingCliente from './pages/LandingCliente';
import LandingMotorista from './pages/LandingMotorista';

// Componente de Proteção de Rota para Clientes Logados
const HomeGuard = ({ children }: { children: JSX.Element }) => {
  const hasActiveOrder = localStorage.getItem('fretogo_current_order');
  // Se tem pedido ativo, pula a Home e vai direto pro Radar do Cliente (agora na rota /simular)
  if (hasActiveOrder) return <Navigate to="/simular" />;
  return children;
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        
        <main className="flex-1 w-full relative">
          <Routes>
            {/* 1. A Entrada do App */}
            <Route path="/" element={<HomeGuard><Home /></HomeGuard>} />
            
            {/* 2. As Vitrines (Marketing / Landing Pages do Google Ads) */}
            <Route path="/cliente" element={<LandingCliente />} />
            <Route path="/motorista" element={<LandingMotorista />} />

            {/* 3. O "Caixa" / Aplicativo Real (Ação pesada com Firebase e GPS) */}
            <Route path="/simular" element={<Cliente />} />
            <Route path="/app-motorista" element={<Motorista />} />

            {/* 4. Painel de Administração */}
            <Route path="/admin" element={<Admin />} />

            {/* Redirecionamento de segurança para links quebrados */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <footer className="bg-slate-950 py-8 text-center border-t border-slate-900">
          <div className="flex justify-center gap-2 mb-4">
             <Zap className="text-yellow-400 w-4 h-4 fill-yellow-400" />
             <span className="font-black text-sm italic tracking-tighter uppercase text-white">FRETOGO</span>
          </div>
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em]">
            © 2026 FRETOGO TECNOLOGIA LTDA • TECNOLOGIA AUTÔNOMA DE LOGÍSTICA
          </p>
        </footer>
      </div>
    </Router>
  );
}
