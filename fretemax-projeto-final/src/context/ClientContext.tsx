import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';

interface ClientRealtimeState {
  connected: boolean;
  reconnecting: boolean;
  radarActive: boolean;
  matchingActive: boolean;
  trackingActive: boolean;
}

interface ClientContextData {
  activeRequest: string | null;
  destinationCode: string | null;
  driverAccepted: boolean;

  realtime: ClientRealtimeState;

  setActiveRequest: (
    value: string | null,
  ) => void;

  setDestinationCode: (
    value: string | null,
  ) => void;

  setDriverAccepted: (
    value: boolean,
  ) => void;

  setRealtimeConnected: (
    value: boolean,
  ) => void;

  setRealtimeReconnecting: (
    value: boolean,
  ) => void;

  setRadarActive: (
    value: boolean,
  ) => void;

  setMatchingActive: (
    value: boolean,
  ) => void;

  setTrackingActive: (
    value: boolean,
  ) => void;

  resetClientRuntime: () => void;
}

const ClientContext =
  createContext<ClientContextData | undefined>(
    undefined,
  );

interface ClientProviderProps {
  children: ReactNode;
}

const CLIENT_RUNTIME_STORAGE =
  'fretmax_client_runtime';

export function ClientProvider({
  children,
}: ClientProviderProps) {
  const [
    activeRequest,
    setActiveRequestState,
  ] = useState<string | null>(null);

  const [
    destinationCode,
    setDestinationCodeState,
  ] = useState<string | null>(null);

  const [
    driverAccepted,
    setDriverAcceptedState,
  ] = useState(false);

  const [
    realtime,
    setRealtime,
  ] = useState<ClientRealtimeState>({
    connected: true,
    reconnecting: false,
    radarActive: true,
    matchingActive: true,
    trackingActive: true,
  });

  useEffect(() => {
    try {
      const storage =
        localStorage.getItem(
          CLIENT_RUNTIME_STORAGE,
        );

      if (!storage) {
        return;
      }

      const parsed =
        JSON.parse(storage);

      if (
        parsed?.activeRequest !== undefined
      ) {
        setActiveRequestState(
          parsed.activeRequest,
        );
      }

      if (
        parsed?.destinationCode !== undefined
      ) {
        setDestinationCodeState(
          parsed.destinationCode,
        );
      }

      if (
        parsed?.driverAccepted !== undefined
      ) {
        setDriverAcceptedState(
          parsed.driverAccepted,
        );
      }

      if (
        parsed?.realtime
      ) {
        setRealtime(
          parsed.realtime,
        );
      }
    } catch (error) {
      console.error(
        'CLIENT_CONTEXT_HYDRATION_ERROR',
        error,
      );
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        CLIENT_RUNTIME_STORAGE,
        JSON.stringify({
          activeRequest,
          destinationCode,
          driverAccepted,
          realtime,
        }),
      );
    } catch (error) {
      console.error(
        'CLIENT_CONTEXT_PERSISTENCE_ERROR',
        error,
      );
    }
  }, [
    activeRequest,
    destinationCode,
    driverAccepted,
    realtime,
  ]);

  useEffect(() => {
    const handleOnline =
      () => {
        setRealtime(
          previous => ({
            ...previous,
            connected: true,
            reconnecting: false,
          }),
        );
      };

    const handleOffline =
      () => {
        setRealtime(
          previous => ({
            ...previous,
            connected: false,
            reconnecting: true,
          }),
        );
      };

    window.addEventListener(
      'online',
      handleOnline,
    );

    window.addEventListener(
      'offline',
      handleOffline,
    );

    return () => {
      window.removeEventListener(
        'online',
        handleOnline,
      );

      window.removeEventListener(
        'offline',
        handleOffline,
      );
    };
  }, []);

  const setRealtimeConnected =
    useCallback(
      (
        value: boolean,
      ) => {
        setRealtime(
          previous => ({
            ...previous,
            connected: value,
          }),
        );
      },
      [],
    );

  const setRealtimeReconnecting =
    useCallback(
      (
        value: boolean,
      ) => {
        setRealtime(
          previous => ({
            ...previous,
            reconnecting: value,
          }),
        );
      },
      [],
    );

  const setRadarActive =
    useCallback(
      (
        value: boolean,
      ) => {
        setRealtime(
          previous => ({
            ...previous,
            radarActive: value,
          }),
        );
      },
      [],
    );

  const setMatchingActive =
    useCallback(
      (
        value: boolean,
      ) => {
        setRealtime(
          previous => ({
            ...previous,
            matchingActive: value,
          }),
        );
      },
      [],
    );

  const setTrackingActive =
    useCallback(
      (
        value: boolean,
      ) => {
        setRealtime(
          previous => ({
            ...previous,
            trackingActive: value,
          }),
        );
      },
      [],
    );

  const resetClientRuntime =
    useCallback(() => {
      setActiveRequestState(
        null,
      );

      setDestinationCodeState(
        null,
      );

      setDriverAcceptedState(
        false,
      );

      setRealtime({
        connected: true,
        reconnecting: false,
        radarActive: true,
        matchingActive: true,
        trackingActive: true,
      });

      localStorage.removeItem(
        CLIENT_RUNTIME_STORAGE,
      );
    }, []);

  const setActiveRequest =
    useCallback(
      (
        value: string | null,
      ) => {
        setActiveRequestState(
          value,
        );
      },
      [],
    );

  const setDestinationCode =
    useCallback(
      (
        value: string | null,
      ) => {
        setDestinationCodeState(
          value,
        );
      },
      [],
    );

  const setDriverAccepted =
    useCallback(
      (
        value: boolean,
      ) => {
        setDriverAcceptedState(
          value,
        );
      },
      [],
    );

  const value =
    useMemo(
      () => ({
        activeRequest,
        destinationCode,
        driverAccepted,

        realtime,

        setActiveRequest,
        setDestinationCode,
        setDriverAccepted,

        setRealtimeConnected,
        setRealtimeReconnecting,
        setRadarActive,
        setMatchingActive,
        setTrackingActive,

        resetClientRuntime,
      }),
      [
        activeRequest,
        destinationCode,
        driverAccepted,
        realtime,

        setActiveRequest,
        setDestinationCode,
        setDriverAccepted,

        setRealtimeConnected,
        setRealtimeReconnecting,
        setRadarActive,
        setMatchingActive,
        setTrackingActive,

        resetClientRuntime,
      ],
    );

  return (
    <ClientContext.Provider
      value={value}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const context =
    useContext(
      ClientContext,
    );

  if (!context) {
    throw new Error(
      'useClientContext deve ser usado dentro de ClientProvider',
    );
  }

  return context;
}
