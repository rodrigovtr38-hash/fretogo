import {
  useEffect,
  useRef,
} from 'react';

import {
  locationRealtimeService,
} from '../services/locationRealtimeService';

/* =========================================================
   HOOK
========================================================= */

export const useDriverRealtime = (
  driverId?: string,

  isOnline?: boolean,
) => {
  const initializedRef =
    useRef(false);

  const activeDriverRef =
    useRef<
      string | undefined
    >();

  useEffect(() => {
    if (!driverId) {
      return;
    }

    /*
     * StrictMode protection.
     */

    if (
      initializedRef.current &&
      activeDriverRef.current ===
        driverId &&
      isOnline
    ) {
      return;
    }

    activeDriverRef.current =
      driverId;

    initializedRef.current =
      true;

    if (isOnline) {
      locationRealtimeService.start(
        driverId,
      );
    } else {
      locationRealtimeService.stop();
    }

    return () => {
      /*
       * Cleanup seguro.
       */

      if (
        activeDriverRef.current ===
        driverId
      ) {
        locationRealtimeService.stop();

        initializedRef.current =
          false;
      }
    };
  }, [driverId, isOnline]);
};
