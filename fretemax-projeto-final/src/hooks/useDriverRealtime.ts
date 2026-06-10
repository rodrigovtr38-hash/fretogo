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

    // 🔥 CTO FIX P0 #3: REMOVIDA LIGAÇÃO PREMATURA DO GPS AQUI. 
    // O locationRealtimeService.start() agora é chamado EXCLUSIVAMENTE 
    // no dispatchRealtimeService.aceitarCorrida(), garantindo que só ligamos
    // o rastreamento pesado (e custoso no Firebase) quando há frete ativo.
    if (!isOnline) {
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
