// src/hooks/useClientRealtime.ts

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  doc,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  AppTripState,
  isFinalState,
} from '../state/tripStateMachine';

import {
  clientFreightService,
} from '../services/clientFreightService';

import {
  triggerRedispatch,
} from '../services/orchestrator';

/*
=========================================================
TYPES
=========================================================
*/

type UseClientRealtimeProps =
  {
    freightId?: string;
  };

type RuntimeOperationalState =
  | 'OFFLINE'
  | 'CONNECTING'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_FOUND'
  | 'DRIVER_ACCEPTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REDISPATCHING';

type RuntimeSnapshot =
  Record<string, any> & {
    id: string;
  };

/*
=========================================================
CONSTANTS
=========================================================
*/

const HEARTBEAT_INTERVAL =
  15000;

const CONNECTION_TIMEOUT =
  30000;

const DRIVER_TIMEOUT =
  45000;

const RECONNECT_DELAY =
  5000;

const STALE_SNAPSHOT_LIMIT =
  1000 * 60 * 5;

const STORAGE_PREFIX =
  'fretogo_runtime_client_';

/*
=========================================================
GLOBAL REGISTRIES
=========================================================
*/

const activeListeners =
  new Map<
    string,
    () => void
  >();

const activeInstances =
  new Set<string>();

const reconnectRegistry =
  new Map<
    string,
    number
  >();

/*
=========================================================
HELPERS
=========================================================
*/

const buildSnapshotHash = (
  data: Record<
    string,
    any
  >,
) => {
  try {
    return JSON.stringify({
      status:
        data.status,

      motoristaId:
        data.motoristaId,

      updatedAt:
        data.updatedAt ||
        data.atualizadoEm,

      dispatchVersion:
        data.dispatchVersion,

      trackingVersion:
        data.trackingVersion,

      matchingVersion:
        data.matchingVersion,
    });
  } catch {
    return `${Date.now()}`;
  }
};

const getStorageKey = (
  freightId: string,
) =>
  `${STORAGE_PREFIX}${freightId}`;

const safeNow = () =>
  Date.now();

/*
=========================================================
HOOK
=========================================================
*/

