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
  previousStatus?: AppTripState;
};

class TripRealtimeListener {
  private currentState: AppTripState =
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
    if (!payload) return;

    const nextState = payload.status;

    const isValidTransition =
      canTransition(
        this.currentState,
        nextState
      );

    if (!isValidTransition) {
      console.warn(
        `Invalid Trip Transition: ${this.currentState} -> ${nextState}`
      );

      return;
    }

    const previousState =
      this.currentState;

    this.currentState = nextState;

    console.log(
      `Trip State Updated: ${previousState} -> ${nextState}`
    );

    this.emitTripEvents(nextState);
  }

  private emitTripEvents(
    state: AppTripState
  ) {
    switch (state) {
      case AppTripState.OFERTANDO:
        eventBusService.emit(
          AppEvents.NEW_TRIP_REQUEST
        );
        break;

      case AppTripState.ACEITO:
        eventBusService.emit(
          AppEvents.TRIP_ACCEPTED
        );
        break;

      case AppTripState.EM_TRANSPORTE:
        eventBusService.emit(
          AppEvents.TRIP_STARTED
        );
        break;

      case AppTripState.ENTREGUE:
        eventBusService.emit(
          AppEvents.TRIP_FINISHED
        );
        break;

      case AppTripState.CANCELADO:
        eventBusService.emit(
          AppEvents.TRIP_CANCELLED
        );
        break;
    }
  }

  getCurrentState() {
    return this.currentState;
  }
}

export const tripRealtimeListener =
  new TripRealtimeListener();
