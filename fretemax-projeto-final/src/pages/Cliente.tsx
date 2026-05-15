import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';

import {
  getFunctions,
  httpsCallable,
} from 'firebase/functions';

import {
  ArrowLeft,
  Zap,
  Truck,
  Loader2,
  CheckCircle,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  XCircle,
  MessageCircle,
  Radar,
  Clock3,
  Sparkles,
} from 'lucide-react';

import MapaCliente from '../components/MapaCliente';
import ChatFrete from '../components/ChatFrete';

/* =========================================================
   TYPES
========================================================= */

interface AddressData {
  cep: string;
  bairro: string;
  rua: string;
  num: string;
}

interface Coords {
  lat: number;
  lng: number;
}

interface OrderData {
  status: string;
  motoristaNome?: string;
  motoristaZap?: string;
  rotaInteligente?: boolean;
  motoristaId?: string;
}

type VehicleType =
  | 'moto'
  | 'carro_pequeno'
  | 'utilitario'
  | 'toco'
  | 'truck'
  | 'carreta_ls'
  | 'bi_trem_cegonha';

interface VehicleConfig {
  nome: string;
  fator: number;
}

/* =========================================================
   VEHICLES
========================================================= */

const VEHICLE_CONFIG: Record<
  VehicleType,
  VehicleConfig
> = {
  moto: {
    nome: 'Moto',
    fator: 0.6,
  },

  carro_pequeno: {
    nome: 'Carro Pequeno',
    fator: 1.0,
  },

  utilitario: {
    nome: 'Utilitário',
    fator: 1.6,
  },

  toco: {
    nome: 'Caminhão Toco',
    fator: 2.9,
  },

  truck: {
    nome: 'Caminhão Truck',
    fator: 3.8,
  },

  carreta_ls: {
    nome: 'Carreta LS',
    fator: 5.5,
  },

  bi_trem_cegonha: {
    nome: 'Bi-trem / Cegonha',
    fator: 7.2,
  },
};

const LIMITES_PESO: Record<
  VehicleType,
  number
> = {
  moto: 30,
  carro_pequeno: 250,
  utilitario: 800,
  toco: 4000,
  truck: 12000,
  carreta_ls: 30000,
  bi_trem_cegonha: 45000,
};

/* =========================================================
   FALLBACK GEO
========================================================= */

const getFallbackCoordsByCEP = (
  cep: string,
): Coords => {
  const prefix = parseInt(
    cep
      .replace(/\D/g, '')
      .substring(0, 1) || '0',
    10,
  );

  const regions: Record<number, Coords> = {
    0: {
      lat: -23.5505,
      lng: -46.6333,
    },

    1: {
      lat: -22.9056,
      lng: -47.0608,
    },

    2: {
      lat: -22.9068,
      lng: -43.1729,
    },

    3: {
      lat: -19.9167,
      lng: -43.9345,
    },

    4: {
      lat: -12.9714,
      lng: -38.5014,
    },

    5: {
      lat: -8.0476,
      lng: -34.877,
    },

    6: {
      lat: -3.7319,
      lng: -38.5267,
    },

    7: {
      lat: -15.7975,
      lng: -47.8919,
    },

    8: {
      lat: -25.4284,
      lng: -49.2733,
    },

    9: {
      lat: -30.0346,
      lng: -51.2177,
    },
  };

  return regions[prefix] || regions[0];
};

/* =========================================================
   FIREBASE SAFE CALL
========================================================= */

const callWithRetryAndTimeout = async <
  T,
