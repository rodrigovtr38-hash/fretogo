import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  auth,
  db,
} from '../firebase';

import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import ChatFrete from '../components/ChatFrete';

import DriverHeader from '../components/motorista/DriverHeader';

import DriverAuth from '../components/motorista/DriverAuth';

import DriverCadastro from '../components/motorista/DriverCadastro';

import DriverRadar from '../components/motorista/DriverRadar';

import DriverDashboardLayout, {
  OperationalFreight,
} from '../components/driver/dashboard/DriverDashboardLayout';

interface DriverData {
  id?: string;

  nome?: string;

  whatsapp?: string;

  categoria?: string;

  status?:
    | 'pendente'
    | 'aprovado'
    | 'rejeitado';
}

const CATEGORY_FEES: Record<
  string,
  number
> = {
  moto: 0.2,
  carro: 0.2,
  utilitario: 0.2,
  toco: 0.15,
  truck: 0.15,
  carreta: 0.15,
  bitrem: 0.15,
};

const ACTIVE_STATUSES = [
  'aceito',
  'coleta',
  'em_transito',
  'entregando',
];

export default function Motorista() {
  const [user, setUser] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [checkingDriver, setCheckingDriver] =
    useState(true);

  const [driverData, setDriverData] =
    useState<DriverData | null>(null);

  const [activeFreight, setActiveFreight] =
    useState<OperationalFreight | null>(
      null,
    );

  const [availableFreights, setAvailableFreights] =
    useState<
      OperationalFreight[]
    >([]);

  const [selectedFreight, setSelectedFreight] =
    useState<OperationalFreight | null>(
      null,
    );

  const [isOnline, setIsOnline] =
    useState(false);

  const [radarLoading, setRadarLoading] =
    useState(false);

  const listenerRegistryRef =
    useRef<{
      freights?: () => void;
      active?: () => void;
      driver?: () => void;
    }>({});

  const operationalCategory =
    useMemo(() => {
      if (
        !driverData?.categoria
      ) {
        return 'carro';
      }

      return driverData.categoria
        .toLowerCase()
        .normalize('NFD')
        .replace(
          /[\u0300-\u036f]/g,
          '',
        );
    }, [driverData]);

  const normalizeFreight =
    useCallback(
      (
        id: string,
        data: any,
      ): OperationalFreight => {
        const feePercent =
          CATEGORY_FEES[
            data.categoria
          ] ?? 0.2;

        const valorCliente =
          Number(
            data.valorCliente ||
              data.valor ||
              0,
          );

        const valorMotorista =
          data.valorMotorista ??
          valorCliente *
            (1 - feePercent);

        const distanciaColetaKm =
          Number(
            data.distanciaColetaKm ||
              0,
          );

        const distanciaEntregaKm =
          Number(
            data.distanciaEntregaKm ||
              data.distancia ||
              0,
          );

        return {
          id,

          status:
            data.status ||
            'disponivel',

          prioridade:
            Boolean(
              data.prioridade,
            ),

          agendado:
            Boolean(
              data.agendado,
            ),

          categoria:
            data.categoria ||
            'carro',

          enderecoColetaTexto:
            data.enderecoColetaTexto ||
            'Coleta não informada',

          enderecoEntregaTexto:
            data.enderecoEntregaTexto ||
            'Entrega não informada',

          distanciaColetaKm,

          distanciaEntregaKm,

          distanciaTotalKm:
            distanciaColetaKm +
            distanciaEntregaKm,

          valorCliente,

          valorMotorista,

          pesoKg: Number(
            data.pesoKg || 0,
          ),

          volumes: Number(
            data.volumes || 1,
          ),

          etaMinutes: Number(
            data.etaMinutes ||
              20,
          ),

          motoristaId:
            data.motoristaId ||
            null,

          createdAt:
            data.createdAt,

          updatedAt:
            data.updatedAt,
        };
      },
      [],
    );

  useEffect(() => {
    const unsubscribe =
      auth.onAuthStateChanged(
        (firebaseUser) => {
          setUser(firebaseUser);

          if (!firebaseUser) {
            setDriverData(null);

            setAvailableFreights(
              [],
            );

            setActiveFreight(
              null,
            );

            setLoading(false);

            setCheckingDriver(
              false,
            );

            return;
          }

          setCheckingDriver(
            true,
          );

          const driverUnsubscribe =
            onSnapshot(
              doc(
                db,
                'motoristas_cadastros',
                firebaseUser.uid,
              ),
              (
                snapshot,
              ) => {
                if (
                  snapshot.exists()
                ) {
                  setDriverData(
                    {
                      id: snapshot.id,
                      ...snapshot.data(),
                    } as DriverData,
                  );
                } else {
                  setDriverData(
                    null,
                  );
                }

                setCheckingDriver(
                  false,
                );
              },
              (
                error,
              ) => {
                console.error(
                  'DRIVER SNAPSHOT ERROR:',
                  error,
                );

                setCheckingDriver(
                  false,
                );
              },
            );

          listenerRegistryRef.current.driver =
            driverUnsubscribe;

          setLoading(false);
        },
      );

    return () => {
      unsubscribe();

      Object.values(
        listenerRegistryRef.current,
      ).forEach(
        (unsubscribeFn) => {
          if (
            typeof unsubscribeFn ===
            'function'
          ) {
            unsubscribeFn();
          }
        },
      );
    };
  }, []);

  useEffect(() => {
    if (
      !user?.uid ||
      !driverData ||
      !isOnline
    ) {
      setAvailableFreights(
        [],
      );

      if (
        listenerRegistryRef.current
          .freights
      ) {
        listenerRegistryRef.current.freights();
      }

      return;
    }

    setRadarLoading(true);

    const freightsQuery =
      query(
        collection(
          db,
          'fretes',
        ),

        where(
          'categoria',
          '==',
          operationalCategory,
        ),

        where(
          'status',
          '==',
          'disponivel',
        ),

        orderBy(
          'createdAt',
          'desc',
        ),

        limit(20),
      );

    const unsubscribe =
      onSnapshot(
        freightsQuery,
        (snapshot) => {
          const freights =
            snapshot.docs
              .map(
                (
                  document,
                ) =>
                  normalizeFreight(
                    document.id,
                    document.data(),
                  ),
              )
              .filter(
                (
                  freight,
                ) =>
                  !freight.motoristaId,
              );

          setAvailableFreights(
            freights,
          );

          setRadarLoading(
            false,
          );
        },
        (error) => {
          console.error(
            'FREIGHTS REALTIME ERROR:',
            error,
          );

          setRadarLoading(
            false,
          );
        },
      );

    listenerRegistryRef.current.freights =
      unsubscribe;

    return () => {
      unsubscribe();
    };
  }, [
    user,
    driverData,
    isOnline,
    operationalCategory,
    normalizeFreight,
  ]);

  useEffect(() => {
    if (!user?.uid) {
      setActiveFreight(
        null,
      );

      return;
    }

    const activeQuery =
      query(
        collection(
          db,
          'fretes',
        ),

        where(
          'motoristaId',
          '==',
          user.uid,
        ),

        where(
          'status',
          'in',
          ACTIVE_STATUSES,
        ),

        limit(1),
      );

    const unsubscribe =
      onSnapshot(
        activeQuery,
        (snapshot) => {
          if (
            snapshot.empty
          ) {
            setActiveFreight(
              null,
            );

            return;
          }

          const activeDoc =
            snapshot.docs[0];

          setActiveFreight(
            normalizeFreight(
              activeDoc.id,
              activeDoc.data(),
            ),
          );
        },
        (error) => {
          console.error(
            'ACTIVE FREIGHT ERROR:',
            error,
          );
        },
      );

    listenerRegistryRef.current.active =
      unsubscribe;

    return () => {
      unsubscribe();
    };
  }, [
    user,
    normalizeFreight,
  ]);

  const handleToggleOnline =
    useCallback(
      (
        nextState: boolean,
      ) => {
        setIsOnline(
          nextState,
        );
      },
      [],
    );

  const handleSelectFreight =
    useCallback(
      (
        freight: OperationalFreight,
      ) => {
        setSelectedFreight(
          freight,
        );
      },
      [],
    );

  const handleCloseFreight =
    useCallback(() => {
      setSelectedFreight(
        null,
      );
    }, []);

  const handleAcceptFreight =
    useCallback(
      async (
        freight: OperationalFreight,
      ) => {
        if (
          !user?.uid ||
          !driverData
        ) {
          return;
        }

        try {
          await updateDoc(
            doc(
              db,
              'fretes',
              freight.id,
            ),
            {
              status:
                'aceito',

              motoristaId:
                user.uid,

              motoristaNome:
                driverData.nome ||
                'Motorista',

              motoristaZap:
                driverData.whatsapp ||
                '',

              acceptedAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),
            },
          );

          setSelectedFreight(
            null,
          );
        } catch (error) {
          console.error(
            'ACCEPT FREIGHT ERROR:',
            error,
          );
        }
      },
      [
        user,
        driverData,
      ],
    );

  const handleRejectFreight =
    useCallback(
      async (
        freight: OperationalFreight,
      ) => {
        setAvailableFreights(
          (
            current,
          ) =>
            current.filter(
              (
                item,
              ) =>
                item.id !==
                freight.id,
            ),
        );

        setSelectedFreight(
          null,
        );
      },
      [],
    );

  if (
    loading ||
    checkingDriver
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-black">
            FRETOGO
          </h1>

          <p className="mt-4 text-slate-400">
            Inicializando sistema operacional...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <DriverAuth />
    );
  }

  if (!driverData) {
    return (
      <DriverCadastro
        onFinish={() => {
          setCheckingDriver(
            true,
          );
        }}
      />
    );
  }

  if (
    driverData.status !==
    'aprovado'
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-md rounded-3xl border border-cyan-500/20 bg-slate-900 p-10 text-center">
          <h1 className="mb-4 text-3xl font-black text-white">
            Cadastro em análise
          </h1>

          <p className="text-slate-400">
            Aguarde aprovação do administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <DriverHeader
        user={user}
      />

      <DriverRadar
        isOnline={
          isOnline
        }
        setIsOnline={
          setIsOnline
        }
        user={user}
        driver={
          driverData
        }
      />

      <DriverDashboardLayout
        freights={
          availableFreights
        }
        selectedFreight={
          selectedFreight
        }
        activeFreight={
          activeFreight
        }
        isOnline={
          isOnline
        }
        loading={
          radarLoading
        }
        driverCategory={
          operationalCategory
        }
        onToggleOnline={
          handleToggleOnline
        }
        onSelectFreight={
          handleSelectFreight
        }
        onCloseFreight={
          handleCloseFreight
        }
        onAcceptFreight={
          handleAcceptFreight
        }
        onRejectFreight={
          handleRejectFreight
        }
      />

      {activeFreight?.id && (
        <div className="mx-auto mt-10 max-w-4xl px-4 pb-20">
          <ChatFrete
            freteId={
              activeFreight.id
            }
            tipoUsuario="motorista"
            nome={
              driverData.nome ||
              'Motorista'
            }
          />
        </div>
      )}
    </div>
  );
}
