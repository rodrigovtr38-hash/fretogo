// =========================================================
// NOME DO ARQUIVO: src/services/realtimeOrchestrator.ts
// CTO-Log: Auditoria de Orquestração (LOTE 6)
// Status: Lock de sincronização ativado. Prevenção de loop infinito validada.
// =========================================================

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
      console.error('[CTO-Log] REALTIME ORCHESTRATOR INIT ERROR:', error);
      eventBusService.emit(AppEvents.SYSTEM_ERROR, { origem: 'realtimeOrchestrator.initialize', error });
    }
  }

  private registerEvents() {
    // Ajuste de Payload: O Orchestrator traduz o payload bruto para a Máquina de Estados.
    eventBusService.on(AppEvents.TRIP_STATUS_CHANGED, async (payload: any) => {
      if (this.syncing || !payload) return;
      
      this.syncing = true; // LOCK: Impede eventos sobrepostos
      try {
        const tripStateRecebido = payload.status as AppTripState;
        const driverStateRecebido = payload.state as DriverState || DriverState.OCUPADO;

        const syncResult = StateSynchronizationService.synchronize(
          driverStateRecebido,
          tripStateRecebido
        );
        
        eventBusService.emit(AppEvents.STATE_SYNCED, syncResult);
      } catch (error) {
        console.error('[CTO-Log] SYNC ERROR:', error);
      } finally {
        this.syncing = false; // RELEASE: Libera para o próximo evento
      }
    });
  }
}

export const realtimeOrchestrator = new RealtimeOrchestrator();
export default realtimeOrchestrator;
