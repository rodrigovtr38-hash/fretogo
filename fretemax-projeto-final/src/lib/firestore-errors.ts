import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: Record<string, unknown> | null;
}

// Dicionário de Engenharia de Vendas/UX: Traduz erros técnicos para linguagem humana
const FIREBASE_ERROR_MAP: Record<string, string> = {
  'permission-denied': 'Acesso negado. Sua sessão pode ter expirado ou você não tem permissão para esta ação.',
  'unavailable': 'Você está sem internet ou o sinal está fraco. O Fretogo sincronizará quando a conexão voltar.',
  'network-request-failed': 'Falha na rede. Verifique seu 4G/Wi-Fi e tente novamente.',
  'not-found': 'Este frete ou registro não existe mais na nossa base.',
  'deadline-exceeded': 'O servidor demorou muito para responder. Tente novamente.',
  'unauthenticated': 'Por favor, faça login novamente para continuar operando.',
};

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth.currentUser;
  const rawErrorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: rawErrorMessage,
    authInfo: currentUser ? {
      userId: currentUser.uid,
      email: currentUser.email,
      isAnonymous: currentUser.isAnonymous,
    } : null,
    operationType,
    path
  };
  
  // Log silencioso e completo para a Torre de Controle (Admin)
  console.error('[Tracker Fretogo - Erro Interno]:', errInfo);
  
  // Mapeamento Inteligente para o Cliente/Motorista
  let userFriendlyMessage = 'Ocorreu um erro inesperado de conexão. Tente novamente.';
  
  // Procura se o erro do Firebase bate com nosso dicionário
  const matchedKey = Object.keys(FIREBASE_ERROR_MAP).find(key => rawErrorMessage.includes(key));
  if (matchedKey) {
    userFriendlyMessage = FIREBASE_ERROR_MAP[matchedKey];
  }
  
  // Dispara apenas a mensagem limpa e profissional para a tela do usuário
  throw new Error(userFriendlyMessage);
}
