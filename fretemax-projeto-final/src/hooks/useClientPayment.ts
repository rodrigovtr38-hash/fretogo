import {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  paymentService,
} from '../services/paymentService';

type CreatePixPaymentPayload = {
  amount: number;
  description: string;
  customer: {
    name: string;
    phone: string;
  };
};

export const useClientPayment = () => {
  const [loadingPayment, setLoadingPayment] =
    useState(false);

  const [paymentError, setPaymentError] =
    useState<string | null>(null);

  const [paymentApproved, setPaymentApproved] =
    useState(false);

  const [pixCode, setPixCode] =
    useState<string | null>(null);

  const [paymentId, setPaymentId] =
    useState<string | null>(null);

  const paymentTimeoutRef =
    useRef<NodeJS.Timeout | null>(null);

  const createPixPayment =
    useCallback(
      async (
        payload: CreatePixPaymentPayload
      ) => {
        try {
          setLoadingPayment(true);

          setPaymentError(null);

          setPaymentApproved(false);

          const response =
            await paymentService.createPixPayment(
              payload
            );

          setPixCode(
            response.pixCode
          );

          setPaymentId(
            response.paymentId
          );

          paymentTimeoutRef.current =
            setTimeout(() => {
              setPaymentError(
                'Pagamento expirado.'
              );
            }, 1000 * 60 * 15);

          return response;
        } catch (error: any) {
          console.error(
            'PIX Payment Error:',
            error
          );

          setPaymentError(
            error?.message ||
              'Erro ao gerar PIX.'
          );

          return null;
        } finally {
          setLoadingPayment(false);
        }
      },
      []
    );

  const confirmPayment =
    useCallback(async () => {
      if (!paymentId) {
        return false;
      }

      try {
        const confirmed =
          await paymentService.confirmPayment(
            paymentId
          );

        if (confirmed) {
          setPaymentApproved(
            true
          );

          if (
            paymentTimeoutRef.current
          ) {
            clearTimeout(
              paymentTimeoutRef.current
            );
          }
        }

        return confirmed;
      } catch (error) {
        console.error(
          'Confirm Payment Error:',
          error
        );

        return false;
      }
    }, [paymentId]);

  const resetPayment =
    useCallback(() => {
      setPixCode(null);

      setPaymentId(null);

      setPaymentApproved(false);

      setPaymentError(null);

      if (
        paymentTimeoutRef.current
      ) {
        clearTimeout(
          paymentTimeoutRef.current
        );
      }
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
