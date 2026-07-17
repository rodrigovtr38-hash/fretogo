// =========================================================
// NOME DO ARQUIVO: src/components/driver/dashboard/FreightRequestModal.tsx
// CTO-Log: Contrato Visual de Fechamento. Foco absoluto na conversão (Aceite).
// =========================================================

import { Clock3, MapPinned, Package, Truck, X, Check, Zap, ShieldCheck } from 'lucide-react';
import type { OperationalFreight } from './DriverDashboardLayout';

interface FreightRequestModalProps {
  freight?: OperationalFreight | null;
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

export default function FreightRequestModal({
  freight,
  visible = false,
  processing = false,
  onClose,
  onAccept,
  onReject,
}: FreightRequestModalProps) {
  if (!visible || !freight) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="absolute h-[35rem] w-[35rem] rounded-full bg-cyan-500/10 blur-[180px] pointer-events-none" />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-cyan-500/30 bg-[#020617]/95 shadow-[0_0_80px_rgba(6,182,212,0.15)] animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-cyan-500/10 border border-cyan-500/20">
              <Zap size={24} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                Match Operacional
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

        <div className="space-y-5 p-6">
          {/* URGÊNCIA */}
          <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
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
          </div>

          {/* MAPA MENTAL DA ROTA */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/60 p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                 <MapPinned size={100} />
              </div>
              <MapPinned size={22} className="text-cyan-400" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Ponto de Coleta</p>
              <h3 className="mt-1 text-lg font-bold text-white leading-tight">{freight.enderecoColetaTexto}</h3>
              <p className="mt-3 text-xs font-bold text-slate-400">Distância: <span className="text-cyan-400">{(freight.distanciaColetaKm || 0).toFixed(1)} km</span></p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-slate-900/60 p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                 <Package size={100} />
              </div>
              <Package size={22} className="text-emerald-400" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Destino Final</p>
              <h3 className="mt-1 text-lg font-bold text-white leading-tight">{freight.enderecoEntregaTexto}</h3>
              <p className="mt-3 text-xs font-bold text-slate-400">Rota até entrega: <span className="text-emerald-400">{(freight.distanciaEntregaKm || 0).toFixed(1)} km</span></p>
            </div>
          </div>

          {/* ESPECIFICAÇÕES TÉCNICAS */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-center">
              <Truck size={18} className="mx-auto text-slate-400 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Veículo</p>
              <h4 className="mt-1 text-sm font-bold text-white truncate">{CATEGORY_LABELS[freight.categoria || 'carro']}</h4>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-center">
              <Package size={18} className="mx-auto text-slate-400 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Peso Bruto</p>
              <h4 className="mt-1 text-sm font-bold text-white">{(freight.pesoKg || 0).toFixed(0)} kg</h4>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-center">
              <ShieldCheck size={18} className="mx-auto text-slate-400 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Volumes</p>
              <h4 className="mt-1 text-sm font-bold text-white">{freight.volumes || 1} un</h4>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-4 text-center shadow-inner">
              <Zap size={18} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Valor Limpo</p>
              <h4 className="mt-1 text-sm font-black text-emerald-400">R$ {(freight.valorMotorista || 0).toFixed(2)}</h4>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex gap-3 pt-2">
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
                <span className="flex items-center gap-2 animate-pulse">PROCESSANDO...</span>
              ) : (
                <>
                  <Check size={20} /> ASSUMIR OPERAÇÃO
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
