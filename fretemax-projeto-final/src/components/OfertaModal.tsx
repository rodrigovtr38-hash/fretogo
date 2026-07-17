// =========================================================
// NOME DO ARQUIVO: src/components/driver/OfertaModal.tsx
// CTO-Log: Lapidação de UX / Engenharia Comportamental (FOMO)
// =========================================================

import { Clock, Zap, Package, MapPin, Truck, Layers, Target } from 'lucide-react';

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

  const kmMostrado = ofertaFrete.distanciaTotalKm || ofertaFrete.distancia || 0;
  const valorFrete = ofertaFrete.valorMotorista || 0;
  
  // Métrica rápida para o cérebro: Quanto ele ganha por KM rodado nessa corrida?
  const valorPorKm = kmMostrado > 0 ? (valorFrete / kmMostrado).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-green-500/40 bg-slate-900 shadow-[0_0_80px_rgba(34,197,94,0.15)] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">

        {/* BARRA DE PROGRESSO */}
        <div
          className="absolute left-0 top-0 h-1.5 bg-green-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(34,197,94,0.8)]"
          style={{
            width: `${(tempoRestante / 30) * 100}%`,
          }}
        />

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
          
          {/* GATILHO DE EXCLUSIVIDADE (FOMO) */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 border border-amber-500/20">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
             </span>
             <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Exclusivo para você</span>
          </div>

          <div className="mx-auto mb-4 mt-2 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-green-500/20 bg-green-500/10 shrink-0">
            <Zap className="h-8 w-8 text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
          </div>

          <h2 className="mb-1 text-center text-2xl font-black uppercase italic tracking-tight text-white">
            Carga Capturada
          </h2>

          <p className="mb-6 flex items-center justify-center gap-2 text-sm font-black text-green-400 animate-pulse">
            <Clock size={16} />
            00:{tempoRestante.toString().padStart(2, '0')}
          </p>

          {/* INFORMAÇÕES DA ROTA */}
          <div className="mb-4 rounded-3xl border border-white/5 bg-slate-950/60 p-5 text-left shadow-inner relative overflow-hidden">
            <div className="absolute left-6 top-7 bottom-7 w-0.5 bg-slate-800 rounded-full"></div>
            
            <div className="mb-5 flex items-start gap-4 relative">
              <div className="bg-slate-950 p-1 rounded-full z-10">
                 <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              </div>
              <div className="pt-0.5">
                <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Ponto de Coleta</p>
                <p className="text-xs font-bold text-white leading-relaxed line-clamp-2">{ofertaFrete.enderecoColetaTexto}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 relative">
              <div className="bg-slate-950 p-1 rounded-full z-10">
                 <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <div className="pt-0.5">
                <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  Destino Final
                  {ofertaFrete.multiplasEntregas && <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[8px] border border-amber-500/30">Múltiplas Paradas</span>}
                </p>
                <p className="text-xs font-bold text-white leading-relaxed line-clamp-2">{ofertaFrete.enderecoEntregaTexto}</p>
              </div>
            </div>
          </div>

          {/* ESPECIFICAÇÕES DA CARGA */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 flex flex-col items-center justify-center text-center">
              <Package className="w-5 h-5 text-slate-400 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Peso Bruto</p>
              <p className="text-sm font-bold text-white">{ofertaFrete.pesoKg || '---'} kg</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 flex flex-col items-center justify-center text-center">
              <Layers className="w-5 h-5 text-slate-400 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Volumes</p>
              <p className="text-sm font-bold text-white truncate max-w-full">{ofertaFrete.volumes || 1}x {ofertaFrete.tipoCarga || 'Volume'}</p>
            </div>
          </div>

          {/* GANHOS OPERACIONAIS & INDICADOR DE RENTABILIDADE */}
          <div className="rounded-3xl border border-green-500/20 bg-green-950/20 p-5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>
            
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-green-500">Pagamento na Entrega</p>
            <h3 className="text-5xl font-black tracking-tighter text-white drop-shadow-md my-2">
              <span className="text-2xl text-green-500 mr-1">R$</span>
              {valorFrete.toFixed(2).replace('.', ',')}
            </h3>
            
            <div className="mt-3 flex items-center justify-center gap-3 divide-x divide-white/10">
               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pr-3 flex items-center gap-1">
                 <Target size={12} className="text-cyan-400" />
                 {kmMostrado.toFixed(1)} km totais
               </p>
               <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 pl-3">
                 R$ {valorPorKm} / km
               </p>
            </div>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="p-4 bg-slate-900 flex gap-3 shrink-0">
          <button
            onClick={onRecusar}
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-2 py-4 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
          >
            Passar
          </button>
          <button
            onClick={onAceitar}
            className="flex-[2] rounded-2xl bg-green-500 px-4 py-4 text-sm font-black uppercase italic tracking-widest text-slate-950 shadow-[0_10px_20px_rgba(34,197,94,0.2)] transition-all hover:bg-green-400 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            Aceitar Corrida <Zap size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
