import {
  Clock3,
  MapPinned,
  Package,
  Truck,
  X,
  Check,
  Zap,
  ShieldCheck,
} from 'lucide-react';

import type {
  OperationalFreight,
} from './DriverDashboardLayout';

interface FreightRequestModalProps {
  freight?: OperationalFreight | null;

  visible?: boolean;

  processing?: boolean;

  onClose: () => void;

  onAccept: () => void;

  onReject: () => void;
}

const CATEGORY_LABELS: Record<
  string,
  string
> = {
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
  if (!visible || !freight) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="absolute h-[35rem] w-[35rem] rounded-full bg-cyan-500/10 blur-[180px]" />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-[#020617]/95 shadow-[0_0_80px_rgba(6,182,212,0.12)]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10">
              <Zap
                size={24}
                className="text-cyan-400"
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                MATCH OPERACIONAL
              </p>

              <h2 className="mt-1 text-2xl font-black text-white">
                Operação disponível
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={processing}
            className="rounded-xl border border-white/10 p-3 text-slate-400 transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
            <div className="flex items-center gap-3">
              <Clock3
                size={22}
                className="text-yellow-400"
              />

              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-yellow-300">
                  Janela operacional
                </p>

                <h3 className="mt-1 text-3xl font-black text-white">
                  {
                    freight.etaMinutes
                  }
                  min
                </h3>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/70 p-5">
              <MapPinned
                size={22}
                className="text-cyan-400"
              />

              <p className="mt-4 text-xs uppercase tracking-widest text-slate-500">
                Coleta
              </p>

              <h3 className="mt-1 text-xl font-black text-white">
                {
                  freight.enderecoColetaTexto
                }
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Distância:
                {' '}
                {(
                  freight.distanciaColetaKm ||
                  0
                ).toFixed(1)}
                km
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/10 bg-slate-900/70 p-5">
              <Package
                size={22}
                className="text-emerald-400"
              />

              <p className="mt-4 text-xs uppercase tracking-widest text-slate-500">
                Entrega
              </p>

              <h3 className="mt-1 text-xl font-black text-white">
                {
                  freight.enderecoEntregaTexto
                }
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Distância:
                {' '}
                {(
                  freight.distanciaEntregaKm ||
                  0
                ).toFixed(1)}
                km
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
              <Truck
                size={18}
                className="text-cyan-400"
              />

              <p className="mt-3 text-xs uppercase tracking-widest text-slate-500">
                Categoria
              </p>

              <h4 className="mt-1 text-lg font-black text-white">
                {
                  CATEGORY_LABELS[
                    freight.categoria ||
                      'carro'
                  ]
                }
              </h4>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
              <Package
                size={18}
                className="text-yellow-400"
              />

              <p className="mt-3 text-xs uppercase tracking-widest text-slate-500">
                Peso
              </p>

              <h4 className="mt-1 text-lg font-black text-white">
                {(
                  freight.pesoKg || 0
                ).toFixed(0)}
                kg
              </h4>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
              <ShieldCheck
                size={18}
                className="text-purple-400"
              />

              <p className="mt-3 text-xs uppercase tracking-widest text-slate-500">
                Volumes
              </p>

              <h4 className="mt-1 text-lg font-black text-white">
                {
                  freight.volumes
                }
              </h4>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
              <Zap
                size={18}
                className="text-emerald-400"
              />

              <p className="mt-3 text-xs uppercase tracking-widest text-slate-500">
                Valor líquido
              </p>

              <h4 className="mt-1 text-lg font-black text-emerald-400">
                R$
                {' '}
                {(
                  freight.valorMotorista ||
                  0
                ).toFixed(2)}
              </h4>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                  KM TOTAL
                </p>

                <strong className="mt-2 block text-3xl font-black text-white">
                  {(
                    freight.distanciaTotalKm ||
                    0
                  ).toFixed(1)}
                  km
                </strong>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                  STATUS
                </p>

                <strong className="mt-2 block text-3xl font-black text-emerald-300">
                  {freight.status ||
                    'DISPONÍVEL'}
                </strong>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={onReject}
              disabled={processing}
              className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-6 py-5 text-sm font-black uppercase tracking-[0.2em] text-slate-300 transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={18} />

              RECUSAR
            </button>

            <button
              onClick={onAccept}
              disabled={processing}
              className="flex items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-6 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={18} />

              {processing
                ? 'PROCESSANDO...'
                : 'ACEITAR FRETE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
