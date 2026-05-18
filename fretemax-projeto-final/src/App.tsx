import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import Cliente from './pages/Cliente';
import Motorista from './pages/Motorista';
import Admin from './pages/Admin';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter>
      {/* Removemos as divs globais que estavam esmagando as telas. 
          Agora o ErrorBoundary abraça o sistema puramente, e cada tela 
          (Cliente/Motorista/Home) vai gerenciar seu próprio tamanho e centralização! */}
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
    </BrowserRouter>
  );
}
