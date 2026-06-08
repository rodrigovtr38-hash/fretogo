import {
  Clock3,
  MapPin,
  Package,
  Sparkles,
  Truck,
  Zap,
  CheckCircle2,
  X,
  ChevronRight
} from 'lucide-react';

import type {
  OperationalFreight,
} from './DriverDashboardLayout';

interface AvailableFreightsProps {
  freights: OperationalFreight[];
  isOnline: boolean;
  loading?: boolean;
  onSelectFreight: (freight: OperationalFreight) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
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
    <section className="relative w-full pb-20">
      
      {/* HEADER DA SEÇÃO */}
      <div className="mb-6 px-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">
              Ofertas <span className="text-cyan-500">No Radar</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              {isOnline ? `${freights.length} cargas encontradas` : 'Radar Offline'}
            </p>
          </div>
          {isOnline && (
            <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          )}
        </div>
      </div>

      {/* ESTADO: CARREGANDO */}
      {isOnline && loading && (
        <div className="py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">
            Sincronizando Dispatch...
          </p>
        </div>
      )}

      {/* ESTADO: NENHUMA CARGA */}
      {isOnline && !loading && freights.length === 0 && (
        <div className="rounded-[2rem] border border-white/5 bg-slate-900/30 p-12 text-center backdrop-blur-sm">
          <Package className="mx-auto h-12 w-12 text-slate-700 mb-4" />
          <h3 className="text-lg font-black text-white uppercase italic">Sem cargas no momento</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto">
            Aguarde um instante. Novas operações surgem a qualquer momento no seu raio de atuação.
          </p>
        </div>
      )}

      {/* GRID DE CARDS "IRRECUSÁVEIS" */}
      {isOnline && freights.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {freights.map((freight) => (
            <div
              key={freight.id}
              onClick={() => onSelectFreight(freight)}
              className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/80 p-5 cursor-pointer transition-all duration-300 hover:border-cyan-500/30 hover:bg-slate-900 shadow-xl"
            >
              {/* VALOR E CATEGORIA */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor Líquido</p>
                  <h2 className="text-3xl font-black text-emerald-400 mt-0.5 tracking-tighter">
                    R$ {(freight.valorMotorista || 0).toFixed(2)}
                  </h2>
                </div>
                <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                    {CATEGORY_LABELS[freight.categoria || 'carro']}
                  </span>
                </div>
              </div>

              {/* ROTA COMPACTA */}
              <div className="space-y-3 mb-5">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Coleta</p>
                    <p className="text-sm font-bold text-white truncate">{freight.enderecoColetaTexto}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Entrega</p>
                    <p className="text-sm font-bold text-white truncate">{freight.enderecoEntregaTexto}</p>
                  </div>
                </div>
              </div>

              {/* MÉTRICAS EM GRID */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="rounded-xl bg-black/20 p-2.5 border border-white/5">
                  <p className="text-[8px] font-black text-slate-500 uppercase">Distância</p>
                  <p className="text-xs font-black text-white mt-0.5">{(freight.distanciaTotalKm || 0).toFixed(0)}km</p>
                </div>
                <div className="rounded-xl bg-black/20 p-2.5 border border-white/5">
                  <p className="text-[8px] font-black text-slate-500 uppercase">Peso</p>
                  <p className="text-xs font-black text-white mt-0.5">{(freight.pesoKg || 0).toFixed(0)}kg</p>
                </div>
                <div className="rounded-xl bg-black/20 p-2.5 border border-white/5">
                  <p className="text-[8px] font-black text-slate-500 uppercase">Tempo</p>
                  <p className="text-xs font-black text-white mt-0.5">{freight.etaMinutes || 20}m</p>
                </div>
              </div>

              {/* BOTÃO DE ACEITE RÁPIDO */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFreight(freight);
                  }}
                  className="flex-[3] flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-xs font-black uppercase tracking-widest text-black transition-all hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={16} />
                  Aceitar Frete
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="flex-1 flex items-center justify-center rounded-2xl bg-slate-800 py-4 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-95 border border-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              {/* TAG DE PRIORIDADE */}
              {freight.prioridade && (
                <div className="absolute top-0 right-0">
                  <div className="bg-yellow-500 text-black text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                    Urgente
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
