// src/pages/Cliente.tsx

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  LogOut,
  MapPin,
  Navigation,
  Radar,
  Route,
  ShieldCheck,
  Truck,
  Wallet,
  Warehouse,
  Zap,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

import { useClientRealtime } from '../hooks/useClientRealtime';

import { useClientFreight } from '../hooks/useClientFreight';

import ClientToast, {
  ClientToastData,
} from '../components/client/ClientToast';

import ClientCancelModal from '../components/client/ClientCancelModal';

import ClientStatusCard from '../components/client/ClientStatusCard';

import ClientDriverCard from '../components/client/ClientDriverCard';

import MapaCliente from '../components/MapaCliente';

type OperationStep =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7;

type CategoriaOperacional =
  | 'moto'
  | 'carro'
  | 'utilitario'
  | 'toco'
  | 'truck'
  | 'carreta'
  | 'bitrem';

type PriorityType =
  | 'normal'
  | 'urgente';

type FormAddress = {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
  enderecoFormatado: string;
  lat: number;
  lng: number;
};

type ClientOperationForm =
  {
    contratarAgora: boolean;

    agendarOperacao: boolean;

    dataAgendamento: string;

    origem: FormAddress;

    destino: FormAddress;

    categoria: CategoriaOperacional;

    tipoCarga: string;

    pesoKg: number;

    cubagem: number;

    volumes: number;

    prioridade: PriorityType;

    retornoDisponivel: boolean;

    multiplasEntregas: boolean;

    transbordo: boolean;

    roteiroRegional: boolean;

    roteiroNacional: boolean;

    marketplace: boolean;

    cargaPesada: boolean;

    observacoes: string;
  };

const STORAGE_KEY =
  'fretogo_client_runtime';

const categories =
  [
    'moto',
    'carro',
    'utilitario',
    'toco',
    'truck',
    'carreta',
    'bitrem',
  ] as const;

const operationalMessages =
  [
    'Motoristas próximos da coleta',
    'Radar operacional ativo',
    'Buscando motorista operacional',
    'Motorista finalizando operação próximo',
    'Expandindo radar operacional',
    'Matching inteligente ativo',
  ];

const defaultAddress =
  (): FormAddress => ({
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
    enderecoFormatado:
      '',
    lat: -23.55052,
    lng: -46.633308,
  });

const defaultForm =
  (): ClientOperationForm => ({
    contratarAgora:
      true,

    agendarOperacao:
      false,

    dataAgendamento:
      '',

    origem:
      defaultAddress(),

    destino:
      defaultAddress(),

    categoria:
      'utilitario',

    tipoCarga: '',

    pesoKg: 0,

    cubagem: 0,

    volumes: 1,

    prioridade:
      'normal',

    retornoDisponivel:
      false,

    multiplasEntregas:
      false,

    transbordo:
      false,

    roteiroRegional:
      true,

    roteiroNacional:
      false,

    marketplace:
      true,

    cargaPesada:
      false,

    observacoes: '',
  });

