// src/hooks/useClientRealtime.ts

import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AppTripState, isFinalState } from '../state/tripStateMachine';
import { clientFreightService } from '../services/clientFreightService';

/*
=========================================================
TYPES
=========================================================
*/
type UseClientRealtimeProps = {
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

type RuntimeSnapshot = Record<string, any> & { id: string };

const HEARTBEAT_INTERVAL = 15000;
const STORAGE_PREFIX = 'fretogo_runtime_client_';
const safeNow = () => Date.now();

export const useClientRealtime = ({ freightId }: UseClientRealtimeProps) => {
  const [orderData, setOrderData] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [driverFound, setDriverFound] = useState(false);
  const [tripFinished, setTripFinished] = useState(false);
  
  const [isRealtimeReady, setIsRealtimeReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [runtimeState, setRuntimeState] = useState<RuntimeOperationalState>('OFFLINE');

  const mountedRef = useRef(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  /*
  =========================================================
  STORAGE (CACHE PARA NÃO PERDER O FRETE SE A INTERNET CAIR)
  =========================================================
  */
  const persistRuntime = (data: RuntimeSnapshot) => {
    if (!freightId) return;
    try {
      localStorage.setItem(
        `${STORAGE_PREFIX}${freightId}`,
        JSON.stringify({ data, timestamp: safeNow() })
      );
    } catch (error) {
      console.error('RUNTIME PERSIST ERROR:', error);
    }
  };

  const hydrateRuntime = () => {
    if (!freightId) return;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${freightId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.data) {
        setOrderData(parsed.data);
      }
    } catch (error) {
      console.error('RUNTIME HYDRATE ERROR:', error);
    }
  };

  useEffect(() => {
    hydrateRuntime();
  }, [freightId]);

  /*
  =========================================================
  ONLINE / OFFLINE FLAGS
  =========================================================
  */
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setConnected(false);
      setRuntimeState('OFFLINE');
    };
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  /*
  =========================================================
  HEARTBEAT (AVISA O PAINEL ADMIN QUE O CLIENTE ESTÁ VENDO)
  =========================================================
  */
  useEffect(() => {
    if (!freightId) return;

    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    heartbeatRef.current = setInterval(async () => {
      try {
        if (isOffline || !mountedRef.current) return;
        await clientFreightService.atualizarFrete(freightId, {
          lastSeenCliente: new Date(),
          runtimeHeartbeat: safeNow(),
        });
      } catch (error) {
        console.warn('HEARTBEAT SILENT FAIL:', error);
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [freightId, isOffline]);

  /*
  =========================================================
  REALTIME LISTENER (O OUVIDO DO CLIENTE)
  =========================================================
  */
  useEffect(() => {
    if (!freightId) return;

    mountedRef.current = true;
    setRuntimeState('CONNECTING');
    setIsRealtimeReady(false);

    const freightRef = doc(db, 'fretes', freightId);

    const unsubscribe = onSnapshot(freightRef, (snapshot) => {
      if (!mountedRef.current || !snapshot.exists()) return;

      const data: RuntimeSnapshot = { id: snapshot.id, ...snapshot.data() };
      
      // Atualiza os dados na tela instantaneamente
      setOrderData(data);
      persistRuntime(data);
      setConnected(true);
      setIsRealtimeReady(true);
      setIsOffline(false);

      // Sincroniza Flags Visuais
      if (data.motoristaId) setDriverFound(true);
      if (isFinalState(data.status)) setTripFinished(true);

      // Define o estado operacional para a UI
      if (data.status === AppTripState.DISPONIVEL || data.status === AppTripState.OFERTANDO || data.status === AppTripState.PROCURANDO_MOTORISTA) {
        setRuntimeState('SEARCHING_DRIVER');
      } else if (data.status === AppTripState.ACEITO) {
        setRuntimeState('DRIVER_ACCEPTED');
      } else if (data.status === AppTripState.COLETANDO || data.status === AppTripState.EM_TRANSPORTE) {
        setRuntimeState('IN_TRANSIT');
      } else if (data.status === AppTripState.ENTREGUE || data.status === 'finalizado') {
        setRuntimeState('DELIVERED');
      } else if (data.status === AppTripState.CANCELADO) {
        setRuntimeState('CANCELLED');
      }

    }, (error) => {
      console.error('Client Realtime Error:', error);
      setConnected(false);
      setRuntimeState('OFFLINE');
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [freightId]);

  /*
  =========================================================
  MEMOS (Para os componentes React não piscarem)
  =========================================================
  */
  const isWaitingDriver = useMemo(() => 
    orderData?.status === AppTripState.DISPONIVEL || 
    orderData?.status === AppTripState.OFERTANDO || 
    orderData?.status === AppTripState.PROCURANDO_MOTORISTA, 
  [orderData]);

  const isDriverAccepted = useMemo(() => orderData?.status === AppTripState.ACEITO, [orderData]);
  const isInTransit = useMemo(() => orderData?.status === AppTripState.EM_TRANSPORTE || orderData?.status === AppTripState.COLETANDO, [orderData]);
  const isCancelled = useMemo(() => orderData?.status === AppTripState.CANCELADO, [orderData]);
  const isCompleted = useMemo(() => orderData?.status === AppTripState.ENTREGUE || orderData?.status === 'finalizado', [orderData]);

  return {
    orderData,
    connected,
    driverFound,
    tripFinished,
    isWaitingDriver,
    isDriverAccepted,
    isInTransit,
    isCancelled,
    isCompleted,
    runtimeState,
    isRealtimeReady,
    isOffline,
  };
};
