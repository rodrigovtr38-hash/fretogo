import {
  eventBusService,
  AppEvents,
} from './eventBusService';

import {
  AppTripState,
  canTransition,
} from '../state/tripStateMachine';

type TripRealtimePayload = {
  id: string;
  status: AppTripState;
};

class TripRealtimeListener {
  private currentState =
    AppTripState.AGUARDANDO_PAGAMENTO;

  initialize() {
    eventBusService.on(
      AppEvents.TRIP_STATUS_CHANGED,
      this.handleTripUpdate.bind(this)
    );
  }

  private handleTripUpdate(
    payload: TripRealtimePayload
  ) {
    if (!payload?.status) return;

    const nextState = payload.status;

    if (
      this.currentState === nextState
    ) {
      return;
    }

    const isValid =
      canTransition(
        this.currentState,
        nextState
      );

    if (!isValid) {
      console.warn(
        `Invalid Trip Transition: ${this.currentState} -> ${nextState}`
      );

      return;
    }

    this.currentState = nextState;

    switch (nextState) {
      case AppTripState.OFERTANDO:
        eventBusService.emit(
          AppEvents.NEW_TRIP_REQUEST,
          payload
        );
        break;

      case AppTripState.ACEITO:
        eventBusService.emit(
          AppEvents.TRIP_ACCEPTED,
          payload
        );
        break;

      case AppTripState.EM_TRANSPORTE:
        eventBusService.emit(
          AppEvents.TRIP_STARTED,
          payload
        );
        break;

      case AppTripState.ENTREGUE:
        eventBusService.emit(
          AppEvents.TRIP_FINISHED,
          payload
        );
        break;

      case AppTripState.CANCELADO:
        eventBusService.emit(
          AppEvents.TRIP_CANCELLED,
          payload
        );
        break;
    }
  }
}

export const tripRealtimeListener =
  new TripRealtimeListener();
