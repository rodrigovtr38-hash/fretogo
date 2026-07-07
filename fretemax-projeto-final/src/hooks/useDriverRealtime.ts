// src/hooks/useDriverRealtime.ts
import { useEffect, useRef } from 'react';
import { locationRealtimeService } from '../services/locationRealtimeService';

/* =========================================================
   HOOK
========================================================= */

export const useDriverRealtime = (
  driverId?: string,
  isOnline?: boolean,
) => {
  const initializedRef = useRef(false);
  const activeDriverRef = useRef<string | undefined>();

  useEffect(() => {
    if (!driverId) {
      return;
    }

    /*
     * StrictMode protection.
     */
    if (initializedRef.current && activeDriverRef.current === driverId && isOnline) {
      return;
    }

    activeDriverRef.current = driverId;
    initializedRef.current = true;

    // 🔥 CTO FIX REVERTIDO: Se o motorista está ONLINE, 
    // a telemetria GPS TEM que estar ligada e transmitindo. 
    // Sem isso, a Vercel não acha ele na caixa de busca e dá SEM_MOTORISTA.
    if (isOnline) {
      locationRealtimeService.start();
    } else {
      locationRealtimeService.stop();
    }

    return () => {
      /*
       * Cleanup seguro.
       */
      if (activeDriverRef.current === driverId) {
        locationRealtimeService.stop();
        initializedRef.current = false;
      }
    };
  }, [driverId, isOnline]);
};
