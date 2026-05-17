// src/state/driverStateMachine.ts

export enum DriverState {
  OFFLINE = 'offline',
  ONLINE = 'online', // Radar ligado, aguardando
  RECEBENDO_OFERTA = 'recebendo_oferta', // Tem 15s para responder
  ACEITOU = 'aceitou',
  INDO_COLETA = 'indo_coleta',
  COLETANDO = 'coletando',
  EM_TRANSPORTE = 'em_transporte',
  FINALIZANDO = 'finalizando',
  OCUPADO = 'ocupado' // Em operação ativa genérica
}

export const DRIVER_ALLOWED_TRANSITIONS: Record<DriverState, DriverState[]> = {
  [DriverState.OFFLINE]: [DriverState.ONLINE],
  [DriverState.ONLINE]: [DriverState.OFFLINE, DriverState.RECEBENDO_OFERTA],
  [DriverState.RECEBENDO_OFERTA]: [DriverState.ACEITOU, DriverState.ONLINE, DriverState.OFFLINE], // Volta pro online se recusar/timeout
  [DriverState.ACEITOU]: [DriverState.INDO_COLETA, DriverState.ONLINE], // Online se a corrida for cancelada pelo cliente
  [DriverState.INDO_COLETA]: [DriverState.COLETANDO, DriverState.ONLINE],
  [DriverState.COLETANDO]: [DriverState.EM_TRANSPORTE],
  [DriverState.EM_TRANSPORTE]: [DriverState.FINALIZANDO],
  [DriverState.FINALIZANDO]: [DriverState.ONLINE], // Acabou a entrega, volta pro Radar
  [DriverState.OCUPADO]: [DriverState.ONLINE, DriverState.OFFLINE]
};
