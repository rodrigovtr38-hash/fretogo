// =========================================================
// NOME DO ARQUIVO: src/state/tripStateMachine.ts
// =========================================================

export enum AppTripState {
  /* ===================================================== PAGAMENTO */
  AGUARDANDO_PAGAMENTO = 'aguardando_pagamento',
  PAGAMENTO_APROVADO = 'pagamento_aprovado',
  ERRO_PAGAMENTO = 'erro_pagamento',

  /* ===================================================== PREPARAÇÃO */
  AGENDADO = 'agendado',
  DISPONIVEL = 'disponivel',
  BUSCANDO_MOTORISTA = 'buscando_motorista',
  EXPANDINDO_BUSCA = 'expandindo_busca',
  SEM_MOTORISTA = 'sem_motorista',

  /* ===================================================== MATCHING */
  OFERTANDO = 'ofertando',
  MOTORISTA_ENCONTRADO = 'motorista_encontrado',
  AGUARDANDO_ACEITE = 'aguardando_aceite',
  RESERVADO_AGUARDANDO_PAGAMENTO = 'reservado_aguardando_pagamento', // Mantido no enum para dados pregressos não quebrarem a UI
  ACEITO = 'aceito',
  REDISPATCH = 'redispatch',
  TIMEOUT = 'timeout',
  EXPIRADO = 'expirado',

  /* ===================================================== COLETA */
  INDO_COLETA = 'indo_coleta',
  CHEGOU_COLETA = 'chegou_coleta',
  COLETANDO = 'coletando',

  /* ===================================================== TRANSPORTE */
  EM_TRANSPORTE = 'em_transporte',
  PARADO_OPERACIONAL = 'parado_operacional',
  CHEGOU_ENTREGA = 'chegou_entrega',
  ENTREGANDO = 'entregando',

  /* ===================================================== FINALIZAÇÃO */
  FINALIZANDO = 'finalizando',
  VALIDANDO_COMPROVANTE = 'validando_comprovante',
  ENTREGUE = 'entregue',

  /* ===================================================== CANCELAMENTO */
  CANCELADO = 'cancelado',
  CANCELADO_CLIENTE = 'cancelado_cliente',
  CANCELADO_MOTORISTA = 'cancelado_motorista',

  /* ===================================================== SISTEMA */
  ERRO = 'erro',
}

export { AppTripState as TripState };

