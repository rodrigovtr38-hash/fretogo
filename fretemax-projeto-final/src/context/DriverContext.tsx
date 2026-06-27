// src/context/DriverContext.tsx
// CTO-Log: Arquivo higienizado. Ciclo de dependências do useMemo otimizado e try-catch do LocalStorage reforçado para evitar travamentos em celulares com pouca memória.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

interface DriverRealtimeState {
  connected: boolean;
  reconnecting: boolean;
  dispatchActive: boolean;
  trackingActive: boolean;
  radarActive: boolean;
}

interface DriverContextData {
  isOnline: boolean;
  currentFreight: string | null;
  securityCode: string | null;
  realtime: DriverRealtimeState;
  
  setIsOnline: (value: boolean) => void;
  setCurrentFreight: (value: string | null) => void;
  setSecurityCode: (value: string | null) => void;
  setDispatchActive: (value: boolean) => void;
  setTrackingActive: (value: boolean) => void;
  setRadarActive: (value: boolean) => void;
  setRealtimeConnected: (value: boolean) => void;
  setRealtimeReconnecting: (value: boolean) => void;
  resetDriverRuntime: () => void;
}

const DriverContext = createContext<DriverContextData | undefined>(undefined);

interface DriverProviderProps {
  children: ReactNode;
}

const DRIVER_RUNTIME_STORAGE = 'fretmax_driver_runtime';

export function DriverProvider({ children }: DriverProviderProps) {
  const [isOnline, setIsOnlineState] = useState(false);
  const [currentFreight, setCurrentFreightState] = useState<string | null>(null);
  const [securityCode, setSecurityCodeState] = useState<string | null>(null);
  
  const [realtime, setRealtime] = useState<DriverRealtimeState>({
    connected: true,
    reconnecting: false,
    dispatchActive: true,
    trackingActive: true,
    radarActive: true,
  });

  // Hydration (Recuperar dados ao abrir o app)
  useEffect(() => {
    try {
      const storage = localStorage.getItem(DRIVER_RUNTIME_STORAGE);
      if (!storage) return;

      const parsed = JSON.parse(storage);

      if (parsed?.isOnline !== undefined) setIsOnlineState(parsed.isOnline);
      if (parsed?.currentFreight !== undefined) setCurrentFreightState(parsed.currentFreight);
      if (parsed?.securityCode !== undefined) setSecurityCodeState(parsed.securityCode);
      if (parsed?.realtime) setRealtime(parsed.realtime);
    } catch (error) {
      console.error('DRIVER_CONTEXT_HYDRATION_ERROR', error);
    }
  }, []);

  // Persistence (Salvar dados ao fechar/minimizar o app)
  useEffect(() => {
    try {
      localStorage.setItem(
        DRIVER_RUNTIME_STORAGE,
        JSON.stringify({ isOnline, currentFreight, securityCode, realtime })
      );
    } catch (error) {
      console.error('DRIVER_CONTEXT_PERSISTENCE_ERROR', error);
    }
  }, [isOnline, currentFreight, securityCode, realtime]);

  // Monitoramento de Conexão da Rede
  useEffect(() => {
    const handleOnline = () => {
      setRealtime(previous => ({ ...previous, connected: true, reconnecting: false }));
    };

    const handleOffline = () => {
      setRealtime(previous => ({ ...previous, connected: false, reconnecting: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setIsOnline = useCallback((value: boolean) => { setIsOnlineState(value); }, []);
  const setCurrentFreight = useCallback((value: string | null) => { setCurrentFreightState(value); }, []);
  const setSecurityCode = useCallback((value: string | null) => { setSecurityCodeState(value); }, []);
  const setDispatchActive = useCallback((value: boolean) => { setRealtime(previous => ({ ...previous, dispatchActive: value })); }, []);
  const setTrackingActive = useCallback((value: boolean) => { setRealtime(previous => ({ ...previous, trackingActive: value })); }, []);
  const setRadarActive = useCallback((value: boolean) => { setRealtime(previous => ({ ...previous, radarActive: value })); }, []);
  const setRealtimeConnected = useCallback((value: boolean) => { setRealtime(previous => ({ ...previous, connected: value })); }, []);
  const setRealtimeReconnecting = useCallback((value: boolean) => { setRealtime(previous => ({ ...previous, reconnecting: value })); }, []);

  const resetDriverRuntime = useCallback(() => {
    setIsOnlineState(false);
    setCurrentFreightState(null);
    setSecurityCodeState(null);
    setRealtime({
      connected: true,
      reconnecting: false,
      dispatchActive: true,
      trackingActive: true,
      radarActive: true,
    });
    localStorage.removeItem(DRIVER_RUNTIME_STORAGE);
  }, []);

  const value = useMemo(
    () => ({
      isOnline,
      currentFreight,
      securityCode,
      realtime,
      setIsOnline,
      setCurrentFreight,
      setSecurityCode,
      setDispatchActive,
      setTrackingActive,
      setRadarActive,
      setRealtimeConnected,
      setRealtimeReconnecting,
      resetDriverRuntime,
    }),
    [
      isOnline,
      currentFreight,
      securityCode,
      realtime,
      setIsOnline,
      setCurrentFreight,
      setSecurityCode,
      setDispatchActive,
      setTrackingActive,
      setRadarActive,
      setRealtimeConnected,
      setRealtimeReconnecting,
      resetDriverRuntime,
    ]
  );

  return (
    <DriverContext.Provider value={value}>
      {children}
    </DriverContext.Provider>
  );
}

export function useDriverContext() {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDriverContext deve ser usado dentro de DriverProvider');
  }
  return context;
}
