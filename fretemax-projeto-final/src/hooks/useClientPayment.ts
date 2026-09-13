// =========================================================
// NOME DO ARQUIVO: src/hooks/useClientPayment.ts
// CTO-Log: Refinamento de Hook (Bloco 3).
// Nota Arquitetural: Na arquitetura atual, Cliente.tsx executa o bypass direto à API. Este hook é mantido hígido para integrações modulares futuras (PWA/Mobile).
// EXECUÇÃO BLOCO 10: Injeção obrigatória do freteId real no payload para viabilizar testes Sandbox e pagamentos legítimos.
// =========================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { paymentService } from '../services/paymentService';

type CreatePixPaymentPayload = {
  amount: number;
  description: string;
  customer: {
    name: string;
    phone: string;
  };
  freteId: string; // 🔥 CTO FIX: Passa a ser obrigatório receber o freteId de quem chama o hook.
  returnUrl?: string; // 🔥 CTO FIX: Injeção da URL de retorno para garantir o redirecionamento após o PIX.
};

const PAYMENT_TIMEOUT = 1000 * 60 * 15; 

export const useClientPayment = () => {
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  
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
        freteId: payload.freteId, // 🔥 CTO FIX: Injeção do dado dinâmico. Fim do "chumbamento" vazio.
        returnUrl: payload.returnUrl // 🔥 CTO FIX: Repasse da URL de callback para o webhook.
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
