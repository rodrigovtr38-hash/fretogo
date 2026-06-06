// src/services/realtimeOrchestrator.ts
import { firebaseRealtimeService } from './firebaseRealtimeService';
import { eventBusService, AppEvents } from './eventBusService';
import { StateSynchronizationService } from './stateSynchronizationService';
import { DriverState } from '../state/driverStateMachine';
import { AppTripState } from '../state/tripStateMachine';

class RealtimeOrchestrator {
  private initialized = false;
  private syncing = false;
  private eventsRegistered = false;

  initialize(config: { driverId?: string; tripId?: string }) {
    try {
      if (!this.eventsRegistered) {
        this.registerEvents();
        this.eventsRegistered = true;
      }

      if (config.driverId) {
        firebaseRealtimeService.listenDriver(config.driverId);
      }

      if (config.tripId) {
        firebaseRealtimeService.listenTrip(config.tripId);
      }

      this.initialized = true;
      eventBusService.emit(AppEvents.REALTIME_CONNECTED);
    } catch (error) {
      console.error('REALTIME ORCHESTRATOR INIT ERROR:', error);
      eventBusService.emit(AppEvents.SYSTEM_ERROR, { origem: 'realtimeOrchestrator.initialize', error });
    }
  }

  private registerEvents() {
    eventBusService.on(AppEvents.TRIP_STATUS_CHANGED, async (payload: { driverState: DriverState, tripState: AppTripState }) => {
      if (this.syncing) return;
      
      this.syncing = true; // 🔥 LOCK: Impede eventos sobrepostos
      try {
        const syncResult = StateSynchronizationService.synchronize(
          payload.driverState,
          payload.tripState
        );
        
        // Emite o resultado da sincronização para todos os ouvintes
        eventBusService.emit(AppEvents.STATE_SYNCED, syncResult);
      } catch (error) {
        console.error('SYNC ERROR:', error);
      } finally {
        this.syncing = false; // 🔥 RELEASE: Libera para o próximo evento
      }
    });
  }
}

// 🔥 Instância Única (Singleton) - Garante que só exista UM cérebro no app
export const realtimeOrchestrator = new RealtimeOrchestrator();
export default realtimeOrchestrator;
