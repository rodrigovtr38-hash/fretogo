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

  private syncing = false;

  private eventsRegistered = false;

  initialize(config: {
    driverId?: string;
    tripId?: string;
  }) {
    try {
      if (!this.eventsRegistered) {
        this.registerEvents();

        this.eventsRegistered = true;
      }

      if (config.driverId) {
        firebaseRealtimeService.listenDriver(
          config.driverId,
        );
      }

      if (config.tripId) {
        firebaseRealtimeService.listenTrip(
          config.tripId,
        );
      }

      this.initialized = true;

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
    eventBusService.on(
      AppEvents.TRIP_STATUS_CHANGED,
      async (tripData: any) => {
        try {
          if (this.syncing) {
            return;
          }
  new RealtimeOrchestrator();
