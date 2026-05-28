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

import {
  useClientContext,
} from '../context/ClientContext';

import {
  useClientRealtime,
} from '../hooks/useClientRealtime';

import {
  useClientFreight,
} from '../hooks/useClientFreight';

import ClientToast, {
  ClientToastData,
} from '../components/client/ClientToast';

import ClientCancelModal from '../components/client/ClientCancelModal';

import ClientStatusCard from '../components/client/ClientStatusCard';

import ClientDriverCard from '../components/client/ClientDriverCard';

import MapaCliente from '../components/MapaCliente';

/*
=========================================================
TIPOS
=========================================================
*/

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

type ClientOperationForm = {
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

type RuntimeUser = {
  uid: string;
  displayName?: string | null;
  phoneNumber?: string | null;
};

/*
=========================================================
CONSTANTES
=========================================================
*/

const STORAGE_KEY =
  'fretmax_cliente_runtime';

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

/*
=========================================================
COMPONENTE
=========================================================
*/

export default function Cliente() {
  const navigate =
    useNavigate();

  const {
    realtime,
    setRadarActive,
    setMatchingActive,
    setTrackingActive,
  } =
    useClientContext();

  /*
  =========================================================
  AUTH RUNTIME
  =========================================================
  */

  const [
    runtimeUser,
    setRuntimeUser,
  ] =
    useState<RuntimeUser | null>(
      null,
    );

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(
          'fretmax_runtime_user',
        );

      if (!raw) {
        return;
      }

      const parsed =
        JSON.parse(raw);

      if (
        parsed?.uid
      ) {
        setRuntimeUser(
          parsed,
        );
      }
    } catch (error) {
      console.error(
        'CLIENT_AUTH_RUNTIME_ERROR',
        error,
      );
    }
  }, []);

  const handleLogout =
    useCallback(async () => {
      localStorage.removeItem(
        'fretmax_runtime_user',
      );

      navigate(
        '/login',
      );
    }, [navigate]);

  /*
  =========================================================
  REFS
  =========================================================
  */

  const mountedRef =
    useRef(true);

  const heartbeatRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);

  /*
  =========================================================
  STATES
  =========================================================
  */

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

  /*
  =========================================================
  SERVICES
  =========================================================
  */

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
  LIFECYCLE
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

  /*
  =========================================================
  RUNTIME PERSISTENCE
  =========================================================
  */

  useEffect(() => {
    try {
      const storage =
        localStorage.getItem(
          STORAGE_KEY,
        );

      if (!storage) {
        return;
      }

      const parsed =
        JSON.parse(storage);

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
        'CLIENT_RUNTIME_HYDRATION_ERROR',
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
        'CLIENT_RUNTIME_PERSISTENCE_ERROR',
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
            previous =>
              (previous +
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
  REALTIME FLAGS
  =========================================================
  */

  useEffect(() => {
    setRadarActive(
      true,
    );

    setMatchingActive(
      true,
    );

    setTrackingActive(
      connected,
    );
  }, [
    connected,
    setRadarActive,
    setMatchingActive,
    setTrackingActive,
  ]);

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
        value: unknown,
      ) => {
        setFormData(
          previous => ({
            ...previous,

            [type]: {
              ...previous[
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
        value: unknown,
      ) => {
        setFormData(
          previous => ({
            ...previous,

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
        previous =>
          Math.min(
            7,
            previous + 1,
          ) as OperationStep,
      );
    }, []);

  const previousStep =
    useCallback(() => {
      setCurrentStep(
        previous =>
          Math.max(
            1,
            previous - 1,
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
        if (
          !runtimeUser?.uid
        ) {
          setToast({
            msg:
              'Cliente não autenticado.',
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
                    runtimeUser.uid,

                  clienteNome:
                    runtimeUser.displayName ||
                    'Cliente',

                  clienteTelefone:
                    runtimeUser.phoneNumber ||
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
                (
                  message: string,
                ) => {
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
        runtimeUser,
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

      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-cyan-500/20 bg-cyan-500/10">

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

          <div className="flex flex-wrap items-center gap-4">

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-cyan-300">

              {
                realtime.connected
                  ? 'Radar operacional ativo'
                  : 'Reconectando runtime'
              }

            </div>

            <div className="hidden md:flex flex-col items-end">

              <p className="text-sm font-bold">
                {
                  runtimeUser?.displayName ||
                  'Cliente'
                }
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

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 xl:grid-cols-[1.3fr_0.7fr]">

        <div className="space-y-6">

          <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">

            <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

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

          </div>

        </div>

      </main>

    </div>
  );
}
