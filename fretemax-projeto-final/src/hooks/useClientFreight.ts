import {
  useState,
  useRef,
  useCallback,
} from 'react';

import {
  clientFreightService,
} from '../services/clientFreightService';

type CreateFreightPayload = {
  freightData: Record<string, any>;

  onSuccess?: (
    freightId: string
  ) => void;

  onError?: (
    message: string
  ) => void;
};

export const useClientFreight =
  () => {
    const [
      loadingPayment,
      setLoadingPayment,
    ] = useState(false);

    const [
      isCancelling,
      setIsCancelling,
    ] = useState(false);

    const actionLock =
      useRef(false);

    /*
    ==========================
    CREATE FREIGHT
    ==========================
    */

    const createFreight =
      useCallback(
        async ({
          freightData,
          onSuccess,
          onError,
        }: CreateFreightPayload) => {
          if (
            actionLock.current
          ) {
            return null;
          }

          actionLock.current =
            true;

          setLoadingPayment(
            true
          );

          try {
            const response =
              await clientFreightService.criarFrete(
                freightData
              );

            if (
              !response.success
            ) {
              onError?.(
                response.error ||
                  'Erro ao criar frete.'
              );

              return null;
            }

            if (
              response.freteId
            ) {
              localStorage.setItem(
                'fretogo_currentorder',
                response.freteId
              );

              onSuccess?.(
                response.freteId
              );
            }

            return (
              response.freteId ||
              null
            );
          } catch (error: any) {
            console.error(
              'Create Freight Error:',
              error
            );

            onError?.(
              error?.message ||
                'Erro ao criar frete.'
            );

            return null;
          } finally {
            setLoadingPayment(
              false
            );

            actionLock.current =
              false;
          }
        },
        []
      );

    /*
    ==========================
    CANCEL FREIGHT
    ==========================
    */

    const cancelFreight =
      useCallback(
        async (
          freightId: string,
          onSuccess?: () => void,
          onError?: (
            message: string
          ) => void
        ) => {
          if (
            !freightId ||
            actionLock.current
          ) {
            return;
          }

          actionLock.current =
            true;

          setIsCancelling(
            true
          );

          try {
            const success =
              await clientFreightService.cancelarFrete(
                freightId
              );

            if (!success) {
              onError?.(
                'Erro ao cancelar frete.'
              );

              return;
            }

            localStorage.removeItem(
              'fretogo_currentorder'
            );

            onSuccess?.();
          } catch (error: any) {
            console.error(
              'Cancel Freight Error:',
              error
            );

            onError?.(
              error?.message ||
                'Erro ao cancelar frete.'
            );
          } finally {
            setIsCancelling(
              false
            );

            actionLock.current =
              false;
          }
        },
        []
      );

    return {
      loadingPayment,
      isCancelling,
      createFreight,
      cancelFreight,
    };
  };
