// src/hooks/useDriverRealtime.ts
import { useEffect, useRef } from 'react';
import { locationRealtimeService } from '../services/locationRealtimeService';

/* =========================================================
   HOOK: CTO-LOG - Injeção de Permissões e GPS Blindado
========================================================= */

export const useDriverRealtime = (
  driverId?: string,
  isOnline?: boolean,
) => {
  const initializedRef = useRef(false);
  const activeDriverRef = useRef<string | undefined>();

  // CTO-LOG: Solicitação de permissão de notificação no carregamento.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log(`Permissão de Notificação Push: ${permission}`);
        });
      }
    }
  }, []);

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

    // 🔥 CTO FIX: Se o motorista está ONLINE, 
    // a telemetria GPS TEM que estar ligada e transmitindo. 
    // Sem isso, a Vercel não acha ele na caixa de busca e dá SEM_MOTORISTA.
    if (isOnline) {
      console.log('📡 Motorista ONLINE - Iniciando Telemetria GPS e Alertas');
      locationRealtimeService.start();
    } else {
      console.log('🛑 Motorista OFFLINE - Cortando Telemetria');
      locationRealtimeService.stop();
    }

    return () => {
      /*
       * Cleanup seguro para evitar vazamento de memória e bateria.
       */
      if (activeDriverRef.current === driverId) {
        locationRealtimeService.stop();
        initializedRef.current = false;
      }
    };
  }, [driverId, isOnline]);
};
