// =========================================================
// NOME DO ARQUIVO: src/components/driver/dashboard/FreightRequestModal.tsx
// CTO-Log: Auditoria 10/10. Sem intervenção requerida no Bloco 4. Mantido conforme exigência.
// Status: "TypeError: Cannot read properties of undefined" ERADICADO.
// Correção (Polimento): Tarja Visual MULTI-DROP e injeção de Informação Ouro (Tipo de Carga e Observações).
// =========================================================

import { Clock3, MapPinned, Package, Truck, X, Check, Zap, ShieldCheck, Info, Scale, Briefcase, Layers } from 'lucide-react';
import type { OperationalFreight } from './DriverDashboardLayout';

interface FreightRequestModalProps {
  freight?: OperationalFreight | any | null;
  visible?: boolean;
  processing?: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
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

export default function FreightRequestModal({
  freight,
  visible = false,
  processing = false,
  onClose,
  onAccept,
  onReject,
}: FreightRequestModalProps) {
  if (!visible || !freight) return null;

  const numParadas = freight.pinEntregas?.length || freight.paradas?.length || 1;
  const isMultiDrop = freight.multiplasEntregas || numParadas > 1;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="absolute h-[35rem] w-[35rem] rounded-full bg-cyan-500/10 blur-[180px] pointer-events-none" />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-cyan-500/30 bg-[#020617]/95 shadow-[0_0_80px_rgba(6,182,212,0.15)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-5 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-cyan-500/10 border border-cyan-500/20">
              <Zap size={24} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 flex items-center gap-1">
                Match Operacional <ShieldCheck size={12} className="text-emerald-400" />
              </p>
              <h2 className="mt-0.5 text-2xl font-black text-white tracking-tight">
                Revisão de Carga
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={processing}
            className="rounded-xl border border-white/10 p-3 text-slate-400 transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="space-y-5 p-6 overflow-y-auto custom-scrollbar">
          
          {/* URGÊNCIA & TEMPO */}
          <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                   <Clock3 size={24} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">
                    Tempo Estimado de Rota
                  </p>
                  <h3 className="mt-1 text-3xl font-black text-white tracking-tighter">
                    {freight.etaMinutes || 0} <span className="text-xl text-amber-100/50">min</span>
                  </h3>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-cyan-400" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase">
                    Percurso total: {formatDistance(freight.distanciaRealKm || freight.distanciaTotalKm || freight.distancia || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ALERTA MULTI-DROP */}
          {isMultiDrop && (
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-[1.5rem] p-4 flex items-center justify-center gap-3">
               <Layers className="text-purple-400 animate-pulse" size={20} />
               <p className="text-sm font-black text-purple-300 uppercase tracking-widest">
                 Atenção: Esta é uma Rota Multi-Drop ({numParadas} Paradas)
               </p>
            </div>
          )}

          {/* MAPA MENTAL DA ROTA */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/60 p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                 <MapPinned size={100} />
              </div>
              <MapPinned size={22} className="text-cyan-400" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Ponto de Coleta</p>
              <h3 className="mt-1 text-base md:text-lg font-bold text-white leading-tight line-clamp-3">{freight.enderecoColetaTexto}</h3>
              <p className="mt-3 text-xs font-bold text-slate-400">
                Distância até o local: <span className="text-cyan-400">{formatDistance(freight.distanciaAteColeta || 0)}</span>
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-slate-900/60 p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                 <MapPinned size={100} /> 
              </div>
              <MapPinned size={22} className="text-emerald-400" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Destino Final</p>
              <h3 className="mt-1 text-base md:text-lg font-bold text-white leading-tight line-clamp-3">{freight.enderecoEntregaTexto}</h3>
              <p className="mt-3 text-xs font-bold text-slate-400">
                {isMultiDrop ? `Roteiro com ${numParadas} paradas no total.` : 'Destino direto.'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-center flex flex-col justify-center">
              <Briefcase size={16} className="mx-auto text-blue-400 mb-1" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Embarcador</p>
              <h4 className="mt-1 text-xs font-bold text-white truncate">{freight.clienteNome || 'Empresa Privada'}</h4>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-center flex flex-col justify-center">
              <Package size={16} className="mx-auto text-purple-400 mb-1" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mercadoria</p>
              <h4 className="mt-1 text-xs font-bold text-white truncate" title={freight.tipoMaterial}>{freight.tipoMaterial || 'Diversos'}</h4>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5">{freight.qtdVolumes ? `${freight.qtdVolumes} volumes` : '--'}</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-center flex flex-col justify-center">
              <Scale size={16} className="mx-auto text-slate-400 mb-1" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Peso Bruto</p>
              <h4 className="mt-1 text-xs font-bold text-white">{(freight.pesoKg || freight.peso || '--')} kg</h4>
            </div>
            
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-4 text-center shadow-inner relative overflow-hidden flex flex-col justify-center">
              <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
              <Zap size={16} className="mx-auto text-emerald-400 mb-1 relative z-10" />
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 relative z-10">Valor Limpo</p>
              <h4 className="mt-1 text-sm font-black text-emerald-400 relative z-10">R$ {(freight.valorLiquidoMotorista || freight.valorMotorista || 0).toFixed(2).replace('.', ',')}</h4>
            </div>
          </div>
          
          {freight.observacoes && (
             <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-4 mt-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 flex items-center gap-1"><Info size={12}/> Instruções do Embarcador:</p>
                <p className="text-xs text-blue-200 font-medium">{freight.observacoes}</p>
             </div>
          )}
        </div>

        {/* FOOTER: BOTÕES DE AÇÃO */}
        <div className="shrink-0 flex gap-3 p-6 border-t border-white/5 bg-slate-900/80 backdrop-blur-md">
          <button
            onClick={onReject}
            disabled={processing}
            className="flex-1 flex items-center justify-center gap-2 rounded-[1.5rem] border border-white/10 bg-slate-950 px-4 py-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
            Recusar
          </button>

          <button
            onClick={onAccept}
            disabled={processing}
            className="flex-[2] flex items-center justify-center gap-2 rounded-[1.5rem] bg-cyan-500 px-6 py-5 text-sm font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all hover:scale-[1.02] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center gap-2 animate-pulse font-black">PROCESSANDO VÍNCULO...</span>
            ) : (
              <>
                <Check size={20} /> ASSUMIR OPERAÇÃO
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
