// FTI - Gestão de Contexto e Memória Temporária
// Mantém o histórico de mensagens para a IA não perder o fio da meada

import { IARequest } from '../types/ia.types';

// Simulando um cache de memória na sessão
const sessionMemory = new Map<string, any[]>();

export const buildContextWindow = (userId: string, newRequest: IARequest) => {
  // Puxa o histórico do usuário
  const history = sessionMemory.get(userId) || [];
  
  // Adiciona a nova mensagem
  history.push({ role: 'user', content: newRequest.prompt });
  
  // Mantém apenas as últimas 10 interações para economizar tokens (Gestão de Custo)
  if (history.length > 10) {
    history.shift();
  }
  
  sessionMemory.set(userId, history);
  
  return history;
};
