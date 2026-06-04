// src/components/motorista/DriverStats.tsx
import { DollarSign, Truck, Star, Award } from 'lucide-react';

interface DriverDashboardProps {
  driver?: any;
}

export default function DriverDashboard({
  driver,
}: DriverDashboardProps) {
  
  const isPremium = driver?.score >= 4.8 || driver?.categoria === 'carreta';

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">

      {/* HERO SECTION - Responsivo */}
      <div className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              CENTRAL OPERACIONAL
            </span>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black leading-tight text-white">
              Bem-vindo ao radar FRETOGO
            </h1>
          </div>

          <div className="w-full lg:max-w-md rounded-[2rem] border border-white/10 bg-black/30 p-5 backdrop-blur-xl">
             <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-xl font-black text-cyan-400 shrink-0">
                  {driver?.nome?.charAt(0) || 'M'}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white truncate">{driver?.nome || 'Motorista'}</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Parceiro FRETOGO</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* 🔥 GRID RESPONSIVA (RESOLVE O PROBLEMA DAS LETRAS CORTADAS) */}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <div className="rounded-[2rem] border border-cyan-500/20 bg-slate-900/80 p-4 md:p-6 flex flex-col h-full shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-400 flex items-center gap-1">
            <DollarSign size={12} /> Ganhos
          </p>
          <h3 className="mt-2 text-xl md:text-3xl font-black text-white tracking-tighter">R$ 0,00</h3>
        </div>

        <div className="rounded-[2rem] border border-emerald-500/20 bg-slate-900/80 p-4 md:p-6 flex flex-col h-full shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400 flex items-center gap-1">
            <Truck size={12} /> Entregas
          </p>
          <h3 className="mt-2 text-xl md:text-3xl font-black text-white tracking-tighter">0</h3>
        </div>

        <div className="rounded-[2rem] border border-amber-500/20 bg-slate-900/80 p-4 md:p-6 flex flex-col h-full shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-400 flex items-center gap-1">
            <Star size={12} /> Avaliação
          </p>
          <h3 className="mt-2 text-xl md:text-3xl font-black text-white tracking-tighter">
            {driver?.score ? Number(driver.score).toFixed(1) : '5.0'}
          </h3>
        </div>

        <div className="rounded-[2rem] border border-purple-500/20 bg-slate-900/80 p-4 md:p-6 flex flex-col h-full shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-purple-400 flex items-center gap-1">
            <Award size={12} /> Nível
          </p>
          <h3 className="mt-2 text-lg md:text-2xl font-black text-white tracking-tighter uppercase italic">
            {isPremium ? 'ELITE' : 'PIONEIRO'}
          </h3>
        </div>
      </div>
    </div>
  );
}
