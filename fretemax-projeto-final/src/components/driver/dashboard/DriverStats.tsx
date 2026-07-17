// =========================================================
// NOME DO ARQUIVO: src/components/motorista/DriverStats.tsx
// CTO-Log: Gamificação de Motorista. UI Premium para retenção.
// =========================================================

import { DollarSign, Truck, Star, Award } from 'lucide-react';

interface DriverDashboardProps {
  driver?: any;
}

export default function DriverStats({ driver }: DriverDashboardProps) {
  // Regra de Negócio: Gamificação para Elite
  const isPremium = (driver?.score && Number(driver.score) >= 4.8) || driver?.categoria?.includes('carreta');
  const ganhosHoje = driver?.ganhosHoje || 0;
  const entregasHoje = driver?.entregasHoje || 0;

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* HERO SECTION - Saudação Dinâmica */}
      <div className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-[#061224] to-slate-950 p-6 md:p-8 shadow-2xl relative">
        {/* Efeito de Luz */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[80px] pointer-events-none rounded-full"></div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
               <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
               Torre de Controle Conectada
            </span>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black leading-tight text-white tracking-tight">
              Central Operacional
            </h1>
          </div>

          <div className="w-full lg:max-w-md rounded-[2rem] border border-white/5 bg-slate-950/60 p-5 backdrop-blur-xl shadow-inner">
             <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-cyan-500/10 text-2xl font-black text-cyan-400 shrink-0 border border-cyan-500/20">
                  {driver?.nome?.charAt(0).toUpperCase() || 'M'}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white truncate">{driver?.nome || 'Motorista Parceiro'}</h2>
                  <p className="text-[10px] text-cyan-500/80 uppercase tracking-widest font-bold mt-0.5">Frota FRETOGO</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* GRID DE KPIs (Métricas Chave) */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Ganhos */}
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/20 p-5 flex flex-col justify-between group hover:border-emerald-500/40 transition-all shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
            <DollarSign size={14} /> Faturamento Hoje
          </p>
          <h3 className="mt-3 text-2xl md:text-3xl font-black text-white tracking-tighter drop-shadow-md">
            R$ {ganhosHoje.toFixed(2).replace('.', ',')}
          </h3>
        </div>

        {/* Entregas */}
        <div className="rounded-3xl border border-blue-500/20 bg-blue-950/20 p-5 flex flex-col justify-between group hover:border-blue-500/40 transition-all shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
            <Truck size={14} /> Entregas Sucesso
          </p>
          <h3 className="mt-3 text-2xl md:text-3xl font-black text-white tracking-tighter drop-shadow-md">
            {entregasHoje}
          </h3>
        </div>

        {/* Avaliação */}
        <div className="rounded-3xl border border-amber-500/20 bg-amber-950/20 p-5 flex flex-col justify-between group hover:border-amber-500/40 transition-all shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
            <Star size={14} /> Sua Nota
          </p>
          <h3 className="mt-3 text-2xl md:text-3xl font-black text-white tracking-tighter drop-shadow-md">
            {driver?.score ? Number(driver.score).toFixed(1) : '5.0'}
          </h3>
        </div>

        {/* Nível */}
        <div className="rounded-3xl border border-purple-500/20 bg-purple-950/20 p-5 flex flex-col justify-between group hover:border-purple-500/40 transition-all shadow-sm relative overflow-hidden">
          {isPremium && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-fuchsia-500"></div>}
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
            <Award size={14} /> Categoria
          </p>
          <h3 className="mt-3 text-xl md:text-2xl font-black text-white tracking-tighter uppercase italic drop-shadow-md">
            {isPremium ? 'ELITE' : 'PIONEIRO'}
          </h3>
        </div>
      </div>
    </div>
  );
}
