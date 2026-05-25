// src/hooks/useClientRealtime.ts

import {
  useEffect,
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

type UseClientRealtimeProps = {
  freightId?: string;
};

const HEARTBEAT_INTERVAL =
  15000;

const CONNECTION_TIMEOUT =
  30000;

const DRIVER_TIMEOUT =
  45000;

export const useClientRealtime = ({
  freightId,
}: UseClientRealtimeProps) => {
  /*
  ==========================
  STATES
  ==========================
  */

  const [orderData, setOrderData] =
    useState<any>(null);

  const [connected, setConnected] =
    useState(false);

  const [driverFound, setDriverFound] =
    useState(false);

  const [tripFinished, setTripFinished] =
    useState(false);

  const [isRedispatching, setIsRedispatching] =
    useState(false);

  /*
  ==========================
  REFS
  ==========================
  */

  const watchdogRef =
    useRef<NodeJS.Timeout | null>(
      null
    );

  const heartbeatRef =
    useRef<NodeJS.Timeout | null>(
      null
    );

  const driverTimeoutRef =
    useRef<NodeJS.Timeout | null>(
      null
    );

  /*
  ==========================
  HEARTBEAT
  ==========================
  */

  useEffect(() => {
    if (!freightId) return;

    heartbeatRef.current =
      setInterval(async () => {
        try {
          await clientFreightService.atualizarFrete(
            freightId,
            {
              lastSeenCliente:
                new Date(),
            }
          );
        } catch (error) {
          console.error(
            'HEARTBEAT ERROR:',
            error
          );
        }
      }, HEARTBEAT_INTERVAL);

    return () => {
      if (
        heartbeatRef.current
      ) {
        clearInterval(
          heartbeatRef.current
        );
      }
    };
  }, [freightId]);

  /*
  ==========================
  REALTIME
  ==========================
  */

  useEffect(() => {
    if (!freightId) return;

    const freightRef = doc(
      db,
      'fretes',
      freightId
    );

    const unsubscribe =
      onSnapshot(
        freightRef,

        async snapshot => {
          if (
            !snapshot.exists()
          ) {
            return;
          }

          const data = {
            id: snapshot.id,
            ...snapshot.data(),
          };

          /*
          ==========================
          STATE
          ==========================
          */

          setOrderData(data);

          setConnected(true);

          /*
          ==========================
          DRIVER FOUND
          ==========================
          */

          if (
            data.motoristaId
          ) {
            setDriverFound(
              true
            );

            if (
              driverTimeoutRef.current
            ) {
              clearTimeout(
                driverTimeoutRef.current
              );
            }
          }

          /*
          ==========================
          FINISHED
          ==========================
          */

          if (
            isFinalState(
              data.status
            )
          ) {
            setTripFinished(
              true
            );
          }

          /*
          ==========================
          CONNECTION WATCHDOG
          ==========================
          */

          if (
            watchdogRef.current
          ) {
            clearTimeout(
              watchdogRef.current
            );
          }

          watchdogRef.current =
            setTimeout(() => {
              setConnected(
                false
              );
            }, CONNECTION_TIMEOUT);

          /*
          ==========================
          REDISPATCH WATCHDOG
          ==========================
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
                driverTimeoutRef.current
              );
            }

            driverTimeoutRef.current =
              setTimeout(
                async () => {
                  try {
                    if (
                      isRedispatching
                    ) {
                      return;
                    }

                    setIsRedispatching(
                      true
                    );

                    await triggerRedispatch(
                      freightId,
                      data.motoristaAtual ||
                        ''
                    );

                    setIsRedispatching(
                      false
                    );
                  } catch (error) {
                    console.error(
                      'REDISPATCH ERROR:',
                      error
                    );

                    setIsRedispatching(
                      false
                    );
                  }
                },
                DRIVER_TIMEOUT
              );
          }
        },

        error => {
          console.error(
            'Client Realtime Error:',
            error
          );

          setConnected(
            false
          );
        }
      );

    /*
    ==========================
    CLEANUP
    ==========================
    */

    return () => {
      unsubscribe();

      if (
        watchdogRef.current
      ) {
        clearTimeout(
          watchdogRef.current
        );
      }

      if (
        heartbeatRef.current
      ) {
        clearInterval(
          heartbeatRef.current
        );
      }

      if (
        driverTimeoutRef.current
      ) {
        clearTimeout(
          driverTimeoutRef.current
        );
      }
    };
  }, [
    freightId,
    isRedispatching,
  ]);

  /*
  ==========================
  RETURNS
  ==========================
  */

  return {
    orderData,

    connected,

    driverFound,

    tripFinished,

    isRedispatching,

    isWaitingDriver:
      orderData?.status ===
        AppTripState.DISPONIVEL ||
      orderData?.status ===
        AppTripState.OFERTANDO,

    isDriverAccepted:
      orderData?.status ===
      AppTripState.ACEITO,

    isInTransit:
      orderData?.status ===
        AppTripState.EM_TRANSPORTE ||
      orderData?.status ===
        AppTripState.FINALIZANDO,

    isCancelled:
      orderData?.status ===
      AppTripState.CANCELADO,

    isCompleted:
      orderData?.status ===
      AppTripState.ENTREGUE,
  };
};
