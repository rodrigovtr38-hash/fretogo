// src/hooks/useClientPayment.ts
// CTO-Log: Corrigido o erro fatal de NodeJS.Timeout. Em ambientes Vite/Navegador, o setTimeout retorna um ID numérico. Usado ReturnType para inferência dinâmica e blindada.

import { useCallback, useEffect, useRef, useState } from 'react';
import { paymentService } from '../services/paymentService';

type CreatePixPaymentPayload = {
  amount: number;
  description: string;
  customer: {
    name: string;
    phone: string;
  };
};

const PAYMENT_TIMEOUT = 1000 * 60 * 15; // 15 Minutos

export const useClientPayment = () => {
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  
  // 🔥 CTO FIX: Inferência correta para o Browser no lugar de NodeJS.Timeout
  const paymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* =========================================================
     CREATE PIX
  ========================================================= */
  const createPixPayment = useCallback(async (payload: CreatePixPaymentPayload) => {
    try {
      setLoadingPayment(true);
      setPaymentError(null);
      setPaymentApproved(false);

      const response = await paymentService.createPixPayment(payload);

      setPixCode(response.pixCode);
      setPaymentId(response.paymentId);

      paymentTimeoutRef.current = setTimeout(() => {
        setPaymentError('Pagamento expirado.');
      }, PAYMENT_TIMEOUT);

      return response;
    } catch (error: any) {
      console.error('PIX ERROR:', error);
      setPaymentError(error?.message || 'Erro PIX.');
      return null;
    } finally {
      setLoadingPayment(false);
    }
  }, []);

  /* =========================================================
     CONFIRM
  ========================================================= */
  const confirmPayment = useCallback(async () => {
    if (!paymentId) {
      return false;
    }

    try {
      const confirmed = await paymentService.confirmPayment(paymentId);

      if (confirmed) {
        setPaymentApproved(true);
        if (paymentTimeoutRef.current) {
          clearTimeout(paymentTimeoutRef.current);
        }
      }
      return confirmed;
    } catch (error) {
      console.error('CONFIRM PAYMENT ERROR:', error);
      return false;
    }
  }, [paymentId]);

  /* =========================================================
     RESET
  ========================================================= */
  const resetPayment = useCallback(() => {
    setPixCode(null);
    setPaymentId(null);
    setPaymentApproved(false);
    setPaymentError(null);

    if (paymentTimeoutRef.current) {
      clearTimeout(paymentTimeoutRef.current);
    }
  }, []);

  /* =========================================================
     CLEANUP
  ========================================================= */
  useEffect(() => {
    return () => {
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
      }
    };
  }, []);

  return {
    loadingPayment,
    paymentError,
    paymentApproved,
    pixCode,
    paymentId,
    createPixPayment,
    confirmPayment,
    resetPayment,
  };
};
