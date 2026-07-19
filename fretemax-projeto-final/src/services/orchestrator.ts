// =========================================================
// NOME DO ARQUIVO: src/services/orchestrator.ts
// CTO-Log: Arquivo Lápide (Stub). Auditoria LOTE 5.
// Status: Lógica migrada com sucesso para dispatchQueueService.ts
// =========================================================

export interface MatchCriteria {
  categoria: string;
  origemLat: number;
  origemLng: number;
  destinoLat: number;
  destinoLng: number;
}

export const buildIntelligentQueue = async (_criteria: MatchCriteria): Promise<string[]> => {
  console.warn("[CTO-Log] buildIntelligentQueue obsoleto chamado. Usar DispatchQueueService.");
  return [];
};

export const executeDispatch = async (_freteId: string, _freteData: MatchCriteria) => {
  console.warn("[CTO-Log] executeDispatch obsoleto chamado. Usar DispatchQueueService.");
  return false;
};

export const triggerRedispatch = async (_freteId: string, _motoristaIdFalho: string) => {
  console.warn("[CTO-Log] triggerRedispatch obsoleto chamado. Usar DispatchQueueService.");
  return false;
};
