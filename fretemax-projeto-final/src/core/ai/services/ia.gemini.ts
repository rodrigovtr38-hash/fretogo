// ============================================================================
// ARQUIVO: src/core/ai/services/ia.gemini.ts
// CTO-Log: FASE 4 - Inteligência Segura
// Status: Zero-Trust ativado. O Frontend perdeu acesso direto à API do Google 
// e à API Key. Toda a conversa passa pela Cloud Function 'askFTI'.
// ============================================================================

import { getFunctions, httpsCallable } from 'firebase/functions';
import { IAResponse } from '../types/ia.responses';
import { parseAIResponse } from '../engine/ia.parser';

/**
 * Ponto único e exclusivo de contato com o motor neural no Backend.
 */
export const callGeminiAPI = async (
  prompt: string, 
  contextData: any
): Promise<IAResponse> => {
  console.log(`[FTI Services] Conectando ao cluster seguro na Nuvem (Firebase Functions)...`);

  try {
    const functions = getFunctions();
    const askFTI = httpsCallable(functions, 'askFTI');
    
    // O envio das informações puras para o Backend construir o prompt de sistema
    const result = await askFTI({ prompt, context: contextData });
    const data = result.data as any;
    
    const rawText = data?.text || '';
    
    return parseAIResponse(rawText);

  } catch (error) {
    console.error('[FTI Services] Falha de comunicação com o Backend Seguro:', error);

    return {
      status: 'error',
      type: 'error',
      content: 'Não foi possível estabelecer conexão com o motor neural (Backend). Verifique sua rede.',
      actionRequired: false
    };
  }
};
