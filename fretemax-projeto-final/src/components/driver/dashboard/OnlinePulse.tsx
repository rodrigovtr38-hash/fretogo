// =========================================================
// NOME DO ARQUIVO: src/components/motorista/OnlinePulse.tsx
// CTO-Log: Refinamento de UI/UX. Engenharia Comportamental com pulso de rede.
// =========================================================

import { Activity, Radar, Search, Wifi, Zap } from 'lucide-react';

export default function OnlinePulse() {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-cyan-500/20 bg-slate-950 px-6 py-16 md:px-12 shadow-2xl">
      
      {/* GLOW DE FUNDO - Efeito de Profundidade */}
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* GRID DE ARQUITETURA TÉCNICA */}
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:40px_40px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center">

        {/* BADGE OPERACIONAL */}
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 py-2 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
          <Radar size={16} className="text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-400">
            Torre de Despacho Ativa
          </span>
        </div>

        {/* MOTOR DO RADAR VISUAL */}
        <div className="relative flex items-center justify-center mb-6">
          {/* ONDA 1 - Expansão */}
          <div className="absolute h-[340px] w-[340px] rounded-full border border-cyan-500/10 animate-ping" style={{ animationDuration: '3s' }} />
          
          {/* ONDA 2 - Intermediária */}
          <div className="absolute h-[250px] w-[250px] rounded-full border border-cyan-400/20" />
          
          {/* ONDA 3 - Interna */}
          <div className="absolute h-[160px] w-[160px] rounded-full border border-cyan-300/30" />

          {/* NÚCLEO DO RADAR */}
          <div className="relative z-10 flex h-40 w-40 items-center justify-center rounded-full border-[6px] border-slate-900 bg-[#061224] shadow-[0_0_80px_rgba(34,211,238,0.5)] ring-4 ring-cyan-500/50">
            <div className="absolute inset-0 rounded-full bg-cyan-400/10 animate-pulse" />
            <div className="relative z-10 flex flex-col items-center justify-center mt-2">
              <Wifi size={46} className="text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              <span className="mt-3 text-[10px] font-black uppercase tracking-[0.4em] text-cyan-300 animate-pulse">
                Online
              </span>
            </div>
          </div>
        </div>

        {/* COPY DE ENGAJAMENTO (FOMO INVERTIDO) */}
        <div className="mt-12 max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
            Interceptando Malha
          </h2>
          <p className="mt-4 text-base md:text-lg leading-relaxed text-slate-400 font-medium">
            Nossa inteligência artificial está escaneando a região em tempo real. 
            <br className="hidden md:block" />Mantenha o app aberto para prioridade máxima no despacho.
          </p>
        </div>

        {/* STATUS CARDS (INFRAESTRUTURA) */}
        <div className="mt-14 grid w-full max-w-5xl gap-4 md:gap-6 md:grid-cols-3">
          
          <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-900/50 p-6 md:p-8 backdrop-blur-sm transition-all hover:bg-slate-900/80 hover:border-cyan-500/30 text-left">
            <div className="bg-cyan-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 border border-cyan-500/20">
              <Search size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-black text-white tracking-wide">Filtro Geográfico</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Processando raio de 50km da sua localização atual.
            </p>
          </div>

          <div className="rounded-[2rem] border border-emerald-500/10 bg-slate-900/50 p-6 md:p-8 backdrop-blur-sm transition-all hover:bg-slate-900/80 hover:border-emerald-500/30 text-left">
            <div className="bg-emerald-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 border border-emerald-500/20">
              <Activity size={24} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-black text-white tracking-wide">Motor de Match</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Cruzamento de cubagem e peso com o seu veículo ativo.
            </p>
          </div>

          <div className="rounded-[2rem] border border-yellow-500/10 bg-slate-900/50 p-6 md:p-8 backdrop-blur-sm transition-all hover:bg-slate-900/80 hover:border-yellow-500/30 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-bl-full pointer-events-none"></div>
            <div className="bg-yellow-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 border border-yellow-500/20 relative z-10">
              <Zap size={24} className="text-yellow-400" />
            </div>
            <h3 className="text-lg font-black text-white tracking-wide relative z-10">Oferta Direta</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 relative z-10">
              Cargas chegam para você antes de irem para o mural geral.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
