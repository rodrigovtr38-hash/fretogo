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

const PAYMENT_TIMEOUT = 1000 * 60 * 15; 

export const useClientPayment = () => {
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  
  // 🔥 CTO FIX: Tipagem robusta para compatibilidade Web/NodeJS
  const paymentTimeoutRef = useRef<any>(null);

  const createPixPayment = useCallback(async (payload: CreatePixPaymentPayload) => {
    try {
      setLoadingPayment(true);
      setPaymentError(null);
      setPaymentApproved(false);

      const response = await paymentService.processarPagamento({
        valor: payload.amount,
        descricao: payload.description,
        clienteId: payload.customer.name, 
        freteId: '' // Placeholder
      });

      if (!response.success) throw new Error(response.error);

      setPaymentId(response.transactionId || null);

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

  const confirmPayment = useCallback(async () => {
    if (!paymentId) return false;
    try {
      // Logic would be linked to the webhook confirmation
      setPaymentApproved(true);
      if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
      return true;
    } catch (error) {
      console.error('CONFIRM PAYMENT ERROR:', error);
      return false;
    }
  }, [paymentId]);

  const resetPayment = useCallback(() => {
    setPixCode(null);
    setPaymentId(null);
    setPaymentApproved(false);
    setPaymentError(null);
    if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
    };
  }, []);

  return { loadingPayment, paymentError, paymentApproved, pixCode, paymentId, createPixPayment, confirmPayment, resetPayment };
};
