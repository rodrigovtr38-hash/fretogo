import {
  Clock3,
  MapPin,
  Package,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react';

import type {
  OperationalFreight,
} from './DriverDashboardLayout';

interface AvailableFreightsProps {
  freights: OperationalFreight[];

  isOnline: boolean;

  loading?: boolean;

  onSelectFreight: (
    freight: OperationalFreight,
  ) => void;
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

export default function AvailableFreights({
  freights,
  isOnline,
  loading = false,
  onSelectFreight,
}: AvailableFreightsProps) {
  return (
    <section className="relative w-full">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">
            <Sparkles
              size={14}
              className="text-cyan-300"
            />

            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
              MATCHING ENTERPRISE
            </span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
            Radar operacional
          </h2>

          <p className="mt-2 text-slate-400">
            Fretes sincronizados em tempo real com dispatch e tracking operacional.
          </p>
        </div>

        <div className="hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 md:flex md:flex-col">
          <span className="text-xs uppercase tracking-[0.25em] text-emerald-300">
            Disponíveis
          </span>

          <strong className="mt-1 text-2xl font-black text-white">
            {freights.length}
          </strong>
        </div>
      </div>

      {!isOnline && (
        <div className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-6">
          <h3 className="text-xl font-black text-white">
            Radar offline
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-yellow-100">
            Ative o radar operacional para receber fretes compatíveis com sua categoria.
          </p>
        </div>
      )}

      {isOnline && loading && (
        <div className="rounded-[2rem] border border-cyan-500/20 bg-cyan-500/5 p-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">
            Carregando operações...
          </p>
        </div>
      )}

      {isOnline &&
        !loading &&
        freights.length === 0 && (
          <div className="rounded-[2rem] border border-white/10 bg-[#020817] p-8 text-center">
            <h3 className="text-2xl font-black text-white">
              Nenhuma carga encontrada
            </h3>

            <p className="mt-3 text-slate-400">
              O dispatch está buscando operações compatíveis na sua região.
            </p>
          </div>
        )}

      {isOnline &&
        freights.length > 0 && (
          <div className="grid gap-6">
            {freights.map(
              (freight) => (
                <div
                  key={freight.id}
                  className="group relative overflow-hidden rounded-[2rem] border border-cyan-500/10 bg-[#020817] p-6 transition-all duration-300 hover:border-cyan-400/30 hover:shadow-[0_0_60px_rgba(6,182,212,0.12)]"
                >
                  <div className="absolute right-[-4rem] top-[-4rem] h-40 w-40 rounded-full bg-cyan-500/5 blur-3xl" />

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        {freight.prioridade && (
                          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5">
                            <Zap
                              size={14}
                              className="text-yellow-300"
                            />

                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-300">
                              PRIORIDADE
                            </span>
                          </div>
                        )}

                        {freight.agendado && (
                          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5">
                            <Clock3
                              size={14}
                              className="text-purple-300"
                            />

                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-300">
                              AGENDADO
                            </span>
                          </div>
                        )}

                        <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5">
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                            {
                              CATEGORY_LABELS[
                                freight.categoria ||
                                  'carro'
                              ]
                            }
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <MapPin
                            size={18}
                            className="mt-1 text-cyan-400"
                          />

                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                              Coleta
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-white">
                              {
                                freight.enderecoColetaTexto
                              }
                            </h3>
                          </div>
                        </div>

                        <div className="ml-2 h-8 w-px bg-cyan-500/20" />

                        <div className="flex items-start gap-3">
                          <Truck
                            size={18}
                            className="mt-1 text-emerald-400"
                          />

                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                              Entrega
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-white">
                              {
                                freight.enderecoEntregaTexto
                              }
                            </h3>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-4 lg:w-[340px]">
                      <div className="rounded-3xl border border-cyan-500/10 bg-[#061224] p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Valor líquido
                        </p>

                        <h2 className="mt-2 text-5xl font-black text-emerald-400">
                          R$
                          {' '}
                          {(
                            freight.valorMotorista ||
                            0
                          ).toFixed(2)}
                        </h2>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-cyan-500/10 bg-[#020817] p-3">
                            <div className="flex items-center gap-2">
                              <Package
                                size={15}
                                className="text-cyan-400"
                              />

                              <span className="text-xs text-slate-400">
                                Distância
                              </span>
                            </div>

                            <strong className="mt-2 block text-white">
                              {(
                                freight.distanciaTotalKm ||
                                0
                              ).toFixed(1)}
                              km
                            </strong>
                          </div>

                          <div className="rounded-2xl border border-cyan-500/10 bg-[#020817] p-3">
                            <div className="flex items-center gap-2">
                              <Clock3
                                size={15}
                                className="text-emerald-400"
                              />

                              <span className="text-xs text-slate-400">
                                ETA
                              </span>
                            </div>

                            <strong className="mt-2 block text-white">
                              {
                                freight.etaMinutes
                              }
                              min
                            </strong>
                          </div>

                          <div className="rounded-2xl border border-cyan-500/10 bg-[#020817] p-3">
                            <span className="text-xs text-slate-400">
                              Peso
                            </span>

                            <strong className="mt-2 block text-white">
                              {(
                                freight.pesoKg ||
                                0
                              ).toFixed(0)}
                              kg
                            </strong>
                          </div>

                          <div className="rounded-2xl border border-cyan-500/10 bg-[#020817] p-3">
                            <span className="text-xs text-slate-400">
                              Volumes
                            </span>

                            <strong className="mt-2 block text-white">
                              {
                                freight.volumes
                              }
                            </strong>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          onSelectFreight(
                            freight,
                          )
                        }
                        className="h-14 rounded-2xl bg-cyan-500 text-sm font-black uppercase tracking-[0.25em] text-black transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-400 hover:shadow-[0_0_35px_rgba(6,182,212,0.45)]"
                      >
                        VER OPERAÇÃO
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
    </section>
  );
}
