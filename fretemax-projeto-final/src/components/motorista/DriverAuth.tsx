import { useState } from 'react';
import { motion } from 'framer-motion';
import { Chrome, ShieldCheck, Truck, Zap } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase';

export default function DriverAuth() {
  const [isLoading, setIsLoading] = useState(false);

  // 🔥 LÓGICA DE LOGIN INJETADA DIRETAMENTE NO COMPONENTE
  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' }); 
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("ERRO AUTH GOOGLE:", error);
      alert("Falha na autenticação. Verifique se o pop-up não foi bloqueado no seu navegador e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6">
      {/* BACKGROUND BLINDADO */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_35%)]" />
      <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-120px] h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_0_80px_rgba(6,182,212,0.12)] backdrop-blur-2xl"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-cyan-500/20 bg-cyan-500/10">
            <Zap className="h-10 w-10 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_18px_rgba(6,182,212,0.8)]" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tight text-white">FRETOGO</h1>
          <p className="mt-3 max-w-[320px] text-sm leading-relaxed text-slate-400">
            Plataforma inteligente de fretes em tempo real para motoristas parceiros.
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
              <Truck className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-white">Fretes instantâneos</h3>
              <p className="text-xs text-slate-400">Receba cargas automaticamente em tempo real.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <ShieldCheck className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-white">Segurança avançada</h3>
              <p className="text-xs text-slate-400">Login protegido e rastreamento inteligente.</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="group relative z-20 flex w-full items-center justify-center gap-3 overflow-hidden rounded-[1.5rem] bg-cyan-500 px-6 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/0 via-white/30 to-cyan-300/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <Chrome size={20} />
          {isLoading ? 'Conectando...' : 'Entrar com Google'}
        </button>

        <div className="mt-8 border-t border-white/5 pt-6 text-center">
          <p className="text-xs leading-relaxed text-slate-500">
            Ao continuar você concorda com os termos da plataforma e política de segurança operacional da FRETOGO.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