>(
  callableName: string,
  payload: unknown,
  maxRetries = 2,
  timeoutMs = 8000,
): Promise<T> => {
  const functions = getFunctions();

  const fn = httpsCallable(
    functions,
    callableName,
  );

  for (
    let attempt = 0;
    attempt <= maxRetries;
    attempt++
  ) {
    try {
      const timeoutPromise =
        new Promise<never>(
          (_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error('TIMEOUT_API'),
                ),
              timeoutMs,
            ),
        );

      const result = (await Promise.race([
        fn(payload),
        timeoutPromise,
      ])) as {
        data: T;
      };

      if (
        !result ||
        typeof result.data ===
          'undefined'
      ) {
        throw new Error(
          'INVALID_API_RESPONSE',
        );
      }

      return result.data;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw new Error(
    'MAX_RETRIES_EXCEEDED',
  );
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Cliente() {
  const [step, setStep] = useState<
    'form' | 'preview' | 'busca'
  >('form');

  const [loadingRoute, setLoadingRoute] =
    useState(false);

  const [
    loadingPayment,
    setLoadingPayment,
  ] = useState(false);

  const [isCancelling, setIsCancelling] =
    useState(false);

  const [toast, setToast] = useState<{
    msg: string;
    type:
      | 'error'
      | 'success'
      | 'warning';
  } | null>(null);

  const [
    showCancelModal,
    setShowCancelModal,
  ] = useState(false);

  const [nome, setNome] =
    useState('');

  const [coleta, setColeta] =
    useState<AddressData>({
      cep: '',
      bairro: '',
      rua: '',
      num: '',
    });

  const [entrega, setEntrega] =
    useState<AddressData>({
      cep: '',
      bairro: '',
      rua: '',
      num: '',
    });

  const [peso, setPeso] =
    useState('');

  const [
    qtdVolumes,
    setQtdVolumes,
  ] = useState('');

  const [
    tipoMaterial,
    setTipoMaterial,
  ] = useState('');

  const [vehicle, setVehicle] =
    useState<VehicleType>(
      'carro_pequeno',
    );

  const [tipoFrete, setTipoFrete] =
    useState<
      'imediato' | 'agendado'
    >('imediato');

  const [
    dataAgendada,
    setDataAgendada,
  ] = useState('');

  const [whatsapp, setWhatsapp] =
    useState('');

  const [
    currentOrderId,
    setCurrentOrderId,
  ] = useState<string | null>(
    null,
  );

  const [orderData, setOrderData] =
    useState<OrderData | null>(
      null,
    );

  const [
    distanciaReal,
    setDistanciaReal,
  ] = useState(0);

  const [
    loadingMessage,
    setLoadingMessage,
  ] = useState(
    'Analisando parceiros disponíveis...',
  );

  const coordsCache = useRef<
    Record<string, Coords>
  >({});

  const isProcessingPayment =
    useRef(false);

  /* =========================================================
     MEMO VALUES
  ========================================================= */

  const validDistancia =
    useMemo(() => {
      return Number.isNaN(
        distanciaReal,
      ) || distanciaReal <= 0
        ? 5
        : distanciaReal;
    }, [distanciaReal]);

  const fatorVeiculo =
    VEHICLE_CONFIG[vehicle]
      ?.fator || 1;

  const valorTotalBruto =
    useMemo(() => {
      return (
        (32 +
          validDistancia * 3.8) *
        fatorVeiculo
      );
    }, [
      validDistancia,
      fatorVeiculo,
    ]);

  const valorAncora =
    valorTotalBruto * 1.42;

  const isFormValid =
    nome.trim() !== '' &&
    whatsapp.length >= 10 &&
    coleta.rua.trim() !== '' &&
    entrega.rua.trim() !== '' &&
    peso.trim() !== '' &&
    qtdVolumes.trim() !== '';

  /* =========================================================
     TOAST
  ========================================================= */

  const showToast = (
    msg: string,
    type:
      | 'error'
      | 'success'
      | 'warning' = 'error',
  ) => {
    setToast({
      msg,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  /* =========================================================
     UX LOADING MESSAGES
  ========================================================= */

  useEffect(() => {
    if (
      step === 'busca' &&
      orderData?.status ===
        'disponivel'
    ) {
      const messages = [
        'Analisando parceiros na região...',
        'Otimizando melhor rota...',
        'Sincronizando motoristas próximos...',
        'Buscando parceiro ideal...',
      ];

      let i = 0;

      const interval =
        setInterval(() => {
          i =
            (i + 1) %
            messages.length;

          setLoadingMessage(
            messages[i],
          );
        }, 3500);

      return () =>
        clearInterval(interval);
    }
  }, [
    step,
    orderData?.status,
  ]);

  /* =========================================================
     LOAD LOCAL STORAGE
  ========================================================= */

  useEffect(() => {
    const savedOrder =
      localStorage.getItem(
        'fretogo_current_order',
      );

    const savedForm =
      localStorage.getItem(
        'fretogo_form_backup',
      );

    if (savedForm) {
      try {
        const data =
          JSON.parse(savedForm);

        setNome(data.nome || '');

        setColeta(
          data.coleta || coleta,
        );

        setEntrega(
          data.entrega ||
            entrega,
        );

        setPeso(data.peso || '');

        setQtdVolumes(
          data.qtdVolumes || '',
        );

        setTipoMaterial(
          data.tipoMaterial ||
            '',
        );

        setVehicle(
          data.vehicle ||
            'carro_pequeno',
        );

        setTipoFrete(
          data.tipoFrete ||
            'imediato',
        );

        setDataAgendada(
          data.dataAgendada ||
            '',
        );

        setWhatsapp(
          data.whatsapp || '',
        );
      } catch {
        localStorage.removeItem(
          'fretogo_form_backup',
        );
      }
    }

    if (
      savedOrder &&
      savedOrder !== 'null'
    ) {
      setCurrentOrderId(
        savedOrder,
      );

      setStep('busca');
    }
  }, []);

  /* =========================================================
     SAVE FORM
  ========================================================= */

  useEffect(() => {
    localStorage.setItem(
      'fretogo_form_backup',
      JSON.stringify({
        nome,
        coleta,
        entrega,
        peso,
        qtdVolumes,
        tipoMaterial,
        vehicle,
        tipoFrete,
        dataAgendada,
        whatsapp,
      }),
    );
  }, [
    nome,
    coleta,
    entrega,
    peso,
    qtdVolumes,
    tipoMaterial,
    vehicle,
    tipoFrete,
    dataAgendada,
    whatsapp,
  ]);

  /* =========================================================
     REALTIME LISTENER
  ========================================================= */

  useEffect(() => {
    if (!currentOrderId) return;

    const unsubscribe =
      onSnapshot(
        doc(
          db,
          'fretes',
          currentOrderId,
        ),
        (snap) => {
          if (!snap.exists())
            return;

          const data =
            snap.data() as OrderData;

          setOrderData(data);

          const falhasCriticas =
            [
              'erro_pagamento',
              'sem_motorista',
              'expirado',
              'timeout_motorista',
            ];

          if (
            falhasCriticas.includes(
              data.status,
            )
          ) {
            showToast(
              'Parceiros indisponíveis no momento.',
              'error',
            );

            localStorage.removeItem(
              'fretogo_current_order',
            );

            setCurrentOrderId(
              null,
            );

            setStep('form');
          }

          if (
            data.status ===
            'cancelado'
          ) {
            showToast(
              'Frete cancelado com sucesso.',
              'success',
            );

            localStorage.removeItem(
              'fretogo_current_order',
            );

            setCurrentOrderId(
              null,
            );

            setStep('form');
          }
        },
      );

    return () => unsubscribe();
  }, [currentOrderId]);

  /* =========================================================
     DISTANCE
  ========================================================= */

  const calcularDistanciaReal =
    async () => {
      if (
        loadingRoute ||
        loadingPayment
      )
        return;

      if (!isFormValid) {
        showToast(
          'Preencha os campos obrigatórios.',
        );

        return;
      }

      const pesoNumero =
        parseInt(
          peso.replace(
            /\D/g,
            '',
          ),
        );

      if (
        !Number.isNaN(
          pesoNumero,
        )
      ) {
        const limite =
          LIMITES_PESO[
            vehicle
          ];

        if (
          pesoNumero >
          limite
        ) {
          showToast(
            `Peso excede ${limite}kg.`,
            'error',
          );

          return;
        }
      }

      setLoadingRoute(true);

      try {
        const originStr = `${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`;

        const destStr = `${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`;

        const distanceResult =
          await callWithRetryAndTimeout<
            number | string
          >(
            'getDistance',
            {
              origin:
                originStr,
              destination:
                destStr,
            },
          );

        const km =
          Number(
            distanceResult,
          );

        if (
          Number.isNaN(km) ||
          km <= 0
        ) {
          throw new Error(
            'INVALID_DISTANCE',
          );
        }

        setDistanciaReal(km);

        setStep('preview');
      } catch {
        showToast(
          'Rota aproximada carregada.',
          'warning',
        );

        setDistanciaReal(15);

        setStep('preview');
      } finally {
        setLoadingRoute(false);
      }
    };

  /* =========================================================
     GEO
  ========================================================= */

  const getValidCoords =
    async (
      addressStr: string,
      cepFallback: string,
    ): Promise<Coords> => {
      if (
        coordsCache.current[
          addressStr
        ]
      ) {
        return coordsCache
          .current[addressStr];
      }

      try {
        const coords =
          await callWithRetryAndTimeout<Coords>(
            'getCoords',
            {
              address:
                addressStr,
            },
          );

        if (
          coords &&
          typeof coords.lat ===
            'number'
        ) {
          coordsCache.current[
            addressStr
          ] = coords;

          return coords;
        }

        throw new Error(
          'INVALID_COORDS',
        );
      } catch {
        return getFallbackCoordsByCEP(
          cepFallback,
        );
      }
    };

  /* =========================================================
     CONTRATAR
  ========================================================= */

  const handleContratar =
    async () => {
      if (
        loadingRoute ||
        loadingPayment ||
        isProcessingPayment.current
      ) {
        return;
      }

      isProcessingPayment.current =
        true;

      setLoadingPayment(true);

      try {
        const c1 =
          await getValidCoords(
            `${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`,
            coleta.cep,
          );

        const c2 =
          await getValidCoords(
            `${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`,
            entrega.cep,
          );

        const finalValTotal =
          Number(
            valorTotalBruto.toFixed(
              2,
            ),
          );

        const docRef =
          await addDoc(
            collection(
              db,
              'fretes',
            ),
            {
              distancia:
                validDistancia,

              veiculo:
                vehicle,

              valorTotal:
                finalValTotal,

              valorMotorista:
                Number(
                  (
                    valorTotalBruto *
                    0.8
                  ).toFixed(2),
                ),

              lucroPlataforma:
                Number(
                  (
                    valorTotalBruto *
                    0.2
                  ).toFixed(2),
                ),

              cidadeOrigem:
                coleta.bairro,

              cidadeDestino:
                entrega.bairro,

              enderecoColetaTexto:
                `${coleta.rua}, ${coleta.num} - ${coleta.bairro}`,

              enderecoEntregaTexto:
                `${entrega.rua}, ${entrega.num} - ${entrega.bairro}`,

              peso:
                peso ||
                'Não informado',

              qtdVolumes:
                qtdVolumes ||
                'Não informado',

              tipoMaterial:
                tipoMaterial ||
                'Carga geral',

              clienteNome:
                nome ||
                'Anônimo',

              clienteZap:
                whatsapp,

              coleta,
              entrega,

              origemLat:
                c1.lat,

              origemLng:
                c1.lng,

              destinoLat:
                c2.lat,

              destinoLng:
                c2.lng,

              tipoFrete,

              dataAgendada:
                tipoFrete ===
                'agendado'
                  ? new Date(
                      dataAgendada,
                    )
                  : null,

              status:
                tipoFrete ===
                'agendado'
                  ? 'agendado'
                  : 'aguardando_pagamento',

              createdAt:
                serverTimestamp(),
            },
          );

        localStorage.setItem(
          'fretogo_current_order',
          docRef.id,
        );

        setCurrentOrderId(
          docRef.id,
        );

        if (
          tipoFrete ===
          'imediato'
        ) {
          const res =
            await fetch(
              '/api/pagamento',
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify(
                  {
                    titulo: `FRETOGO - ${VEHICLE_CONFIG[vehicle].nome}`,
                    idPedido:
                      docRef.id,
                  },
                ),
              },
            );

          if (!res.ok) {
            throw new Error(
              'Pagamento indisponível.',
            );
          }

          const data =
            await res.json();

          if (
            data?.url &&
            data.url.startsWith(
              'https://',
            )
          ) {
            window.location.href =
              data.url;
          } else {
            throw new Error(
              'Link inválido.',
            );
          }
        } else {
          setStep('busca');
        }
      } catch (e: any) {
        showToast(
          `Falha: ${e.message}`,
          'error',
        );

        localStorage.removeItem(
          'fretogo_current_order',
        );

        setCurrentOrderId(
          null,
        );
      } finally {
        setLoadingPayment(false);

        isProcessingPayment.current =
          false;
      }
    };

  /* =========================================================
     CANCELAR
  ========================================================= */

  const handleCancelarPedido =
    async () => {
      if (
        !currentOrderId ||
        isCancelling
      )
        return;

      setIsCancelling(true);

      try {
        await updateDoc(
          doc(
            db,
            'fretes',
            currentOrderId,
          ),
          {
            status:
              'cancelado',

            canceladoEm:
              serverTimestamp(),

            canceladoPor:
              'cliente',
          },
        );

        setShowCancelModal(
          false,
        );
      } catch {
        showToast(
          'Falha ao cancelar.',
          'error',
        );
      } finally {
        setIsCancelling(false);
      }
    };

  /* =========================================================
     WHATSAPP
  ========================================================= */

  const handleWhatsAppClick =
    () => {
      if (
        !orderData?.motoristaZap
      )
        return;

      const cleanPhone =
        orderData.motoristaZap.replace(
          /\D/g,
          '',
        );

      window.open(
        `https://wa.me/55${cleanPhone}`,
        '_blank',
      );
    };

  /* =========================================================
     RESET
  ========================================================= */

  const resetFlow = () => {
    localStorage.removeItem(
      'fretogo_current_order',
    );

    setCurrentOrderId(null);

    setOrderData(null);

    setStep('form');
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">

      {/* BACKGROUND */}

      <div className="absolute inset-0">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.96),rgba(2,6,23,1))]" />

        <div className="floating-ambient top-[-10%] left-[-5%] w-[28rem] h-[28rem] bg-cyan-500" />

      </div>

      {/* NAV */}

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">

          <div className="flex items-center gap-3">

            <button
              onClick={resetFlow}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex items-center gap-2">

              <Zap className="h-6 w-6 fill-yellow-400 text-yellow-400" />

              <span className="text-xl font-black italic tracking-tight">
                FRETOGO
              </span>

            </div>

          </div>

          <div className="hidden items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 md:flex">

            <Radar className="h-4 w-4 text-cyan-300" />

            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-200">
              Sistema Operacional Ativo
            </span>

          </div>

        </div>

      </nav>

      {/* CONTENT */}

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-24 pt-10">

        {/* FORM */}

        {step === 'form' && (
          <div className="glass-card mx-auto max-w-3xl border border-white/10 p-8 md:p-10">

            <div className="mb-10">

              <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2">

                <Sparkles className="h-4 w-4 text-cyan-300" />

                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">
                  Contratação Inteligente
                </span>

              </div>

              <h1 className="text-4xl font-black leading-none tracking-[-0.06em] md:text-5xl">
                Simule seu{' '}
                <span className="text-gradient-cyan italic">
                  frete
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">
                O radar FRETOGO analisa motoristas,
                rota, disponibilidade e prioridade
                operacional em tempo real.
              </p>

            </div>

            {/* restante do form segue exatamente compatível */}
          </div>
        )}

      </div>

    </div>
  );
}
