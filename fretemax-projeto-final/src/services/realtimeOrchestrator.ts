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
  private initialized =
    false;

  private syncing =
    false;

  initialize(
    driverId?: string,
    tripId?: string,
  ) {
    try {

      if (
        this.initialized
      ) {
        return;
      }

      console.log(
        'REALTIME ORCHESTRATOR STARTED',
      );

      this.initialized =
        true;

      /*
      ===================================
      DRIVER REALTIME
      ===================================
      */

      if (driverId) {

        firebaseRealtimeService.listenDriver(
          driverId,
        );

      }

      /*
      ===================================
      TRIP REALTIME
      ===================================
      */

      if (tripId) {

        firebaseRealtimeService.listenTrip(
          tripId,
        );

      }

      /*
      ===================================
      REGISTER EVENTS
      ===================================
      */

      this.registerEvents();

      /*
      ===================================
      REALTIME CONNECTED
      ===================================
      */

      eventBusService.emit(
        AppEvents.REALTIME_CONNECTED,
      );

    } catch (error) {

      console.error(
        'REALTIME ORCHESTRATOR INIT ERROR:',
        error,
      );

      eventBusService.emit(
        AppEvents.SYSTEM_ERROR,
        {
          origem:
            'realtimeOrchestrator.initialize',

          error,
        },
      );
    }
  }

  private registerEvents() {

    /*
    ===================================
    TRIP STATUS
    ===================================
    */

    eventBusService.on(
      AppEvents.TRIP_STATUS_CHANGED,

      async (
        tripData: any,
      ) => {

        try {

          if (
            this.syncing
          ) {
            return;
          }

          if (
            !tripData
          ) {
            return;
          }

          if (
            !tripData.driverId ||
            !tripData.status
          ) {
            return;
          }

          this.syncing =
            true;

          const synchronized =
            StateSynchronizationService.synchronize(
              tripData.driverState as DriverState,

              tripData.status as AppTripState,
            );

          /*
          ===============================
          UPDATE DRIVER
          ===============================
          */

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
              },
            );

          }

          /*
          ===============================
          LOG
          ===============================
          */

          console.log(
            'SYNC OK:',
            tripData.status,
          );

        } catch (error) {

          console.error(
            'TRIP SYNC ERROR:',
            error,
          );

          eventBusService.emit(
            AppEvents.SYSTEM_ERROR,
            {
              origem:
                'TRIP_STATUS_CHANGED',

              error,
            },
          );

        } finally {

          this.syncing =
            false;

        }
      },
    );

    /*
    ===================================
    REALTIME DISCONNECTED
    ===================================
    */

    eventBusService.on(
      AppEvents.REALTIME_DISCONNECTED,

      () => {

        console.warn(
          'REALTIME DISCONNECTED',
        );

      },
    );

    /*
    ===================================
    REALTIME RECONNECTED
    ===================================
    */

    eventBusService.on(
      AppEvents.REALTIME_RECONNECTED,

      () => {

        console.log(
          'REALTIME RECONNECTED',
        );

      },
    );

    /*
    ===================================
    SYSTEM ERROR
    ===================================
    */

    eventBusService.on(
      AppEvents.SYSTEM_ERROR,

      (
        payload,
      ) => {

        console.error(
          'SYSTEM ERROR:',
          payload,
        );

      },
    );
  }

  destroy() {

    try {

      firebaseRealtimeService.disconnectAll();

      eventBusService.clear();

      this.initialized =
        false;

      this.syncing =
        false;

      console.log(
        'REALTIME ORCHESTRATOR DESTROYED',
      );

    } catch (error) {

      console.error(
        'REALTIME DESTROY ERROR:',
        error,
      );
    }
  }
}

export const realtimeOrchestrator =
  new RealtimeOrchestrator();
