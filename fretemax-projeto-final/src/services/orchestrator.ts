// src/services/orchestrator.ts
// 🔥 ARQUIVO DEPRECIADO: Lógica migrada com sucesso para dispatchQueueService.ts
// Mantido apenas como stub para evitar quebras de importações residuais antigas.

export interface MatchCriteria {
  categoria: string;
  origemLat: number;
  origemLng: number;
  destinoLat: number;
  destinoLng: number;
}

export const buildIntelligentQueue = async (_criteria: MatchCriteria): Promise<string[]> => {
  console.warn("buildIntelligentQueue obsoleto chamado. Usar DispatchQueueService.");
  return [];
};

export const executeDispatch = async (_freteId: string, _freteData: MatchCriteria) => {
  console.warn("executeDispatch obsoleto chamado. Usar DispatchQueueService.");
  return false;
};

export const triggerRedispatch = async (_freteId: string, _motoristaIdFalho: string) => {
  console.warn("triggerRedispatch obsoleto chamado. Usar DispatchQueueService.");
  return false;
};
