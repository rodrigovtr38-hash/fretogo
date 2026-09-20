// ============================================================================
// ARQUIVO: src/core/ai/services/ia.gemini.ts
// CTO-Log: Lote 08 - Inteligência Segura (Zero-Trust)
// Status: O Frontend atua apenas como ponte. A API Key e a composição 
// do prompt foram transferidas 100% para a Cloud Function 'askFTI'.
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
    
    // Envio estrito do contexto limpo para o Backend. 
    // O Backend construirá o System Prompt injetando as regras secretas.
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
