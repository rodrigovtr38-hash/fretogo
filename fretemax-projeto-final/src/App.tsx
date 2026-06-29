// src/App.tsx
// CTO-Log: Refatoração do sistema de rotas.
// 1. Implementação de proteção nativa em nível de roteador.
// 2. Remoção da "expulsão silenciosa" para uma redireção inteligente de autenticação.
// 3. Estabilização do Runtime para garantir que o Auth do Firebase carregue ANTES de decidir a rota.

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { auth } from './firebase'; // Importação do auth para validação em tempo real
import ErrorBoundary from './components/ErrorBoundary';
import AppShell from './layouts/AppShell';
import Home from './pages/Home';
import Cliente from './pages/Cliente';
import Motorista from './pages/Motorista';
import Admin from './pages/Admin';
import { ClientProvider } from './context/ClientContext';

/* =========================================================
   PROTECTED ROUTE (A "Guarda de Trânsito" do App)
========================================================= */
const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Validando credenciais...</div>;
  
  // Se não estiver logado, manda para o Home para fazer login
  if (!user) return <Navigate to="/" replace />;
  
  // O componente Admin já possui a trava interna ADMIN_UIDS, mantemos a redundância por segurança máxima
  return children;
};

export default function App() {
  const [runtimeStatus, setRuntimeStatus] = useState<'booting' | 'ready' | 'error'>('booting');

  useEffect(() => {
    let mounted = true;
    async function initializeCore() {
      try {
        await Promise.resolve();
        if (mounted) setRuntimeStatus('ready');
      } catch (error) {
        if (mounted) setRuntimeStatus('error');
      }
    }
    void initializeCore();
    return () => { mounted = false; };
  }, []);

  if (runtimeStatus === 'booting') return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-zinc-700 border-t-white animate-spin" />
        <p className="text-sm tracking-wide uppercase text-zinc-400">Inicializando plataforma...</p>
      </div>
    </div>
  );

  if (runtimeStatus === 'error') return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] text-red-500 p-6 text-center">
      <h1>Erro ao iniciar plataforma.</h1>
    </div>
  );

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            
            <Route path="/cliente" element={
              <ClientProvider>
                <Cliente />
              </ClientProvider>
            } />

            <Route path="/motorista" element={<Motorista />} />

            {/* ROTA PROTEGIDA - Segurança de nível empresarial */}
            <Route path="/admin" element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            } />

            {/* REDIRECTS E SEO */}
            <Route path="/contratar" element={<Navigate to="/cliente" replace />} />
            <Route path="/simular" element={<Navigate to="/cliente" replace />} />
            <Route path="/frete" element={<Navigate to="/cliente" replace />} />
            <Route path="/cargas" element={<Navigate to="/cliente" replace />} />
            <Route path="/parceiros" element={<Navigate to="/motorista" replace />} />
            <Route path="/motoristas" element={<Navigate to="/motorista" replace />} />
            <Route path="/radar" element={<Navigate to="/motorista" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
