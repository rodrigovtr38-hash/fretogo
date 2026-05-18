import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import Cliente from './pages/Cliente';
import Motorista from './pages/Motorista';
import Admin from './pages/Admin';
import ErrorBoundary from './components/ErrorBoundary'; // <--- Ativando o escudo protetor

export default function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen w-full flex flex-col bg-[#020617] text-slate-200 font-sans">
        
        {/* Envolvemos o ecossistema com o caçador de erros */}
        <ErrorBoundary>
          <Routes>
            {/* Rotas Base Cadastradas */}
            <Route path="/" element={<Home />} />
            <Route path="/cliente" element={<Cliente />} />
            <Route path="/motorista" element={<Motorista />} />
            <Route path="/admin" element={<Admin />} />

            {/* REDIRECIONAMENTOS DE SEGURANÇA (Fail-Safe) */}
            {/* Se o botão da Home chamar caminhos antigos ou alternativos, o app redireciona sem quebrar */}
            <Route path="/contratar" element={<Navigate to="/cliente" replace />} />
            <Route path="/simular" element={<Navigate to="/cliente" replace />} />
            <Route path="/parceiros" element={<Navigate to="/motorista" replace />} />
            <Route path="/radar" element={<Navigate to="/motorista" replace />} />

            {/* Rota de fuga caso digitem qualquer link inexistente */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>

      </div>
    </BrowserRouter>
  );
}
