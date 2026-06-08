import { signOut } from 'firebase/auth';
import { Truck, Zap, Star, Download, LogOut } from 'lucide-react';
import { auth } from '../../firebase';
import { useState, useEffect } from 'react';

interface DriverHeaderProps {
  user: {
    uid: string;
    email: string | null;
  } | null;
  driverData?: any;
}

export default function DriverHeader({ user, driverData }: DriverHeaderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const score = driverData?.score ? Number(driverData.score).toFixed(1) : '5.0';

  return (
    <header className="relative z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-3 lg:px-8">
        
        {/* PERFIL DO MOTORISTA (PADRÃO UBER) */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-500/30 bg-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Truck className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black uppercase tracking-tight text-white truncate max-w-[120px] md:max-w-[200px]">
              {driverData?.nome || 'Motorista'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-bold text-slate-300">{score}</span>
              </div>
              <span className="h-3 w-px bg-white/10" />
              <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">
                {driverData?.categoria?.replace('_', ' ') || 'Veículo'}
              </span>
            </div>
          </div>
        </div>

        {/* AÇÕES: PWA E SAIR */}
        <div className="flex items-center gap-2">
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-cyan-400 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {user && (
            <button
              onClick={() => signOut(auth)}
              className="flex items-center justify-center h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 active:scale-95"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>

      </nav>
    </header>
  );
}
