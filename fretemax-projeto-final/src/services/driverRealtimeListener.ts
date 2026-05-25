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
};

class DriverRealtimeListener {
  private currentState =
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
    if (!payload?.state) return;

    const nextState = payload.state;

    if (
      this.currentState === nextState
    ) {
      return;
    }

    const valid =
      canDriverTransition(
        this.currentState,
        nextState
      );

    if (!valid) {
      console.warn(
        `Invalid Driver Transition: ${this.currentState} -> ${nextState}`
      );

      return;
    }

    this.currentState = nextState;

    switch (nextState) {
      case DriverState.ONLINE:
        eventBusService.emit(
          AppEvents.DRIVER_ONLINE,
          payload
        );
        break;

      case DriverState.OFFLINE:
        eventBusService.emit(
          AppEvents.DRIVER_OFFLINE,
          payload
        );
        break;

      case DriverState.ACEITOU:
        eventBusService.emit(
          AppEvents.TRIP_ACCEPTED,
          payload
        );
        break;

      case DriverState.EM_TRANSPORTE:
        eventBusService.emit(
          AppEvents.TRIP_STARTED,
          payload
        );
        break;

      case DriverState.FINALIZANDO:
        eventBusService.emit(
          AppEvents.TRIP_FINISHED,
          payload
        );
        break;
    }
  }
}

export const driverRealtimeListener =
  new DriverRealtimeListener();
