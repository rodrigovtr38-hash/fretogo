import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import Cliente from './pages/Cliente';
import Motorista from './pages/Motorista';
import Admin from './pages/Admin';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter>
      {/* A DIV RAIZ:
        - min-h-screen: Altura mínima da tela inteira
        - w-full: Largura total (evita overflow)
        - overflow-x-hidden: Trava o scroll horizontal indesejado
        - flex flex-col: Prepara o layout para crescer verticalmente
      */}
      <div className="relative min-h-screen w-full flex flex-col overflow-x-hidden bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
        
        {/* O APPSHELL (O SEGREDO DA CENTRALIZAÇÃO):
          Ao colocar flex-1, dizemos para ocupar o espaço restante.
          Isto garante que as páginas filhas herdem essa estrutura flexível.
        */}
        <div className="flex flex-col flex-1 w-full relative z-10">
          <ErrorBoundary>
            <Routes>
              {/* Rotas Base Cadastradas */}
              <Route path="/" element={<Home />} />
              <Route path="/cliente" element={<Cliente />} />
              <Route path="/motorista" element={<Motorista />} />
              <Route path="/admin" element={<Admin />} />

              {/* REDIRECIONAMENTOS DE SEGURANÇA (Fail-Safe) */}
              <Route path="/contratar" element={<Navigate to="/cliente" replace />} />
              <Route path="/simular" element={<Navigate to="/cliente" replace />} />
              <Route path="/parceiros" element={<Navigate to="/motorista" replace />} />
              <Route path="/radar" element={<Navigate to="/motorista" replace />} />

              {/* Rota de fuga caso digitem qualquer link inexistente */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>

      </div>
    </BrowserRouter>
  );
}
