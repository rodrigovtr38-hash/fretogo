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
      AppTripState.ERRO_PAGAMENTO, AppTripState.SEM_MOTORISTA,
      AppTripState.CANCELADO_CLIENTE, AppTripState.CANCELADO_MOTORISTA
    ].includes(this.currentState);
  }

  isActive(): boolean {
    return [
      AppTripState.RESERVADO_AGUARDANDO_PAGAMENTO as any,
      AppTripState.ACEITO, AppTripState.INDO_COLETA, AppTripState.CHEGOU_COLETA, AppTripState.COLETANDO,
      AppTripState.EM_TRANSPORTE, AppTripState.CHEGOU_ENTREGA, AppTripState.ENTREGANDO, AppTripState.FINALIZANDO
    ].includes(this.currentState);
  }

  reset(): void {
    this.currentState = AppTripState.AGUARDANDO_PAGAMENTO;
  }
}
