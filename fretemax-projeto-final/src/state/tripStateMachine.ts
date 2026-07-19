// =========================================================
// NOME DO ARQUIVO: src/services/tripStateService.ts
// CTO-Log: API de Consumo Rápido da Máquina de Estados (LOTE 7)
// Status: Compressão de sintaxe.
// =========================================================

import { AppTripState, canTransition } from '../state/tripStateMachine';

export class TripStateService {
  private currentState: AppTripState;

  constructor(initialState: AppTripState) {
    this.currentState = initialState;
  }

  getState(): AppTripState { return this.currentState; }

  canTransition(nextState: AppTripState): boolean {
    return canTransition(this.currentState, nextState);
  }

  transition(nextState: AppTripState): boolean {
    const allowed = this.canTransition(nextState);

    if (!allowed) {
      console.error(`[CTO-Log] Transição inválida: ${this.currentState} -> ${nextState}`);
      return false;
    }

    console.log(`[CTO-Log] Viagem mudou de estado: ${this.currentState} -> ${nextState}`);
    this.currentState = nextState;
    return true;
  }

  isFinished(): boolean {
    return [
      AppTripState.ENTREGUE, AppTripState.CANCELADO, AppTripState.EXPIRADO,
      AppTripState.ERRO_PAGAMENTO, AppTripState.SEM_MOTORISTA
    ].includes(this.currentState);
  }

  isActive(): boolean {
    return [
      AppTripState.ACEITO, AppTripState.INDO_COLETA, AppTripState.COLETANDO,
      AppTripState.EM_TRANSPORTE, AppTripState.FINALIZANDO
    ].includes(this.currentState);
  }

  reset(): void {
    this.currentState = AppTripState.AGUARDANDO_PAGAMENTO;
  }
}
