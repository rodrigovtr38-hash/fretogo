// src/state/tripStateMachine.ts

export enum AppTripState {
  AGUARDANDO_PAGAMENTO = 'aguardando_pagamento',
  DISPONIVEL = 'disponivel',
  OFERTANDO = 'ofertando',
  ACEITO = 'aceito',
  INDO_COLETA = 'indo_coleta',
  COLETANDO = 'coletando',
  EM_TRANSPORTE = 'em_transporte',
  FINALIZANDO = 'finalizando',
  ENTREGUE = 'entregue',
  CANCELADO = 'cancelado',
  EXPIRADO = 'expirado',
  REDISPATCH = 'redispatch'
}

export const ALLOWED_TRANSITIONS: Record<AppTripState, AppTripState[]> = {
  [AppTripState.AGUARDANDO_PAGAMENTO]: [AppTripState.DISPONIVEL, AppTripState.CANCELADO],
  [AppTripState.DISPONIVEL]: [AppTripState.OFERTANDO, AppTripState.CANCELADO, AppTripState.EXPIRADO],
  [AppTripState.OFERTANDO]: [AppTripState.ACEITO, AppTripState.REDISPATCH, AppTripState.CANCELADO],
  [AppTripState.ACEITO]: [AppTripState.INDO_COLETA, AppTripState.REDISPATCH, AppTripState.CANCELADO],
  [AppTripState.INDO_COLETA]: [AppTripState.COLETANDO, AppTripState.REDISPATCH, AppTripState.CANCELADO],
  [AppTripState.COLETANDO]: [AppTripState.EM_TRANSPORTE, AppTripState.REDISPATCH], 
  [AppTripState.EM_TRANSPORTE]: [AppTripState.FINALIZANDO, AppTripState.REDISPATCH], 
  [AppTripState.FINALIZANDO]: [AppTripState.ENTREGUE],
  [AppTripState.ENTREGUE]: [], 
  [AppTripState.CANCELADO]: [], 
  [AppTripState.EXPIRADO]: [], 
  [AppTripState.REDISPATCH]: [AppTripState.DISPONIVEL, AppTripState.CANCELADO] 
};

export const canTransition = (current: string, next: string): boolean => {
  return ALLOWED_TRANSITIONS[current as AppTripState]?.includes(next as AppTripState) ?? false;
};

export const isFinalState = (status: string): boolean => {
  return [AppTripState.ENTREGUE, AppTripState.CANCELADO, AppTripState.EXPIRADO].includes(status as AppTripState);
};

export const isActiveState = (status: string): boolean => {
  return [AppTripState.ACEITO, AppTripState.INDO_COLETA, AppTripState.COLETANDO, AppTripState.EM_TRANSPORTE, AppTripState.FINALIZANDO].includes(status as AppTripState);
};
