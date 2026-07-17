// =========================================================
// NOME DO ARQUIVO: src/components/home/Navbar.tsx
// CTO-Log: Governança de Topo de Funil. CTA fixo para maximizar captura de leads.
// =========================================================

import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* LOGOMARCA */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-lg font-black text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all group-hover:scale-105 group-hover:bg-cyan-500/20">
            F
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black uppercase tracking-[0.25em] text-white">
              FRETOGO
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.35em] text-cyan-400">
              Ecossistema Logístico
            </span>
          </div>
        </Link>

        {/* MENU DE NAVEGAÇÃO B2B/B2C */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/cliente" className="text-sm font-bold text-slate-300 transition-colors hover:text-cyan-400">
            Para Embarcadores
          </Link>
          <Link to="/motorista" className="text-sm font-bold text-slate-300 transition-colors hover:text-cyan-400">
            Para Motoristas
          </Link>
          <Link to="/admin" className="text-sm font-bold text-slate-300 transition-colors hover:text-cyan-400">
            Central Operacional
          </Link>
        </nav>

        {/* CALL TO ACTION (CTA) PRINCIPAL */}
        <Link
          to="/cliente"
          className="relative inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-300 hover:scale-[1.05] hover:bg-cyan-400 hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] overflow-hidden"
        >
          <div className="absolute inset-0 w-full h-full bg-white/20 blur-md -translate-x-full animate-[shimmer_3s_infinite]"></div>
          Cotar Frete Agora
        </Link>

      </div>
    </header>
  );
}
