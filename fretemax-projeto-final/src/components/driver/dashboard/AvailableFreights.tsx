import { useEffect, useRef } from 'react';
import {
  Clock3,
  MapPin,
  Package,
  Sparkles,
  Truck,
  Zap,
  CheckCircle2,
  X,
  Flame,
  AlertOctagon
} from 'lucide-react';

import type { OperationalFreight } from './DriverDashboardLayout';

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
  const prevFreightsLength = useRef(freights.length);

  // CTO-LOG: Gatilho Sonoro de Nova Carga
  useEffect(() => {
    if (isOnline && freights.length > prevFreightsLength.current) {
      try {
        // Tenta tocar um som nativo ou som de notificação padrão
        const beep = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        beep.play().catch(() => console.warn('Bloqueio de autoplay do navegador evitado.'));
        
        if (Notification.permission === 'granted') {
          new Notification('Fretogo: Nova Carga!', {
            body: 'Dinheiro na mesa. Aceite a carga antes de outro motorista.',
            icon: '/icon-192.png'
          });
        }
      } catch (e) {
        console.error('Erro no alerta sonoro', e);
      }
    }
    prevFreightsLength.current = freights.length;
  }, [freights, isOnline]);

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
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Buscando</span>
               <div className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
            </div>
          )}
        </div>
      </div>

      {/* ESTADO: CARREGANDO */}
      {isOnline && loading && (
        <div className="py-10 text-center bg-slate-900/50 rounded-[2rem] border border-cyan-500/20">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 animate-pulse">
            Sincronizando Malha...
          </p>
        </div>
      )}

      {/* ESTADO: NENHUMA CARGA */}
      {isOnline && !loading && freights.length === 0 && (
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-slate-900/30 p-12 text-center backdrop-blur-sm">
          <Package className="mx-auto h-12 w-12 text-slate-700 mb-4 animate-bounce" style={{ animationDuration: '3s' }} />
          <h3 className="text-lg font-black text-white uppercase italic">Radar Limpo</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto font-medium">
            Fique atento. Novas rotas da Fretogo podem estourar na sua tela a qualquer segundo.
          </p>
        </div>
      )}

      {/* GRID DE CARDS "IRRECUSÁVEIS" */}
      {isOnline && freights.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {freights.map((freight) => {
            // CTO-LOG: Regra de Temperatura. Se for prioridade ou valor alto, a chapa esquenta.
            const isHot = freight.prioridade || (freight.valorMotorista && freight.valorMotorista > 150);

            return (
              <div
                key={freight.id}
                onClick={() => onSelectFreight(freight)}
                className={`group relative overflow-hidden rounded-3xl border p-5 cursor-pointer transition-all duration-300 shadow-xl
                  ${isHot 
                    ? 'border-orange-500/50 bg-slate-900 hover:border-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]' 
                    : 'border-white/5 bg-slate-900/80 hover:border-cyan-500/30'
                  }
                `}
              >
                {/* BARRA DE ESCASSEZ PSICOLÓGICA (Animação contínua para gerar urgência) */}
                <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full overflow-hidden">
                   <div className={`h-full w-full animate-[shrink_15s_linear] origin-left ${isHot ? 'bg-orange-500' : 'bg-cyan-500'}`} />
                </div>

                {/* VALOR E CATEGORIA */}
                <div className="flex items-start justify-between mb-4 mt-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor Líquido Fretogo</p>
                    <h2 className={`text-3xl font-black mt-0.5 tracking-tighter ${isHot ? 'text-orange-400' : 'text-emerald-400'}`}>
                      R$ {(freight.valorMotorista || 0).toFixed(2)}
                    </h2>
                  </div>
                  <div className={`rounded-xl border px-3 py-1.5 flex items-center gap-1 ${isHot ? 'bg-orange-500/10 border-orange-500/30' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                    {isHot && <Flame size={12} className="text-orange-400 animate-pulse" />}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isHot ? 'text-orange-400' : 'text-cyan-400'}`}>
                      {CATEGORY_LABELS[freight.categoria || 'carro']}
                    </span>
                  </div>
                </div>

                {/* ROTA COMPACTA */}
                <div className="space-y-3 mb-5 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 flex h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Coleta</p>
                      <p className="text-sm font-bold text-white truncate">{freight.enderecoColetaTexto}</p>
                    </div>
                  </div>
                  <div className="border-l border-dashed border-slate-700 ml-1 pl-4 py-1">
                     <AlertOctagon size={12} className="text-slate-600" />
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Entrega</p>
                      <p className="text-sm font-bold text-white truncate">{freight.enderecoEntregaTexto}</p>
                    </div>
                  </div>
                </div>

                {/* MÉTRICAS EM GRID */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <div className="rounded-xl bg-slate-950 p-2.5 border border-white/5 text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase">Distância</p>
                    <p className="text-xs font-black text-white mt-0.5">{(freight.distanciaTotalKm || 0).toFixed(0)}km</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-2.5 border border-white/5 text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase">Peso Máx</p>
                    <p className="text-xs font-black text-white mt-0.5">{(freight.pesoKg || 0).toFixed(0)}kg</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-2.5 border border-white/5 text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase">Tempo Est.</p>
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
                    className={`flex-[3] flex items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg
                      ${isHot 
                        ? 'bg-orange-500 text-white hover:bg-orange-400 shadow-orange-500/20' 
                        : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20'
                      }
                    `}
                  >
                    <CheckCircle2 size={16} />
                    {isHot ? 'Garantir Carga Rápido' : 'Aceitar Frete'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="flex-1 flex items-center justify-center rounded-2xl bg-slate-800 py-4 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-95 border border-white/5"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* TAG DE PRIORIDADE */}
                {isHot && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1 backdrop-blur-md">
                      <Zap size={10} className="animate-pulse" />
                      Alta Demanda
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
