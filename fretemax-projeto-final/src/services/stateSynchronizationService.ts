import { DriverState } from '../state/driverStateMachine';
import { AppTripState } from '../state/tripStateMachine';

/* =========================================================
   TYPES (Mapeamento unificado)
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
   SERVICE - Sincronização de Estado Blindada
========================================================= */

export class StateSynchronizationService {
  static synchronize(
    driverState: DriverState,
    tripState: AppTripState,
  ): OperationalSyncResult {
    
    // Core Logic: O status da tripState dita o comportamento de todo o sistema
    switch (tripState) {
      
      case AppTripState.BUSCANDO_MOTORISTA:
      case AppTripState.DISPONIVEL:
        return {
          driverState: DriverState.ONLINE,
          tripState,
          dispatchState: 'MATCHING',
          trackingState: 'IDLE',
          availabilityState: 'AVAILABLE',
          operationalRuntime: { matching: true, tracking: false, radar: true, dispatch: true, returning: false, realtime: true },
        };

      case AppTripState.OFERTANDO:
        return {
          driverState: DriverState.RECEBENDO_OFERTA,
          tripState,
          dispatchState: 'RESERVED',
          trackingState: 'ACTIVE',
          availabilityState: 'RESERVED',
          operationalRuntime: { matching: true, tracking: true, radar: true, dispatch: true, returning: false, realtime: true },
        };

      case AppTripState.ACEITO:
        return {
          driverState: DriverState.ACEITOU,
          tripState,
          dispatchState: 'ACTIVE_TRIP',
          trackingState: 'ACTIVE',
          availabilityState: 'BUSY',
          operationalRuntime: { matching: false, tracking: true, radar: false, dispatch: true, returning: false, realtime: true },
        };

      case AppTripState.INDO_COLETA:
        return {
          driverState: DriverState.INDO_COLETA,
          tripState,
          dispatchState: 'COLLECTING',
          trackingState: 'COLLECTING',
          availabilityState: 'BUSY',
          operationalRuntime: { matching: false, tracking: true, radar: false, dispatch: true, returning: false, realtime: true },
        };

      case AppTripState.COLETANDO:
        return {
          driverState: DriverState.COLETANDO,
          tripState,
          dispatchState: 'COLLECTING',
          trackingState: 'COLLECTING',
          availabilityState: 'BUSY',
          operationalRuntime: { matching: false, tracking: true, radar: false, dispatch: true, returning: false, realtime: true },
        };

      case AppTripState.EM_TRANSPORTE:
        return {
          driverState: DriverState.EM_TRANSPORTE,
          tripState,
          dispatchState: 'IN_TRANSIT',
          trackingState: 'MOVING',
          availabilityState: 'BUSY',
          operationalRuntime: { matching: false, tracking: true, radar: false, dispatch: true, returning: false, realtime: true },
        };

      case AppTripState.FINALIZANDO:
        return {
          driverState: DriverState.FINALIZANDO,
          tripState,
          dispatchState: 'DELIVERING',
          trackingState: 'DELIVERING',
          availabilityState: 'BUSY',
          operationalRuntime: { matching: false, tracking: true, radar: false, dispatch: true, returning: false, realtime: true },
        };

      case AppTripState.ENTREGUE:
        return {
          driverState: DriverState.ENTREGUE,
          tripState,
          dispatchState: 'RETURNING',
          trackingState: 'RETURNING',
          availabilityState: 'RETURNING',
          operationalRuntime: { matching: false, tracking: true, radar: true, dispatch: true, returning: true, realtime: true },
        };

      // Estados de Erro / Cancelamento
      case AppTripState.CANCELADO:
      case AppTripState.CANCELADO_CLIENTE:
      case AppTripState.CANCELADO_MOTORISTA:
      case AppTripState.SEM_MOTORISTA:
      case AppTripState.ERRO_PAGAMENTO:
        return {
          driverState: DriverState.ONLINE,
          tripState,
          dispatchState: 'ONLINE',
          trackingState: 'IDLE',
          availabilityState: 'AVAILABLE',
          operationalRuntime: { matching: true, tracking: false, radar: true, dispatch: true, returning: false, realtime: true },
        };

      default:
        return {
          driverState,
          tripState,
          dispatchState: 'ONLINE',
          trackingState: 'IDLE',
          availabilityState: 'AVAILABLE',
          operationalRuntime: { matching: true, tracking: false, radar: true, dispatch: true, returning: false, realtime: true },
        };
    }
  }
}
