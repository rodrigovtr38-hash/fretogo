import {
  DriverState,
} from '../state/driverStateMachine';

import {
  AppTripState,
} from '../state/tripStateMachine';

/* =========================================================
   TYPES
========================================================= */

export type DispatchOperationalState =
  | 'OFFLINE'
  | 'ONLINE'
  | 'MATCHING'
  | 'RESERVED'
  | 'ACTIVE_TRIP'
  | 'COLLECTING'
  | 'IN_TRANSIT'
  | 'DELIVERING'
  | 'RETURNING';

export type TrackingOperationalState =
  | 'IDLE'
  | 'ACTIVE'
  | 'COLLECTING'
  | 'MOVING'
  | 'DELIVERING'
  | 'RETURNING';

export type AvailabilityOperationalState =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'BUSY'
  | 'RETURNING'
  | 'OFFLINE';

export interface OperationalSyncResult {
  driverState: DriverState;

  tripState: AppTripState;

  dispatchState: DispatchOperationalState;

  trackingState: TrackingOperationalState;

  availabilityState: AvailabilityOperationalState;

  operationalRuntime: {
    matching: boolean;

    tracking: boolean;

    radar: boolean;

    dispatch: boolean;

    returning: boolean;

    realtime: boolean;
  };
}

/* =========================================================
   SERVICE
========================================================= */

export class StateSynchronizationService {
  /* =========================================================
     SYNCHRONIZE
  ========================================================= */

  static synchronize(
    driverState: DriverState,
    tripState: AppTripState,
  ): OperationalSyncResult {
    switch (tripState) {
      /*
      =========================================================
      MATCHING
      =========================================================
      */

      case AppTripState.BUSCANDO_MOTORISTA:

        return {
          driverState:
            DriverState.ONLINE,

          tripState,

          dispatchState:
            'MATCHING',

          trackingState:
            'IDLE',

          availabilityState:
            'AVAILABLE',

          operationalRuntime: {
            matching: true,

            tracking: false,

            radar: true,

            dispatch: true,

            returning: false,

            realtime: true,
          },
        };

      /*
      =========================================================
      RESERVED
      =========================================================
      */

      case AppTripState.OFERTANDO:

        return {
          driverState:
            DriverState.RECEBENDO_OFERTA,

          tripState,

          dispatchState:
            'RESERVED',

          trackingState:
            'ACTIVE',

          availabilityState:
            'RESERVED',

          operationalRuntime: {
            matching: true,

            tracking: true,

            radar: true,

            dispatch: true,

            returning: false,

            realtime: true,
          },
        };

      /*
      =========================================================
      ACTIVE TRIP
      =========================================================
      */

      case AppTripState.ACEITO:

        return {
          driverState:
            DriverState.ACEITOU,

          tripState,

          dispatchState:
            'ACTIVE_TRIP',

          trackingState:
            'ACTIVE',

          availabilityState:
            'BUSY',

          operationalRuntime: {
            matching: false,

            tracking: true,

            radar: false,

            dispatch: true,

            returning: false,

            realtime: true,
          },
        };

      /*
      =========================================================
      COLLECTING
      =========================================================
      */

      case AppTripState.INDO_COLETA:

        return {
          driverState:
            DriverState.INDO_COLETA,

          tripState,

          dispatchState:
            'COLLECTING',

          trackingState:
            'COLLECTING',

          availabilityState:
            'BUSY',

          operationalRuntime: {
            matching: false,

            tracking: true,

            radar: false,

            dispatch: true,

            returning: false,

            realtime: true,
          },
        };

      case AppTripState.COLETANDO:

        return {
          driverState:
            DriverState.COLETANDO,

          tripState,

          dispatchState:
            'COLLECTING',

          trackingState:
            'COLLECTING',

          availabilityState:
            'BUSY',

          operationalRuntime: {
            matching: false,

            tracking: true,

            radar: false,

            dispatch: true,

            returning: false,

            realtime: true,
          },
        };

      /*
      =========================================================
      IN TRANSIT
      =========================================================
      */

      case AppTripState.EM_TRANSPORTE:

        return {
          driverState:
            DriverState.EM_TRANSPORTE,

          tripState,

          dispatchState:
            'IN_TRANSIT',

          trackingState:
            'MOVING',

          availabilityState:
            'BUSY',

          operationalRuntime: {
            matching: false,

            tracking: true,

            radar: false,

            dispatch: true,

            returning: false,

            realtime: true,
          },
        };

      /*
      =========================================================
      DELIVERING
      =========================================================
      */

      case AppTripState.FINALIZANDO:

        return {
          driverState:
            DriverState.FINALIZANDO,

          tripState,

          dispatchState:
            'DELIVERING',

          trackingState:
            'DELIVERING',

          availabilityState:
            'BUSY',

          operationalRuntime: {
            matching: false,

            tracking: true,

            radar: false,

            dispatch: true,

            returning: false,

            realtime: true,
          },
        };

      /*
      =========================================================
      RETURNING
      =========================================================
      */

      case AppTripState.ENTREGUE:

        return {
          driverState:
            DriverState.ONLINE,

          tripState:
            AppTripState.BUSCANDO_MOTORISTA,

          dispatchState:
            'RETURNING',

          trackingState:
            'RETURNING',

          availabilityState:
            'RETURNING',

          operationalRuntime: {
            matching: true,

            tracking: true,

            radar: true,

            dispatch: true,

            returning: true,

            realtime: true,
          },
        };

      /*
      =========================================================
      FALLBACKS
      =========================================================
      */

      case AppTripState.CANCELADO:

      case AppTripState.EXPIRADO:

      case AppTripState.SEM_MOTORISTA:

        return {
          driverState:
            DriverState.ONLINE,

          tripState:
            AppTripState.BUSCANDO_MOTORISTA,

          dispatchState:
            'MATCHING',

          trackingState:
            'IDLE',

          availabilityState:
            'AVAILABLE',

          operationalRuntime: {
            matching: true,

            tracking: false,

            radar: true,

            dispatch: true,

            returning: false,

            realtime: true,
          },
        };

      /*
      =========================================================
      DEFAULT
      =========================================================
      */

      default:

        return {
          driverState,

          tripState,

          dispatchState:
            'ONLINE',

          trackingState:
            'ACTIVE',

          availabilityState:
            'AVAILABLE',

          operationalRuntime: {
            matching: true,

            tracking: true,

            radar: true,

            dispatch: true,

            returning: false,

            realtime: true,
          },
        };
    }
  }
}
