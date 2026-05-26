// src/pages/Cliente.tsx

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Loader2,
  MapPin,
  Package,
  Radar,
  Sparkles,
  Truck,
  User,
  Zap,
} from 'lucide-react';

import MapaCliente from '../components/MapaCliente';

import ChatFrete from '../components/ChatFrete';

import ClientToast, {
  ClientToastData,
} from '../components/client/ClientToast';

import ClientCancelModal from '../components/client/ClientCancelModal';

import ClientStatusCard from '../components/client/ClientStatusCard';

import ClientDriverCard from '../components/client/ClientDriverCard';

import {
  useClientFreight,
} from '../hooks/useClientFreight';

import {
  useClientRealtime,
} from '../hooks/useClientRealtime';

import {
  useClientPayment,
} from '../hooks/useClientPayment';

import {
  AppTripState,
  isFinalState,
} from '../state/tripStateMachine';

/* =========================================================
   TYPES
========================================================= */

type VehicleCategory =
  | 'moto'
  | 'carro'
  | 'utilitario'
  | 'toco'
  | 'truck'
  | 'carreta'
  | 'bitrem';

interface FreightForm {
  clienteNome: string;
  clienteTelefone: string;

  origemEndereco: string;
  destinoEndereco: string;

  origemCidade: string;
  destinoCidade: string;

  origemLat: number;
  origemLng: number;

  destinoLat: number;
  destinoLng: number;

  categoria: VehicleCategory;

  tipoCarga: string;

  pesoKg: number;

  volumes: number;

  prioridade: 'normal' | 'urgente';

  observacoes: string;

  agendado: boolean;

  dataAgendamento: string;

  retornoDisponivel: boolean;
}

/* =========================================================
   CONSTANTS
========================================================= */

