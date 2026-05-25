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

type UseClientRealtimeProps = {
  freightId?: string;
};

export const useClientRealtime = ({
  freightId,
}: UseClientRealtimeProps) => {
  const [orderData, setOrderData] =
    useState<any>(null);

  const [connected, setConnected] =
    useState(false);

  const [driverFound, setDriverFound] =
    useState(false);

  const [tripFinished, setTripFinished] =
    useState(false);

  const watchdogRef =
    useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!freightId) return;

    const freightRef = doc(
      db,
      'fretes',
      freightId
    );

    const unsubscribe = onSnapshot(
      freightRef,
      snapshot => {
        if (!snapshot.exists()) {
          return;
        }

        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        setOrderData(data);

        setConnected(true);

        if (data.motoristaId) {
          setDriverFound(true);
        }

        if (
          isFinalState(data.status)
        ) {
          setTripFinished(true);
        }

        if (
          watchdogRef.current
        ) {
          clearTimeout(
            watchdogRef.current
          );
        }

        watchdogRef.current =
          setTimeout(() => {
            setConnected(false);
          }, 30000);
      },
      error => {
        console.error(
          'Client Realtime Error:',
          error
        );

        setConnected(false);
      }
    );

    return () => {
      unsubscribe();

      if (
        watchdogRef.current
      ) {
        clearTimeout(
          watchdogRef.current
        );
      }
    };
  }, [freightId]);

  return {
    orderData,
    connected,
    driverFound,
    tripFinished,

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
  };
};
