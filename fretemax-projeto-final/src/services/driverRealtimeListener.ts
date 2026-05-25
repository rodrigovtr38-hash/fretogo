import {
  eventBusService,
  AppEvents,
} from './eventBusService';

import {
  DriverState,
  canDriverTransition,
} from '../state/driverStateMachine';

type DriverRealtimePayload = {
  id: string;

  state: DriverState;

  freteAtualId?: string;

  online?: boolean;

  disponivel?: boolean;

  novaOferta?: any;
};

class DriverRealtimeListener {
  private currentState =
    DriverState.OFFLINE;

  initialize() {
    eventBusService.on(
      AppEvents.DRIVER_STATUS_CHANGED,
      this.handleDriverUpdate.bind(this),
    );
  }

  private handleDriverUpdate(
    payload: DriverRealtimePayload,
  ) {
    try {
      if (
        !payload?.state
      ) {
        return;
      }

      const nextState =
        payload.state;

      /*
      ===================================
      IGNORA DUPLICADO
      ===================================
      */

      if (
        this.currentState ===
        nextState
      ) {
        return;
      }

      /*
      ===================================
      VALIDAÇÃO STATE MACHINE
      ===================================
      */

      const valid =
        canDriverTransition(
          this.currentState,
          nextState,
        );

      if (!valid) {
        console.warn(
          `INVALID DRIVER TRANSITION: ${this.currentState} -> ${nextState}`,
        );

        eventBusService.emit(
          AppEvents.SYSTEM_ERROR,
          {
            origem:
              'driverRealtimeListener',

            currentState:
              this.currentState,

            nextState,
          },
        );

        return;
      }

      /*
      ===================================
      LOG TRANSITION
      ===================================
      */

      console.log(
        `DRIVER STATE: ${this.currentState} -> ${nextState}`,
      );

      this.currentState =
        nextState;

      /*
      ===================================
      EVENTS
      ===================================
      */

      switch (nextState) {

        /*
        ================================
        ONLINE
        ================================
        */

        case DriverState.ONLINE:

          eventBusService.emit(
            AppEvents.DRIVER_ONLINE,
            payload,
          );

          break;

        /*
        ================================
        OFFLINE
        ================================
        */

        case DriverState.OFFLINE:

          eventBusService.emit(
            AppEvents.DRIVER_OFFLINE,
            payload,
          );

          break;

        /*
        ================================
        RECEBENDO OFERTA
        ================================
        */

        case DriverState.RECEBENDO_OFERTA:

          eventBusService.emit(
            AppEvents.NEW_TRIP_REQUEST,
            payload,
          );

          break;

        /*
        ================================
        ACEITOU
        ================================
        */

        case DriverState.ACEITOU:

          eventBusService.emit(
            AppEvents.DRIVER_ACCEPTED_TRIP,
            payload,
          );

          eventBusService.emit(
            AppEvents.TRIP_ACCEPTED,
            payload,
          );

          break;

        /*
        ================================
        REJEITOU
        ================================
        */

        case DriverState.REJEITOU_OFERTA:

          eventBusService.emit(
            AppEvents.DRIVER_REJECTED_TRIP,
            payload,
          );

          break;

        /*
        ================================
        TIMEOUT
        ================================
        */

        case DriverState.TIMEOUT:

          eventBusService.emit(
            AppEvents.DISPATCH_TIMEOUT,
            payload,
          );

          break;

        /*
        ================================
        REDISPATCH
        ================================
        */

        case DriverState.REDISPATCH:

          eventBusService.emit(
            AppEvents.REDISPATCH_STARTED,
            payload,
          );

          break;

        /*
        ================================
        COLETA
        ================================
        */

        case DriverState.COLETANDO:

          eventBusService.emit(
            AppEvents.TRIP_COLLECTED,
            payload,
          );

          break;

        /*
        ================================
        TRANSPORTE
        ================================
        */

        case DriverState.EM_TRANSPORTE:

          eventBusService.emit(
            AppEvents.TRIP_IN_PROGRESS,
            payload,
          );

          eventBusService.emit(
            AppEvents.TRIP_STARTED,
            payload,
          );

          break;

        /*
        ================================
        FINALIZAÇÃO
        ================================
        */

        case DriverState.FINALIZANDO:

          eventBusService.emit(
            AppEvents.TRIP_FINISHED,
            payload,
          );

          break;

        /*
        ================================
        CANCELADO
        ================================
        */

        case DriverState.CANCELADO:

          eventBusService.emit(
            AppEvents.TRIP_CANCELLED,
            payload,
          );

          break;
      }
    } catch (error) {

      console.error(
        'DRIVER REALTIME LISTENER ERROR:',
        error,
      );

      eventBusService.emit(
        AppEvents.SYSTEM_ERROR,
        {
          origem:
            'driverRealtimeListener',

          error,
        },
      );
    }
  }
}

export const driverRealtimeListener =
  new DriverRealtimeListener();
