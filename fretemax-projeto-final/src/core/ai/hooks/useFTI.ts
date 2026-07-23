// FTI - Hook Principal de Integração
// Única ponte autorizada entre as telas do app (React) e o Motor da IA

import { useState } from 'react';
import { IAContext } from '../types/ia.types';
import { routeIntent } from '../engine/ia.router';

export const useFTI = () => {
  const [isThinking, setIsThinking] = useState(false);

  const askFTI = async (prompt: string, context: IAContext) => {
    setIsThinking(true);
    
    try {
      const response = await routeIntent(prompt, context);
      setIsThinking(false);
      return response;
    } catch (error) {
      setIsThinking(false);
      return { status: 'error', message: 'Falha de comunicação com a matriz FTI.' };
    }
  };

  return {
    askFTI,
    isThinking,
  };
};
