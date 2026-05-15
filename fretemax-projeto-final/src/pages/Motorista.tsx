import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

import {
  auth,
  provider,
  db,
  storage,
} from '../firebase';

import {
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  runTransaction,
  arrayRemove,
} from 'firebase/firestore';

import {
  getMessaging,
  getToken,
} from 'firebase/messaging';

import {
  Loader2,
  Truck,
  CheckCircle,
  Navigation,
  MapPin,
  ShieldCheck,
  UserPlus,
  Camera,
  Zap,
  Power,
  AlertTriangle,
  XCircle,
  Package,
  Download,
  Radar,
  DollarSign,
  Clock,
  Radio,
} from 'lucide-react';

import ChatFrete from '../components/ChatFrete';

import type {
  UserProfile,
  DriverData,
  OrderData,
  VehicleType,
  Coords,
} from '../types';

/* =========================================================
   VEHICLES
========================================================= */

const VEHICLE_CONFIG: Record<
  string,
  {
    nome: string;
    fator: number;
  }
> = {
  moto: {
    nome: 'Moto',
    fator: 0.6,
  },

  carro_pequeno: {
    nome: 'Carro Pequeno',
    fator: 1,
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
    nome:
      'Bi-trem / Cegonha',

    fator: 7.2,
  },
};

