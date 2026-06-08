import { signOut } from 'firebase/auth';
import { Truck, Zap, Download } from 'lucide-react';
import { auth } from '../../firebase';

interface DriverHeaderProps {
  user: {
    uid: string;
    email: string | null;
  } | null;
}

export default function DriverHeader({
  user,
}: DriverHeaderProps) {

  // Lógica segura de gatilho PWA (sem quebrar React lifecycle)
  const handleInstallClick = () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      alert('O aplicativo FretoGo já está instalado no seu dispositivo!');
      return;
    }
    alert('Para instalar o FretoGo: Toque no menu do seu navegador (três pontinhos) e selecione "Adicionar à Tela Inicial" ou "Instalar Aplicativo".');
  };

  return (
    <header className="relative z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-4 lg:px-8">

        {/* LOGO */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
            <Zap className="h-5 w-5 md:h-6 md:w-6 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-black italic tracking-tighter text-white">
              FRETOGO
            </span>
            <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400">
              Operacional
            </span>
          </div>
        </div>

        {/* CONTROLES / STATUS */}
        {user && (
          <div className="flex items-center gap-2 md:gap-4">
            
            {/* BOTÃO PWA (Novo) */}
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 rounded-[1.25rem] bg-cyan-500/10 border border-cyan-500/30 px-3 py-2 md:px-4 md:py-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-cyan-400 transition-all hover:bg-cyan-500 hover:text-slate-950 active:scale-95"
            >
              <Download size={14} className="md:w-4 md:h-4" />
              <span className="hidden md:block">Instalar App</span>
              <span className="block md:hidden">Baixar</span>
            </button>

            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 rounded-[1.25rem] border border-white/10 bg-white/5 px-3 py-2 md:px-5 md:py-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 active:scale-95"
            >
              <span className="hidden md:block">Sair</span>
              <Truck size={14} className="md:w-4 md:h-4" />
            </button>

          </div>
        )}

      </nav>
    </header>
  );
}
