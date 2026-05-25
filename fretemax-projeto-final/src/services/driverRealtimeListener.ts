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
  previousState?: DriverState;
};

class DriverRealtimeListener {
  private currentState: DriverState =
    DriverState.OFFLINE;

  initialize() {
    eventBusService.on(
      AppEvents.DRIVER_STATUS_CHANGED,
      this.handleDriverUpdate.bind(this)
    );
  }

  private handleDriverUpdate(
    payload: DriverRealtimePayload
  ) {
    if (!payload) return;

    const nextState = payload.state;

    const isValidTransition =
      canDriverTransition(
        this.currentState,
        nextState
      );

    if (!isValidTransition) {
      console.warn(
        `Invalid Driver Transition: ${this.currentState} -> ${nextState}`
      );

      return;
    }

    const previousState = this.currentState;

    this.currentState = nextState;

    console.log(
      `Driver State Updated: ${previousState} -> ${nextState}`
    );

    this.emitStateEvents(nextState);
  }

  private emitStateEvents(
    state: DriverState
  ) {
    switch (state) {
      case DriverState.ONLINE:
        eventBusService.emit(
          AppEvents.DRIVER_ONLINE
        );
        break;

      case DriverState.OFFLINE:
        eventBusService.emit(
          AppEvents.DRIVER_OFFLINE
        );
        break;

      case DriverState.ACEITOU:
        eventBusService.emit(
          AppEvents.TRIP_ACCEPTED
        );
        break;

      case DriverState.EM_TRANSPORTE:
        eventBusService.emit(
          AppEvents.TRIP_STARTED
        );
        break;

      case DriverState.FINALIZANDO:
        eventBusService.emit(
          AppEvents.TRIP_FINISHED
        );
        break;
    }
  }

  getCurrentState() {
    return this.currentState;
  }
}

export const driverRealtimeListener =
  new DriverRealtimeListener();
