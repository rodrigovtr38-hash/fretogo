// =========================================================
// NOME DO ARQUIVO: src/components/driver/dashboard/AvailableFreights.tsx
// CTO-Log: FASE 3 - Auditoria UX Feed.
// Correção: Remoção do botão de favoritar. Injeção de Tipo de Carga e Volumes.
// CTO-Log [Bloco 4]: Anti-Ghosting, Correção de Alarme por ID e Padronização de CTA.
// =========================================================

import { useEffect, useRef, useState } from 'react';
import { AlertOctagon, CheckCircle2, Flame, Package, Zap, ShieldCheck, Ruler, CalendarClock, Scale, Layers, FileText } from 'lucide-react';
import { dispatchRealtimeService } from '../../../services/dispatchRealtimeService';
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

const formatDistance = (km: number | undefined | null) => {
  if (!km || isNaN(km)) return '0 km';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export default function AvailableFreights({
  freights,
  isOnline,
  loading = false,
  onSelectFreight,
}: AvailableFreightsProps) {
  const [tick, setTick] = useState(0);
  const viewedFreights = useRef<Set<string>>(new Set());
  const prevTopFreightId = useRef<string | null>(null);

  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && freights.length > 0) {
      let hasNewFreight = false;
      const currentTopFreight = freights[0];

      freights.forEach(freight => {
        if (!viewedFreights.current.has(freight.id)) {
          viewedFreights.current.add(freight.id);
          dispatchRealtimeService.registrarVisualizacao(freight.id);
          hasNewFreight = true; // 🔥 CTO FIX: Detecta novidade pelo ID único
        }
      });

      // 🔥 CTO FIX: Dispara notificação se há uma carga nova no set, ou se a carga do topo mudou
      if (hasNewFreight || (currentTopFreight && currentTopFreight.id !== prevTopFreightId.current)) {
        try {
          const beep = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          beep.play().catch(() => console.warn('[UX] Bloqueio nativo evitado.'));
          
          if (Notification.permission === 'granted') {
            new Notification('Fretogo: Carga na Mesa!', {
              body: 'Toque para visualizar os detalhes e garantir o frete.',
              icon: '/icon-192.png'
            });
          }
        } catch (e) {}
      }
      prevTopFreightId.current = currentTopFreight ? currentTopFreight.id : null;
    } else if (freights.length === 0) {
      prevTopFreightId.current = null;
    }
  }, [freights, isOnline]);

  const now = Date.now();
  const validFreights = freights.filter(freight => {
    // 🔥 CTO FIX: Filtra Cargas Agendadas (Elas não devem poluir a malha ativa)
    if (freight.agendado || freight.tipoFrete === 'agendado') {
        return false; 
    }

    // 🔥 CTO FIX [Problema 1]: Anti-Ghosting. Esconde instantaneamente fretes já aceitos
    if (freight.status && !['disponivel', 'buscando_motorista'].includes(freight.status)) {
        return false;
    }
    
    // CTO FIX: Lê a data de expiração real gerada no backend
    if (freight.expiraEm) {
        const expirationTime = freight.expiraEm.toMillis ? freight.expiraEm.toMillis() : new Date(freight.expiraEm).getTime();
        return now < expirationTime;
    }
    
    return true; 
  });

  return (
    <section className="relative w-full pb-20 animate-in fade-in duration-500">
      
      <div className="mb-8 px-2 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase italic drop-shadow-md">
            Malha <span className="text-cyan-500">Ativa</span>
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5">
            {isOnline ? `${validFreights.length} cargas interceptadas` : 'Sistema em repouso'}
          </p>
        </div>
        {isOnline && (
          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
             <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Ao Vivo</span>
             <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          </div>
        )}
      </div>

      {isOnline && loading && (
        <div className="py-16 text-center bg-slate-900/40 rounded-[2.5rem] border border-cyan-500/10 backdrop-blur-sm">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 animate-pulse">
            Sincronizando Torre...
          </p>
        </div>
      )}

      {isOnline && !loading && validFreights.length === 0 && (
        <div className="rounded-[2.5rem] border border-dashed border-white/10 bg-slate-900/20 p-16 text-center backdrop-blur-sm">
          <Package className="mx-auto h-14 w-14 text-slate-600 mb-5 animate-pulse" />
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Radar Limpo</h3>
          <p className="mt-3 text-sm text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
            Mantenha a tela ligada. Novas rotas de alta lucratividade podem estourar aqui a qualquer segundo.
          </p>
        </div>
      )}

      {isOnline && validFreights.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2">
          {validFreights.map((freight: any) => {
            const isHot = freight.prioridade || (freight.valorMotorista && freight.valorMotorista > 150);
            const km = freight.distanciaRealKm || freight.distanciaTotalKm || freight.distanciaEntregaKm || freight.distancia || 1;
            const ganhoPorKm = (freight.valorLiquidoMotorista || freight.valorMotorista || 0) / km;
            
            const numParadas = freight.pinEntregas?.length || freight.paradas?.length || 1;
            const isMultiDrop = freight.multiplasEntregas || numParadas > 1;

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
                <div className="absolute top-0 left-0 h-1.5 bg-slate-950 w-full overflow-hidden">
                   <div className={`h-full w-full animate-[shrink_20s_linear] origin-left ${isHot ? 'bg-orange-500' : 'bg-cyan-500'}`} />
                </div>

                <div className="flex items-start justify-between mb-5 mt-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck size={12} className="text-emerald-400" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Pagamento Garantido</p>
                    </div>
                    <h2 className={`text-4xl font-black tracking-tighter drop-shadow-md ${isHot ? 'text-orange-400' : 'text-emerald-400'}`}>
                      <span className="text-xl mr-1">R$</span>
                      {(freight.valorLiquidoMotorista || freight.valorMotorista || 0).toFixed(2).replace('.', ',')}
                    </h2>
                    <p className="text-[9px] uppercase font-bold text-slate-500 mt-1">Empresa: <span className="text-slate-300">{freight.clienteNome || 'Privado'}</span></p>
                  </div>
                  <div className={`rounded-xl border px-3 py-1.5 flex flex-col items-end gap-1 ${isHot ? 'bg-orange-500/10 border-orange-500/30' : 'bg-slate-800 border-white/10'}`}>
                    <div className="flex items-center gap-1.5">
                      {isHot && <Flame size={14} className="text-orange-400 animate-pulse" />}
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isHot ? 'text-orange-400' : 'text-slate-300'}`}>
                        {CATEGORY_LABELS[freight.categoria || 'carro']}
                      </span>
                    </div>
                    {isMultiDrop && (
                      <span className="bg-purple-500/20 text-purple-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1 mt-1 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                        <Layers size={10} /> Multi-Drop ({numParadas})
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-6 bg-slate-950/50 p-4 rounded-2xl border border-white/5 relative">
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
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Destino Final</p>
                      <p className="text-sm font-bold text-white truncate mt-0.5">
                        {freight.enderecoEntregaTexto} 
                        {isMultiDrop && <span className="text-purple-400 ml-1"> (+ {numParadas - 1} paradas)</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-xl bg-slate-950/80 p-3 border border-white/5 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-2">
                       <Ruler size={14} className="text-slate-500" />
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Renda / Dist.</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-emerald-400">R$ {ganhoPorKm.toFixed(2)}/km</p>
                       <p className="text-[9px] font-bold text-white mt-0.5">{formatDistance(km)}</p>
                    </div>
                  </div>
                  
                  <div className="rounded-xl bg-slate-950/80 p-3 border border-white/5 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-2">
                       <FileText size={14} className="text-slate-500" />
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Carga</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-white truncate max-w-[80px]">{freight.tipoMaterial || 'Diversos'}</p>
                       <p className="text-[9px] font-bold text-slate-400 mt-0.5">{freight.qtdVolumes ? `${freight.qtdVolumes} un / ` : ''}{freight.pesoKg || freight.peso || '--'}kg</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFreight(freight);
                    }}
                    className={`w-full flex items-center justify-center gap-2 rounded-[1.5rem] py-4 text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg
                      ${isHot 
                        ? 'bg-orange-500 text-slate-950 hover:bg-orange-400 shadow-[0_5px_20px_rgba(249,115,22,0.2)]' 
                        : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_5px_20px_rgba(16,185,129,0.2)]'
                      }
                    `}
                  >
                    <CheckCircle2 size={18} />
                    {/* 🔥 CTO FIX [Problema 3]: Padronização realista de CTA */}
                    Revisar Oferta
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
