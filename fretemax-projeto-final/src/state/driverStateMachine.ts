export enum DriverState {
  /* BASE */
  OFFLINE = 'offline',
  ONLINE = 'online',
  INDISPONIVEL = 'indisponivel',

  /* OFERTA */
  RECEBENDO_OFERTA = 'recebendo_oferta',
  ANALISANDO_OFERTA = 'analisando_oferta',
  OFERTA_EXPIRADA = 'oferta_expirada',
  REJEITOU_OFERTA = 'rejeitou_oferta',

  /* ACEITE */
  ACEITOU = 'aceitou',
  RESERVADO = 'reservado',

  /* COLETA */
  INDO_COLETA = 'indo_coleta',
  CHEGOU_COLETA = 'chegou_coleta',
  COLETANDO = 'coletando',

  /* TRANSPORTE */
  EM_TRANSPORTE = 'em_transporte',
  PARADO_OPERACIONAL = 'parado_operacional',

  /* ENTREGA */
  FINALIZANDO = 'finalizando',
  ENTREGUE = 'entregue',

  /* SISTEMA */
  REDISPATCH = 'redispatch',
  TIMEOUT = 'timeout',
  CANCELADO = 'cancelado',
  ERRO = 'erro',

  /* LOCK */
  OCUPADO = 'ocupado',
}

export const DRIVER_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  [DriverState.OFFLINE]: [
    DriverState.ONLINE,
  ],

  [DriverState.ONLINE]: [
    DriverState.OFFLINE,
    DriverState.RECEBENDO_OFERTA,
    DriverState.INDISPONIVEL,
  ],

  [DriverState.INDISPONIVEL]: [
    DriverState.ONLINE,
    DriverState.OFFLINE,
  ],

  [DriverState.RECEBENDO_OFERTA]: [
    DriverState.ANALISANDO_OFERTA,
    DriverState.ACEITOU,
    DriverState.REJEITOU_OFERTA,
    DriverState.OFERTA_EXPIRADA,
    DriverState.TIMEOUT,
    DriverState.REDISPATCH,
    DriverState.ONLINE,
  ],

  [DriverState.ANALISANDO_OFERTA]: [
    DriverState.ACEITOU,
    DriverState.REJEITOU_OFERTA,
    DriverState.OFERTA_EXPIRADA,
    DriverState.TIMEOUT,
  ],

  [DriverState.REJEITOU_OFERTA]: [
    DriverState.ONLINE,
    DriverState.OFFLINE, // CTO Fix: Motorista pode desligar após rejeitar
  ],

  [DriverState.OFERTA_EXPIRADA]: [
    DriverState.ONLINE,
    DriverState.OFFLINE, // CTO Fix
  ],

  [DriverState.ACEITOU]: [
    DriverState.RESERVADO,
    DriverState.INDO_COLETA,
    DriverState.CANCELADO,
  ],

  [DriverState.RESERVADO]: [
    DriverState.INDO_COLETA,
    DriverState.CANCELADO,
  ],

  [DriverState.INDO_COLETA]: [
    DriverState.CHEGOU_COLETA,
    DriverState.CANCELADO,
    DriverState.ERRO,
  ],

  [DriverState.CHEGOU_COLETA]: [
    DriverState.COLETANDO,
    DriverState.CANCELADO,
  ],

  [DriverState.COLETANDO]: [
    DriverState.EM_TRANSPORTE,
    DriverState.CANCELADO,
  ],

  [DriverState.EM_TRANSPORTE]: [
    DriverState.PARADO_OPERACIONAL,
    DriverState.FINALIZANDO,
    DriverState.ERRO,
  ],

  [DriverState.PARADO_OPERACIONAL]: [
    DriverState.EM_TRANSPORTE,
    DriverState.ERRO,
  ],

  [DriverState.FINALIZANDO]: [
    DriverState.ENTREGUE,
    DriverState.ERRO,
  ],

  [DriverState.ENTREGUE]: [
    DriverState.ONLINE,
    DriverState.OFFLINE, // CTO Fix: Pode encerrar o dia após entregar
  ],

  [DriverState.REDISPATCH]: [
    DriverState.ONLINE,
  ],

  [DriverState.TIMEOUT]: [
    DriverState.ONLINE,
  ],

  [DriverState.CANCELADO]: [
    DriverState.ONLINE,
    DriverState.OFFLINE, // CTO Fix: Evita que o app trave se o motorista se irritar com o cancelamento
  ],

  [DriverState.ERRO]: [
    DriverState.ONLINE,
    DriverState.OFFLINE,
  ],

  [DriverState.OCUPADO]: [
    DriverState.ONLINE,
    DriverState.OFFLINE,
  ],
};

export const canDriverTransition = (current: string, next: string): boolean => {
  return DRIVER_ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
};