export default function Cliente() {
  const navigate =
    useNavigate();

  const { user, logout } =
    useAuth();

  const mountedRef =
    useRef(true);

  const heartbeatRef =
    useRef<
      NodeJS.Timeout | null
    >(null);

  const reconnectRef =
    useRef(false);

  const [
    currentStep,
    setCurrentStep,
  ] =
    useState<OperationStep>(
      1,
    );

  const [
    toast,
    setToast,
  ] =
    useState<ClientToastData | null>(
      null,
    );

  const [
    openCancelModal,
    setOpenCancelModal,
  ] = useState(false);

  const [
    operationalMessageIndex,
    setOperationalMessageIndex,
  ] = useState(0);

  const [
    formData,
    setFormData,
  ] =
    useState<ClientOperationForm>(
      defaultForm(),
    );

  const {
    loadingPayment,

    isCancelling,

    createFreight,

    cancelFreight,
  } =
    useClientFreight();

  const {
    connected,

    orderData,

    isWaitingDriver,

    isDriverAccepted,

    isInTransit,

    isCompleted,

    isCancelled,

    driverFound,

    tripFinished,

    isRedispatching,

    isRealtimeReady,
  } =
    useClientRealtime();

  /*
  =========================================================
  RUNTIME PERSISTENCE
  =========================================================
  */

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;
    };
  }, []);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          STORAGE_KEY,
        );

      if (!saved) {
        return;
      }

      const parsed =
        JSON.parse(saved);

      if (
        parsed?.formData
      ) {
        setFormData(
          parsed.formData,
        );
      }

      if (
        parsed?.step
      ) {
        setCurrentStep(
          parsed.step,
        );
      }
    } catch (error) {
      console.error(
        'RUNTIME HYDRATION ERROR:',
        error,
      );
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          formData,
          step:
            currentStep,
          updatedAt:
            Date.now(),
        }),
      );
    } catch (error) {
      console.error(
        'RUNTIME PERSIST ERROR:',
        error,
      );
    }
  }, [
    formData,
    currentStep,
  ]);

  /*
  =========================================================
  HEARTBEAT
  =========================================================
  */

  useEffect(() => {
    heartbeatRef.current =
      setInterval(
        () => {
          setOperationalMessageIndex(
            prev =>
              (prev +
                1) %
              operationalMessages.length,
          );
        },
        5000,
      );

    return () => {
      if (
        heartbeatRef.current
      ) {
        clearInterval(
          heartbeatRef.current,
        );
      }
    };
  }, []);

  /*
  =========================================================
  RECONNECT
  =========================================================
  */

  useEffect(() => {
    const onOnline =
      () => {
        reconnectRef.current =
          false;

        setToast({
          msg:
            'Runtime operacional reconectado.',
          type:
            'success',
        });
      };

    const onOffline =
      () => {
        reconnectRef.current =
          true;

        setToast({
          msg:
            'Sem conexão. Runtime operacional em modo persistente.',
          type:
            'warning',
        });
      };

    window.addEventListener(
      'online',
      onOnline,
    );

    window.addEventListener(
      'offline',
      onOffline,
    );

    return () => {
      window.removeEventListener(
        'online',
        onOnline,
      );

      window.removeEventListener(
        'offline',
        onOffline,
      );
    };
  }, []);

  /*
  =========================================================
  PRICING ENGINE
  =========================================================
  */

  const pricing =
    useMemo(() => {
      const kmEntrega =
        32;

      const kmColeta =
        6;

      const kmTotal =
        kmEntrega +
        kmColeta;

      const isHeavy =
        [
          'toco',
          'truck',
          'carreta',
          'bitrem',
        ].includes(
          formData.categoria,
        );

      const platformFee =
        isHeavy
          ? 0.15
          : 0.2;

      const basePerKm =
        {
          moto: 2,
          carro: 3,
          utilitario: 4,
          toco: 8,
          truck: 12,
          carreta: 15,
          bitrem: 18,
        }[
          formData
            .categoria
        ] || 4;

      const urgencyFactor =
        formData.prioridade ===
        'urgente'
          ? 1.35
          : 1;

      const pedagio =
        isHeavy
          ? kmTotal * 0.42
          : 0;

      const bruto =
        kmTotal *
          basePerKm *
          urgencyFactor +
        pedagio;

      const liquido =
        bruto *
        (1 -
          platformFee);

      const eta =
        isHeavy
          ? 180
          : 55;

      return {
        kmColeta,

        kmEntrega,

        kmTotal,

        eta,

        pedagio,

        bruto,

        liquido,
      };
    }, [formData]);

  /*
  =========================================================
  HELPERS
  =========================================================
  */

  const updateAddress =
    useCallback(
      (
        type:
          | 'origem'
          | 'destino',
        key: keyof FormAddress,
        value: any,
      ) => {
        setFormData(
          prev => ({
            ...prev,

            [type]: {
              ...prev[
                type
              ],

              [key]:
                value,
            },
          }),
        );
      },
      [],
    );

  const updateField =
    useCallback(
      (
        key: keyof ClientOperationForm,
        value: any,
      ) => {
        setFormData(
          prev => ({
            ...prev,

            [key]:
              value,
          }),
        );
      },
      [],
    );

  const nextStep =
    useCallback(() => {
      setCurrentStep(
        prev =>
          Math.min(
            7,
            prev + 1,
          ) as OperationStep,
      );
    }, []);

  const previousStep =
    useCallback(() => {
      setCurrentStep(
        prev =>
          Math.max(
            1,
            prev - 1,
          ) as OperationStep,
      );
    }, []);

  /*
  =========================================================
  CREATE FREIGHT
  =========================================================
  */

  const handleCreateFreight =
    useCallback(
      async () => {
        if (!user?.uid) {
          setToast({
            msg:
              'Usuário não autenticado.',
            type:
              'error',
          });

          return;
        }

        const response =
          await createFreight(
            {
              freightData:
                {
                  clienteId:
                    user.uid,

                  clienteNome:
                    user.displayName ||
                    'Cliente',

                  clienteTelefone:
                    user.phoneNumber ||
                    '',

                  origem:
                    formData.origem,

                  destino:
                    formData.destino,

                  categoria:
                    formData.categoria,

                  tipoCarga:
                    formData.tipoCarga,

                  pesoKg:
                    formData.pesoKg,

                  cubagem:
                    formData.cubagem,

                  volumes:
                    formData.volumes,

                  prioridade:
                    formData.prioridade,

                  observacoes:
                    formData.observacoes,

                  retornoDisponivel:
                    formData.retornoDisponivel,

                  multiplasEntregas:
                    formData.multiplasEntregas,

                  transbordo:
                    formData.transbordo,

                  roteiroRegional:
                    formData.roteiroRegional,

                  roteiroNacional:
                    formData.roteiroNacional,

                  marketplace:
                    formData.marketplace,

                  cargaPesada:
                    formData.cargaPesada,

                  valorTotal:
                    pricing.bruto,

                  kmColeta:
                    pricing.kmColeta,

                  kmEntrega:
                    pricing.kmEntrega,

                  kmTotal:
                    pricing.kmTotal,

                  agendado:
                    formData.agendarOperacao,

                  dataAgendamento:
                    formData.dataAgendamento,
                },

              onSuccess:
                () => {
                  setToast(
                    {
                      msg:
                        'Operação logística iniciada.',
                      type:
                        'success',
                    },
                  );
                },

              onError:
                message => {
                  setToast(
                    {
                      msg:
                        message,
                      type:
                        'error',
                    },
                  );
                },
            },
          );

        if (
          response
        ) {
          nextStep();
        }
      },
      [
        user,
        formData,
        pricing,
        createFreight,
        nextStep,
      ],
    );

  /*
  =========================================================
  CANCEL
  =========================================================
  */

  const handleCancel =
    useCallback(async () => {
      if (
        !orderData?.id
      ) {
        return;
      }

      await cancelFreight(
        orderData.id,
        () => {
          setToast({
            msg:
              'Operação cancelada.',
            type:
              'warning',
          });

          setOpenCancelModal(
            false,
          );
        },
      );
    }, [
      orderData,
      cancelFreight,
    ]);

  /*
  =========================================================
  LOGOUT
  =========================================================
  */

  const handleLogout =
    useCallback(async () => {
      await logout();

      navigate(
        '/login',
      );
    }, [
      logout,
      navigate,
    ]);

  /*
  =========================================================
  RENDER
  =========================================================
  */

  return (
    <div className="min-h-screen bg-[#050816] text-white">

      <ClientToast
        toast={toast}
      />

      <ClientCancelModal
        open={
          openCancelModal
        }
        isCancelling={
          isCancelling
        }
        onClose={() =>
          setOpenCancelModal(
            false,
          )
        }
        onConfirm={
          handleCancel
        }
      />

      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-500/10 border border-cyan-500/20">

              <Truck className="h-7 w-7 text-cyan-400" />

            </div>

            <div>

              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-400">
                Runtime Operacional
              </p>

              <h1 className="text-2xl font-black">
                Central Logística Realtime
              </h1>

            </div>

          </div>

          <div className="flex items-center gap-4">

            <div className="hidden md:flex flex-col items-end">

              <p className="text-sm font-bold">
                {user?.displayName}
              </p>

              <p className="text-xs text-slate-400">
                {
                  isRealtimeReady
                    ? 'Realtime sincronizado'
                    : 'Sincronizando runtime'
                }
              </p>

            </div>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-wider transition-all hover:bg-white/10"
            >

              <LogOut
                size={16}
              />

              Sair

            </button>

          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 xl:grid-cols-[1.3fr_0.7fr]">

        {/* FORM */}

        <div className="space-y-6">

          <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">

            <div className="mb-8 flex items-center justify-between">

              <div>

                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-400">
                  Workflow Operacional
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Solicitação Enterprise
                </h2>

              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-300">

                ETAPA {currentStep}/7

              </div>

            </div>

            {/* STEP 1 */}

            {currentStep ===
              1 && (
              <div className="space-y-6">

                <div className="grid gap-5 md:grid-cols-2">

                  <button
                    type="button"
                    onClick={() => {
                      updateField(
                        'contratarAgora',
                        true,
                      );

                      updateField(
                        'agendarOperacao',
                        false,
                      );
                    }}
                    className={`rounded-[2rem] border p-6 text-left transition-all ${
                      formData.contratarAgora
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >

                    <Zap className="mb-4 text-cyan-400" />

                    <h3 className="text-xl font-black">
                      Contratar Agora
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                      Dispatch realtime imediato.
                    </p>

                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateField(
                        'contratarAgora',
                        false,
                      );

                      updateField(
                        'agendarOperacao',
                        true,
                      );
                    }}
                    className={`rounded-[2rem] border p-6 text-left transition-all ${
                      formData.agendarOperacao
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >

                    <Calendar className="mb-4 text-cyan-400" />

                    <h3 className="text-xl font-black">
                      Agendar Operação
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                      Operação programada.
                    </p>

                  </button>

                </div>

                {formData.agendarOperacao && (
                  <input
                    type="datetime-local"
                    value={
                      formData.dataAgendamento
                    }
                    onChange={e =>
                      updateField(
                        'dataAgendamento',
                        e.target.value,
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-5 outline-none"
                  />
                )}

              </div>
            )}

            {/* STEP 2 */}

            {currentStep ===
              2 && (
              <div className="grid gap-4 md:grid-cols-2">

                {[
                  'cep',
                  'rua',
                  'numero',
                  'bairro',
                  'cidade',
                  'estado',
                  'complemento',
                ].map(field => (
                  <input
                    key={field}
                    placeholder={`Origem ${field}`}
                    value={
                      formData
                        .origem[
                        field as keyof FormAddress
                      ] as string
                    }
                    onChange={e =>
                      updateAddress(
                        'origem',
                        field as keyof FormAddress,
                        e.target.value,
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-5 outline-none"
                  />
                ))}

              </div>
            )}

            {/* STEP 3 */}

            {currentStep ===
              3 && (
              <div className="grid gap-4 md:grid-cols-2">

                {[
                  'cep',
                  'rua',
                  'numero',
                  'bairro',
                  'cidade',
                  'estado',
                  'complemento',
                ].map(field => (
                  <input
                    key={field}
                    placeholder={`Destino ${field}`}
                    value={
                      formData
                        .destino[
                        field as keyof FormAddress
                      ] as string
                    }
                    onChange={e =>
                      updateAddress(
                        'destino',
                        field as keyof FormAddress,
                        e.target.value,
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-5 outline-none"
                  />
                ))}

              </div>
            )}

            {/* STEP 4 */}

            {currentStep ===
              4 && (
              <div className="space-y-5">

                <div className="grid gap-4 md:grid-cols-2">

                  <select
                    value={
                      formData.categoria
                    }
                    onChange={e =>
                      updateField(
                        'categoria',
                        e.target.value,
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >

                    {categories.map(
                      category => (
                        <option
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {
                            category
                          }
                        </option>
                      ),
                    )}

                  </select>

                  <input
                    placeholder="Tipo carga"
                    value={
                      formData.tipoCarga
                    }
                    onChange={e =>
                      updateField(
                        'tipoCarga',
                        e.target.value,
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  />

                  <input
                    type="number"
                    placeholder="Peso KG"
                    value={
                      formData.pesoKg
                    }
                    onChange={e =>
                      updateField(
                        'pesoKg',
                        Number(
                          e.target.value,
                        ),
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  />

                  <input
                    type="number"
                    placeholder="Cubagem"
                    value={
                      formData.cubagem
                    }
                    onChange={e =>
                      updateField(
                        'cubagem',
                        Number(
                          e.target.value,
                        ),
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  />

                  <input
                    type="number"
                    placeholder="Volumes"
                    value={
                      formData.volumes
                    }
                    onChange={e =>
                      updateField(
                        'volumes',
                        Number(
                          e.target.value,
                        ),
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  />

                  <select
                    value={
                      formData.prioridade
                    }
                    onChange={e =>
                      updateField(
                        'prioridade',
                        e.target.value,
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >

                    <option value="normal">
                      Normal
                    </option>

                    <option value="urgente">
                      Urgente
                    </option>

                  </select>

                </div>

              </div>
            )}

            {/* STEP 5 */}

            {currentStep ===
              5 && (
              <div className="grid gap-4 md:grid-cols-2">

                {[
                  [
                    'retornoDisponivel',
                    'Retorno disponível',
                  ],
                  [
                    'multiplasEntregas',
                    'Múltiplas entregas',
                  ],
                  [
                    'transbordo',
                    'Transbordo',
                  ],
                  [
                    'roteiroRegional',
                    'Roteiro regional',
                  ],
                  [
                    'roteiroNacional',
                    'Roteiro nacional',
                  ],
                  [
                    'marketplace',
                    'Marketplace',
                  ],
                  [
                    'cargaPesada',
                    'Carga pesada',
                  ],
                ].map(
                  ([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        updateField(
                          key as keyof ClientOperationForm,
                          !formData[
                            key as keyof ClientOperationForm
                          ],
                        )
                      }
                      className={`rounded-[2rem] border p-5 text-left transition-all ${
                        formData[
                          key as keyof ClientOperationForm
                        ]
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >

                      <p className="font-black">
                        {label}
                      </p>

                    </button>
                  ),
                )}

              </div>
            )}

            {/* STEP 6 */}

            {currentStep ===
              6 && (
              <div className="space-y-6">

                <div className="rounded-[2rem] border border-cyan-500/20 bg-cyan-500/5 p-6">

                  <div className="mb-5 flex items-center gap-3">

                    <Radar className="animate-spin text-cyan-400" />

                    <div>

                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                        Radar Operacional
                      </p>

                      <h3 className="text-2xl font-black">
                        Matching Inteligente
                      </h3>

                    </div>

                  </div>

                  <div className="grid gap-4 md:grid-cols-3">

                    <div className="rounded-2xl border border-white/5 bg-black/20 p-5">

                      <p className="text-xs text-slate-500">
                        ETA Operacional
                      </p>

                      <h4 className="mt-2 text-2xl font-black">
                        {pricing.eta} min
                      </h4>

                    </div>

                    <div className="rounded-2xl border border-white/5 bg-black/20 p-5">

                      <p className="text-xs text-slate-500">
                        Motoristas próximos
                      </p>

                      <h4 className="mt-2 text-2xl font-black">
                        12
                      </h4>

                    </div>

                    <div className="rounded-2xl border border-white/5 bg-black/20 p-5">

                      <p className="text-xs text-slate-500">
                        Radius escalation
                      </p>

                      <h4 className="mt-2 text-2xl font-black">
                        Ativo
                      </h4>

                    </div>

                  </div>

                </div>

                <div className="overflow-hidden rounded-[2rem] border border-white/10">

                  <MapaCliente />

                </div>

                <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">

                  <div className="flex items-center gap-3">

                    <Loader2 className="animate-spin text-cyan-400" />

                    <p className="font-black">
                      {
                        operationalMessages[
                          operationalMessageIndex
                        ]
                      }
                    </p>

                  </div>

                </div>

              </div>
            )}

            {/* STEP 7 */}

            {currentStep ===
              7 && (
              <div className="space-y-6">

                <div className="grid gap-5 md:grid-cols-2">

                  <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">

                    <div className="mb-5 flex items-center gap-3">

                      <Wallet className="text-emerald-400" />

                      <h3 className="text-xl font-black">
                        Pricing Operacional
                      </h3>

                    </div>

                    <div className="space-y-4">

                      <div className="flex justify-between">

                        <span className="text-slate-400">
                          KM Coleta
                        </span>

                        <strong>
                          {
                            pricing.kmColeta
                          }{' '}
                          km
                        </strong>

                      </div>

                      <div className="flex justify-between">

                        <span className="text-slate-400">
                          KM Entrega
                        </span>

                        <strong>
                          {
                            pricing.kmEntrega
                          }{' '}
                          km
                        </strong>

                      </div>

                      <div className="flex justify-between">

                        <span className="text-slate-400">
                          KM Total
                        </span>

                        <strong>
                          {
                            pricing.kmTotal
                          }{' '}
                          km
                        </strong>

                      </div>

                      <div className="flex justify-between">

                        <span className="text-slate-400">
                          Pedágio
                        </span>

                        <strong>
                          R${' '}
                          {pricing.pedagio.toFixed(
                            2,
                          )}
                        </strong>

                      </div>

                      <div className="flex justify-between">

                        <span className="text-slate-400">
                          Cliente vê
                        </span>

                        <strong className="text-emerald-400">
                          R${' '}
                          {pricing.bruto.toFixed(
                            2,
                          )}
                        </strong>

                      </div>

                      <div className="flex justify-between">

                        <span className="text-slate-400">
                          Motorista recebe
                        </span>

                        <strong className="text-cyan-400">
                          R${' '}
                          {pricing.liquido.toFixed(
                            2,
                          )}
                        </strong>

                      </div>

                    </div>

                  </div>

                  <div className="rounded-[2rem] border border-cyan-500/20 bg-cyan-500/5 p-6">

                    <div className="mb-5 flex items-center gap-3">

                      <ShieldCheck className="text-cyan-400" />

                      <h3 className="text-xl font-black">
                        Runtime Enterprise
                      </h3>

                    </div>

                    <div className="space-y-3 text-sm">

                      <p>
                        ✅ Dispatch realtime
                      </p>

                      <p>
                        ✅ Matching inteligente
                      </p>

                      <p>
                        ✅ Tracking sincronizado
                      </p>

                      <p>
                        ✅ Radius escalation
                      </p>

                      <p>
                        ✅ Redispatch automático
                      </p>

                      <p>
                        ✅ Runtime persistente
                      </p>

                    </div>

                  </div>

                </div>

                <button
                  type="button"
                  disabled={
                    loadingPayment
                  }
                  onClick={
                    handleCreateFreight
                  }
                  className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[2rem] bg-cyan-500 text-lg font-black uppercase tracking-wider text-black transition-all hover:bg-cyan-400 disabled:opacity-40"
                >

                  {loadingPayment ? (
                    <>
                      <Loader2 className="animate-spin" />

                      Processando operação...
                    </>
                  ) : (
                    <>
                      <Truck />

                      Iniciar operação logística
                    </>
                  )}

                </button>

              </div>
            )}

            {/* FOOTER */}

            <div className="mt-10 flex items-center justify-between">

              <button
                type="button"
                disabled={
                  currentStep ===
                  1
                }
                onClick={
                  previousStep
                }
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-wider disabled:opacity-30"
              >

                <ChevronLeft
                  size={16}
                />

                Voltar

              </button>

              {currentStep <
                7 && (
                <button
                  type="button"
                  onClick={
                    nextStep
                  }
                  className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-black"
                >

                  Próxima etapa

                  <ChevronRight
                    size={16}
                  />

                </button>
              )}

            </div>

          </div>

        </div>

        {/* SIDEBAR */}

        <div className="space-y-6">

          <ClientStatusCard
            status={
              connected
                ? 'Realtime operacional ativo'
                : 'Sincronizando runtime'
            }
            loadingMessage={
              operationalMessages[
                operationalMessageIndex
              ]
            }
            motoristaNome={
              orderData?.motoristaNome
            }
            veiculo={
              orderData?.veiculo
            }
            distancia={
              pricing.kmTotal
            }
            valorTotal={
              pricing.bruto
            }
          />

          <ClientDriverCard
            motoristaZap={
              orderData?.motoristaZap
            }
            motoristaNome={
              orderData?.motoristaNome
            }
            isFinal={
              isCompleted ||
              tripFinished
            }
            isCancelling={
              isCancelling
            }
            onCancelClick={() =>
              setOpenCancelModal(
                true,
              )
            }
            onWhatsAppClick={() => {
              if (
                orderData?.motoristaZap
              ) {
                window.open(
                  `https://wa.me/${orderData.motoristaZap}`,
                  '_blank',
                );
              }
            }}
          />

          <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">

            <div className="mb-6 flex items-center gap-3">

              <Warehouse className="text-cyan-400" />

              <div>

                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                  Orquestração
                </p>

                <h3 className="text-xl font-black">
                  Lifecycle Operacional
                </h3>

              </div>

            </div>

            <div className="space-y-4 text-sm">

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4">

                <span>
                  Matching
                </span>

                <span className="font-black text-cyan-400">
                  {
                    isWaitingDriver
                      ? 'ATIVO'
                      : 'STANDBY'
                  }
                </span>

              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4">

                <span>
                  Dispatch
                </span>

                <span className="font-black text-cyan-400">
                  {
                    driverFound
                      ? 'MATCH'
                      : 'SEARCHING'
                  }
                </span>

              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4">

                <span>
                  Tracking
                </span>

                <span className="font-black text-cyan-400">
                  {
                    isInTransit
                      ? 'LIVE'
                      : 'PENDING'
                  }
                </span>

              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4">

                <span>
                  Redispatch
                </span>

                <span className="font-black text-cyan-400">
                  {
                    isRedispatching
                      ? 'EXPANDING'
                      : 'LOCKED'
                  }
                </span>

              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4">

                <span>
                  Runtime
                </span>

                <span className="font-black text-cyan-400">
                  {
                    isRealtimeReady
                      ? 'READY'
                      : 'SYNC'
                  }
                </span>

              </div>

            </div>

          </div>

          {(isCompleted ||
            isCancelled) && (
            <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 p-6">

              <div className="flex items-center gap-3">

                <CheckCircle2 className="text-emerald-400" />

                <div>

                  <h3 className="text-lg font-black">
                    Operação Finalizada
                  </h3>

                  <p className="text-sm text-slate-300">
                    Runtime operacional permanece sincronizado.
                  </p>

                </div>

              </div>

            </div>
          )}

        </div>

      </main>

      {/* FOOTER */}

      <footer className="border-t border-white/5 bg-black/30 py-6">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 md:flex-row">

          <p>
            © Runtime Enterprise Logístico Realtime
          </p>

          <div className="flex items-center gap-5">

            <div className="flex items-center gap-2">

              <Route
                size={14}
              />

              Dispatch ativo

            </div>

            <div className="flex items-center gap-2">

              <Navigation
                size={14}
              />

              Tracking realtime

            </div>

            <div className="flex items-center gap-2">

              <Clock3
                size={14}
              />

              Matching inteligente

            </div>

          </div>

        </div>

      </footer>

    </div>
  );
}
