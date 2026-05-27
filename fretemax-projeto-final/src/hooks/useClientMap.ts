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
  const mountedRef =
    useRef(true);

  /* =======================================================
     MAP STATE
  ======================================================= */

  const [origin, setOrigin] =
    useState<Coordinates | null>(
      null,
    );

  const [
    destination,
    setDestination,
  ] =
    useState<Coordinates | null>(
      null,
    );

  const [distanceKm, setDistanceKm] =
    useState(0);

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState(0);

  const [
    loadingRoute,
    setLoadingRoute,
  ] = useState(false);

  const [routeError, setRouteError] =
    useState<string | null>(
      null,
    );

  /* =======================================================
     MAPS RUNTIME
  ======================================================= */

  const [mapsStatus, setMapsStatus] =
    useState<MapsStatus>(
      'idle',
    );

  const [
    mapsError,
    setMapsError,
  ] = useState<string | null>(
    null,
  );

  /* =======================================================
     BOOTSTRAP MAPS
  ======================================================= */

  useEffect(() => {
    mountedRef.current =
      true;

    async function initializeMaps() {
      try {
        setMapsStatus(
          'loading',
        );

        setMapsError(null);

        await mapsLoader.load();

        if (
          !mountedRef.current
        ) {
          return;
        }

        setMapsStatus(
          'ready',
        );

        console.log(
          '✅ Maps runtime pronto.',
        );
      } catch (error) {
        console.error(
          '❌ Maps bootstrap error:',
          error,
        );

        if (
          mountedRef.current
        ) {
          setMapsStatus(
            'error',
          );

          setMapsError(
            'Erro ao carregar Google Maps.',
          );
        }
      }
    }

    void initializeMaps();

    return () => {
      mountedRef.current =
        false;
    };
  }, []);

  /* =======================================================
     ROUTE
  ======================================================= */

  const calculateRoute =
    useCallback(
      async (
        originCoords: Coordinates,
        destinationCoords: Coordinates,
      ) => {
        try {
          setLoadingRoute(
            true,
          );

          setRouteError(
            null,
          );

          const route =
            await locationService.calculateRoute(
              originCoords,
              destinationCoords,
            );

          if (!route) {
            throw new Error(
              'Route unavailable.',
            );
          }

          if (
            !mountedRef.current
          ) {
            return null;
          }

          setDistanceKm(
            route.distanceKm,
          );

          setDurationMinutes(
            route.durationMinutes,
          );

          setOrigin(
            originCoords,
          );

          setDestination(
            destinationCoords,
          );

          return route;
        } catch (error) {
          console.error(
            '❌ Route Error:',
            error,
          );

          if (
            mountedRef.current
          ) {
            setRouteError(
              'Erro ao calcular rota.',
            );
          }

          return null;
        } finally {
          if (
            mountedRef.current
          ) {
            setLoadingRoute(
              false,
            );
          }
        }
      },
      [],
    );

  /* =======================================================
     GEOLOCATION
  ======================================================= */

  const getCurrentLocation =
    useCallback(async () => {
      try {
        return await locationService.getCurrentLocation();
      } catch (error) {
        console.error(
          '❌ Location Error:',
          error,
        );

        return null;
      }
    }, []);

  /* =======================================================
     CEP
  ======================================================= */

  const getCoordinatesFromCep =
    useCallback(
      async (cep: string) => {
        try {
          return await locationService.getCoordinatesFromCEP(
            cep,
          );
        } catch (error) {
          console.error(
            '❌ CEP Error:',
            error,
          );

          return null;
        }
      },
      [],
    );

  /* =======================================================
     RESET
  ======================================================= */

  const resetMapState =
    useCallback(() => {
      setOrigin(null);

      setDestination(null);

      setDistanceKm(0);

      setDurationMinutes(0);

      setRouteError(null);
    }, []);

  /* =======================================================
     READY
  ======================================================= */

  const mapReady =
    useMemo(
      () =>
        mapsStatus ===
        'ready',
      [mapsStatus],
    );

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

    calculateRoute,

    getCurrentLocation,

    getCoordinatesFromCep,

    resetMapState,
  };
};
