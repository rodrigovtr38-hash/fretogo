import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  locationService,
} from '../services/locationService';

import {
  locationRealtimeService,
} from '../services/locationRealtimeService';

import {
  mapsLoader,
} from '../services/mapsLoader';

/* =========================================================
   TYPES
========================================================= */

type Coordinates = {
  lat: number;
  lng: number;
};

type MapsStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error';

/* =========================================================
   HOOK
========================================================= */

export const useClientMap = () => {
  const mountedRef = useRef(true);

  /* =======================================================
     MAP STATE
  ======================================================= */

  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // 🔥 CTO FIX: Adicionado estado de telemetria viva do motorista
  const [driverLivePosition, setDriverLivePosition] = useState<Coordinates | null>(null);

  /* =======================================================
     MAPS RUNTIME
  ======================================================= */

  const [mapsStatus, setMapsStatus] = useState<MapsStatus>('idle');
  const [mapsError, setMapsError] = useState<string | null>(null);

  /* =======================================================
     BOOTSTRAP MAPS
  ======================================================= */

  useEffect(() => {
    mountedRef.current = true;

    async function initializeMaps() {
      try {
        setMapsStatus('loading');
        setMapsError(null);

        await mapsLoader.load();

        if (!mountedRef.current) return;

        setMapsStatus('ready');
        console.log('✅ Maps runtime pronto.');
      } catch (error) {
        console.error('❌ Maps bootstrap error:', error);
        if (mountedRef.current) {
          setMapsStatus('error');
          setMapsError('Erro ao carregar Google Maps.');
        }
      }
    }

    void initializeMaps();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =======================================================
     ROUTE
  ======================================================= */

  // CTO FIX: A função agora é capaz de ler e processar os waypoints (Múltiplas Paradas) na construção do Google Maps.
  const calculateRoute = useCallback(
    async (originCoords: Coordinates, destinationCoords: Coordinates, waypoints?: Coordinates[]) => {
      try {
        setLoadingRoute(true);
        setRouteError(null);

        const route = await locationService.calculateRoute(
          originCoords,
          destinationCoords,
          waypoints // <- Injeção das paradas intermediárias ativada
        );

        if (!route) throw new Error('Route unavailable.');
        if (!mountedRef.current) return null;

        setDistanceKm(route.distanceKm);
        setDurationMinutes(route.durationMinutes);
        setOrigin(originCoords);
        setDestination(destinationCoords);

        return route;
      } catch (error) {
        console.error('❌ Route Error:', error);
        if (mountedRef.current) setRouteError('Erro ao calcular rota.');
        return null;
      } finally {
        if (mountedRef.current) setLoadingRoute(false);
      }
    },
    [],
  );

  /* =======================================================
     GEOLOCATION & LIVE TRACKING
  ======================================================= */

  const getCurrentLocation = useCallback(async () => {
    try {
      return await locationService.getCurrentLocation();
    } catch (error) {
      console.error('❌ Location Error:', error);
      return null;
    }
  }, []);

  // 🔥 CTO FIX: Listener contínuo do motorista para o painel do Embarcador
  const startDriverTracking = useCallback((freteId: string) => {
    try {
      const unsubscribe = locationRealtimeService.subscribeToFreightLocation?.(freteId, (pos: Coordinates) => {
        if (mountedRef.current) {
          setDriverLivePosition(pos);
        }
      });
      return unsubscribe || (() => {});
    } catch (error) {
      console.error('[CTO-Log] Erro ao assinar telemetria RTDB', error);
      return () => {};
    }
  }, []);

  /* =======================================================
     CEP
  ======================================================= */

  const getCoordinatesFromCep = useCallback(async (cep: string) => {
    try {
      return await locationService.getCoordinatesFromCEP(cep);
    } catch (error) {
      console.error('❌ CEP Error:', error);
      return null;
    }
  }, []);

  /* =======================================================
     RESET
  ======================================================= */

  const resetMapState = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setDistanceKm(0);
    setDurationMinutes(0);
    setRouteError(null);
    setDriverLivePosition(null);
  }, []);

  /* =======================================================
     READY
  ======================================================= */

  const mapReady = useMemo(() => mapsStatus === 'ready', [mapsStatus]);

  return {
    origin,
    destination,
    distanceKm,
    durationMinutes,
    loadingRoute,
    routeError,
    mapsStatus,
    mapsError,
    mapReady,
    driverLivePosition,      // State exportado
    calculateRoute,
    getCurrentLocation,
    startDriverTracking,    // Metodo exportado
    getCoordinatesFromCep,
    resetMapState,
  };
};
