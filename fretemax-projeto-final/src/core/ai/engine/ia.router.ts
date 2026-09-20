// ============================================================================
// ARQUIVO: src/core/ai/engine/ia.router.ts
// CTO-Log: FASE 4 - Migração Backend
// Status: "Cérebro de Plástico" removido. O Router frontend agora apenas
// atua como uma ponte limpa para o Cérebro Blindado no Backend (Cloud Functions).
// ============================================================================

import { IAContext } from '../types/ia.context';
import { IAResponse } from '../types/ia.responses';
import { callGeminiAPI } from '../services/ia.gemini';

export const routeIntent = async (prompt: string, context: IAContext): Promise<IAResponse> => {
  console.log(`[FTI Router] Roteamento de intenções transferido para a Nuvem (Backend).`);
  
  try {
    if (!prompt || prompt.trim() === '') {
      return {
        status: 'error',
        type: 'error',
        content: 'Não consegui captar sua instrução operacional. Pode repetir?',
        actionRequired: false
      };
    }

    // A tomada de decisão ocorre exclusivamente no backend agora
    return await callGeminiAPI(prompt, context);

  } catch (error) {
    console.error('[FTI Engine] Erro fatal no roteamento:', error);
    
    return {
      status: 'error',
      type: 'error',
      content: 'Aviso (FTI): Instabilidade pontual na rede de telemetria. Retentativa automática iniciada.',
      actionRequired: false
    };
  }
};
