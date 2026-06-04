// src/hooks/useClientFreight.ts

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
  const createFreight = useCallback(async ({ freightData, onSuccess, onError }: CreateFreightPayload) => {
    if (actionLock.current) return null;
    actionLock.current = true;
    setLoadingPayment(true);

    try {
      const response = await clientFreightService.criarFrete(freightData);

      if (!response.success) {
        onError?.(response.error || 'Erro ao processar a cotação logística.');
        return null;
      }

      if (response.freteId) {
        // Salva a sessão para evitar perda de carrinho (cliente fechou o app sem querer)
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
  CANCEL FREIGHT (SEGURANÇA DE REEMBOLSO)
  =========================================================
  */
  const cancelFreight = useCallback(async (freightId: string, onSuccess?: () => void, onError?: (message: string) => void) => {
    if (!freightId || actionLock.current) return;
    actionLock.current = true;
    setIsCancelling(true);

    try {
      const success = await clientFreightService.cancelarFrete(freightId);

      if (!success) {
        onError?.('Erro ao abortar a operação. Contate o suporte.');
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
