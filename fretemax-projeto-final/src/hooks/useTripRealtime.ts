// src/hooks/useTripRealtime.ts

import {
  useEffect,
  useRef,
} from 'react';

import {
  firebaseRealtimeService,
} from '../services/firebaseRealtimeService';

/* =========================================================
   GLOBAL LISTENER REGISTRY
========================================================= */

const activeTripListeners =
  new Set<string>();

/* =========================================================
   HOOK
========================================================= */

export const useTripRealtime =
  (
    tripId?: string,
  ) => {
    const initializedRef =
      useRef(false);

    useEffect(() => {
      if (!tripId) {
        return;
      }

      /*
       * StrictMode protection.
       */

      if (
        initializedRef.current
      ) {
        return;
      }

      /*
       * Prevent duplicate listeners.
       */

      if (
        activeTripListeners.has(
          tripId,
        )
      ) {
        return;
      }

      initializedRef.current =
        true;

      activeTripListeners.add(
        tripId,
      );

      console.log(
        `📡 Trip realtime iniciado: ${tripId}`,
      );

      firebaseRealtimeService.listenTrip(
        tripId,
      );

      return () => {
        initializedRef.current =
          false;

        activeTripListeners.delete(
          tripId,
        );

        firebaseRealtimeService.stopTripListener(
          tripId,
        );

        console.log(
          `🛑 Trip realtime finalizado: ${tripId}`,
        );
      };
    }, [tripId]);
  };
