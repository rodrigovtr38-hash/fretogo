import {
  DriverState,
  canDriverTransition
} from '../state/driverStateMachine';

export class DriverStateService {
  private currentState: DriverState;

  constructor(initialState: DriverState) {
    this.currentState = initialState;
  }

  getState(): DriverState {
    return this.currentState;
  }

  canTransition(nextState: DriverState): boolean {
    return canDriverTransition(
      this.currentState,
      nextState
    );
  }

  transition(nextState: DriverState): boolean {
    const allowed = this.canTransition(nextState);

    if (!allowed) {
      console.error(
        `Transição inválida: ${this.currentState} -> ${nextState}`
      );

      return false;
    }

    console.log(
      `Motorista mudou de estado: ${this.currentState} -> ${nextState}`
    );

    this.currentState = nextState;

    return true;
  }

  isOnline(): boolean {
    return this.currentState !== DriverState.OFFLINE;
  }

  isBusy(): boolean {
    return [
      DriverState.RECEBENDO_OFERTA,
      DriverState.ACEITOU,
      DriverState.INDO_COLETA,
      DriverState.COLETANDO,
      DriverState.EM_TRANSPORTE,
      DriverState.FINALIZANDO
    ].includes(this.currentState);
  }

  reset(): void {
    this.currentState = DriverState.OFFLINE;
  }
}
