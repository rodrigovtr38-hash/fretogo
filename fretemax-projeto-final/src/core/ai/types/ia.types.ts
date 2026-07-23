// FTI - Tipagens Globais Base
// Contratos rigorosos de dados que a IA vai respeitar

export type IAUserRole = 'motorista' | 'empresa' | 'admin';

export interface IAContext {
  userId: string;
  role: IAUserRole;
  currentScreen: string;
  activeFreightId?: string | null;
  timestamp: number;
}

export interface IAResponse {
  status: 'success' | 'error' | 'fallback';
  message: string;
  actionSuggested?: string;
}
