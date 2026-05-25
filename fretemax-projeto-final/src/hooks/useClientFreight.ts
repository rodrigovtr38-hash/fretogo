import {
  useState,
  useRef,
  useCallback,
} from 'react';

import {
  addDoc,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  AppTripState,
  isFinalState,
} from '../state/tripStateMachine';

type CreateFreightPayload = {
  freightData: Record<string, any>;
  onSuccess?: (freightId: string) => void;
  onError?: (message: string) => void;
};

export const useClientFreight = () => {
  const [loadingPayment, setLoadingPayment] =
    useState(false);

  const [isCancelling, setIsCancelling] =
    useState(false);

  const actionLock = useRef(false);

  const createFreight = useCallback(
    async ({
      freightData,
      onSuccess,
      onError,
    }: CreateFreightPayload) => {
      if (actionLock.current) {
        return null;
      }

      actionLock.current = true;

      setLoadingPayment(true);

      try {
        const docRef = await addDoc(
          collection(db, 'fretes'),
          {
            ...freightData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        localStorage.setItem(
          'fretogo_currentorder',
          docRef.id
        );

        onSuccess?.(docRef.id);

        return docRef.id;
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
        setLoadingPayment(false);

        actionLock.current = false;
      }
    },
    []
  );

  const cancelFreight = useCallback(
    async (
      freightId: string,
      onSuccess?: () => void,
      onError?: (message: string) => void
    ) => {
      if (
        !freightId ||
        actionLock.current
      ) {
        return;
      }

      actionLock.current = true;

      setIsCancelling(true);

      try {
        const freightRef = doc(
          db,
          'fretes',
          freightId
        );

        await runTransaction(
          db,
          async transaction => {
            const snapshot =
              await transaction.get(
                freightRef
              );

            if (!snapshot.exists()) {
              throw new Error(
                'FREIGHT_NOT_FOUND'
              );
            }

            const data =
              snapshot.data();

            if (
              isFinalState(
                data.status
              )
            ) {
              throw new Error(
                'FREIGHT_ALREADY_FINISHED'
              );
            }

            transaction.update(
              freightRef,
              {
                status:
                  AppTripState.CANCELADO,
                canceladoEm:
                  serverTimestamp(),
                canceladoPor:
                  'cliente',
                updatedAt:
                  serverTimestamp(),
                motoristaId: null,
                motoristaNome: null,
                motoristaZap: null,
                filaMatching: [],
                activeOffers: [],
                redispatchQueue: [],
              }
            );
          }
        );

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
        setIsCancelling(false);

        actionLock.current = false;
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