export const useClientRealtime =
  ({
    freightId,
  }: UseClientRealtimeProps) => {
    /*
    =========================================================
    STATES
    =========================================================
    */

    const [
      orderData,
      setOrderData,
    ] = useState<any>(
      null,
    );

    const [
      connected,
      setConnected,
    ] = useState(false);

    const [
      driverFound,
      setDriverFound,
    ] = useState(false);

    const [
      tripFinished,
      setTripFinished,
    ] = useState(false);

    const [
      isRedispatching,
      setIsRedispatching,
    ] = useState(false);

    /*
    =========================================================
    ENTERPRISE FLAGS
    =========================================================
    */

    const [
      isRealtimeReady,
      setIsRealtimeReady,
    ] = useState(false);

    const [
      isHydrated,
      setIsHydrated,
    ] = useState(false);

    const [
      isOffline,
      setIsOffline,
    ] = useState(false);

    const [
      isReconnecting,
      setIsReconnecting,
    ] = useState(false);

    const [
      isRedispatchLocked,
      setIsRedispatchLocked,
    ] = useState(false);

    const [
      hasStaleSnapshot,
      setHasStaleSnapshot,
    ] = useState(false);

    const [
      hasDriverTimeout,
      setHasDriverTimeout,
    ] = useState(false);

    const [
      runtimeRecovered,
      setRuntimeRecovered,
    ] = useState(false);

    const [
      runtimeState,
      setRuntimeState,
    ] =
      useState<RuntimeOperationalState>(
        'OFFLINE',
      );

    /*
    =========================================================
    REFS
    =========================================================
    */

    const mountedRef =
      useRef(false);

    const snapshotHashRef =
      useRef<
        string | null
      >(null);

    const watchdogRef =
      useRef<
        NodeJS.Timeout | null
      >(null);

    const heartbeatRef =
      useRef<
        NodeJS.Timeout | null
      >(null);

    const driverTimeoutRef =
      useRef<
        NodeJS.Timeout | null
      >(null);

    const reconnectTimeoutRef =
      useRef<
        NodeJS.Timeout | null
      >(null);

    const reconnectingRef =
      useRef(false);

    const inflightRedispatchRef =
      useRef(false);

    const visibilityRef =
      useRef(
        typeof document !==
          'undefined'
          ? !document.hidden
          : true,
      );

    const hydratedRef =
      useRef(false);

    const renderLockRef =
      useRef(false);

    const lastSnapshotTimestampRef =
      useRef(0);

    /*
    =========================================================
    STORAGE
    =========================================================
    */

    const persistRuntime =
      (
        data: RuntimeSnapshot,
      ) => {
        if (
          !freightId
        ) {
          return;
        }

        try {
          localStorage.setItem(
            getStorageKey(
              freightId,
            ),
            JSON.stringify({
              data,
              timestamp:
                safeNow(),
            }),
          );
        } catch (
          error
        ) {
          console.error(
            'RUNTIME PERSIST ERROR:',
            error,
          );
        }
      };

    const hydrateRuntime =
      () => {
        if (
          !freightId
        ) {
          return;
        }

        try {
          const raw =
            localStorage.getItem(
              getStorageKey(
                freightId,
              ),
            );

          if (!raw) {
            return;
          }

          const parsed =
            JSON.parse(raw);

          if (
            !parsed?.data
          ) {
            return;
          }

          setOrderData(
            parsed.data,
          );

          setRuntimeRecovered(
            true,
          );

          hydratedRef.current =
            true;

          setIsHydrated(
            true,
          );
        } catch (
          error
        ) {
          console.error(
            'RUNTIME HYDRATE ERROR:',
            error,
          );
        }
      };

    /*
    =========================================================
    OPERATIONAL STATE
    =========================================================
    */

    const resolveOperationalState =
      (
        data?: Record<
          string,
          any
        >,
      ): RuntimeOperationalState => {
        if (!data) {
          return 'OFFLINE';
        }

        if (
          isRedispatching
        ) {
          return 'REDISPATCHING';
        }

        switch (
          data.status
        ) {
          case
            AppTripState.DISPONIVEL:
          case
            AppTripState.OFERTANDO:
          case
            AppTripState.PROCURANDO_MOTORISTA:
            return 'SEARCHING_DRIVER';

          case
            AppTripState.ACEITO:
            return 'DRIVER_ACCEPTED';

          case
            AppTripState.COLETANDO:
          case
            AppTripState.EM_TRANSPORTE:
          case
            AppTripState.FINALIZANDO:
            return 'IN_TRANSIT';

          case
            AppTripState.ENTREGUE:
            return 'DELIVERED';

          case
            AppTripState.CANCELADO:
            return 'CANCELLED';

          default:
            break;
        }

        if (
          data.motoristaId
        ) {
          return 'DRIVER_FOUND';
        }

        return connected
          ? 'CONNECTING'
          : 'OFFLINE';
      };

    /*
    =========================================================
    HYDRATE
    =========================================================
    */

    useEffect(() => {
      if (
        !freightId
      ) {
        return;
      }

      hydrateRuntime();
    }, [freightId]);

    /*
    =========================================================
    VISIBILITY
    =========================================================
    */

    useEffect(() => {
      const handleVisibility =
        () => {
          visibilityRef.current =
            !document.hidden;

          if (
            visibilityRef.current &&
            freightId
          ) {
            setIsReconnecting(
              true,
            );
          }
        };

      document.addEventListener(
        'visibilitychange',
        handleVisibility,
      );

      return () => {
        document.removeEventListener(
          'visibilitychange',
          handleVisibility,
        );
      };
    }, [freightId]);

    /*
    =========================================================
    ONLINE / OFFLINE
    =========================================================
    */

    useEffect(() => {
      const handleOffline =
        () => {
          setIsOffline(
            true,
          );

          setConnected(
            false,
          );

          setRuntimeState(
            'OFFLINE',
          );
        };

      const handleOnline =
        () => {
          setIsOffline(
            false,
          );

          setIsReconnecting(
            true,
          );
        };

      window.addEventListener(
        'offline',
        handleOffline,
      );

      window.addEventListener(
        'online',
        handleOnline,
      );

      return () => {
        window.removeEventListener(
          'offline',
          handleOffline,
        );

        window.removeEventListener(
          'online',
          handleOnline,
        );
      };
    }, []);

    /*
    =========================================================
    HEARTBEAT
    =========================================================
    */

    useEffect(() => {
      if (
        !freightId
      ) {
        return;
      }

      if (
        heartbeatRef.current
      ) {
        clearInterval(
          heartbeatRef.current,
        );
      }

      heartbeatRef.current =
        setInterval(
          async () => {
            try {
              if (
                isOffline ||
                !mountedRef.current
              ) {
                return;
              }

              await clientFreightService.atualizarFrete(
                freightId,
                {
                  lastSeenCliente:
                    new Date(),

                  runtimeHeartbeat:
                    safeNow(),

                  reconnecting:
                    reconnectingRef.current,
                },
              );
            } catch (
              error
            ) {
              console.error(
                'HEARTBEAT ERROR:',
                error,
              );
            }
          },
          HEARTBEAT_INTERVAL,
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
    }, [
      freightId,
      isOffline,
    ]);

    /*
    =========================================================
    REALTIME
    =========================================================
    */

    useEffect(() => {
      if (
        !freightId
      ) {
        return;
      }

      /*
      =========================================================
      MULTI INSTANCE PROTECTION
      =========================================================
      */

      if (
        activeInstances.has(
          freightId,
        )
      ) {
        return;
      }

      activeInstances.add(
        freightId,
      );

      mountedRef.current =
        true;

      setRuntimeState(
        'CONNECTING',
      );

      setIsRealtimeReady(
        false,
      );

      /*
      =========================================================
      REMOVE PREVIOUS LISTENER
      =========================================================
      */

      const existing =
        activeListeners.get(
          freightId,
        );

      if (existing) {
        existing();
        activeListeners.delete(
          freightId,
        );
      }

      const freightRef = doc(
        db,
        'fretes',
        freightId,
      );

      const unsubscribe =
        onSnapshot(
          freightRef,

          async snapshot => {
            try {
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

              /*
              =========================================================
              BUILD SNAPSHOT
              =========================================================
              */

              const data: RuntimeSnapshot =
                {
                  id:
                    snapshot.id,

                  ...snapshot.data(),
                };

              /*
              =========================================================
              STALE PROTECTION
              =========================================================
              */

              const snapshotUpdatedAt =
                data.updatedAt?.seconds
                  ? data.updatedAt
                      .seconds *
                    1000
                  : data.atualizadoEm ||
                    safeNow();

              const stale =
                safeNow() -
                  snapshotUpdatedAt >
                STALE_SNAPSHOT_LIMIT;

              setHasStaleSnapshot(
                stale,
              );

              if (
                stale
              ) {
                return;
              }

              /*
              =========================================================
              SNAPSHOT DEDUPE
              =========================================================
              */

              const currentHash =
                buildSnapshotHash(
                  data,
                );

              if (
                snapshotHashRef.current ===
                  currentHash &&
                connected
              ) {
                return;
              }

              snapshotHashRef.current =
                currentHash;

              /*
              =========================================================
              WATCHDOG
              =========================================================
              */

              if (
                watchdogRef.current
              ) {
                clearTimeout(
                  watchdogRef.current,
                );
              }

              watchdogRef.current =
                setTimeout(
                  () => {
                    if (
                      !mountedRef.current
                    ) {
                      return;
                    }

                    setConnected(
                      false,
                    );

                    setIsReconnecting(
                      true,
                    );

                    reconnectingRef.current =
                      true;
                  },
                  CONNECTION_TIMEOUT,
                );

              /*
              =========================================================
              RENDER GUARD
              =========================================================
              */

              if (
                renderLockRef.current
              ) {
                return;
              }

              renderLockRef.current =
                true;

              requestAnimationFrame(
                () => {
                  if (
                    !mountedRef.current
                  ) {
                    return;
                  }

                  setOrderData(
                    prev => {
                      const prevUpdated =
                        prev?.updatedAt
                          ?.seconds ||
                        0;

                      const nextUpdated =
                        data?.updatedAt
                          ?.seconds ||
                        0;

                      /*
                      =========================================================
                      PREVENT STALE OVERWRITE
                      =========================================================
                      */

                      if (
                        nextUpdated <
                        prevUpdated
                      ) {
                        return prev;
                      }

                      return data;
                    },
                  );

                  persistRuntime(
                    data,
                  );

                  renderLockRef.current =
                    false;
                },
              );

              /*
              =========================================================
              CONNECTION FLAGS
              =========================================================
              */

              setConnected(
                true,
              );

              setIsRealtimeReady(
                true,
              );

              setIsOffline(
                false,
              );

              setIsReconnecting(
                false,
              );

              reconnectingRef.current =
                false;

              /*
              =========================================================
              DRIVER FOUND
              =========================================================
              */

              if (
                data.motoristaId
              ) {
                setDriverFound(
                  true,
                );

                setHasDriverTimeout(
                  false,
                );

                if (
                  driverTimeoutRef.current
                ) {
                  clearTimeout(
                    driverTimeoutRef.current,
                  );
                }
              }

              /*
              =========================================================
              FINAL STATE
              =========================================================
              */

              if (
                isFinalState(
                  data.status,
                )
              ) {
                setTripFinished(
                  true,
                );
              }

              /*
              =========================================================
              REDISPATCH
              =========================================================
              */

              if (
                data.status ===
                  AppTripState.OFERTANDO &&
                !data.motoristaId
              ) {
                if (
                  driverTimeoutRef.current
                ) {
                  clearTimeout(
                    driverTimeoutRef.current,
                  );
                }

                driverTimeoutRef.current =
                  setTimeout(
                    async () => {
                      try {
                        if (
                          inflightRedispatchRef.current
                        ) {
                          return;
                        }

                        inflightRedispatchRef.current =
                          true;

                        setIsRedispatchLocked(
                          true,
                        );

                        setHasDriverTimeout(
                          true,
                        );

                        setIsRedispatching(
                          true,
                        );

                        setRuntimeState(
                          'REDISPATCHING',
                        );

                        await triggerRedispatch(
                          freightId,
                          data.motoristaAtual ||
                            '',
                        );
                      } catch (
                        error
                      ) {
                        console.error(
                          'REDISPATCH ERROR:',
                          error,
                        );
                      } finally {
                        inflightRedispatchRef.current =
                          false;

                        setIsRedispatchLocked(
                          false,
                        );

                        setIsRedispatching(
                          false,
                        );
                      }
                    },
                    DRIVER_TIMEOUT,
                  );
              }

              /*
              =========================================================
              RUNTIME STATE
              =========================================================
              */

              setRuntimeState(
                resolveOperationalState(
                  data,
                ),
              );

              /*
              =========================================================
              RECOVERY
              =========================================================
              */

              if (
                !hydratedRef.current
              ) {
                hydratedRef.current =
                  true;

                setIsHydrated(
                  true,
                );
              }

              setRuntimeRecovered(
                true,
              );

              lastSnapshotTimestampRef.current =
                safeNow();
            } catch (
              error
            ) {
              console.error(
                'SNAPSHOT PROCESS ERROR:',
                error,
              );
            }
          },

          error => {
            console.error(
              'Client Realtime Error:',
              error,
            );

            setConnected(
              false,
            );

            setIsReconnecting(
              true,
            );

            reconnectingRef.current =
              true;

            /*
            =========================================================
            RECONNECT ORCHESTRATION
            =========================================================
            */

            const attempts =
              reconnectRegistry.get(
                freightId,
              ) || 0;

            reconnectRegistry.set(
              freightId,
              attempts + 1,
            );

            if (
              reconnectTimeoutRef.current
            ) {
              clearTimeout(
                reconnectTimeoutRef.current,
              );
            }

            reconnectTimeoutRef.current =
              setTimeout(
                () => {
                  if (
                    !mountedRef.current
                  ) {
                    return;
                  }

                  setRuntimeState(
                    'CONNECTING',
                  );
                },
                RECONNECT_DELAY,
              );
          },
        );

      activeListeners.set(
        freightId,
        unsubscribe,
      );

      /*
      =========================================================
      CLEANUP
      =========================================================
      */

      return () => {
        mountedRef.current =
          false;

        activeInstances.delete(
          freightId,
        );

        const listener =
          activeListeners.get(
            freightId,
          );

        if (
          listener
        ) {
          listener();

          activeListeners.delete(
            freightId,
          );
        }

        if (
          watchdogRef.current
        ) {
          clearTimeout(
            watchdogRef.current,
          );
        }

        if (
          heartbeatRef.current
        ) {
          clearInterval(
            heartbeatRef.current,
          );
        }

        if (
          driverTimeoutRef.current
        ) {
          clearTimeout(
            driverTimeoutRef.current,
          );
        }

        if (
          reconnectTimeoutRef.current
        ) {
          clearTimeout(
            reconnectTimeoutRef.current,
          );
        }

        reconnectingRef.current =
          false;

        inflightRedispatchRef.current =
          false;
      };
    }, [freightId]);

    /*
    =========================================================
    MEMOS
    =========================================================
    */

    const isWaitingDriver =
      useMemo(
        () =>
          orderData?.status ===
            AppTripState.DISPONIVEL ||
          orderData?.status ===
            AppTripState.OFERTANDO ||
          orderData?.status ===
            AppTripState.PROCURANDO_MOTORISTA,
        [orderData],
      );

    const isDriverAccepted =
      useMemo(
        () =>
          orderData?.status ===
          AppTripState.ACEITO,
        [orderData],
      );

    const isInTransit =
      useMemo(
        () =>
          orderData?.status ===
            AppTripState.EM_TRANSPORTE ||
          orderData?.status ===
            AppTripState.FINALIZANDO ||
          orderData?.status ===
            AppTripState.COLETANDO,
        [orderData],
      );

    const isCancelled =
      useMemo(
        () =>
          orderData?.status ===
          AppTripState.CANCELADO,
        [orderData],
      );

    const isCompleted =
      useMemo(
        () =>
          orderData?.status ===
          AppTripState.ENTREGUE,
        [orderData],
      );

    /*
    =========================================================
    RETURN
    =========================================================
    */

    return {
      /*
      =========================================================
      PRESERVED API
      =========================================================
      */

      orderData,

      connected,

      driverFound,

      tripFinished,

      isRedispatching,

      isWaitingDriver,

      isDriverAccepted,

      isInTransit,

      isCancelled,

      isCompleted,

      /*
      =========================================================
      ENTERPRISE FLAGS
      =========================================================
      */

      runtimeState,

      isRealtimeReady,

      isHydrated,

      isOffline,

      isReconnecting,

      isRedispatchLocked,

      hasStaleSnapshot,

      hasDriverTimeout,

      runtimeRecovered,
    };
  };
