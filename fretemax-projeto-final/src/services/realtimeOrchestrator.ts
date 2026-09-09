// =========================================================
// NOME DO ARQUIVO: src/services/realtimeOrchestrator.ts
// CTO-Log: Auditoria de Orquestração (LOTE 7)
// Status: Variáveis fantasma removidas e payload tipado para deploy verde.
// EXECUÇÃO BLOCO 7 (Prob #3): Eliminação de Event Loss via Lock Booleano. Implementação de Promise Chain para processamento sequencial.
// =========================================================

import { firebaseRealtimeService } from './firebaseRealtimeService';
import { eventBusService, AppEvents } from './eventBusService';
import { StateSynchronizationService } from './stateSynchronizationService';
import { DriverState } from '../state/driverStateMachine';
import { AppTripState } from '../state/tripStateMachine';

class RealtimeOrchestrator {
  private _initialized = false;
  private _syncQueue: Promise<void> = Promise.resolve(); // 🔥 CTO FIX: Fila de processamento sequencial
  private _eventsRegistered = false;

  // Exposto para garantir que a Vercel não acuse a variável como inutilizada
  public get isInitialized(): boolean {
    return this._initialized;
  }

  initialize(config: { driverId?: string; tripId?: string }): void {
    try {
      if (!this._eventsRegistered) {
        this.registerEvents();
        this._eventsRegistered = true;
      }

      if (config.driverId) {
        firebaseRealtimeService.listenDriver(config.driverId);
      }

      if (config.tripId) {
        firebaseRealtimeService.listenTrip(config.tripId);
      }

      this._initialized = true;
      eventBusService.emit(AppEvents.REALTIME_CONNECTED);
    } catch (error: unknown) {
      console.error('[CTO-Log] REALTIME ORCHESTRATOR INIT ERROR:', error);
      eventBusService.emit(AppEvents.SYSTEM_ERROR, { origem: 'realtimeOrchestrator.initialize', error });
    }
  }

  private registerEvents(): void {
    // Ajuste de Payload: Tipagem restrita substituindo o uso de 'any'
    eventBusService.on(AppEvents.TRIP_STATUS_CHANGED, (payload: Record<string, unknown> | null) => {
      if (!payload) return;
      
      // 🔥 CTO FIX [Bloco 7 - Prob #3]: Substituição do Lock booleano (que descartava eventos) por uma Promise Chain.
      // O evento B vai para a fila do Microtask e aguarda o término do evento A, impedindo dessincronização por rede móvel instável.
      this._syncQueue = this._syncQueue.then(async () => {
        try {
          const tripStateRecebido = payload.status as AppTripState;
          const driverStateRecebido = (payload.state as DriverState) || DriverState.OCUPADO;

          const syncResult = StateSynchronizationService.synchronize(
            driverStateRecebido,
            tripStateRecebido
          );
          
          eventBusService.emit(AppEvents.STATE_SYNCED, syncResult);
        } catch (error: unknown) {
          console.error('[CTO-Log] SYNC ERROR:', error);
        }
      }).catch(err => {
        // Blindagem para garantir que a chain não quebre definitivamente em caso de exceção severa.
        console.error('[CTO-Log] SYNC QUEUE CHAIN ERROR:', err);
      });
    });
  }
}

export const realtimeOrchestrator = new RealtimeOrchestrator();
export default realtimeOrchestrator;
