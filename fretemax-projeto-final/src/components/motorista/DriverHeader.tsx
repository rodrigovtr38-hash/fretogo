import { signOut } from 'firebase/auth';

import { Truck, Zap } from 'lucide-react';

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
  return (
    <header className="relative z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-4 lg:px-8">

        {/* LOGO */}
        <div className="flex items-center gap-4">

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
            <Zap className="h-6 w-6 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
          </div>

          <div className="flex flex-col">
            <span className="text-2xl font-black italic tracking-tighter text-white">
              FRETOGO
            </span>

            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400">
              Painel do Motorista
            </span>
          </div>

        </div>

        {/* STATUS */}
        {user && (
          <div className="flex items-center gap-4">

            <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex md:flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Conectado
              </span>

              <span className="max-w-[180px] truncate text-xs font-bold text-white">
                {user.email}
              </span>
            </div>

            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 rounded-[1.25rem] border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10 hover:text-white active:scale-95"
            >
              <Truck size={16} />

              Sair
            </button>

          </div>
        )}

      </nav>
    </header>
  );
}
