// =========================================================
// NOME DO ARQUIVO: src/hooks/useDriverRealtime.ts
// CTO-Log: Injeção de Permissões e GPS Blindado
// EXECUÇÃO BLOCO 2: Prevenção de GPS Kill em Unmount e adição de contexto freteId.
// EXECUÇÃO BLOCO 3: Prevenção de Zombie GPS via Grace Period nativo e Unload Protection.
// EXECUÇÃO BLOCO 5: Anti-vazamento de contexto (freteId condition fix) na Telemetria.
// =========================================================

import { useEffect, useRef } from 'react';
import { locationRealtimeService } from '../services/locationRealtimeService';

// 🔥 CTO FIX [Bloco 3]: Controle de persistência contra transições de tela sem vazar memória.
let gpsGraceTimeout: NodeJS.Timeout | null = null;

export const useDriverRealtime = (
  driverId?: string,
  isOnline?: boolean,
  freteId?: string, // 🔥 CTO FIX: Adicionado suporte ao contexto de túnel da viagem
) => {
  const initializedRef = useRef(false);
  const activeDriverRef = useRef<string | undefined>();
  const activeFreteIdRef = useRef<string | undefined>(); // 🔥 CTO FIX [Bloco 5]: Controle de estado do frete para telemetria

  // Solicitação de permissão de notificação e eventos de ciclo de vida nativo no carregamento.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log(`Permissão de Notificação Push: ${permission}`);
        });
      }
    }

    // 🔥 CTO FIX [Bloco 3]: Proteção contra interrupções letais do OS/Navegador (Ex: fechar aba)
    const handleFatalUnload = () => {
      locationRealtimeService.stop();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleFatalUnload);
      window.addEventListener('pagehide', handleFatalUnload);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleFatalUnload);
        window.removeEventListener('pagehide', handleFatalUnload);
      }
    };
  }, []);

  useEffect(() => {
    if (!driverId) {
      return;
    }

    // 🔥 CTO FIX [Bloco 3]: Se remontou em outra tela durante a viagem, cancelamos a sentença de morte.
    if (gpsGraceTimeout) {
      clearTimeout(gpsGraceTimeout);
      gpsGraceTimeout = null;
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
       * 🔥 CTO FIX [Bloco 3]: O unmount agora injeta um "Grace Period" de 10s. 
       * Se o hook não for reativado (ex: o usuário foi para o menu ou fechou o layout base), 
       * nós trucidamos a thread fantasma impedindo o leak de bateria e banco.
       */
      if (activeDriverRef.current === driverId) {
        initializedRef.current = false;
        
        gpsGraceTimeout = setTimeout(() => {
          console.log('🛑 Timeout de Transição Excedido - Encerrando Telemetria Zombie');
          locationRealtimeService.stop();
        }, 10000);
      }
    };
  }, [driverId, isOnline, freteId]);
};
