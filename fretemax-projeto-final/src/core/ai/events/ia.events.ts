// FTI - Central de Eventos Passivos
// A IA escuta esses eventos para tomar ações proativas sem o usuário pedir

import { IAContext } from '../types/ia.types';

export enum FTIEventType {
  TRIP_CREATED = 'TRIP_CREATED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DRIVER_STUCK = 'DRIVER_STUCK',
  MARKET_OPPORTUNITY = 'MARKET_OPPORTUNITY'
}

export const notifyFTI = async (eventType: FTIEventType, payload: any, context: IAContext) => {
  // A IA avalia o evento silenciosamente
  console.log(`[FTI Sensor] Evento capturado: ${eventType}`, payload);
  
  // Se for um evento crítico (ex: motorista travado), a IA pode decidir intervir
  return { acknowledged: true, requiresAction: false };
};
