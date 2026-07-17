// =========================================================
// NOME DO ARQUIVO: src/components/driver/dashboard/AvailableFreights.tsx
// CTO-Log: Vitrine Operacional. UX voltada para urgência visual (Heatmap de oportunidades).
// =========================================================

import { useEffect, useRef } from 'react';
import { AlertOctagon, CheckCircle2, Flame, Package, X, Zap } from 'lucide-react';
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

  // Gatilho Sonoro de Nova Carga (Segurança contra bloqueio de Autoplay do Browser)
  useEffect(() => {
    if (isOnline && freights.length > prevFreightsLength.current) {
      try {
        const beep = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        beep.play().catch(() => console.warn('[UX] Bloqueio nativo de autoplay evitado. Áudio silenciado pelo navegador.'));
        
        if (Notification.permission === 'granted') {
          new Notification('Fretogo: Carga na Mesa!', {
            body: 'Toque para visualizar os detalhes e garantir o frete.',
            icon: '/icon-192.png'
          });
        }
      } catch (e) {
        console.error('[UX_ERROR] Falha no alerta sonoro', e);
      }
    }
    prevFreightsLength.current = freights.length;
  }, [freights, isOnline]);

  return (
    <section className="relative w-full pb-20">
      
      {/* HEADER DA SEÇÃO */}
      <div className="mb-8 px-2 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase italic drop-shadow-md">
            Malha <span className="text-cyan-500">Ativa</span>
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5">
            {isOnline ? `${freights.length} cargas interceptadas` : 'Sistema em repouso'}
          </p>
        </div>
        {isOnline && (
          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
             <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Ao Vivo</span>
             <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          </div>
        )}
      </div>

      {/* ESTADO: CARREGANDO */}
      {isOnline && loading && (
        <div className="py-16 text-center bg-slate-900/40 rounded-[2.5rem] border border-cyan-500/10 backdrop-blur-sm">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 animate-pulse">
            Sincronizando Torre...
          </p>
        </div>
      )}

      {/* ESTADO: NENHUMA CARGA */}
      {isOnline && !loading && freights.length === 0 && (
        <div className="rounded-[2.5rem] border border-dashed border-white/10 bg-slate-900/20 p-16 text-center backdrop-blur-sm">
          <Package className="mx-auto h-14 w-14 text-slate-600 mb-5 animate-pulse" />
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Radar Limpo</h3>
          <p className="mt-3 text-sm text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
            Mantenha a tela ligada. Novas rotas de alta lucratividade podem estourar aqui a qualquer segundo.
          </p>
        </div>
      )}

      {/* GRID DE CARDS */}
      {isOnline && freights.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2">
          {freights.map((freight) => {
            const isHot = freight.prioridade || (freight.valorMotorista && freight.valorMotorista > 150);

            return (
              <div
                key={freight.id}
                onClick={() => onSelectFreight(freight)}
                className={`group relative overflow-hidden rounded-[2rem] border p-6 cursor-pointer transition-all duration-300
                  ${isHot 
                    ? 'border-orange-500/40 bg-slate-900 shadow-[0_10px_40px_rgba(249,115,22,0.1)] hover:border-orange-400' 
                    : 'border-white/5 bg-slate-900/60 shadow-xl hover:border-cyan-500/30 hover:bg-slate-900/80'
                  }
                `}
              >
                {/* BARRA DE ESCASSEZ PSICOLÓGICA */}
                <div className="absolute top-0 left-0 h-1.5 bg-slate-950 w-full overflow-hidden">
                   <div className={`h-full w-full animate-[shrink_20s_linear] origin-left ${isHot ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]'}`} />
                </div>

                <div className="flex items-start justify-between mb-5 mt-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Pagamento na Entrega</p>
                    <h2 className={`text-4xl font-black tracking-tighter drop-shadow-md ${isHot ? 'text-orange-400' : 'text-emerald-400'}`}>
                      <span className="text-xl mr-1">R$</span>
                      {(freight.valorMotorista || 0).toFixed(2).replace('.', ',')}
                    </h2>
                  </div>
                  <div className={`rounded-xl border px-3 py-1.5 flex items-center gap-1.5 ${isHot ? 'bg-orange-500/10 border-orange-500/30' : 'bg-slate-800 border-white/10'}`}>
                    {isHot && <Flame size={14} className="text-orange-400 animate-pulse" />}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isHot ? 'text-orange-400' : 'text-slate-300'}`}>
                      {CATEGORY_LABELS[freight.categoria || 'carro']}
                    </span>
                  </div>
                </div>

                {/* ROTA COMPACTA */}
                <div className="space-y-3 mb-6 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 flex h-2.5 w-2.5 rounded-full bg-cyan-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Coleta</p>
                      <p className="text-sm font-bold text-white truncate mt-0.5">{freight.enderecoColetaTexto}</p>
                    </div>
                  </div>
                  <div className="border-l-2 border-dashed border-slate-800 ml-[4px] pl-5 py-1">
                     <AlertOctagon size={14} className="text-slate-700" />
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 flex h-2.5 w-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Destino</p>
                      <p className="text-sm font-bold text-white truncate mt-0.5">{freight.enderecoEntregaTexto}</p>
                    </div>
                  </div>
                </div>

                {/* MÉTRICAS EM GRID */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="rounded-xl bg-slate-950/80 p-3 border border-white/5 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trajeto</p>
                    <p className="text-sm font-black text-white mt-1">{(freight.distanciaTotalKm || 0).toFixed(0)} km</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/80 p-3 border border-white/5 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Carga</p>
                    <p className="text-sm font-black text-white mt-1">{(freight.pesoKg || 0).toFixed(0)} kg</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/80 p-3 border border-white/5 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tempo</p>
                    <p className="text-sm font-black text-white mt-1">{freight.etaMinutes || 20} min</p>
                  </div>
                </div>

                {/* AÇÕES RAPIDAS */}
                <div className="flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFreight(freight);
                    }}
                    className={`flex-[3] flex items-center justify-center gap-2 rounded-[1.5rem] py-4 text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg
                      ${isHot 
                        ? 'bg-orange-500 text-slate-950 hover:bg-orange-400 shadow-[0_5px_20px_rgba(249,115,22,0.2)]' 
                        : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_5px_20px_rgba(16,185,129,0.2)]'
                      }
                    `}
                  >
                    <CheckCircle2 size={18} />
                    {isHot ? 'Capturar Urgente' : 'Visualizar Carga'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="flex-1 flex items-center justify-center rounded-[1.5rem] bg-slate-950 py-4 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 active:scale-95 border border-white/5"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* TAG ABSOLUTA DE PRIORIDADE */}
                {isHot && (
                  <div className="absolute top-3 right-3 pointer-events-none">
                    <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-md">
                      <Zap size={12} className="animate-pulse" />
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
