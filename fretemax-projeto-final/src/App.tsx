// =========================================================
// NOME DO ARQUIVO: src/App.tsx
// CTO-Log: Sprint 1 - Limpeza de Topologia e Preparação de Rotas B2B/B2C.
// Integração do Firebase e Contextos mantida INTACTA para evitar quebra de listeners.
// =========================================================

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import ErrorBoundary from './components/ErrorBoundary';
import AppShell from './layouts/AppShell';

import Home from './pages/Home';
import Cliente from './pages/Cliente';
import Motorista from './pages/Motorista';
import Admin from './pages/Admin';

import { ClientProvider } from './context/ClientContext';

/* =========================================================
   RUNTIME TYPES
========================================================= */
type AppRuntimeStatus = 'booting' | 'ready' | 'error';

/* =========================================================
   APP COMPONENT
========================================================= */
export default function App() {
  const [runtimeStatus, setRuntimeStatus] = useState<AppRuntimeStatus>('booting');

  /* =====================================================
     BOOTSTRAP GATE (Proteção de Inicialização)
  ===================================================== */
  useEffect(() => {
    let mounted = true;

    async function initializeCore() {
      try {
        // Aguarda a estabilização do DOM antes de carregar ouvintes pesados do Firebase
        await Promise.resolve();

        if (!mounted) return;
        
        setRuntimeStatus('ready');
        console.log('✅ CORE runtime da FretoGo Network estabilizado.');
      } catch (error) {
        console.error('❌ Erro no CORE runtime:', error);
        if (mounted) setRuntimeStatus('error');
      }
    }

    void initializeCore();

    return () => {
      mounted = false;
    };
  }, []);

  const isReady = useMemo(() => runtimeStatus === 'ready', [runtimeStatus]);

  /* =====================================================
     FALLBACKS (Telas de Carregamento/Erro Crítico)
  ===================================================== */
  if (runtimeStatus === 'booting') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin" />
          <p className="text-sm font-bold tracking-widest uppercase text-slate-400">
            Inicializando FretoGo Network...
          </p>
        </div>
      </div>
    );
  }

  if (runtimeStatus === 'error') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-red-500 p-6 text-center">
        <div>
          <h1 className="text-2xl font-black mb-4 uppercase tracking-wider">Erro de Inicialização</h1>
          <p className="text-slate-400 font-medium">Ocorreu uma falha crítica no bootstrap do sistema.</p>
        </div>
      </div>
    );
  }

  if (!isReady) return null;

  /* =====================================================
     APP ROUTER (Topologia da FretoGo Network)
  ===================================================== */
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppShell>
          <Routes>

            {/* ======================================================
                PORTAL UNIFICADO (Landing Page B2B/B2C)
            ====================================================== */}
            <Route path="/" element={<Home />} />

            {/* ======================================================
                MÓDULO: EMBARCADOR (Empresas / B2B)
                Nota: ClientProvider mantido provisoriamente para proteção do Firebase
            ====================================================== */}
            <Route 
              path="/cliente" 
              element={
                <ClientProvider>
                  <Cliente />
                </ClientProvider>
              } 
            />

            {/* ======================================================
                MÓDULO: TRANSPORTADOR (Motoristas / Agregados)
            ====================================================== */}
            <Route path="/motorista" element={<Motorista />} />

            {/* ======================================================
                MÓDULO: TORRE DE CONTROLE (Admin)
            ====================================================== */}
            <Route path="/admin" element={<Admin />} />

            {/* ======================================================
                REDIRECIONAMENTOS DE SEO E LINKS ANTIGOS
            ====================================================== */}
            <Route path="/contratar" element={<Navigate to="/cliente" replace />} />
            <Route path="/simular" element={<Navigate to="/cliente" replace />} />
            <Route path="/frete" element={<Navigate to="/cliente" replace />} />
            <Route path="/cargas" element={<Navigate to="/cliente" replace />} />
            
            <Route path="/parceiros" element={<Navigate to="/motorista" replace />} />
            <Route path="/motoristas" element={<Navigate to="/motorista" replace />} />
            <Route path="/radar" element={<Navigate to="/motorista" replace />} />

            {/* ======================================================
                FALLBACK (Página 404 Catcher)
            ====================================================== */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </AppShell>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
