// =========================================================
// NOME DO ARQUIVO: src/hooks/useClientFreight.ts
// CTO-Log: Refinamento de Hook - Validação Flexível de Coordenadas e Categorias para evitar falsos positivos locais.
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

// 🔥 CTO FIX: Reconhece coords agrupadas ({lat, lng}) ou planas (origemLat, origemLng) para não dar falso positivo.
const hasFiniteCoordinates = (value: unknown, flatLat?: unknown, flatLng?: unknown): boolean => {
  if (Number.isFinite(Number(flatLat)) && Number.isFinite(Number(flatLng))) return true;
  if (!value || typeof value !== 'object') return false;
  const coords = value as { lat?: unknown; lng?: unknown };
  return Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lng));
};

const validateFreightPayload = (freightData: Record<string, any>): string | null => {
  if (!freightData) return "Payload vazio enviado ao hook.";
  if (!freightData.clienteId) return "ID do cliente (clienteId) está ausente.";
  
  const categoriaOuVeiculo = freightData.categoria || freightData.veiculo;
  if (!categoriaOuVeiculo) return "Categoria ou Veículo ausente no payload.";
  
  if (!hasFiniteCoordinates(freightData.origem, freightData.origemLat, freightData.origemLng)) {
      return "Coordenadas de origem inválidas ou ausentes.";
  }
  if (!hasFiniteCoordinates(freightData.destino, freightData.destinoLat, freightData.destinoLng)) {
      return "Coordenadas de destino inválidas ou ausentes.";
  }
  
  return null; // Null significa que passou em todas as checagens
};

const persistOrderId = (freightId: string) => {
  if (typeof window === 'undefined') return;
  try {
    ORDER_STORAGE_KEYS.forEach(key => window.localStorage.setItem(key, freightId));
  } catch (error) {
    console.warn('[HOOK] Não foi possível persistir o identificador local:', error);
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
    console.warn('[HOOK] Não foi possível limpar o identificador local:', error);
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

  const createFreight = useCallback(async ({ freightData, onSuccess, onError }: CreateFreightPayload): Promise<string | null> => {
    if (actionLock.current) {
      if (onError) onError('OPERACAO_EM_PROCESSAMENTO');
      return null;
    }

    const validationErrorMsg = validateFreightPayload(freightData);
    if (validationErrorMsg) {
      console.error("[HOOK - CTO LOG] Payload barrado:", validationErrorMsg, freightData);
      if (onError) onError(`Bloqueio de Dados: ${validationErrorMsg}`);
      return null;
    }

    actionLock.current = true;
    if (mountedRef.current) setLoadingPayment(true);

    try {
      const response = await clientFreightService.criarFrete(freightData as any);

      if (!response?.success) {
        const errorMsg = normalizeErrorMessage(response?.error, 'O servidor rejeitou a cotação. Verifique permissões do Firebase.');
        if (onError) onError(errorMsg);
        return null;
      }

      const freightId = typeof response.freteId === 'string' ? response.freteId.trim() : '';
      if (!freightId) {
        if (onError) onError('RESPOSTA_INVALIDA_CRIACAO_FRETE: Servidor não devolveu o ID.');
        return null;
      }

      persistOrderId(freightId);
      if (mountedRef.current && onSuccess) onSuccess(freightId);
      
      return freightId;
    } catch (error: unknown) {
      console.error('[HOOK] CREATE FREIGHT ERROR:', error);
      if (mountedRef.current && onError) {
        onError(normalizeErrorMessage(error, 'Falha crítica de comunicação com o servidor.'));
      }
      return null;
    } finally {
      actionLock.current = false;
      if (mountedRef.current) setLoadingPayment(false);
    }
  }, []);

  const cancelFreight = useCallback(async (freightId: string, onSuccess?: () => void, onError?: (message: string) => void) => {
    const normalizedFreightId = typeof freightId === 'string' ? freightId.trim() : '';
    
    if (!normalizedFreightId) {
      if (onError) onError('FRETE_ID_INVALIDO');
      return;
    }

    if (actionLock.current) {
      if (onError) onError('OPERACAO_EM_PROCESSAMENTO');
      return;
    }

    actionLock.current = true;
    if (mountedRef.current) setIsCancelling(true);

    try {
      const response = await clientFreightService.cancelarFrete(normalizedFreightId);

      if (!response?.success) {
        if (onError) onError(normalizeErrorMessage(response?.error, 'Erro ao abortar a operação no servidor.'));
        return;
      }

      removePersistedOrderId(normalizedFreightId);
      if (mountedRef.current && onSuccess) onSuccess();
      
    } catch (error: unknown) {
      console.error('[HOOK] CANCEL FREIGHT ERROR:', error);
      if (mountedRef.current && onError) {
        onError(normalizeErrorMessage(error, 'Erro crítico ao cancelar a operação.'));
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
