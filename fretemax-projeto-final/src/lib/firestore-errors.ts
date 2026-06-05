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
  authInfo: Record<string, unknown> | null; // 🔥 Vercel/TS Error resolvido: Tipagem estrita no lugar do "any"
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth.currentUser;
  
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: currentUser ? {
      userId: currentUser.uid,
      email: currentUser.email,
      emailVerified: currentUser.emailVerified,
      isAnonymous: currentUser.isAnonymous,
      tenantId: currentUser.tenantId,
      providerInfo: currentUser.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    } : null,
    operationType,
    path
  };
  
  // Log silencioso para o Painel Admin (O Cliente não vê esse texto feio)
  console.error('[Tracker Fretogo - Erro no Banco]:', errInfo);
  
  // Dispara apenas a mensagem limpa para a tela do usuário
  throw new Error(errInfo.error);
}
