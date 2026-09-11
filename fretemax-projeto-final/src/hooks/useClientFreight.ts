// =========================================================
// NOME DO ARQUIVO: src/hooks/useClientFreight.ts
// CTO-Log: Refinamento de Hook (Bloco 3 / FASE 3).
// Evolução: proteção de concorrência, callbacks, unmount e persistência local.
// =========================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { clientFreightService } from '../services/clientFreightService';

type CreateFreightPayload = {
  freightData: Record<string, any>;
  onSuccess?: (freightId: string) => void;
  onError?: (message: string) => void;
};

const ORDER_STORAGE_KEYS = ['fretogo_current_order', 'fretogo_currentorder'] as const;

const normalizeErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const candidate = error as { code?: unknown; message?: unknown };
    if (typeof candidate.code === 'string' && candidate.code.trim()) return candidate.code;
    if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
  }
  return fallback;
};

const invokeSafely = (callback: (() => void) | undefined, label: string) => {
  if (!callback) return;
  try {
    callback();
  } catch (error) {
    console.error(`[HOOK] ${label} CALLBACK ERROR:`, error);
  }
};

const invokeErrorSafely = (callback: ((message: string) => void) | undefined, message: string) => {
  if (!callback) return;
  try {
    callback(message);
  } catch (error) {
    console.error('[HOOK] ERROR CALLBACK ERROR:', error);
  }
};

const hasFiniteCoordinates = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  const coords = value as { lat?: unknown; lng?: unknown };
  return Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lng));
};

const isValidFreightPayload = (freightData: Record<string, any>): boolean => {
  return Boolean(
    freightData &&
    typeof freightData.clienteId === 'string' &&
    freightData.clienteId.trim() &&
    typeof freightData.categoria === 'string' &&
    freightData.categoria.trim() &&
    hasFiniteCoordinates(freightData.origem) &&
    hasFiniteCoordinates(freightData.destino)
  );
};

const persistOrderId = (freightId: string) => {
  if (typeof window === 'undefined') return;
  try {
    ORDER_STORAGE_KEYS.forEach(key => window.localStorage.setItem(key, freightId));
  } catch (error) {
    console.warn('[HOOK] Não foi possível persistir o identificador local da operação:', error);
  }
};

const removePersistedOrderId = (freightId: string) => {
  if (typeof window === 'undefined') return;
  try {
    ORDER_STORAGE_KEYS.forEach(key => {
      if (window.localStorage.getItem(key) === freightId) {
        window.localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('[HOOK] Não foi possível limpar o identificador local da operação:', error);
  }
};

export const useClientFreight = () => {
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const actionLock = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
  =========================================================
  CREATE FREIGHT (CONEXÃO BLINDADA)
  =========================================================
  */
  const createFreight = useCallback(async ({ freightData, onSuccess, onError }: CreateFreightPayload): Promise<string | null> => {
    if (actionLock.current) {
      invokeErrorSafely(onError, 'OPERACAO_EM_PROCESSAMENTO');
      return null;
    }

    if (!isValidFreightPayload(freightData)) {
      invokeErrorSafely(onError, 'DADOS_DO_FRETE_INVALIDOS');
      return null;
    }

    actionLock.current = true;
    if (mountedRef.current) setLoadingPayment(true);

    try {
      const response = await clientFreightService.criarFrete(freightData as any);

      if (!response?.success) {
        invokeErrorSafely(onError, normalizeErrorMessage(response?.error, 'Erro ao processar a cotação logística.'));
        return null;
      }

      const freightId = typeof response.freteId === 'string' ? response.freteId.trim() : '';
      if (!freightId) {
        invokeErrorSafely(onError, 'RESPOSTA_INVALIDA_CRIACAO_FRETE');
        return null;
      }

      persistOrderId(freightId);
      if (mountedRef.current) {
        invokeSafely(() => onSuccess?.(freightId), 'SUCCESS');
      }
      return freightId;
    } catch (error: unknown) {
      console.error('[HOOK] CREATE FREIGHT ERROR:', error);
      if (mountedRef.current) {
        invokeErrorSafely(onError, normalizeErrorMessage(error, 'Falha de comunicação com a central.'));
      }
      return null;
    } finally {
      actionLock.current = false;
      if (mountedRef.current) setLoadingPayment(false);
    }
  }, []);

  /*
  =========================================================
  CANCEL FREIGHT (SEGURANÇA SERVER-SIDE)
  =========================================================
  */
  const cancelFreight = useCallback(async (freightId: string, onSuccess?: () => void, onError?: (message: string) => void) => {
    const normalizedFreightId = typeof freightId === 'string' ? freightId.trim() : '';
    if (!normalizedFreightId) {
      invokeErrorSafely(onError, 'FRETE_ID_INVALIDO');
      return;
    }

    if (actionLock.current) {
      invokeErrorSafely(onError, 'OPERACAO_EM_PROCESSAMENTO');
      return;
    }

    actionLock.current = true;
    if (mountedRef.current) setIsCancelling(true);

    try {
      const response = await clientFreightService.cancelarFrete(normalizedFreightId);

      if (!response?.success) {
        invokeErrorSafely(onError, normalizeErrorMessage(response?.error, 'Erro ao abortar a operação. Contate o suporte.'));
        return;
      }

      removePersistedOrderId(normalizedFreightId);
      if (mountedRef.current) {
        invokeSafely(onSuccess, 'CANCEL SUCCESS');
      }
    } catch (error: unknown) {
      console.error('[HOOK] CANCEL FREIGHT ERROR:', error);
      if (mountedRef.current) {
        invokeErrorSafely(onError, normalizeErrorMessage(error, 'Erro crítico ao cancelar.'));
      }
    } finally {
      actionLock.current = false;
      if (mountedRef.current) setIsCancelling(false);
    }
  }, []);

  return {
    loadingPayment,
    isCancelling,
    createFreight,
    cancelFreight,
  };
};
