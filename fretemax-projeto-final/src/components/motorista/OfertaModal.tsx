import { Clock, Zap } from 'lucide-react';

interface OrderData {
  id?: string;
  enderecoColetaTexto?: string;
  enderecoEntregaTexto?: string;
  valorMotorista?: number;
  distancia?: number;
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-md animate-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-green-500/30 bg-slate-900 p-8 text-center shadow-[0_20px_60px_rgba(34,197,94,0.2)]">

        <div
          className="absolute left-0 top-0 h-1.5 bg-green-500 transition-all duration-1000"
          style={{
            width: `${(tempoRestante / 15) * 100}%`,
          }}
        />

        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-green-500/20 bg-green-500/10">
          <Zap className="h-10 w-10 text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
        </div>

        <h2 className="mb-2 text-3xl font-black uppercase italic tracking-tight text-white">
          Carga no Radar!
        </h2>

        <p className="mb-6 flex items-center justify-center gap-2 text-sm font-black text-green-400 animate-pulse">
          <Clock size={16} />
          00:{tempoRestante.toString().padStart(2, '0')}
        </p>

        <div className="mb-6 rounded-3xl border border-white/5 bg-slate-950/60 p-6 text-left shadow-inner">
          <div className="mb-4">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Local de Coleta
            </p>

            <p className="text-sm font-bold text-white">
              {ofertaFrete.enderecoColetaTexto}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Local de Entrega
            </p>

            <p className="text-sm font-bold text-white">
              {ofertaFrete.enderecoEntregaTexto}
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-white/5 bg-slate-950/60 p-6">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Ganhos Operacionais
          </p>

          <h3 className="text-5xl font-black tracking-tighter text-green-400 drop-shadow-md">
            R${' '}
            {ofertaFrete.valorMotorista
              ?.toFixed(2)
              .replace('.', ',')}
          </h3>

          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            {ofertaFrete.distancia?.toFixed(1)} km percorridos
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onRecusar}
            className="flex-1 rounded-[1.25rem] border border-white/10 bg-white/5 px-6 py-5 text-sm font-black uppercase tracking-widest text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            Recusar
          </button>

          <button
            onClick={onAceitar}
            className="flex-1 rounded-[1.25rem] bg-green-500 px-6 py-5 text-[15px] font-black uppercase italic tracking-widest text-slate-950 shadow-[0_15px_30px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] active:scale-95"
          >
            Aceitar Carga
          </button>
        </div>
      </div>
    </div>
  );
}
