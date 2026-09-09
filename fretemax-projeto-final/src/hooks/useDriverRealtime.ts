// =========================================================
// NOME DO ARQUIVO: src/hooks/useDriverRealtime.ts
// CTO-Log: Injeção de Permissões e GPS Blindado
// EXECUÇÃO BLOCO 2: Prevenção de GPS Kill em Unmount e adição de contexto freteId.
// EXECUÇÃO BLOCO 5: Anti-vazamento de contexto (freteId condition fix) na Telemetria.
// =========================================================

import { useEffect, useRef } from 'react';
import { locationRealtimeService } from '../services/locationRealtimeService';

export const useDriverRealtime = (
  driverId?: string,
  isOnline?: boolean,
  freteId?: string, // 🔥 CTO FIX: Adicionado suporte ao contexto de túnel da viagem
) => {
  const initializedRef = useRef(false);
  const activeDriverRef = useRef<string | undefined>();
  const activeFreteIdRef = useRef<string | undefined>(); // 🔥 CTO FIX [Bloco 5]: Controle de estado do frete para telemetria

  // Solicitação de permissão de notificação no carregamento.
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
     * StrictMode protection & Redundancy Prevention.
     * 🔥 CTO FIX [Bloco 5]: Adicionada a validação do activeFreteIdRef. 
     * Se o frete mudar, precisamos relançar a telemetria com a nova ID.
     */
    if (initializedRef.current && activeDriverRef.current === driverId && isOnline && activeFreteIdRef.current === freteId) {
      return;
    }

    activeDriverRef.current = driverId;
    activeFreteIdRef.current = freteId;
    initializedRef.current = true;

    // Se o motorista está ONLINE, a telemetria GPS TEM que estar ligada e transmitindo. 
    if (isOnline) {
      console.log(`📡 Motorista ONLINE - Iniciando Telemetria GPS e Alertas${freteId ? ` (Frete: ${freteId})` : ''}`);
      locationRealtimeService.start(driverId, freteId);
    } else {
      console.log('🛑 Motorista OFFLINE - Cortando Telemetria');
      locationRealtimeService.stop();
    }

    return () => {
      /*
       * 🔥 CTO FIX: REMOVIDO locationRealtimeService.stop() do unmount incondicional.
       * A troca entre telas (Ex: Dashboard <-> ActiveTrip) causava a morte da telemetria.
       * O rastreamento agora persiste na memória e só é parado se 'isOnline' vier como falso.
       */
      if (activeDriverRef.current === driverId) {
        initializedRef.current = false;
      }
    };
  }, [driverId, isOnline, freteId]);
};
