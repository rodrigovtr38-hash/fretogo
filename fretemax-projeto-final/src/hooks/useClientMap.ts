import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  locationService,
} from '../services/locationService';

type Coordinates = {
  lat: number;
  lng: number;
};

type RouteData = {
  distanceKm: number;
  durationMinutes: number;
};

export const useClientMap = () => {
  const [origin, setOrigin] =
    useState<Coordinates | null>(
      null
    );

  const [destination, setDestination] =
    useState<Coordinates | null>(
      null
    );

  const [distanceKm, setDistanceKm] =
    useState(0);

  const [durationMinutes, setDurationMinutes] =
    useState(0);

  const [loadingRoute, setLoadingRoute] =
    useState(false);

  const [mapReady, setMapReady] =
    useState(false);

  const [routeError, setRouteError] =
    useState<string | null>(null);

  useEffect(() => {
    setMapReady(true);
  }, []);

  const calculateRoute =
    useCallback(
      async (
        originCoords: Coordinates,
        destinationCoords: Coordinates
      ) => {
        try {
          setLoadingRoute(true);

          setRouteError(null);

          const route =
            await locationService.calculateRoute(
              originCoords,
              destinationCoords
            );

          setDistanceKm(
            route.distanceKm
          );

          setDurationMinutes(
            route.durationMinutes
          );

          setOrigin(originCoords);

          setDestination(
            destinationCoords
          );

          return route;
        } catch (error) {
          console.error(
            'Route Error:',
            error
          );

          setRouteError(
            'Erro ao calcular rota.'
          );

          return null;
        } finally {
          setLoadingRoute(false);
        }
      },
      []
    );

  const getCurrentLocation =
    useCallback(async () => {
      try {
        return await locationService.getCurrentLocation();
      } catch (error) {
        console.error(
          'Location Error:',
          error
        );

        return null;
      }
    }, []);

  const getCoordinatesFromCep =
    useCallback(
      async (cep: string) => {
        try {
          return await locationService.getCoordinatesFromCEP(
            cep
          );
        } catch (error) {
          console.error(
            'CEP Error:',
            error
          );

          return null;
        }
      },
      []
    );

  const resetMapState =
    useCallback(() => {
      setOrigin(null);

      setDestination(null);

      setDistanceKm(0);

      setDurationMinutes(0);

      setRouteError(null);
    }, []);

  return {
    origin,
    destination,

    distanceKm,
    durationMinutes,

    loadingRoute,
    mapReady,
    routeError,

    calculateRoute,
    getCurrentLocation,
    getCoordinatesFromCep,

    resetMapState,
  };
};
