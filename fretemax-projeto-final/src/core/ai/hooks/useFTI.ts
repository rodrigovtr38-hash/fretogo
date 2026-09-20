// ============================================================================
// ARQUIVO: src/core/ai/hooks/useFTI.ts
// CTO-Log: FASE 4 - Migração Backend
// Status: Validado e Seguro. Atua apenas como ponte.
// ============================================================================

import { useState, useCallback } from 'react';
import { callGeminiAPI } from '../services/ia.gemini';
import { ftiMemory } from '../memory/ia.memory';
import { IAContext } from '../types/ia.context';
import { validateAndParseJSON } from '../utils/ia.validator';

export const useFTI = (context: IAContext) => {
  // Estado que controla se a IA está "pensando", útil para travar botões na interface
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Função principal que a interface (UI) chama quando o usuário/motorista digita algo.
   */
  const interactWithAI = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return null;
    
    setIsProcessing(true);

    try {
      // 1. Salva a mensagem do usuário na memória RAM local do Chat
      ftiMemory.addMessage(context.userId, 'user', userMessage);

      // 2. Dispara a requisição para o motor neural seguro (Backend - Cloud Functions).
      // A persistência da resposta sistêmica ocorre lá no servidor.
      const rawResponse = await callGeminiAPI(userMessage, context);

      // 3. Escudo ativado: Limpa sujeira de formatação e valida o contrato JSON obrigatório
      const safeData = validateAndParseJSON(rawResponse.content);

      // 4. Salva a resposta limpa na memória RAM (para o chat flutuante, não banco de dados)
      ftiMemory.addMessage(context.userId, 'model', safeData.content);

      // 5. Devolve o JSON perfeito para o Front-End
      return safeData;

    } catch (error) {
      console.error('[FTI Hook] Colapso na requisição:', error);
      
      // Fallback de segurança impenetrável para não estourar a tela do motorista
      return {
        status: 'error',
        type: 'support',
        content: 'Estou recebendo um volume altíssimo de tráfego na Torre de Controle neste segundo. Tente enviar novamente.',
        actionRequired: false
      };
    } finally {
      setIsProcessing(false);
    }
  }, [context]);

  return {
    interactWithAI,
    isProcessing
  };
};
