// FTI - Telemetria e Métricas
// Monitoramento de custo, consumo de tokens e performance da IA

export interface AIMetric {
  operation: string;
  tokensUsed: number;
  responseTimeMs: number;
  timestamp: string;
}

export const logAIOperation = (metric: AIMetric) => {
  // O dashboard gerencial puxará esses dados para calcular o ROI da IA
  console.log(`[FTI Telemetry] Op: ${metric.operation} | Tokens: ${metric.tokensUsed} | Latência: ${metric.responseTimeMs}ms`);
  
  // TODO: Conectar com o sistema de logs do Firebase ou Vercel Analytics no futuro
};
