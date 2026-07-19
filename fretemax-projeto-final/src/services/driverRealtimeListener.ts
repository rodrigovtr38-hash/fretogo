// =========================================================
// NOME DO ARQUIVO: src/services/driverRealtimeListener.ts
// CTO-Log: Auditoria de Eventos em Tempo Real - LOTE 4
// Status: Certificado. Validação de transição de estado da máquina ativada.
// =========================================================

import { eventBusService, AppEvents } from './eventBusService';
import { DriverState, canDriverTransition } from '../state/driverStateMachine';

type DriverRealtimePayload = {
  id: string;
  state: DriverState;
  freteAtualId?: string;
  online?: boolean;
  disponivel?: boolean;
  novaOferta?: any;
};

class DriverRealtimeListener {
  private currentState = DriverState.OFFLINE;

  initialize() {
    eventBusService.on(AppEvents.DRIVER_STATUS_CHANGED, this.handleDriverUpdate.bind(this));
  }

  private handleDriverUpdate(payload: DriverRealtimePayload) {
    try {
      if (!payload?.state) return;

      const nextState = payload.state;

      /* ===================================
         IGNORA DUPLICADO E RENOVA
      =================================== */
      if (this.currentState === nextState) return;

      /* ===================================
         VALIDAÇÃO STATE MACHINE SEGURA
      =================================== */
      const valid = canDriverTransition(this.currentState, nextState);

      if (!valid) {
        console.warn(`[CTO-Log] INVALID DRIVER TRANSITION: ${this.currentState} -> ${nextState}`);
        eventBusService.emit(AppEvents.SYSTEM_ERROR, { origem: 'driverRealtimeListener', currentState: this.currentState, nextState });
        return;
      }

      console.log(`[CTO-Log] DRIVER STATE: ${this.currentState} -> ${nextState}`);
      this.currentState = nextState;

      /* ===================================
         EVENTS DISPATCHER
      =================================== */
      switch (nextState) {
        case DriverState.ONLINE:
          eventBusService.emit(AppEvents.DRIVER_ONLINE, payload);
          break;
        case DriverState.OFFLINE:
          eventBusService.emit(AppEvents.DRIVER_OFFLINE, payload);
          break;
        case DriverState.RECEBENDO_OFERTA:
          eventBusService.emit(AppEvents.NEW_TRIP_REQUEST, payload);
          break;
        case DriverState.ACEITOU:
          eventBusService.emit(AppEvents.DRIVER_ACCEPTED_TRIP, payload);
          eventBusService.emit(AppEvents.TRIP_ACCEPTED, payload);
          break;
        case DriverState.REJEITOU_OFERTA:
          eventBusService.emit(AppEvents.DRIVER_REJECTED_TRIP, payload);
          break;
        case DriverState.TIMEOUT:
          eventBusService.emit(AppEvents.DISPATCH_TIMEOUT, payload);
          break;
        case DriverState.REDISPATCH:
          eventBusService.emit(AppEvents.REDISPATCH_STARTED, payload);
          break;
        case DriverState.COLETANDO:
          eventBusService.emit(AppEvents.TRIP_COLLECTED, payload);
          break;
        case DriverState.EM_TRANSPORTE:
          eventBusService.emit(AppEvents.TRIP_IN_PROGRESS, payload);
          eventBusService.emit(AppEvents.TRIP_STARTED, payload);
          break;
        case DriverState.FINALIZANDO:
          eventBusService.emit(AppEvents.TRIP_FINISHED, payload);
          break;
        case DriverState.CANCELADO:
          eventBusService.emit(AppEvents.TRIP_CANCELLED, payload);
          break;
      }
    } catch (error) {
      console.error('[CTO-Log] DRIVER REALTIME LISTENER ERROR:', error);
      eventBusService.emit(AppEvents.SYSTEM_ERROR, { origem: 'driverRealtimeListener', error });
    }
  }
}

export const driverRealtimeListener = new DriverRealtimeListener();
