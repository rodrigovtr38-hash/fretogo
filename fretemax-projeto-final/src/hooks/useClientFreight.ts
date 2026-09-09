// =========================================================
// NOME DO ARQUIVO: src/hooks/useClientFreight.ts
// CTO-Log: Refinamento de Hook (Bloco 3 / FASE 3).
// Status: Importações e Lock Actions 100% seguros e validados.
// =========================================================

import { useCallback, useRef, useState } from 'react';
import { clientFreightService } from '../services/clientFreightService';

type CreateFreightPayload = {
  freightData: Record<string, any>;
  onSuccess?: (freightId: string) => void;
  onError?: (message: string) => void;
};

export const useClientFreight = () => {
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const actionLock = useRef(false);

  /*
  =========================================================
  CREATE FREIGHT (CONEXÃO BLINDADA)
  =========================================================
  */
  const createFreight = useCallback(async ({ freightData, onSuccess, onError }: CreateFreightPayload): Promise<string | null> => {
    if (actionLock.current) return null;
    actionLock.current = true;
    setLoadingPayment(true);

    try {
      const response = await clientFreightService.criarFrete(freightData as any);

      if (!response.success) {
        onError?.(response.error || 'Erro ao processar a cotação logística.');
        return null;
      }

      if (response.freteId) {
        localStorage.setItem('fretogo_currentorder', response.freteId);
        onSuccess?.(response.freteId);
      }

      return response.freteId || null;
    } catch (error: any) {
      console.error('[HOOK] CREATE FREIGHT ERROR:', error);
      onError?.(error?.message || 'Falha de comunicação com a central.');
      return null;
    } finally {
      setLoadingPayment(false);
      actionLock.current = false;
    }
  }, []);

  /*
  =========================================================
  CANCEL FREIGHT (SEGURANÇA SERVER-SIDE)
  =========================================================
  */
  const cancelFreight = useCallback(async (freightId: string, onSuccess?: () => void, onError?: (message: string) => void) => {
    if (!freightId || actionLock.current) return;
    actionLock.current = true;
    setIsCancelling(true);

    try {
      const response = await clientFreightService.cancelarFrete(freightId);

      if (!response.success) {
        onError?.(response.error || 'Erro ao abortar a operação. Contate o suporte.');
        return;
      }

      localStorage.removeItem('fretogo_currentorder');
      onSuccess?.();
    } catch (error: any) {
      console.error('[HOOK] CANCEL FREIGHT ERROR:', error);
      onError?.(error?.message || 'Erro crítico ao cancelar.');
    } finally {
      setIsCancelling(false);
      actionLock.current = false;
    }
  }, []);

  return {
    loadingPayment,
    isCancelling,
    createFreight,
    cancelFreight,
  };
};
