// =========================================================
// NOME DO ARQUIVO: src/components/motorista/DriverAuth.tsx
// CTO-Log: Auditoria Etapa 2 (Portas de Entrada)
// Status: Autenticação Google mantida. Injeção de UX Enterprise.
// 1. Substituição do alert() nativo por Feedback Visual Corporativo.
// 2. Animações de "Sistema Vivo" durante a resolução do Pop-Up do Google.
// =========================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chrome, ShieldCheck, Truck, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase';

export default function DriverAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Entrar com Google');
  const [errorMsg, setErrorMsg] = useState('');

  // Troca as mensagens para o motorista não achar que travou
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (isLoading) {
      setLoadingMessage('Solicitando permissão Google...');
      timeoutId = setTimeout(() => setLoadingMessage('Autenticando na Torre de Controle...'), 3500);
    } else {
      setLoadingMessage('Entrar com Google');
    }
    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // 🔥 LÓGICA DE LOGIN INJETADA DIRETAMENTE NO COMPONENTE
  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' }); 
      await signInWithPopup(auth, provider);
      // Se der certo, o listener do Firebase no Motorista.tsx assume o roteamento.
    } catch (error: any) {
      console.error("ERRO AUTH GOOGLE:", error);
      // Tratamento específico se o usuário fechar a aba do Google
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Você fechou a janela de autenticação. Tente novamente.');
      } else {
        setErrorMsg('Falha na autenticação. Verifique se o pop-up não foi bloqueado no seu navegador.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 font-sans selection:bg-cyan-500/30">
      {/* BACKGROUND BLINDADO */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_35%)]" />
      <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-120px] h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-8 md:p-10 shadow-[0_0_80px_rgba(6,182,212,0.12)] backdrop-blur-2xl"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-cyan-500/20 bg-cyan-500/10 shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-cyan-400/20 blur-xl animate-pulse"></div>
            <Zap className="h-10 w-10 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_18px_rgba(6,182,212,0.8)] relative z-10" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">FRETOGO</h1>
          <p className="mt-3 max-w-[320px] text-sm leading-relaxed text-slate-400 font-medium">
            Plataforma inteligente de conexão logística. Acesse a malha nacional de fretes em tempo real.
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900/50 p-4 transition-colors hover:border-cyan-500/30 hover:bg-slate-900/80">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 shrink-0">
              <Truck className="text-cyan-400 w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white mb-1">Radar Instantâneo</h3>
              <p className="text-xs text-slate-400 leading-snug">Oportunidades roteirizadas automaticamente para sua categoria.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900/50 p-4 transition-colors hover:border-emerald-500/30 hover:bg-slate-900/80">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <ShieldCheck className="text-emerald-400 w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white mb-1">Garantia Escrow</h3>
              <p className="text-xs text-slate-400 leading-snug">Credencial protegida e valor do frete blindado até a entrega.</p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
               <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
                  <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs font-bold text-red-300 leading-relaxed">{errorMsg}</p>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="group relative z-20 flex w-full h-[72px] items-center justify-center gap-3 overflow-hidden rounded-[2rem] bg-cyan-500 text-sm font-black uppercase tracking-[0.2em] text-black transition-all duration-300 hover:bg-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-80 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/0 via-white/30 to-cyan-300/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          
          {isLoading ? (
            <Loader2 size={24} className="animate-spin text-black" />
          ) : (
            <Chrome size={24} />
          )}
          {loadingMessage}
        </button>

        <div className="mt-8 border-t border-white/5 pt-6 text-center">
          <p className="text-[10px] uppercase tracking-widest font-black leading-relaxed text-slate-500">
            Acesso Exclusivo para Parceiros Homologados
          </p>
        </div>
      </motion.div>
    </div>
  );
}
