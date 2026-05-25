import {
  Clock,
  Zap,
} from 'lucide-react';

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
  onAceitar: () => Promise<void>;
  onRecusar: () => void;
}

export default function OfertaModal({
  exibindoOferta,
  ofertaFrete,
  tempoRestante,
  onAceitar,
  onRecusar,
}: OfertaModalProps) {
  if (
    !exibindoOferta ||
    !ofertaFrete
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 backdrop-blur-md">

      <div className="w-full max-w-md rounded-[2rem] border border-green-500/20 bg-slate-950 p-8">

        <div
          className="mb-6 h-2 rounded-full bg-green-500 transition-all"
          style={{
            width: `${
              (tempoRestante / 15) *
              100
            }%`,
          }}
        />

        <div className="mb-5 flex justify-center">

          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-green-500/10">

            <Zap className="h-10 w-10 text-green-400" />

          </div>

        </div>

        <h2 className="text-center text-3xl font-black text-white">
          NOVA CARGA
        </h2>

        <p className="mt-2 flex items-center justify-center gap-2 text-green-400">

          <Clock size={16} />

          00:
          {tempoRestante
            .toString()
            .padStart(2, '0')}

        </p>

        <div className="mt-8 rounded-3xl bg-black/30 p-5">

          <p className="text-xs text-slate-500">
            COLETA
          </p>

          <p className="font-bold text-white">
            {
              ofertaFrete.enderecoColetaTexto
            }
          </p>

          <div className="mt-5" />

          <p className="text-xs text-slate-500">
            ENTREGA
          </p>

          <p className="font-bold text-white">
            {
              ofertaFrete.enderecoEntregaTexto
            }
          </p>

        </div>

        <div className="mt-6 rounded-3xl bg-green-500/10 p-6 text-center">

          <h3 className="text-5xl font-black text-green-400">

            R$
            {ofertaFrete.valorMotorista
              ?.toFixed(2)
              .replace('.', ',')}

          </h3>

          <p className="mt-2 text-sm text-slate-400">

            {ofertaFrete.distancia?.toFixed(
              1
            )}{' '}
            km

          </p>

        </div>

        <div className="mt-8 flex gap-4">

          <button
            onClick={onRecusar}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-sm font-black text-slate-400"
          >
            RECUSAR
          </button>

          <button
            onClick={async () => {
              await onAceitar();
            }}
            className="flex-1 rounded-2xl bg-green-500 px-6 py-5 text-sm font-black text-black"
          >
            ACEITAR
          </button>

        </div>

      </div>

    </div>
  );
}
