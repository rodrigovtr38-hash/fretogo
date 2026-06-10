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
    // 🔥 CTO FIX P0 #1: Ajuste de Payload. O Firestore manda o documento bruto (com id, status, motoristaId).
    // O Orchestrator agora traduz esse payload bruto para a Máquina de Estados entender.
    eventBusService.on(AppEvents.TRIP_STATUS_CHANGED, async (payload: any) => {
      if (this.syncing || !payload) return;
      
      this.syncing = true; // 🔥 LOCK: Impede eventos sobrepostos
      try {
        // Converte o status que veio do banco para o AppTripState oficial
        const tripStateRecebido = payload.status as AppTripState;
        
        // Se houver state do motorista no payload (opcional), usa, senão foca no tripState
        const driverStateRecebido = payload.state as DriverState || DriverState.OCUPADO;

        const syncResult = StateSynchronizationService.synchronize(
          driverStateRecebido,
          tripStateRecebido
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
