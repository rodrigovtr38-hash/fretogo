import { DollarSign, Truck, Star, Award, MessageCircle } from 'lucide-react'; 

interface DriverDashboardProps {
  driver?: any;
}

export default function DriverDashboard({
  driver,
}: DriverDashboardProps) {
  
  const isPremium = driver?.score >= 4.8 || driver?.categoria === 'carreta';

  const openWhatsAppSupport = () => {
    window.open('https://wa.me/5511946099840', '_blank');
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">

      {/* HEADER COMPACTO (Foco Operacional) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="flex items-center gap-4 rounded-[2rem] border border-white/10 bg-slate-900/60 p-4 md:p-5 backdrop-blur-xl w-full lg:w-auto">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-xl font-black text-cyan-400 shrink-0 border border-cyan-500/20">
            {driver?.nome?.charAt(0) || 'M'}
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white truncate max-w-[200px]">
              {driver?.nome || 'Motorista'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded-md">
                {driver?.categoria?.replace('_', ' ') || 'Veículo'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${isPremium ? 'text-purple-400 bg-purple-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                {isPremium ? 'Elite' : 'Pioneiro'}
              </span>
            </div>
          </div>
        </div>

        <button onClick={openWhatsAppSupport} className="flex h-[72px] items-center justify-center gap-2 bg-slate-900/60 text-slate-300 px-6 py-4 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all border border-white/10 w-full lg:w-auto shrink-0">
          <MessageCircle size={18} /> Central de Apoio
        </button>
      </div>

      {/* STATUS GRID (O QUE IMPORTA PRO MOTORISTA) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        <div className="rounded-3xl border border-emerald-500/20 bg-slate-900/80 p-5 flex flex-col shadow-[0_10px_30px_rgba(16,185,129,0.05)] relative overflow-hidden group">
          <DollarSign className="absolute -right-2 -bottom-2 w-16 h-16 text-emerald-500/5 transition-colors" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 relative z-10">
            Ganhos Hoje
          </p>
          <h3 className="mt-2 text-2xl md:text-3xl font-black text-white tracking-tighter relative z-10">
            R$ 0,00
          </h3>
        </div>

        <div className="rounded-3xl border border-blue-500/20 bg-slate-900/80 p-5 flex flex-col shadow-[0_10px_30px_rgba(59,130,246,0.05)] relative overflow-hidden group">
          <Truck className="absolute -right-2 -bottom-2 w-16 h-16 text-blue-500/5 transition-colors" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 relative z-10">
            Entregas
          </p>
          <h3 className="mt-2 text-2xl md:text-3xl font-black text-white tracking-tighter relative z-10">
            0
          </h3>
        </div>

        <div className="rounded-3xl border border-amber-500/20 bg-slate-900/80 p-5 flex flex-col shadow-[0_10px_30px_rgba(245,158,11,0.05)] relative overflow-hidden group">
          <Star className="absolute -right-2 -bottom-2 w-16 h-16 text-amber-500/5 transition-colors" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 relative z-10">
            Avaliação
          </p>
          <h3 className="mt-2 text-2xl md:text-3xl font-black text-white tracking-tighter relative z-10">
            {driver?.score ? Number(driver.score).toFixed(1) : '5.0'}
          </h3>
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-slate-900/80 p-5 flex flex-col shadow-[0_10px_30px_rgba(168,85,247,0.05)] relative overflow-hidden group">
          <Award className="absolute -right-2 -bottom-2 w-16 h-16 text-purple-500/5 transition-colors" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 relative z-10">
            Taxa de Aceite
          </p>
          <h3 className="mt-2 text-2xl md:text-3xl font-black text-white tracking-tighter relative z-10">
            100%
          </h3>
        </div>

      </div>
    </div>
  );
}