// 🔥 CTO FIX: REMOÇÃO TOTAL DE RESERVADO_AGUARDANDO_PAGAMENTO DAS TRANSIÇÕES OPERACIONAIS (CLEAN FLOW)
export const VALID_TRANSITIONS: Record<string, string[]> = {
  [AppTripState.AGUARDANDO_PAGAMENTO]: [AppTripState.PAGAMENTO_APROVADO, AppTripState.ERRO_PAGAMENTO, AppTripState.CANCELADO],
  [AppTripState.PAGAMENTO_APROVADO]: [AppTripState.DISPONIVEL, AppTripState.AGENDADO],
  [AppTripState.ERRO_PAGAMENTO]: [AppTripState.CANCELADO],

  [AppTripState.AGENDADO]: [AppTripState.DISPONIVEL, AppTripState.ACEITO, AppTripState.CANCELADO],

  [AppTripState.DISPONIVEL]: [AppTripState.ACEITO, AppTripState.BUSCANDO_MOTORISTA, AppTripState.SEM_MOTORISTA, AppTripState.CANCELADO, AppTripState.EXPIRADO],
  
  [AppTripState.BUSCANDO_MOTORISTA]: [AppTripState.EXPANDINDO_BUSCA, AppTripState.OFERTANDO, AppTripState.SEM_MOTORISTA, AppTripState.CANCELADO, AppTripState.ACEITO],
  [AppTripState.EXPANDINDO_BUSCA]: [AppTripState.OFERTANDO, AppTripState.SEM_MOTORISTA, AppTripState.CANCELADO, AppTripState.ACEITO],
  [AppTripState.SEM_MOTORISTA]: [AppTripState.CANCELADO, AppTripState.DISPONIVEL], 

  [AppTripState.OFERTANDO]: [AppTripState.MOTORISTA_ENCONTRADO, AppTripState.AGUARDANDO_ACEITE, AppTripState.REDISPATCH, AppTripState.TIMEOUT, AppTripState.CANCELADO, AppTripState.ACEITO],
  [AppTripState.MOTORISTA_ENCONTRADO]: [AppTripState.AGUARDANDO_ACEITE, AppTripState.ACEITO, AppTripState.REDISPATCH],
  [AppTripState.AGUARDANDO_ACEITE]: [AppTripState.ACEITO, AppTripState.TIMEOUT, AppTripState.REDISPATCH, AppTripState.CANCELADO],
  [AppTripState.TIMEOUT]: [AppTripState.REDISPATCH, AppTripState.SEM_MOTORISTA, AppTripState.DISPONIVEL],
  [AppTripState.REDISPATCH]: [AppTripState.DISPONIVEL, AppTripState.BUSCANDO_MOTORISTA, AppTripState.OFERTANDO, AppTripState.SEM_MOTORISTA, AppTripState.CANCELADO],
  
  [AppTripState.EXPIRADO]: [AppTripState.CANCELADO, AppTripState.DISPONIVEL],

  // Mantido apenas caso algum script forçado ou carga antiga queira pular fora, mas é inacessível para novas
  [AppTripState.RESERVADO_AGUARDANDO_PAGAMENTO]: [AppTripState.ACEITO, AppTripState.DISPONIVEL, AppTripState.CANCELADO, AppTripState.EXPIRADO, AppTripState.REDISPATCH],

  [AppTripState.ACEITO]: [AppTripState.INDO_COLETA, AppTripState.CANCELADO_MOTORISTA, AppTripState.CANCELADO_CLIENTE, AppTripState.REDISPATCH, AppTripState.DISPONIVEL],
  [AppTripState.INDO_COLETA]: [AppTripState.CHEGOU_COLETA, AppTripState.CANCELADO, AppTripState.REDISPATCH, AppTripState.DISPONIVEL],
  [AppTripState.CHEGOU_COLETA]: [AppTripState.COLETANDO, AppTripState.CANCELADO, AppTripState.REDISPATCH, AppTripState.DISPONIVEL],
  [AppTripState.COLETANDO]: [AppTripState.EM_TRANSPORTE, AppTripState.CANCELADO, AppTripState.REDISPATCH, AppTripState.DISPONIVEL],
  
  [AppTripState.EM_TRANSPORTE]: [AppTripState.CHEGOU_ENTREGA, AppTripState.PARADO_OPERACIONAL, AppTripState.FINALIZANDO, AppTripState.ENTREGUE, AppTripState.ERRO, AppTripState.REDISPATCH, AppTripState.DISPONIVEL],
  [AppTripState.CHEGOU_ENTREGA]: [AppTripState.ENTREGANDO, AppTripState.CANCELADO, AppTripState.REDISPATCH, AppTripState.DISPONIVEL],
  [AppTripState.ENTREGANDO]: [AppTripState.FINALIZANDO, AppTripState.ENTREGUE, AppTripState.EM_TRANSPORTE, AppTripState.CANCELADO, AppTripState.REDISPATCH, AppTripState.DISPONIVEL],
  [AppTripState.PARADO_OPERACIONAL]: [AppTripState.EM_TRANSPORTE, AppTripState.ERRO],
  
  [AppTripState.FINALIZANDO]: [AppTripState.VALIDANDO_COMPROVANTE, AppTripState.ENTREGUE, AppTripState.ERRO],
  [AppTripState.VALIDANDO_COMPROVANTE]: [AppTripState.ENTREGUE, AppTripState.ERRO],
  [AppTripState.ENTREGUE]: [AppTripState.EM_TRANSPORTE],
  
  [AppTripState.CANCELADO]: [],
  [AppTripState.CANCELADO_CLIENTE]: [],
  [AppTripState.CANCELADO_MOTORISTA]: [AppTripState.REDISPATCH, AppTripState.CANCELADO, AppTripState.DISPONIVEL],
  
  [AppTripState.ERRO]: [AppTripState.CANCELADO, AppTripState.REDISPATCH],
};

export const canTransition = (current: string, next: string): boolean => {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
};

export const isFinalState = (status: string): boolean => {
  return [AppTripState.ENTREGUE, AppTripState.CANCELADO, AppTripState.CANCELADO_CLIENTE, AppTripState.CANCELADO_MOTORISTA, AppTripState.EXPIRADO, AppTripState.SEM_MOTORISTA, AppTripState.ERRO_PAGAMENTO].includes(status as AppTripState);
};

export const isActiveState = (status: string): boolean => {
  // A RESERVA_AGUARDANDO_PAGAMENTO continua aqui apenas para não quebrar a UI de fretes legados, mas cargas novas não entrarão nela.
  return [AppTripState.BUSCANDO_MOTORISTA, AppTripState.EXPANDINDO_BUSCA, AppTripState.OFERTANDO, AppTripState.AGUARDANDO_ACEITE, AppTripState.RESERVADO_AGUARDANDO_PAGAMENTO, AppTripState.ACEITO, AppTripState.INDO_COLETA, AppTripState.CHEGOU_COLETA, AppTripState.COLETANDO, AppTripState.EM_TRANSPORTE, AppTripState.CHEGOU_ENTREGA, AppTripState.ENTREGANDO, AppTripState.PARADO_OPERACIONAL, AppTripState.FINALIZANDO, AppTripState.VALIDANDO_COMPROVANTE].includes(status as AppTripState);
};

export const isOperationalState = (status: string): boolean => {
  return [AppTripState.ACEITO, AppTripState.INDO_COLETA, AppTripState.CHEGOU_COLETA, AppTripState.COLETANDO, AppTripState.EM_TRANSPORTE, AppTripState.CHEGOU_ENTREGA, AppTripState.ENTREGANDO, AppTripState.PARADO_OPERACIONAL, AppTripState.FINALIZANDO].includes(status as AppTripState);
};
