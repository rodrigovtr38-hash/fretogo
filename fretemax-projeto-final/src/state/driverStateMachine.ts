export enum DriverState {
  OFFLINE = 'offline',
  ONLINE = 'online',
  RECEBENDO_OFERTA = 'recebendo_oferta',
  ACEITOU = 'aceitou',
  INDO_COLETA = 'indo_coleta',
  COLETANDO = 'coletando',
  EM_TRANSPORTE = 'em_transporte',
  FINALIZANDO = 'finalizando',
  OCUPADO = 'ocupado'
}

export const DRIVER_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  [DriverState.OFFLINE]: [DriverState.ONLINE],
  [DriverState.ONLINE]: [DriverState.OFFLINE, DriverState.RECEBENDO_OFERTA],
  [DriverState.RECEBENDO_OFERTA]: [DriverState.ACEITOU, DriverState.ONLINE, DriverState.OFFLINE],
  [DriverState.ACEITOU]: [DriverState.INDO_COLETA, DriverState.ONLINE],
  [DriverState.INDO_COLETA]: [DriverState.COLETANDO, DriverState.ONLINE],
  [DriverState.COLETANDO]: [DriverState.EM_TRANSPORTE],
  [DriverState.EM_TRANSPORTE]: [DriverState.FINALIZANDO],
  [DriverState.FINALIZANDO]: [DriverState.ONLINE],
  [DriverState.OCUPADO]: [DriverState.ONLINE, DriverState.OFFLINE]
};

export const canDriverTransition = (current: string, next: string): boolean => {
  return DRIVER_ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
};
