import {
  firebaseRealtimeService,
} from './firebaseRealtimeService';

import {
  eventBusService,
  AppEvents,
} from './eventBusService';

import {
  StateSynchronizationService,
} from './stateSynchronizationService';

import {
  DriverState,
} from '../state/driverStateMachine';

import {
  AppTripState,
} from '../state/tripStateMachine';

class RealtimeOrchestrator {
  private initialized = false;

  initialize(
    driverId?: string,
    tripId?: string
  ) {
    if (this.initialized) return;

    this.initialized = true;

    if (driverId) {
      firebaseRealtimeService.listenDriver(
        driverId
      );
    }

    if (tripId) {
      firebaseRealtimeService.listenTrip(
        tripId
      );
    }

    this.registerEvents();

    eventBusService.emit(
      AppEvents.REALTIME_CONNECTED
    );
  }

  private registerEvents() {
    eventBusService.on(
      AppEvents.TRIP_STATUS_CHANGED,
      async (tripData: any) => {
        if (!tripData) return;

        if (
          !tripData.driverId ||
          !tripData.status
        ) {
          return;
        }

        const synchronized =
          StateSynchronizationService.synchronize(
            tripData.driverState as DriverState,
            tripData.status as AppTripState
          );

        if (
          synchronized.driverState &&
          synchronized.driverState !==
            tripData.driverState
        ) {
          await firebaseRealtimeService.updateDriverRealtime(
            tripData.driverId,
            {
              state:
                synchronized.driverState,
            }
          );
        }
      }
    );
  }

  destroy() {
    firebaseRealtimeService.disconnectAll();

    eventBusService.clear();

    this.initialized = false;
  }
}

export const realtimeOrchestrator =
  new RealtimeOrchestrator();