/* =========================================================
   PROTECTION
========================================================= */

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_MIME_TYPES =
  [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

const GPS_MIN_DISTANCE_METERS =
  50;

const GPS_HEARTBEAT_MS =
  15000;

/* =========================================================
   COMPONENT
========================================================= */

export default function Motorista() {
  /* =========================================================
     STATES
  ========================================================= */

  const [user, setUser] =
    useState<UserProfile | null>(
      null,
    );

  const [
    driverData,
    setDriverData,
  ] =
    useState<DriverData | null>(
      null,
    );

  const [
    activeFrete,
    setActiveFrete,
  ] =
    useState<OrderData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [
    checkingDriver,
    setCheckingDriver,
  ] = useState(true);

  const [
    isOnline,
    setIsOnline,
  ] = useState(false);

  const [
    backhaulDestino,
    setBackhaulDestino,
  ] = useState('');

  const [
    comprovante,
    setComprovante,
  ] = useState<File | null>(
    null,
  );

  const [toast, setToast] =
    useState<{
      msg: string;
      type:
        | 'error'
        | 'warning';
    } | null>(null);

  const [
    deferredPrompt,
    setDeferredPrompt,
  ] = useState<any>(null);

  const [
    loadingMessage,
    setLoadingMessage,
  ] = useState(
    'Analisando cargas próximas...',
  );

  const [
    ofertaFrete,
    setOfertaFrete,
  ] =
    useState<OrderData | null>(
      null,
    );

  const [
    exibindoOferta,
    setExibindoOferta,
  ] = useState(false);

  const [
    tempoRestante,
    setTempoRestante,
  ] = useState(15);

  const [
    uploadingDocs,
    setUploadingDocs,
  ] = useState(false);

  const [formStep] =
    useState(false);

  const [
    sendingStatus,
    setSendingStatus,
  ] = useState(false);

  const [
    docFile,
    setDocFile,
  ] = useState<File | null>(
    null,
  );

  const [form, setForm] =
    useState({
      nome: '',
      whatsapp: '',
      placa: '',
      categoria:
        'carro_pequeno' as VehicleType,
      cnh: '',
      renavam: '',
      cpf: '',
      cidadeEstado: '',
    });

  /* =========================================================
     REFS
  ========================================================= */

  const actionHandled =
    useRef(false);

  const lastGpsUpdate =
    useRef(0);

  const lastGpsCoords =
    useRef<Coords | null>(null);

  const currentOfferId =
    useRef<string | null>(null);

  const audioRef =
    useRef<HTMLAudioElement | null>(
      null,
    );

  const watchIdRef =
    useRef<number | null>(null);

  /* =========================================================
     TOAST
  ========================================================= */

  const showToast =
    useCallback(
      (
        msg: string,
        type:
          | 'error'
          | 'warning' = 'error',
      ) => {
        setToast({
          msg,
          type,
        });

        setTimeout(() => {
          setToast(null);
        }, 5000);
      },
      [],
    );

  /* =========================================================
     AUDIO
  ========================================================= */

  const initAudio =
    useCallback(() => {
      if (
        !audioRef.current
      ) {
        audioRef.current =
          new Audio(
            'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
          );

        audioRef.current.loop =
          true;
      }

      audioRef.current
        .play()
        .then(() => {
          audioRef.current?.pause();

          if (
            audioRef.current
          ) {
            audioRef.current.currentTime =
              0;
          }
        })
        .catch(() => {});
    }, []);

  const playAudio =
    useCallback(() => {
      audioRef.current
        ?.play()
        .catch(() => {});
    }, []);

  const stopAudio =
    useCallback(() => {
      if (
        audioRef.current
      ) {
        audioRef.current.pause();

        audioRef.current.currentTime =
          0;
      }
    }, []);

  /* =========================================================
     ROTATING STATUS
  ========================================================= */

  useEffect(() => {
    let interval:
      | NodeJS.Timeout
      | undefined;

    if (
      isOnline &&
      !exibindoOferta &&
      !activeFrete
    ) {
      const messages = [
        'Analisando cargas próximas...',
        'Otimizando rotas...',
        'Buscando frete ideal...',
        'Mapeando oportunidades...',
      ];

      let i = 0;

      interval =
        setInterval(() => {
          i =
            (i + 1) %
            messages.length;

          setLoadingMessage(
            messages[i],
          );
        }, 4000);
    }

    return () => {
      if (interval)
        clearInterval(
          interval,
        );
    };
  }, [
    isOnline,
    exibindoOferta,
    activeFrete,
  ]);

  /* =========================================================
     INSTALL APP
  ========================================================= */

  useEffect(() => {
    const handleBeforeInstallPrompt =
      (e: any) => {
        e.preventDefault();

        setDeferredPrompt(e);
      };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt,
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick =
    async () => {
      if (
        !deferredPrompt
      )
        return;

      deferredPrompt.prompt();

      const {
        outcome,
      } =
        await deferredPrompt.userChoice;

      if (
        outcome ===
        'accepted'
      ) {
        setDeferredPrompt(
          null,
        );
      }
    };

  /* =========================================================
     PUSH
  ========================================================= */

  useEffect(() => {
    const requestPermission =
      async () => {
        try {
          const messaging =
            getMessaging();

          const token =
            await getToken(
              messaging,
              {
                vapidKey:
                  'SUA_CHAVE_VAPID_AQUI',
              },
            );

          if (token) {
            localStorage.setItem(
              'fcm_token',
              token,
            );
          }
        } catch {}
      };

    if (user)
      requestPermission();
  }, [user]);

  /* =========================================================
     GPS
  ========================================================= */

  const calculateDistance =
    (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ) => {
      const R = 6371e3;

      const φ1 =
        (lat1 *
          Math.PI) /
        180;

      const φ2 =
        (lat2 *
          Math.PI) /
        180;

      const Δφ =
        ((lat2 -
          lat1) *
          Math.PI) /
        180;

      const Δλ =
        ((lon2 -
          lon1) *
          Math.PI) /
        180;

      const a =
        Math.sin(
          Δφ / 2,
        ) *
          Math.sin(
            Δφ / 2,
          ) +
        Math.cos(φ1) *
          Math.cos(φ2) *
          Math.sin(
            Δλ / 2,
          ) *
          Math.sin(
            Δλ / 2,
          );

      const c =
        2 *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(1 - a),
        );

      return R * c;
    };

  useEffect(() => {
    if (
      !user ||
      !driverData ||
      !isOnline
    )
      return;

    const updatePosition =
      async (
        pos: GeolocationPosition,
      ) => {
        const now =
          Date.now();

        const {
          latitude,
          longitude,
        } = pos.coords;

        const currentCoords =
          {
            lat: latitude,
            lng: longitude,
          };

        let shouldUpdate =
          false;

        if (
          now -
            lastGpsUpdate.current >=
          GPS_HEARTBEAT_MS
        ) {
          shouldUpdate =
            true;
        } else if (
          lastGpsCoords.current
        ) {
          const distanceMoved =
            calculateDistance(
              lastGpsCoords
                .current.lat,
              lastGpsCoords
                .current.lng,
              currentCoords.lat,
              currentCoords.lng,
            );

          if (
            distanceMoved >=
            GPS_MIN_DISTANCE_METERS
          ) {
            shouldUpdate =
              true;
          }
        } else {
          shouldUpdate =
            true;
        }

        if (!shouldUpdate)
          return;

        lastGpsUpdate.current =
          now;

        lastGpsCoords.current =
          currentCoords;

        try {
          await setDoc(
            doc(
              db,
              'motoristas_online',
              user.uid,
            ),
            {
              nome:
                driverData.nome,

              whatsapp:
                driverData.whatsapp,

              lat: latitude,

              lng: longitude,

              categoria:
                driverData.categoria,

              status:
                activeFrete
                  ? 'ocupado'
                  : 'disponivel',

              emRota:
                !!activeFrete,

              tokenFCM:
                localStorage.getItem(
                  'fcm_token',
                ) || null,

              lastSeen:
                serverTimestamp(),
            },
            {
              merge: true,
            },
          );
        } catch {}
      };

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        updatePosition,

        () => {},

        {
          enableHighAccuracy:
            true,

          maximumAge:
            10000,

          timeout: 10000,
        },
      );

    return () => {
      if (
        watchIdRef.current !==
        null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current,
        );

        watchIdRef.current =
          null;
      }
    };
  }, [
    user,
    driverData,
    isOnline,
    activeFrete,
  ]);

  /* =========================================================
     OFFERS
  ========================================================= */

  useEffect(() => {
    if (
      !user ||
      !isOnline ||
      activeFrete
    ) {
      setExibindoOferta(
        false,
      );

      setOfertaFrete(
        null,
      );

      currentOfferId.current =
        null;

      stopAudio();

      return;
    }

    const q = query(
      collection(
        db,
        'fretes',
      ),

      where(
        'status',
        '==',
        'disponivel',
      ),

      where(
        'filaMatching',
        'array-contains',
        user.uid,
      ),
    );

    const unsub =
      onSnapshot(
        q,
        (snapshot) => {
          if (
            snapshot.empty
          ) {
            setExibindoOferta(
              false,
            );

            setOfertaFrete(
              null,
            );

            stopAudio();

            return;
          }

          let foundOffer =
            false;

          for (const docSnap of snapshot.docs) {
            const data =
              docSnap.data() as OrderData;

            if (
              data
                ?.filaMatching?.[0] ===
                user.uid &&
              !data.motoristaId
            ) {
              if (
                currentOfferId.current !==
                docSnap.id
              ) {
                currentOfferId.current =
                  docSnap.id;

                actionHandled.current =
                  false;

                setOfertaFrete(
                  {
                    id: docSnap.id,
                    ...data,
                  },
                );

                setTempoRestante(
                  15,
                );

                setExibindoOferta(
                  true,
                );

                playAudio();
              }

              foundOffer =
                true;

              break;
            }
          }

          if (
            !foundOffer
          ) {
            setExibindoOferta(
              false,
            );

            setOfertaFrete(
              null,
            );

            stopAudio();
          }
        },
      );

    return () => {
      unsub();
    };
  }, [
    user,
    isOnline,
    activeFrete,
    playAudio,
    stopAudio,
  ]);

  /* =========================================================
     TIMER
  ========================================================= */

  useEffect(() => {
    let timer:
      | NodeJS.Timeout
      | undefined;

    if (
      exibindoOferta &&
      tempoRestante > 0
    ) {
      timer =
        setTimeout(() => {
          setTempoRestante(
            (
              prev,
            ) =>
              prev - 1,
          );
        }, 1000);
    }

    return () => {
      if (timer)
        clearTimeout(
          timer,
        );
    };
  }, [
    exibindoOferta,
    tempoRestante,
  ]);

  /* =========================================================
     ACCEPT
  ========================================================= */

  const handleAceitar =
    async () => {
      if (
        !ofertaFrete ||
        !user ||
        actionHandled.current
      ) {
        return;
      }

      actionHandled.current =
        true;

      stopAudio();

      try {
        const freteRef =
          doc(
            db,
            'fretes',
            ofertaFrete.id!,
          );

        await runTransaction(
          db,
          async (
            transaction,
          ) => {
            const snap =
              await transaction.get(
                freteRef,
              );

            if (
              !snap.exists()
            ) {
              throw new Error(
                'CANCELADO',
              );
            }

            const data =
              snap.data() as OrderData;

            if (
              data.status !==
                'disponivel' ||
              data.motoristaId
            ) {
              throw new Error(
                'JA_ACEITO',
              );
            }

            transaction.update(
              freteRef,
              {
                status:
                  'aceito',

                motoristaId:
                  user.uid,

                motoristaNome:
                  driverData?.nome ||
                  '',

                motoristaZap:
                  driverData?.whatsapp ||
                  '',

                aceitoEm:
                  serverTimestamp(),
              },
            );
          },
        );

        setOfertaFrete(
          null,
        );

        setExibindoOferta(
          false,
        );
      } catch {
        showToast(
          'Esta corrida já foi atribuída.',
          'warning',
        );
      }
    };

  /* =========================================================
     REJECT
  ========================================================= */

  const handleRecusar =
    async () => {
      if (
        !ofertaFrete ||
        !user
      )
        return;

      try {
        await updateDoc(
          doc(
            db,
            'fretes',
            ofertaFrete.id!,
          ),
          {
            filaMatching:
              arrayRemove(
                user.uid,
              ),
          },
        );
      } catch {}

      setOfertaFrete(
        null,
      );

      setExibindoOferta(
        false,
      );

      stopAudio();
    };

  /* =========================================================
     FILES
  ========================================================= */

  const handleFileChange =
    (
      e: React.ChangeEvent<HTMLInputElement>,
      setter: React.Dispatch<
        React.SetStateAction<File | null>
      >,
    ) => {
      const file =
        e.target.files?.[0];

      if (!file)
        return;

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        showToast(
          'Arquivo muito pesado.',
          'warning',
        );

        return;
      }

      if (
        !ALLOWED_MIME_TYPES.includes(
          file.type,
        )
      ) {
        showToast(
          'Formato inválido.',
          'error',
        );

        return;
      }

      setter(file);
    };

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    let unsubCad:
      | (() => void)
      | undefined;

    let unsubFretes:
      | (() => void)
      | undefined;

    const unsubAuth =
      auth.onAuthStateChanged(
        (u) => {
          if (!u) {
            setUser(
              null,
            );

            setLoading(
              false,
            );

            setCheckingDriver(
              false,
            );

            return;
          }

          setUser({
            uid: u.uid,
            email:
              u.email,
          });

          unsubCad =
            onSnapshot(
              doc(
                db,
                'motoristas_cadastros',
                u.uid,
              ),
              (
                snap,
              ) => {
                if (
                  snap.exists()
                ) {
                  setDriverData(
                    {
                      id: snap.id,
                      ...snap.data(),
                    } as DriverData,
                  );
                }

                setCheckingDriver(
                  false,
                );
              },
            );

          unsubFretes =
            onSnapshot(
              query(
                collection(
                  db,
                  'fretes',
                ),

                where(
                  'motoristaId',
                  '==',
                  u.uid,
                ),
              ),
              (
                s,
              ) => {
                const ativo =
                  s.docs
                    .map(
                      (
                        d,
                      ) =>
                        ({
                          id: d.id,
                          ...d.data(),
                        }) as OrderData,
                    )
                    .find(
                      (
                        f,
                      ) =>
                        [
                          'aceito',
                          'coleta',
                          'em_transporte',
                        ].includes(
                          f.status,
                        ),
                    );

                setActiveFrete(
                  ativo ||
                    null,
                );

                setLoading(
                  false,
                );
              },
            );
        },
      );

    return () => {
      unsubAuth();

      unsubCad?.();

      unsubFretes?.();
    };
  }, []);

  /* =========================================================
     TOGGLE
  ========================================================= */

  const toggleStatus =
    async () => {
      if (!user)
        return;

      initAudio();

      if (
        isOnline
      ) {
        setIsOnline(
          false,
        );

        stopAudio();

        try {
          await deleteDoc(
            doc(
              db,
              'motoristas_online',
              user.uid,
            ),
          );
        } catch {}
      } else {
        setIsOnline(
          true,
        );
      }
    };

  /* =========================================================
     FRETE STATUS
  ========================================================= */

  const updateStatusFrete =
    async (
      status: string,
    ) => {
      if (
        !activeFrete ||
        !user
      )
        return;

      setSendingStatus(
        true,
      );

      try {
        const updateData: any =
          {
            status,
          };

        if (
          status ===
          'coleta'
        ) {
          updateData.coletaEm =
            serverTimestamp();
        }

        if (
          status ===
          'em_transporte'
        ) {
          updateData.transporteEm =
            serverTimestamp();
        }

        if (
          status ===
          'entregue'
        ) {
          if (
            !comprovante
          ) {
            showToast(
              'Anexe a foto da entrega.',
              'warning',
            );

            return;
          }

          const fileRef =
            ref(
              storage,
              `comprovantes/${activeFrete.id}`,
            );

          await uploadBytes(
            fileRef,
            comprovante,
          );

          const url =
            await getDownloadURL(
              fileRef,
            );

          updateData.comprovanteUrl =
            url;

          updateData.entregueEm =
            serverTimestamp();
        }

        await updateDoc(
          doc(
            db,
            'fretes',
            activeFrete.id!,
          ),
          updateData,
        );
      } catch {
        showToast(
          'Erro ao atualizar status.',
          'error',
        );
      } finally {
        setSendingStatus(
          false,
        );
      }
    };

  /* =========================================================
     MAPS
  ========================================================= */

  const openMaps =
    (
      lat: number,
      lng: number,
    ) => {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        '_blank',
      );
    };

  /* =========================================================
     MEMOS
  ========================================================= */

  const vehicleLabel =
    useMemo(() => {
      return (
        VEHICLE_CONFIG[
          driverData
            ?.categoria ||
            'carro_pequeno'
        ]?.nome ||
        'Veículo'
      );
    }, [driverData]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading ||
    checkingDriver
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950">

        <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-cyan-500/20 bg-cyan-500/10">

          <div className="absolute inset-0 rounded-[2rem] border border-cyan-400/20 radar-pulse" />

          <Truck className="h-12 w-12 text-cyan-400" />

        </div>

        <Loader2 className="mt-8 h-8 w-8 animate-spin text-cyan-400" />

        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
          Inicializando radar
        </p>

      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">

      {/* ambient */}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.08),transparent_55%)]" />

      {/* toast */}

      {toast && (
        <div className="fixed left-1/2 top-6 z-[200] flex w-[92%] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-500/20 bg-slate-900 px-5 py-4 shadow-2xl backdrop-blur-xl">

          <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />

          <p className="flex-1 text-sm font-bold text-slate-200">
            {toast.msg}
          </p>

          <button
            onClick={() =>
              setToast(
                null,
              )
            }
          >

            <XCircle className="h-5 w-5 text-slate-500" />

          </button>

        </div>
      )}

      {/* offer modal */}

      {exibindoOferta &&
        ofertaFrete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 p-5 backdrop-blur-md">

            <div className="glass-card relative w-full max-w-md overflow-hidden border border-cyan-500/20 bg-slate-950/95 p-8">

              <div className="absolute left-0 top-0 h-1 bg-cyan-400 transition-all duration-1000"
                style={{
                  width: `${(tempoRestante / 15) * 100}%`,
                }}
              />

              <div className="mb-8 flex flex-col items-center text-center">

                <div className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10">

                  <div className="absolute inset-0 rounded-full border border-cyan-400/20 radar-pulse" />

                  <Zap className="h-10 w-10 text-cyan-400" />

                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
                  Nova oportunidade
                </p>

                <h2 className="mt-3 text-3xl font-black uppercase italic tracking-tight text-white">
                  Carga disponível
                </h2>

                <div className="mt-5 flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2">

                  <Clock className="h-4 w-4 text-cyan-300" />

                  <span className="text-sm font-black text-cyan-200">
                    00:
                    {tempoRestante
                      .toString()
                      .padStart(
                        2,
                        '0',
                      )}
                  </span>

                </div>

              </div>

              <div className="space-y-4 rounded-[2rem] border border-white/5 bg-slate-900/70 p-5">

                <div>

                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Coleta
                  </p>

                  <p className="text-sm font-bold text-slate-200">
                    {
                      ofertaFrete.enderecoColetaTexto
                    }
                  </p>

                </div>

                <div>

                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Entrega
                  </p>

                  <p className="text-sm font-bold text-slate-200">
                    {
                      ofertaFrete.enderecoEntregaTexto
                    }
                  </p>

                </div>

                <div className="grid grid-cols-2 gap-4 pt-3">

                  <div className="rounded-2xl border border-white/5 bg-slate-950 p-4 text-center">

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Distância
                    </p>

                    <h3 className="mt-2 text-2xl font-black text-white">
                      {ofertaFrete.distancia?.toFixed(
                        1,
                      )}{' '}
                      km
                    </h3>

                  </div>

                  <div className="rounded-2xl border border-white/5 bg-slate-950 p-4 text-center">

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Ganho
                    </p>

                    <h3 className="mt-2 text-2xl font-black text-emerald-400">
                      R${' '}
                      {ofertaFrete.valorMotorista
                        ?.toFixed(
                          2,
                        )
                        .replace(
                          '.',
                          ',',
                        )}
                    </h3>

                  </div>

                </div>

              </div>

              <div className="mt-8 flex gap-3">

                <button
                  onClick={
                    handleRecusar
                  }
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-900 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-400 transition-all duration-200 hover:bg-slate-800 hover:text-white"
                >
                  Recusar
                </button>

                <button
                  onClick={
                    handleAceitar
                  }
                  className="flex-[2] rounded-2xl border border-cyan-500/20 bg-cyan-500 py-4 text-sm font-black uppercase italic tracking-[0.2em] text-slate-950 shadow-[0_10px_40px_rgba(6,182,212,0.25)] transition-all duration-200 hover:scale-[1.02]"
                >
                  Aceitar corrida
                </button>

              </div>

            </div>

          </div>
        )}

      {/* header */}

      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/85 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">

          <div className="flex items-center gap-3">

            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">

              <div className="absolute inset-0 rounded-2xl border border-cyan-400/10 radar-pulse" />

              <Zap className="h-5 w-5 text-cyan-400" />

            </div>

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
                FRETOGO
              </p>

              <h1 className="mt-1 text-lg font-black italic tracking-tight text-white">
                Radar operacional
              </h1>

            </div>

          </div>

          {user && (
            <button
              onClick={() =>
                signOut(
                  auth,
                )
              }
              className="rounded-full border border-white/10 bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 transition-all duration-200 hover:text-white"
            >
              Sair
            </button>
          )}

        </div>

      </header>

      {/* content */}

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-5 py-10">

        {/* auth */}

        {!user && (
          <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center">

            <div className="glass-card w-full overflow-hidden border border-cyan-500/10 bg-slate-950/90 p-10 text-center">

              <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10">

                <div className="absolute inset-0 rounded-full border border-cyan-400/20 radar-pulse" />

                <Truck className="h-12 w-12 text-cyan-400" />

              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
                Portal do parceiro
              </p>

              <h2 className="mt-4 text-4xl font-black italic tracking-tight text-white">
                Central logística
              </h2>

              <p className="mt-5 text-sm leading-relaxed text-slate-400">
                Acesse o radar realtime e receba
                cargas inteligentes na sua região.
              </p>

              <button
                onClick={() =>
                  signInWithPopup(
                    auth,
                    provider,
                  )
                }
                className="mt-10 flex w-full items-center justify-center gap-3 rounded-[1.6rem] border border-cyan-500/20 bg-cyan-500 py-5 text-sm font-black uppercase italic tracking-[0.22em] text-slate-950 shadow-[0_10px_40px_rgba(6,182,212,0.25)] transition-all duration-200 hover:scale-[1.02]"
              >

                <Truck className="h-5 w-5" />

                Entrar no radar

              </button>

            </div>

          </div>
        )}

        {/* approved */}

        {user &&
          driverData?.status ===
            'aprovado' &&
          !activeFrete && (
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center">

              {/* radar */}

              <div className="relative mb-14 mt-6 flex items-center justify-center">

                {isOnline && (
                  <>
                    <div className="absolute h-[260px] w-[260px] rounded-full border border-cyan-500/10 animate-pulse" />

                    <div className="absolute h-[360px] w-[360px] rounded-full border border-cyan-500/5" />
                  </>
                )}

                <button
                  onClick={
                    toggleStatus
                  }
                  className={`relative z-10 flex h-40 w-40 flex-col items-center justify-center rounded-full border-[3px] transition-all duration-300 ${
                    isOnline
                      ? 'border-cyan-400 bg-slate-950 shadow-[0_0_80px_rgba(6,182,212,0.15)]'
                      : 'border-slate-800 bg-slate-900'
                  }`}
                >

                  <Power
                    className={`h-12 w-12 ${
                      isOnline
                        ? 'text-cyan-400'
                        : 'text-slate-600'
                    }`}
                  />

                  <span
                    className={`mt-3 text-[10px] font-black uppercase tracking-[0.3em] ${
                      isOnline
                        ? 'text-cyan-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {isOnline
                      ? 'Online'
                      : 'Offline'}
                  </span>

                </button>

              </div>

              {isOnline ? (
                <div className="w-full animate-in fade-in duration-500">

                  <div className="mb-8 text-center">

                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2">

                      <Radio className="h-4 w-4 text-cyan-300" />

                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
                        Radar ativo
                      </span>

                    </div>

                    <h2 className="text-4xl font-black italic tracking-tight text-white">
                      Sistema operacional
                    </h2>

                    <p className="mt-5 text-sm text-slate-400">
                      {
                        loadingMessage
                      }
                    </p>

                  </div>

                  <div className="glass-card border border-white/5 bg-slate-900/70 p-8">

                    <div className="mb-5 flex items-center justify-between">

                      <div>

                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                          Busca inteligente
                        </p>

                        <h3 className="mt-2 text-xl font-black text-white">
                          {vehicleLabel}
                        </h3>

                      </div>

                      <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">

                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-300">
                          realtime
                        </span>

                      </div>

                    </div>

                    <input
                      value={
                        backhaulDestino
                      }
                      onChange={(
                        e,
                      ) =>
                        setBackhaulDestino(
                          e.target
                            .value,
                        )
                      }
                      placeholder="Destino preferencial"
                      className="w-full rounded-[1.4rem] border border-white/10 bg-slate-950 px-5 py-5 text-sm font-semibold text-white outline-none transition-all duration-200 placeholder:text-slate-600 focus:border-cyan-500/40"
                    />

                    <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
                      O radar priorizará cargas
                      alinhadas com sua rota de
                      retorno.
                    </p>

                  </div>

                </div>
              ) : (
                <div className="mx-auto max-w-md text-center">

                  <h2 className="text-4xl font-black italic tracking-tight text-slate-700">
                    Radar desligado
                  </h2>

                  <p className="mt-5 text-sm leading-relaxed text-slate-500">
                    Fique online para receber
                    ofertas inteligentes em tempo
                    real.
                  </p>

                  {deferredPrompt && (
                    <button
                      onClick={
                        handleInstallClick
                      }
                      className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-6 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-300 transition-all duration-200 hover:bg-slate-800"
                    >

                      <Download className="h-4 w-4" />

                      Instalar app

                    </button>
                  )}

                </div>
              )}

            </div>
          )}

        {/* active frete */}

        {activeFrete && (
          <div className="mx-auto w-full max-w-2xl">

            <div className="glass-card border border-cyan-500/10 bg-slate-950/90 p-8">

              <div className="mb-8 flex items-center gap-3">

                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">

                  <div className="absolute inset-0 rounded-2xl border border-cyan-400/20 radar-pulse" />

                  <Truck className="h-5 w-5 text-cyan-400" />

                </div>

                <div>

                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
                    Operação ativa
                  </p>

                  <h2 className="mt-1 text-2xl font-black italic tracking-tight text-white">
                    Corrida em andamento
                  </h2>

                </div>

              </div>

              <div className="space-y-5 rounded-[2rem] border border-white/5 bg-slate-900/70 p-6">

                <div>

                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Coleta
                  </p>

                  <p className="font-bold text-slate-200">
                    {
                      activeFrete.enderecoColetaTexto
                    }
                  </p>

                </div>

                <div>

                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Entrega
                  </p>

                  <p className="font-bold text-slate-200">
                    {
                      activeFrete.enderecoEntregaTexto
                    }
                  </p>

                </div>

              </div>

              <button
                onClick={() =>
                  openMaps(
                    activeFrete.status ===
                      'aceito'
                      ? activeFrete.origemLat
                      : activeFrete.destinoLat,
                    activeFrete.status ===
                      'aceito'
                      ? activeFrete.origemLng
                      : activeFrete.destinoLng,
                  )
                }
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-[1.4rem] border border-white/10 bg-slate-900 py-5 text-sm font-black uppercase tracking-[0.22em] text-white transition-all duration-200 hover:bg-slate-800"
              >

                <Navigation className="h-5 w-5" />

                Abrir GPS

              </button>

              {activeFrete.status ===
                'aceito' && (
                <button
                  disabled={
                    sendingStatus
                  }
                  onClick={() =>
                    updateStatusFrete(
                      'coleta',
                    )
                  }
                  className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500 py-5 text-sm font-black uppercase italic tracking-[0.22em] text-slate-950 shadow-[0_10px_40px_rgba(6,182,212,0.25)] transition-all duration-200 hover:scale-[1.01]"
                >

                  <MapPin className="h-5 w-5" />

                  Cheguei na coleta

                </button>
              )}

              {activeFrete.status ===
                'coleta' && (
                <button
                  disabled={
                    sendingStatus
                  }
                  onClick={() =>
                    updateStatusFrete(
                      'em_transporte',
                    )
                  }
                  className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.4rem] border border-yellow-400/20 bg-yellow-400 py-5 text-sm font-black uppercase italic tracking-[0.22em] text-slate-950 shadow-[0_10px_40px_rgba(250,204,21,0.25)] transition-all duration-200 hover:scale-[1.01]"
                >

                  <Truck className="h-5 w-5" />

                  Carga embarcada

                </button>
              )}

              {activeFrete.status ===
                'em_transporte' && (
                <div className="mt-6 rounded-[2rem] border border-white/5 bg-slate-900/70 p-5">

                  <label className={`flex cursor-pointer items-center justify-center gap-3 rounded-[1.4rem] border-2 border-dashed px-5 py-5 text-xs font-black uppercase tracking-[0.25em] transition-all duration-200 ${
                    comprovante
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-700 text-slate-500 hover:border-slate-600'
                  }`}
                  >

                    <Camera className="h-5 w-5" />

                    {comprovante
                      ? 'Foto anexada'
                      : 'Anexar comprovante'}

                    <input
                      hidden
                      type="file"
                      capture="environment"
                      onChange={(
                        e,
                      ) =>
                        handleFileChange(
                          e,
                          setComprovante,
                        )
                      }
                    />

                  </label>

                  <button
                    disabled={
                      sendingStatus
                    }
                    onClick={() =>
                      updateStatusFrete(
                        'entregue',
                      )
                    }
                    className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.4rem] border border-emerald-500/20 bg-emerald-500 py-5 text-sm font-black uppercase italic tracking-[0.22em] text-slate-950 shadow-[0_10px_40px_rgba(34,197,94,0.25)] transition-all duration-200 hover:scale-[1.01]"
                  >

                    {sendingStatus ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-5 w-5" />
                    )}

                    Finalizar corrida

                  </button>

                </div>
              )}

              <div className="mt-8 border-t border-white/5 pt-8">

                <ChatFrete
                  freteId={
                    activeFrete.id!
                  }
                  tipoUsuario="motorista"
                  nome={
                    driverData?.nome ||
                    'Motorista'
                  }
                />

              </div>

            </div>

          </div>
        )}

      </main>

    </div>
  );
}
