import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  doc,
  onSnapshot,
} from 'firebase/firestore';

import {
  db,
} from '../firebase';

import {
  Activity,
  Camera,
  CheckCircle,
  Clock3,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  Zap,
} from 'lucide-react';

import MapaCliente from '../components/MapaCliente';

import {
  TripLifecycleService,
} from '../services/tripLifecycleService';

interface Props {
  freteId: string;
}

export default function DriverActiveTrip({
  freteId,
}: Props) {
  const mountedRef =
    useRef(false);

  const snapshotGuardRef =
    useRef('');

  const [
    frete,
    setFrete,
  ] = useState<any>(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    runtimeReady,
    setRuntimeReady,
  ] = useState(false);

  useEffect(() => {
    mountedRef.current =
      true;

    const frame =
      requestAnimationFrame(
        () => {
          if (
            mountedRef.current
          ) {
            setRuntimeReady(
              true,
            );
          }
        },
      );

    return () => {
      mountedRef.current =
        false;

      cancelAnimationFrame(
        frame,
      );
    };
  }, []);

  useEffect(() => {
    if (
      !runtimeReady ||
      !freteId
    ) {
      return;
    }

    const unsubscribe =
      onSnapshot(
        doc(
          db,
          'fretes',
          freteId,
        ),

        snapshot => {
          if (
            !mountedRef.current
          ) {
            return;
          }

          if (
            !snapshot.exists()
          ) {
            return;
          }

          const next =
            snapshot.data();

          const fingerprint =
            JSON.stringify({
              status:
                next.status,
              updatedAt:
                next.updatedAt,
            });

          if (
            snapshotGuardRef.current ===
            fingerprint
          ) {
            return;
          }

          snapshotGuardRef.current =
            fingerprint;

          setFrete(next);
        },
      );

    return () => {
      unsubscribe();
    };
  }, [
    runtimeReady,
    freteId,
  ]);

  const statusLabel =
    useMemo(() => {
      switch (
        frete?.status
      ) {
        case 'aceito':
          return 'MATCHING CONFIRMADO';

        case 'indo_coleta':
          return 'INDO PARA COLETA';

        case 'chegou_coleta':
          return 'COLETA CONFIRMADA';

        case 'coletando':
          return 'COLETANDO CARGA';

        case 'em_transporte':
          return 'TRANSPORTE ATIVO';

        case 'em_entrega':
          return 'EM ENTREGA';

        case 'returning':
          return 'RETORNANDO AO RADAR';

        default:
          return 'OPERAÇÃO ATIVA';
      }
    }, [frete]);

  const updateStatus =
    useCallback(
      async (
        nextStatus: string,
      ) => {
        if (
          loading
        ) {
          return;
        }

        try {
          setLoading(
            true,
          );

          switch (
            nextStatus
          ) {
            case 'indo_coleta':
              await TripLifecycleService.alterarStatusViagem(
                freteId,
                nextStatus as any,
              );
              break;

            case 'chegou_coleta':
              await TripLifecycleService.alterarStatusViagem(
                freteId,
                nextStatus as any,
              );
              break;

            case 'coletando':
              await TripLifecycleService.alterarStatusViagem(
                freteId,
                nextStatus as any,
              );
              break;

            case 'em_transporte':
              await TripLifecycleService.alterarStatusViagem(
                freteId,
                nextStatus as any,
              );
              break;

            case 'em_entrega':
              await TripLifecycleService.alterarStatusViagem(
                freteId,
                nextStatus as any,
              );
              break;

            case 'returning':
              await TripLifecycleService.alterarStatusViagem(
                freteId,
                nextStatus as any,
              );
              break;

            case 'entregue':
              await TripLifecycleService.finalizarCorrida(
                freteId,
                frete.motoristaId,
              );
              break;
          }
        } catch (
          error
        ) {
          console.error(
            'TRIP STATUS ERROR:',
            error,
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        freteId,
        frete,
        loading,
      ],
    );

  if (
    !runtimeReady ||
    !frete
  ) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-[2rem] border border-cyan-500/10 bg-slate-900/80 text-white">
        <div className="text-center">
          <Activity className="mx-auto mb-5 h-12 w-12 animate-pulse text-cyan-400" />

          <h2 className="text-2xl font-black">
            Inicializando operação realtime...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-cyan-500/10 bg-slate-900/70 backdrop-blur-xl">
      <div className="border-b border-white/5 px-6 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">
              <Zap
                size={14}
                className="text-cyan-300"
              />

              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
                ACTIVE TRIP ENTERPRISE
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-black text-white">
              {
                statusLabel
              }
            </h1>

            <p className="mt-3 text-slate-400">
              Operação sincronizada em realtime com tracking e dispatch.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-300" />

              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
                  Runtime operacional
                </p>

                <strong className="mt-1 block text-xl font-black text-white">
                  TRACKING ATIVO
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-[#020617]">
          <div className="h-[520px]">
            <MapaCliente
              motoristaId={
                frete.motoristaId
              }
              origem={{
                lat:
                  frete.origemLat,
                lng:
                  frete.origemLng,
              }}
              destino={{
                lat:
                  frete.destinoLat,
                lng:
                  frete.destinoLng,
              }}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-white/5 bg-[#020617] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Truck className="text-cyan-400" />

              <h2 className="text-xl font-black uppercase text-white">
                Status operacional
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                <span className="text-slate-400">
                  Cliente
                </span>

                <strong className="text-white">
                  {
                    frete.clienteNome
                  }
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                <span className="text-slate-400">
                  Categoria
                </span>

                <strong className="uppercase text-cyan-300">
                  {
                    frete.categoria
                  }
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                <span className="text-slate-400">
                  ETA operacional
                </span>

                <strong className="text-emerald-300">
                  {
                    frete.etaMinutes
                  }
                  min
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                <span className="text-slate-400">
                  Distância total
                </span>

                <strong className="text-white">
                  {
                    frete.distanciaTotalKm
                  }
                  km
                </strong>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-[#020617] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Package className="text-yellow-400" />

              <h2 className="text-xl font-black uppercase text-white">
                Fluxo operacional
              </h2>
            </div>

            <div className="space-y-4">
              <button
                disabled={
                  loading
                }
                onClick={() =>
                  updateStatus(
                    'indo_coleta',
                  )
                }
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-cyan-500 font-black uppercase text-slate-950 transition-all duration-300 hover:bg-cyan-400"
              >
                <MapPin size={18} />

                Iniciar coleta
              </button>

              <button
                disabled={
                  loading
                }
                onClick={() =>
                  updateStatus(
                    'chegou_coleta',
                  )
                }
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-yellow-500 font-black uppercase text-slate-950 transition-all duration-300 hover:bg-yellow-400"
              >
                <Clock3 size={18} />

                Confirmar coleta
              </button>

              <button
                disabled={
                  loading
                }
                onClick={() =>
                  updateStatus(
                    'em_transporte',
                  )
                }
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-purple-500 font-black uppercase text-white transition-all duration-300 hover:bg-purple-400"
              >
                <Truck size={18} />

                Transporte ativo
              </button>

              <button
                disabled={
                  loading
                }
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-slate-700 font-black uppercase text-white transition-all duration-300 hover:bg-slate-600"
              >
                <Camera size={18} />

                Validar comprovante
              </button>

              <button
                disabled={
                  loading
                }
                onClick={() =>
                  updateStatus(
                    'entregue',
                  )
                }
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 font-black uppercase text-slate-950 transition-all duration-300 hover:bg-emerald-400"
              >
                <CheckCircle size={18} />

                Finalizar entrega
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
