import { DriverState } from '../state/driverStateMachine';
import { AppTripState } from '../state/tripStateMachine';

type SyncResult = {
  driverState?: DriverState;
  tripState?: AppTripState;
};

export class StateSynchronizationService {
  static synchronize(
    driverState: DriverState,
    tripState: AppTripState
  ): SyncResult {
    switch (tripState) {
      case AppTripState.OFERTANDO:
        return {
          driverState: DriverState.RECEBENDO_OFERTA
        };

      case AppTripState.ACEITO:
        return {
          driverState: DriverState.ACEITOU
        };

      case AppTripState.INDO_COLETA:
        return {
          driverState: DriverState.INDO_COLETA
        };

      case AppTripState.COLETANDO:
        return {
          driverState: DriverState.COLETANDO
        };

      case AppTripState.EM_TRANSPORTE:
        return {
          driverState: DriverState.EM_TRANSPORTE
        };

      case AppTripState.FINALIZANDO:
        return {
          driverState: DriverState.FINALIZANDO
        };

      case AppTripState.ENTREGUE:
        return {
          driverState: DriverState.ONLINE
        };

      case AppTripState.CANCELADO:
        return {
          driverState: DriverState.ONLINE
        };

      case AppTripState.EXPIRADO:
        return {
          driverState: DriverState.ONLINE
        };

      case AppTripState.SEM_MOTORISTA:
        return {
          driverState: DriverState.ONLINE
        };

      default:
        return {
          driverState
        };
    }
  }
}