const VEHICLE_OPTIONS: Array<{
  value: VehicleCategory;
  label: string;
}> = [
  {
    value: 'moto',
    label: 'Moto',
  },

  {
    value: 'carro',
    label: 'Carro',
  },

  {
    value: 'utilitario',
    label: 'Utilitário',
  },

  {
    value: 'toco',
    label: 'Toco',
  },

  {
    value: 'truck',
    label: 'Truck',
  },

  {
    value: 'carreta',
    label: 'Carreta',
  },

  {
    value: 'bitrem',
    label: 'Bitrem',
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function Cliente() {
  /*
  =========================================================
  STATES
  =========================================================
  */

  const [toast, setToast] =
    useState<ClientToastData | null>(
      null,
    );

  const [
    showCancelModal,
    setShowCancelModal,
  ] = useState(false);

  const [
    currentFreightId,
    setCurrentFreightId,
  ] = useState<string | null>(
    localStorage.getItem(
      'fretogo_currentorder',
    ),
  );

  const [
    dispatching,
    setDispatching,
  ] = useState(false);

  const formLockRef =
    useRef(false);

  /*
  =========================================================
  FORM
  =========================================================
  */

  const [
    form,
    setForm,
  ] = useState<FreightForm>({
    clienteNome: '',
    clienteTelefone: '',

    origemEndereco: '',
    destinoEndereco: '',

    origemCidade: '',
    destinoCidade: '',

    origemLat: -23.55052,
    origemLng: -46.633308,

    destinoLat: -23.563099,
    destinoLng: -46.654389,

    categoria: 'moto',

    tipoCarga: '',

    pesoKg: 1,

    volumes: 1,

    prioridade: 'normal',

    observacoes: '',

    agendado: false,

    dataAgendamento: '',

    retornoDisponivel: false,
  });

  /*
  =========================================================
  HOOKS
  =========================================================
  */

  const {
    loadingPayment,
    isCancelling,
    createFreight,
    cancelFreight,
  } = useClientFreight();

  const {
    paymentApproved,
    paymentError,
    pixCode,
  } = useClientPayment();

  const {
    orderData,
    connected,
    driverFound,
    isRedispatching,
    isWaitingDriver,
    isDriverAccepted,
    isInTransit,
    isCompleted,
  } = useClientRealtime({
    freightId:
      currentFreightId || undefined,
  });

  /*
  =========================================================
  MEMOS
  =========================================================
  */

  const distanceKm =
    useMemo(() => {
      const base =
        Math.sqrt(
          Math.pow(
            form.destinoLat -
              form.origemLat,
            2,
          ) +
            Math.pow(
              form.destinoLng -
                form.origemLng,
              2,
            ),
        ) * 111;

      return Number(
        base.toFixed(1),
      );
    }, [
      form.origemLat,
      form.origemLng,
      form.destinoLat,
      form.destinoLng,
    ]);

  const operationalValue =
    useMemo(() => {
      const basePerKm =
        {
          moto: 2.5,
          carro: 3.5,
          utilitario: 5.5,
          toco: 8,
          truck: 11,
          carreta: 16,
          bitrem: 25,
        }[
          form.categoria
        ] || 3;

      const priorityMultiplier =
        form.prioridade ===
        'urgente'
          ? 1.35
          : 1;

      const volumeMultiplier =
        1 +
        form.volumes * 0.03;

      const pesoMultiplier =
        1 +
        form.pesoKg * 0.002;

      const total =
        distanceKm *
        basePerKm *
        priorityMultiplier *
        volumeMultiplier *
        pesoMultiplier;

      return Number(
        total.toFixed(2),
      );
    }, [
      distanceKm,
      form.categoria,
      form.prioridade,
      form.volumes,
      form.pesoKg,
    ]);

  /*
  =========================================================
  TOAST
  =========================================================
  */

  const showToast =
    useCallback(
      (
        msg: string,
        type:
          | 'success'
          | 'warning'
          | 'error' = 'success',
      ) => {
        setToast({
          msg,
          type,
        });

        setTimeout(() => {
          setToast(null);
        }, 3500);
      },
      [],
    );

  /*
  =========================================================
  PAYMENT ERRORS
  =========================================================
  */

  useEffect(() => {
    if (!paymentError) {
      return;
    }

    showToast(
      paymentError,
      'error',
    );
  }, [
    paymentError,
    showToast,
  ]);

  /*
  =========================================================
  FORM UPDATE
  =========================================================
  */

  const updateField =
    useCallback(
      <
        K extends keyof FreightForm,
      >(
        field: K,
        value: FreightForm[K],
      ) => {
        setForm(prev => ({
          ...prev,
          [field]: value,
        }));
      },
      [],
    );

  /*
  =========================================================
  CREATE FREIGHT
  =========================================================
  */

  const handleCreateFreight =
    useCallback(async () => {
      if (
        formLockRef.current
      ) {
        return;
      }

      if (
        !form.clienteNome ||
        !form.clienteTelefone ||
        !form.origemEndereco ||
        !form.destinoEndereco
      ) {
        showToast(
          'Preencha os campos obrigatórios.',
          'warning',
        );

        return;
      }

      try {
        formLockRef.current =
          true;

        setDispatching(true);

        const freightId =
          await createFreight({
            freightData: {
              clienteId:
                form.clienteTelefone,

              origem: {
                endereco:
                  form.origemEndereco,

                cidade:
                  form.origemCidade,

                lat:
                  form.origemLat,

                lng:
                  form.origemLng,
              },

              destino: {
                endereco:
                  form.destinoEndereco,

                cidade:
                  form.destinoCidade,

                lat:
                  form.destinoLat,

                lng:
                  form.destinoLng,
              },

              categoria:
                form.categoria,

              tipoCarga:
                form.tipoCarga,

              pesoKg:
                form.pesoKg,

              volumes:
                form.volumes,

              prioridade:
                form.prioridade,

              observacoes:
                form.observacoes,

              distancia:
                distanceKm,

              valorTotal:
                operationalValue,

              agendado:
                form.agendado,

              dataAgendamento:
                form.dataAgendamento,

              retornoDisponivel:
                form.retornoDisponivel,
            },

            onSuccess: id => {
              setCurrentFreightId(
                id,
              );

              showToast(
                'Operação criada com sucesso.',
                'success',
              );
            },

            onError: message => {
              showToast(
                message,
                'error',
              );
            },
          });

        if (!freightId) {
          return;
        }
      } finally {
        setDispatching(false);

        formLockRef.current =
          false;
      }
    }, [
      createFreight,
      distanceKm,
      form,
      operationalValue,
      showToast,
    ]);

  /*
  =========================================================
  CANCEL FREIGHT
  =========================================================
  */

  const handleCancelFreight =
    useCallback(async () => {
      if (
        !currentFreightId
      ) {
        return;
      }

      await cancelFreight(
        currentFreightId,

        () => {
          setCurrentFreightId(
            null,
          );

          setShowCancelModal(
            false,
          );

          showToast(
            'Operação cancelada.',
            'warning',
          );
        },

        message => {
          showToast(
            message,
            'error',
          );
        },
      );
    }, [
      cancelFreight,
      currentFreightId,
      showToast,
    ]);

  /*
  =========================================================
  WHATSAPP
  =========================================================
  */

  const openWhatsApp =
    useCallback(() => {
      if (
        !orderData?.motoristaZap
      ) {
        return;
      }

      window.open(
        `https://wa.me/${orderData.motoristaZap}`,
        '_blank',
      );
    }, [orderData]);

  /*
  =========================================================
  STATUS
  =========================================================
  */

  const operationalMessage =
    useMemo(() => {
      if (
        isRedispatching
      ) {
        return 'Redispatch operacional em andamento';
      }

      if (
        isCompleted
      ) {
        return 'Entrega finalizada';
      }

      if (
        isInTransit
      ) {
        return 'Carga em transporte';
      }

      if (
        isDriverAccepted
      ) {
        return 'Motorista confirmado';
      }

      if (
        isWaitingDriver
      ) {
        return 'Procurando motorista';
      }

      return 'Operação inicializada';
    }, [
      isCompleted,
      isDriverAccepted,
      isInTransit,
      isRedispatching,
      isWaitingDriver,
    ]);

  /*
  =========================================================
  UI
  =========================================================
  */

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <ClientToast toast={toast} />

      <ClientCancelModal
        open={
          showCancelModal
        }
        isCancelling={
          isCancelling
        }
        onClose={() =>
          setShowCancelModal(
            false,
          )
        }
        onConfirm={
          handleCancelFreight
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10">

        {/* HEADER */}

        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-cyan-500/10 border border-cyan-500/20">
                <Truck className="h-7 w-7 text-cyan-400" />
              </div>

              <div>

                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-400">
                  Plataforma Logística
                </p>

                <h1 className="mt-2 text-4xl font-black text-white">
                  FRETOGO CLIENTE
                </h1>

              </div>

            </div>

            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              Operação logística realtime com dispatch inteligente,
              rastreamento operacional e sincronização nacional.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                Realtime
              </p>

              <p className="mt-2 text-sm font-bold text-white">
                {connected
                  ? 'ONLINE'
                  : 'DESCONECTADO'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                Operação
              </p>

              <p className="mt-2 text-sm font-bold text-white">
                {operationalMessage}
              </p>
            </div>

          </div>

        </div>

        {/* GRID */}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">

          {/* LEFT */}

          <div className="space-y-6">

            {/* FORM */}

            <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">

              <div className="mb-8 flex items-center gap-3">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
                  <Sparkles className="h-6 w-6 text-cyan-400" />
                </div>

                <div>

                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-400">
                    Nova Operação
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-white">
                    Solicitar Frete
                  </h2>

                </div>

              </div>

              <div className="grid gap-5 md:grid-cols-2">

                <input
                  value={
                    form.clienteNome
                  }
                  onChange={e =>
                    updateField(
                      'clienteNome',
                      e.target.value,
                    )
                  }
                  placeholder="Nome do cliente"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold outline-none"
                />

                <input
                  value={
                    form.clienteTelefone
                  }
                  onChange={e =>
                    updateField(
                      'clienteTelefone',
                      e.target.value,
                    )
                  }
                  placeholder="Telefone"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold outline-none"
                />

                <input
                  value={
                    form.origemEndereco
                  }
                  onChange={e =>
                    updateField(
                      'origemEndereco',
                      e.target.value,
                    )
                  }
                  placeholder="Origem"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold outline-none"
                />

                <input
                  value={
                    form.destinoEndereco
                  }
                  onChange={e =>
                    updateField(
                      'destinoEndereco',
                      e.target.value,
                    )
                  }
                  placeholder="Destino"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold outline-none"
                />

                <select
                  value={
                    form.categoria
                  }
                  onChange={e =>
                    updateField(
                      'categoria',
                      e.target
                        .value as VehicleCategory,
                    )
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold outline-none"
                >
                  {VEHICLE_OPTIONS.map(
                    option => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    ),
                  )}
                </select>

                <input
                  value={
                    form.tipoCarga
                  }
                  onChange={e =>
                    updateField(
                      'tipoCarga',
                      e.target.value,
                    )
                  }
                  placeholder="Tipo da carga"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold outline-none"
                />

                <input
                  type="number"
                  value={
                    form.pesoKg
                  }
                  onChange={e =>
                    updateField(
                      'pesoKg',
                      Number(
                        e.target.value,
                      ),
                    )
                  }
                  placeholder="Peso KG"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold outline-none"
                />

                <input
                  type="number"
                  value={
                    form.volumes
                  }
                  onChange={e =>
                    updateField(
                      'volumes',
                      Number(
                        e.target.value,
                      ),
                    )
                  }
                  placeholder="Volumes"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold outline-none"
                />

              </div>

              <textarea
                value={
                  form.observacoes
                }
                onChange={e =>
                  updateField(
                    'observacoes',
                    e.target.value,
                  )
                }
                placeholder="Observações operacionais"
                className="mt-5 min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold outline-none"
              />

              <div className="mt-6 flex flex-wrap gap-4">

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-bold">

                  <input
                    type="checkbox"
                    checked={
                      form.agendado
                    }
                    onChange={e =>
                      updateField(
                        'agendado',
                        e.target
                          .checked,
                      )
                    }
                  />

                  Frete Agendado

                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-bold">

                  <input
                    type="checkbox"
                    checked={
                      form.retornoDisponivel
                    }
                    onChange={e =>
                      updateField(
                        'retornoDisponivel',
                        e.target
                          .checked,
                      )
                    }
                  />

                  Retorno Disponível

                </label>

              </div>

              {form.agendado && (
                <input
                  type="datetime-local"
                  value={
                    form.dataAgendamento
                  }
                  onChange={e =>
                    updateField(
                      'dataAgendamento',
                      e.target.value,
                    )
                  }
                  className="mt-5 w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold outline-none"
                />
              )}

              {/* SUMMARY */}

              <div className="mt-8 grid gap-4 md:grid-cols-3">

                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                    Distância
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {distanceKm} km
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                    Categoria
                  </p>

                  <p className="mt-2 text-2xl font-black capitalize">
                    {
                      form.categoria
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                    Valor
                  </p>

                  <p className="mt-2 text-2xl font-black text-emerald-400">
                    R$ {operationalValue.toFixed(2)}
                  </p>
                </div>

              </div>

              <button
                onClick={
                  handleCreateFreight
                }
                disabled={
                  dispatching ||
                  loadingPayment
                }
                className="mt-8 flex min-h-[72px] w-full items-center justify-center gap-4 rounded-[1.8rem] bg-cyan-500 text-lg font-black uppercase tracking-wider text-slate-950 transition-all duration-300 hover:bg-cyan-400 disabled:opacity-40"
              >

                {dispatching ||
                loadingPayment ? (
                  <>
                    <Loader2 className="animate-spin" />

                    Inicializando operação...
                  </>
                ) : (
                  <>
                    <Zap />

                    Solicitar Operação
                  </>
                )}

              </button>

            </div>

            {/* MAP */}

            <MapaCliente
              origem={{
                lat: form.origemLat,
                lng: form.origemLng,
              }}
              destino={{
                lat: form.destinoLat,
                lng: form.destinoLng,
              }}
              motoristaPos={
                orderData?.motoristaPos
              }
              operationalMessage={
                operationalMessage
              }
              eta={
                orderData?.eta
              }
            />

            {/* CHAT */}

            {currentFreightId && (
              <ChatFrete
                freteId={
                  currentFreightId
                }
                tipoUsuario="cliente"
                nome={
                  form.clienteNome ||
                  'Cliente'
                }
              />
            )}

          </div>

          {/* RIGHT */}

          <div className="space-y-6">

            <ClientStatusCard
              status={
                orderData?.status
              }
              motoristaNome={
                orderData?.motoristaNome
              }
              veiculo={
                orderData?.categoria
              }
              distancia={
                distanceKm
              }
              valorTotal={
                operationalValue
              }
            />

            <ClientDriverCard
              motoristaNome={
                orderData?.motoristaNome
              }
              motoristaZap={
                orderData?.motoristaZap
              }
              isFinal={isFinalState(
                orderData?.status,
              )}
              isCancelling={
                isCancelling
              }
              onCancelClick={() =>
                setShowCancelModal(
                  true,
                )
              }
              onWhatsAppClick={
                openWhatsApp
              }
            />

            {/* OPERATIONAL TIMELINE */}

            <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">

              <div className="mb-6 flex items-center gap-3">

                <Radar className="h-6 w-6 text-cyan-400" />

                <div>

                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                    Lifecycle
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Operação
                  </h2>

                </div>

              </div>

              <div className="space-y-4">

                {[
                  {
                    label:
                      'Pagamento',
                    active:
                      paymentApproved,
                  },

                  {
                    label:
                      'Dispatch',
                    active:
                      driverFound,
                  },

                  {
                    label:
                      'Motorista',
                    active:
                      isDriverAccepted,
                  },

                  {
                    label:
                      'Transporte',
                    active:
                      isInTransit,
                  },

                  {
                    label:
                      'Entrega',
                    active:
                      isCompleted,
                  },
                ].map(step => (
                  <div
                    key={
                      step.label
                    }
                    className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-950/50 px-5 py-4"
                  >

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        step.active
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      <CheckCircle
                        size={18}
                      />
                    </div>

                    <p className="text-sm font-bold">
                      {
                        step.label
                      }
                    </p>

                  </div>
                ))}

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
