export enum DriverState {

  /*
  =====================================================
  BASE
  =====================================================
  */

  OFFLINE = 'offline',

  ONLINE = 'online',

  INDISPONIVEL = 'indisponivel',

  /*
  =====================================================
  OFERTA
  =====================================================
  */

  RECEBENDO_OFERTA =
    'recebendo_oferta',

  ANALISANDO_OFERTA =
    'analisando_oferta',

  OFERTA_EXPIRADA =
    'oferta_expirada',

  REJEITOU_OFERTA =
    'rejeitou_oferta',

  /*
  =====================================================
  ACEITE
  =====================================================
  */

  ACEITOU =
    'aceitou',

  RESERVADO =
    'reservado',

  /*
  =====================================================
  COLETA
  =====================================================
  */

  INDO_COLETA =
    'indo_coleta',

  CHEGOU_COLETA =
    'chegou_coleta',

  COLETANDO =
    'coletando',

  /*
  =====================================================
  TRANSPORTE
  =====================================================
  */

  EM_TRANSPORTE =
    'em_transporte',

  PARADO_OPERACIONAL =
    'parado_operacional',

  /*
  =====================================================
  ENTREGA
  =====================================================
  */

  FINALIZANDO =
    'finalizando',

  ENTREGUE =
    'entregue',

  /*
  =====================================================
  SISTEMA
  =====================================================
  */

  REDISPATCH =
    'redispatch',

  TIMEOUT =
    'timeout',

  CANCELADO =
    'cancelado',

  ERRO =
    'erro',

  /*
  =====================================================
  LOCK
  =====================================================
  */

  OCUPADO =
    'ocupado',
}

/*
=====================================================
TRANSITIONS
=====================================================
*/

export const DRIVER_ALLOWED_TRANSITIONS:
  Record<string, string[]> = {

  /*
  =====================================================
  OFFLINE
  =====================================================
  */

  [DriverState.OFFLINE]: [
    DriverState.ONLINE,
  ],

  /*
  =====================================================
  ONLINE
  =====================================================
  */

  [DriverState.ONLINE]: [
    DriverState.OFFLINE,

    DriverState.RECEBENDO_OFERTA,

    DriverState.INDISPONIVEL,
  ],

  /*
  =====================================================
  INDISPONIVEL
  =====================================================
  */

  [DriverState.INDISPONIVEL]: [
    DriverState.ONLINE,
    DriverState.OFFLINE,
  ],

  /*
  =====================================================
  RECEBENDO OFERTA
  =====================================================
  */

  [DriverState.RECEBENDO_OFERTA]: [

    DriverState.ANALISANDO_OFERTA,

    DriverState.ACEITOU,

    DriverState.REJEITOU_OFERTA,

    DriverState.OFERTA_EXPIRADA,

    DriverState.TIMEOUT,

    DriverState.REDISPATCH,

    DriverState.ONLINE,
  ],

  /*
  =====================================================
  ANALISANDO
  =====================================================
  */

  [DriverState.ANALISANDO_OFERTA]: [

    DriverState.ACEITOU,

    DriverState.REJEITOU_OFERTA,

    DriverState.OFERTA_EXPIRADA,

    DriverState.TIMEOUT,
  ],

  /*
  =====================================================
  REJEITOU
  =====================================================
  */

  [DriverState.REJEITOU_OFERTA]: [
    DriverState.ONLINE,
  ],

  /*
  =====================================================
  EXPIRADA
  =====================================================
  */

  [DriverState.OFERTA_EXPIRADA]: [
    DriverState.ONLINE,
  ],

  /*
  =====================================================
  ACEITOU
  =====================================================
  */

  [DriverState.ACEITOU]: [

    DriverState.RESERVADO,

    DriverState.INDO_COLETA,

    DriverState.CANCELADO,
  ],

  /*
  =====================================================
  RESERVADO
  =====================================================
  */

  [DriverState.RESERVADO]: [

    DriverState.INDO_COLETA,

    DriverState.CANCELADO,
  ],

  /*
  =====================================================
  INDO COLETA
  =====================================================
  */

  [DriverState.INDO_COLETA]: [

    DriverState.CHEGOU_COLETA,

    DriverState.CANCELADO,

    DriverState.ERRO,
  ],

  /*
  =====================================================
  CHEGOU COLETA
  =====================================================
  */

  [DriverState.CHEGOU_COLETA]: [

    DriverState.COLETANDO,

    DriverState.CANCELADO,
  ],

  /*
  =====================================================
  COLETANDO
  =====================================================
  */

  [DriverState.COLETANDO]: [

    DriverState.EM_TRANSPORTE,

    DriverState.CANCELADO,
  ],

  /*
  =====================================================
  TRANSPORTE
  =====================================================
  */

  [DriverState.EM_TRANSPORTE]: [

    DriverState.PARADO_OPERACIONAL,

    DriverState.FINALIZANDO,

    DriverState.ERRO,
  ],

  /*
  =====================================================
  PARADO
  =====================================================
  */

  [DriverState.PARADO_OPERACIONAL]: [

    DriverState.EM_TRANSPORTE,

    DriverState.ERRO,
  ],

  /*
  =====================================================
  FINALIZANDO
  =====================================================
  */

  [DriverState.FINALIZANDO]: [

    DriverState.ENTREGUE,

    DriverState.ERRO,
  ],

  /*
  =====================================================
  ENTREGUE
  =====================================================
  */

  [DriverState.ENTREGUE]: [

    DriverState.ONLINE,
  ],

  /*
  =====================================================
  REDISPATCH
  =====================================================
  */

  [DriverState.REDISPATCH]: [

    DriverState.ONLINE,
  ],

  /*
  =====================================================
  TIMEOUT
  =====================================================
  */

  [DriverState.TIMEOUT]: [

    DriverState.ONLINE,
  ],

  /*
  =====================================================
  CANCELADO
  =====================================================
  */

  [DriverState.CANCELADO]: [

    DriverState.ONLINE,
  ],

  /*
  =====================================================
  ERRO
  =====================================================
  */

  [DriverState.ERRO]: [

    DriverState.ONLINE,

    DriverState.OFFLINE,
  ],

  /*
  =====================================================
  OCUPADO
  =====================================================
  */

  [DriverState.OCUPADO]: [

    DriverState.ONLINE,

    DriverState.OFFLINE,
  ],
};

/*
=====================================================
VALIDADOR
=====================================================
*/

export const canDriverTransition = (
  current: string,
  next: string,
): boolean => {

  return (
    DRIVER_ALLOWED_TRANSITIONS[
      current
    ]?.includes(next) ?? false
  );
};
