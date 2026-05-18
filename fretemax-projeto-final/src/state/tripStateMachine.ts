// src/state/tripStateMachine.ts

export enum TripState {
  AGUARDANDO_PAGAMENTO = 'aguardando_pagamento',
  DISPONIVEL = 'disponivel', // No radar
  OFERTANDO = 'ofertando',   // Lock de 15s para um motorista específico
  ACEITO = 'aceito',         // Motorista aceitou, indo pra coleta
  INDO_COLETA = 'indo_coleta',
  COLETANDO = 'coletando',   // Motorista no local de coleta
  EM_TRANSPORTE = 'em_transporte', // Carga no caminhão
  FINALIZANDO = 'finalizando', // Aguardando upload do canhoto/comprovante
  ENTREGUE = 'entregue',     // Operação logística concluída
  CANCELADO = 'cancelado',
  EXPIRADO = 'expirado',
  REDISPATCH = 'redispatch'  // Estado efêmero para forçar nova busca
}

// Mapa de Transições Seguras (Guards)
export const ALLOWED_TRANSITIONS: Record<TripState, TripState[]> = {
  [TripState.AGUARDANDO_PAGAMENTO]: [TripState.DISPONIVEL, TripState.CANCELADO],
  [TripState.DISPONIVEL]: [TripState.OFERTANDO, TripState.CANCELADO, TripState.EXPIRADO],
  [TripState.OFERTANDO]: [TripState.ACEITO, TripState.REDISPATCH, TripState.CANCELADO],
  [TripState.ACEITO]: [TripState.INDO_COLETA, TripState.REDISPATCH, TripState.CANCELADO],
  [TripState.INDO_COLETA]: [TripState.COLETANDO, TripState.REDISPATCH, TripState.CANCELADO],
  [TripState.COLETANDO]: [TripState.EM_TRANSPORTE, TripState.REDISPATCH], 
  [TripState.EM_TRANSPORTE]: [TripState.FINALIZANDO, TripState.REDISPATCH], 
  [TripState.FINALIZANDO]: [TripState.ENTREGUE],
  [TripState.ENTREGUE]: [], 
  [TripState.CANCELADO]: [], 
  [TripState.EXPIRADO]: [], 
  [TripState.REDISPATCH]: [TripState.DISPONIVEL, TripState.CANCELADO] 
};

/**
 * Valida se a transição de estado é permitida pela arquitetura.
 */
export const isValidTransition = (currentStatus: TripState, nextStatus: TripState): boolean => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(nextStatus);
};
