import {
  Clock3,
  MapPin,
  Package,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react';

import type {
  OperationalFreight,
} from './DriverDashboardLayout';

interface AvailableFreightsProps {
  freights: OperationalFreight[];
  isOnline: boolean;
  loading?: boolean;
  onSelectFreight: (
    freight: OperationalFreight,
  ) => void;
}

const CATEGORY_LABELS: Record<
  string,
  string
> = {
  moto: 'Moto',
  carro: 'Carro',
  utilitario: 'Utilitário',
  toco: 'Toco',
  truck: 'Truck',
  carreta: 'Carreta',
  bitrem: 'Bitrem',
};

export default function AvailableFreights({
  freights,
  isOnline,
  loading = false,
  onSelectFreight,
}: AvailableFreightsProps) {
  return (
    <section className="relative w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
            <Sparkles size={12} className="text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
              DISPATCH ATIVO
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            Cargas na Região
          </h2>
        </div>

        <div className="hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 md:flex md:flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">
            Disponíveis
          </span>
          <strong className="mt-1 text-2xl font-black text-white">
            {freights.length}
          </strong>
        </div>
      </div>

      {!isOnline && (
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/50 p-8 text-center">
          <Truck size={48} className="mx-auto text-slate-600 mb-4 opacity-50" />
          <h3 className="text-xl font-black text-white">
            Você está Offline
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Ligue o radar operacional para visualizar e aceitar fretes.
          </p>
        </div>
      )}

      {isOnline && loading && (
        <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-12 text-center">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">
            Buscando operações...
          </p>
        </div>
      )}

      {isOnline && !loading && freights.length === 0 && (
        <div className="rounded-[2rem] border border-dashed border-slate-700 bg-[#020817] p-12 text-center">
          <Radar size={48} className="mx-auto text-cyan-500/50 animate-pulse mb-4" />
          <h3 className="text-2xl font-black text-white">
            Nenhuma carga no momento
          </h3>
          <p className="mt-3 text-slate-400 max-w-sm mx-auto">
            Mantenha o radar ligado. O sistema avisará assim que um novo frete for liberado na sua região.
          </p>
        </div>
      )}

      {isOnline && freights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          {freights.map((freight) => (
            <div
              key={freight.id}
              className="group relative overflow-hidden rounded-[2rem] border-2 border-slate-800 bg-slate-950 p-6 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.1)] flex flex-col justify-between"
            >
              <div className="absolute right-[-4rem] top-[-4rem] h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      {CATEGORY_LABELS[freight.categoria || 'carro']}
                    </div>
                    {freight.prioridade && (
                      <div className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-400">
                        <Zap size={10} /> Prioridade
                      </div>
                    )}
                  </div>
                  <h2 className="text-3xl font-black text-emerald-400 tracking-tighter">
                    <span className="text-lg text-emerald-500/70 mr-1">R$</span>
                    {(freight.valorMotorista || 0).toFixed(2)}
                  </h2>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl bg-slate-900/80 p-4 border border-white/5 mb-6 relative">
                  <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-slate-700 border-l border-dashed border-slate-600"></div>
                  
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
                      <MapPin size={12} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Coleta ({freight.etaMinutes || 0} min)</p>
                      <h3 className="text-sm font-bold text-white leading-tight mt-0.5 line-clamp-2">
                        {freight.enderecoColetaTexto}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 relative z-10">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Truck size={12} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Entrega Final</p>
                      <h3 className="text-sm font-bold text-white leading-tight mt-0.5 line-clamp-2">
                        {freight.enderecoEntregaTexto}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6 px-2">
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Distância</span>
                    <strong className="text-sm text-white">{(freight.distanciaTotalKm || 0).toFixed(1)} km</strong>
                  </div>
                  <div className="h-6 w-px bg-slate-800"></div>
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Peso</span>
                    <strong className="text-sm text-white">{(freight.pesoKg || 0).toFixed(0)} kg</strong>
                  </div>
                  <div className="h-6 w-px bg-slate-800"></div>
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Volumes</span>
                    <strong className="text-sm text-white">{freight.volumes || 1}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectFreight(freight)}
                className="w-full h-14 rounded-2xl bg-emerald-500 text-sm font-black uppercase tracking-[0.2em] text-slate-950 transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-400 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                VER DETALHES DA ROTA
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
