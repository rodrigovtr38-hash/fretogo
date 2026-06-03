import { DollarSign, Truck, Star, Award } from 'lucide-react'; // 🔥 Injetado ícones para melhorar a UI

interface DriverDashboardProps {
  driver?: any;
}

export default function DriverDashboard({
  driver,
}: DriverDashboardProps) {
  
  // Gatilho de Gamificação (Base para próximas fases)
  const isPremium = driver?.score >= 4.8 || driver?.categoria === 'carreta';

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">

      {/* HERO SECTION */}
      <div className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-6 md:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              CENTRAL OPERACIONAL
            </span>
            <h1 className="max-w-2xl text-3xl md:text-4xl font-black leading-tight text-white lg:text-5xl">
              Bem-vindo ao radar operacional FRETOGO
            </h1>
            <p className="mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-slate-300">
              Sistema inteligente de distribuição logística em tempo real.
              Fique online para começar a receber fretes compatíveis com sua categoria e localização.
            </p>
          </div>

          {/* DRIVER CARD */}
          <div className="w-full lg:max-w-md rounded-[2rem] border border-white/10 bg-black/30 p-5 md:p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-xl md:text-2xl font-black text-cyan-400 shrink-0">
                {driver?.nome?.charAt(0) || 'M'}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-black text-white truncate">
                  {driver?.nome || 'Motorista'}
                </h2>
                <p className="text-sm text-slate-400">
                  Parceiro FRETOGO {isPremium ? 'Elite' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/80 px-4 py-4">
                <span className="text-xs md:text-sm text-slate-400 uppercase font-bold tracking-wider">
                  Categoria
                </span>
                <span className="text-xs md:text-sm font-black uppercase text-cyan-400 truncate max-w-[140px] text-right">
                  {driver?.categoria?.replace('_', ' ') || 'Não definida'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/80 px-4 py-4">
                <span className="text-xs md:text-sm text-slate-400 uppercase font-bold tracking-wider">
                  Status
                </span>
                <span className="text-xs md:text-sm font-black text-emerald-400 tracking-wider">
                  {driver?.status?.toUpperCase() || 'APROVADO'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATUS GRID (🔥 CIRURGIA RESPONSIVA) */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-[2rem] border border-cyan-500/20 bg-slate-900/80 p-6 flex flex-col h-full shadow-[0_10px_30px_rgba(6,182,212,0.05)] relative overflow-hidden group">
          <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-cyan-500/5 group-hover:text-cyan-500/10 transition-colors" />
          <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-cyan-400 relative z-10 flex items-center gap-2">
            <DollarSign size={14} /> Ganhos Hoje
          </p>
          <h3 className="mt-4 text-3xl md:text-4xl font-black text-white tracking-tighter relative z-10">
            R$ 0,00
          </h3>
          <p className="mt-3 text-xs md:text-sm font-medium text-slate-400 relative z-10 mt-auto pt-2">
            <span className="text-cyan-400 font-bold">+0%</span> na última hora
          </p>
        </div>

        <div className="rounded-[2rem] border border-emerald-500/20 bg-slate-900/80 p-6 flex flex-col h-full shadow-[0_10px_30px_rgba(16,185,129,0.05)] relative overflow-hidden group">
          <Truck className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors" />
          <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-emerald-400 relative z-10 flex items-center gap-2">
            <Truck size={14} /> Entregas
          </p>
          <h3 className="mt-4 text-3xl md:text-4xl font-black text-white tracking-tighter relative z-10">
            0
          </h3>
          <p className="mt-3 text-xs md:text-sm font-medium text-slate-400 relative z-10 mt-auto pt-2">
            Finalizadas nas últimas 24h
          </p>
        </div>

        <div className="rounded-[2rem] border border-amber-500/20 bg-slate-900/80 p-6 flex flex-col h-full shadow-[0_10px_30px_rgba(245,158,11,0.05)] relative overflow-hidden group">
          <Star className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-500/5 group-hover:text-amber-500/10 transition-colors" />
          <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-amber-400 relative z-10 flex items-center gap-2">
            <Star size={14} /> Avaliação
          </p>
          <h3 className="mt-4 text-3xl md:text-4xl font-black text-white tracking-tighter relative z-10">
            {driver?.score ? Number(driver.score).toFixed(1) : '5.0'}
          </h3>
          <p className="mt-3 text-xs md:text-sm font-medium text-slate-400 relative z-10 mt-auto pt-2">
            Motorista verificado
          </p>
        </div>

        <div className="rounded-[2rem] border border-purple-500/20 bg-slate-900/80 p-6 flex flex-col h-full shadow-[0_10px_30px_rgba(168,85,247,0.05)] relative overflow-hidden group">
          <Award className="absolute -right-4 -bottom-4 w-24 h-24 text-purple-500/5 group-hover:text-purple-500/10 transition-colors" />
          <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-purple-400 relative z-10 flex items-center gap-2">
            <Award size={14} /> Nível Atual
          </p>
          <h3 className="mt-4 text-2xl md:text-3xl font-black text-white tracking-tighter relative z-10 uppercase italic">
            {isPremium ? 'ELITE' : 'PIONEIRO'}
          </h3>
          <p className="mt-3 text-xs md:text-sm font-medium text-slate-400 relative z-10 mt-auto pt-2 leading-relaxed">
            Prioridade nos fretes da região
          </p>
        </div>

      </div>

      {/* OPERATIONAL INFO */}
      <div className="mt-8 rounded-[2rem] border border-white/5 bg-slate-900/70 p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-black text-white">
          Central logística inteligente
        </h2>
        <p className="mt-4 max-w-4xl text-sm md:text-base leading-relaxed text-slate-400">
          O sistema FRETOGO monitora automaticamente parceiros online, 
          calcula rotas e distâncias em tempo real e orquestra o redispatch 
          (redistribuição de carga) de forma autônoma.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-black/20 p-5 md:p-6 transition-colors hover:bg-slate-800/50">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">
              Match inteligente
            </h3>
            <p className="mt-2 text-xs md:text-sm leading-relaxed text-slate-400">
              O algoritmo só envia cargas compatíveis com a sua categoria veicular e raio de atuação.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5 md:p-6 transition-colors hover:bg-slate-800/50">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">
              Redispatch autônomo
            </h3>
            <p className="mt-2 text-xs md:text-sm leading-relaxed text-slate-400">
              Caso você perca o tempo limite da oferta, a plataforma repassa para o próximo parceiro disponível.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5 md:p-6 transition-colors hover:bg-slate-800/50 sm:col-span-2 lg:col-span-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">
              Tracking Realtime
            </h3>
            <p className="mt-2 text-xs md:text-sm leading-relaxed text-slate-400">
              Sincronização 100% direta entre você, o cliente que solicitou e a nossa central administrativa.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
