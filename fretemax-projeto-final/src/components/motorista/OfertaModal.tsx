// =========================================================
// NOME DO ARQUIVO: src/components/motorista/OfertaModal.tsx
// CTO-Log: Pop-up de Despacho Rápido.
// Status: Cálculo de KM fixado. Progress Bar perfeitamente sincronizada com o Backend.
// =========================================================

import { Clock, Zap, Package, MapPin, Truck, Layers } from 'lucide-react';

interface OrderData {
  id?: string;
  enderecoColetaTexto?: string;
  enderecoEntregaTexto?: string;
  valorMotorista?: number;
  distancia?: number;
  distanciaTotalKm?: number;
  pesoKg?: number;
  volumes?: number;
  tipoCarga?: string;
  multiplasEntregas?: boolean;
  categoria?: string;
}

interface OfertaModalProps {
  exibindoOferta: boolean;
  ofertaFrete: OrderData | null;
  tempoRestante: number;
  onAceitar: () => void;
  onRecusar: () => void;
}

export default function OfertaModal({
  exibindoOferta,
  ofertaFrete,
  tempoRestante,
  onAceitar,
  onRecusar,
}: OfertaModalProps) {
  if (!exibindoOferta || !ofertaFrete) {
    return null;
  }

  // Usa distanciaTotalKm se existir, senão usa distancia
  const kmMostrado = ofertaFrete.distanciaTotalKm || ofertaFrete.distancia || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-green-500/30 bg-slate-900 shadow-[0_20px_60px_rgba(34,197,94,0.15)] flex flex-col max-h-[90vh]">

        {/* BARRA DE PROGRESSO (Sincronizada para 30 Segundos) */}
        <div
          className="absolute left-0 top-0 h-1.5 bg-green-500 transition-all duration-1000 ease-linear"
          style={{ width: `${(tempoRestante / 30) * 100}%` }}
        />

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-green-500/20 bg-green-500/10 shrink-0">
            <Zap className="h-8 w-8 text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
          </div>

          <h2 className="mb-1 text-center text-2xl font-black uppercase italic tracking-tight text-white">
            Carga no Radar!
          </h2>

          <p className="mb-6 flex items-center justify-center gap-2 text-sm font-black text-green-400 animate-pulse">
            <Clock size={16} />
            00:{tempoRestante.toString().padStart(2, '0')}
          </p>

          {/* INFORMAÇÕES DA ROTA */}
          <div className="mb-4 rounded-3xl border border-white/5 bg-slate-950/60 p-5 text-left shadow-inner">
            <div className="mb-4 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Local de Coleta</p>
                <p className="text-xs font-bold text-white leading-relaxed line-clamp-2">{ofertaFrete.enderecoColetaTexto}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Truck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  Destino {ofertaFrete.multiplasEntregas && <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[8px]">Múltiplas Paradas</span>}
                </p>
                <p className="text-xs font-bold text-white leading-relaxed line-clamp-2">{ofertaFrete.enderecoEntregaTexto}</p>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 flex flex-col items-center justify-center text-center">
              <Package className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Peso</p>
              <p className="text-sm font-bold text-white">{ofertaFrete.pesoKg || '---'} kg</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 flex flex-col items-center justify-center text-center">
              <Layers className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Qtd / Tipo</p>
              <p className="text-sm font-bold text-white truncate max-w-full">{ofertaFrete.volumes || 1}x {ofertaFrete.tipoCarga || 'Vol'}</p>
            </div>
          </div>

          {/* GANHOS OPERACIONAIS */}
          <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-5 text-center">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Ganhos Operacionais</p>
            <h3 className="text-4xl md:text-5xl font-black tracking-tighter text-green-400 drop-shadow-md">
              R$ {ofertaFrete.valorMotorista?.toFixed(2).replace('.', ',') || '0,00'}
            </h3>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {kmMostrado.toFixed(1)} km totais calculados
            </p>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="p-4 bg-slate-900 border-t border-white/5 flex gap-3 shrink-0">
          <button
            onClick={onRecusar}
            className="flex-1 rounded-2xl border border-white/10 bg-transparent px-2 py-4 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
          >
            Recusar
          </button>
          <button
            onClick={onAceitar}
            className="flex-[2] rounded-2xl bg-green-500 px-4 py-4 text-sm font-black uppercase italic tracking-widest text-slate-950 shadow-[0_10px_20px_rgba(34,197,94,0.2)] transition-all hover:bg-green-400 hover:scale-[1.02] active:scale-95"
          >
            Aceitar Carga
          </button>
        </div>

      </div>
    </div>
  );
}
