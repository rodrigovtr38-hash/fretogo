import {
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  eventBusService,
  AppEvents,
} from './eventBusService';

import {
  firebaseRealtimeService,
} from './firebaseRealtimeService';

import {
  AppTripState,
} from '../state/tripStateMachine';

type PaymentPayload = {
  valor: number;
  descricao: string;
  clienteId: string;
  freteId: string;
};

type PaymentResponse = {
  success: boolean;
  transactionId?: string;
  error?: string;
};

class PaymentService {
  private readonly TIMEOUT =
    15000;

  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ) {
    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => {
        controller.abort();
      },
      this.TIMEOUT
    );

    try {
      const response = await fetch(
        url,
        {
          ...options,
          signal:
            controller.signal,
        }
      );

      clearTimeout(timeout);

      return response;
    } catch (error) {
      clearTimeout(timeout);

      throw error;
    }
  }

  async processarPagamento(
    payload: PaymentPayload
  ): Promise<PaymentResponse> {
    try {
      const response =
        await this.fetchWithTimeout(
          '/api/pagamento',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              payload
            ),
          }
        );

      if (!response.ok) {
        eventBusService.emit(
          AppEvents.PAYMENT_FAILED,
          payload
        );

        return {
          success: false,
          error:
            'ERRO_PAGAMENTO',
        };
      }

      const data =
        await response.json();

      await this.sincronizarPagamento(
        payload.freteId,
        data.transactionId
      );

      eventBusService.emit(
        AppEvents.PAYMENT_APPROVED,
        {
          freteId:
            payload.freteId,

          transactionId:
            data.transactionId,
        }
      );

      return {
        success: true,

        transactionId:
          data.transactionId,
      };
    } catch (error) {
      console.error(
        'PAYMENT ERROR:',
        error
      );

      eventBusService.emit(
        AppEvents.PAYMENT_FAILED,
        payload
      );

      return {
        success: false,
        error:
          'FALHA_PROCESSAMENTO',
      };
    }
  }

  private async sincronizarPagamento(
    freteId: string,
    transactionId: string
  ) {
    try {
      const freteRef = doc(
        db,
        'fretes',
        freteId
      );

      await updateDoc(
        freteRef,
        {
          pagamentoStatus:
            'aprovado',

          transactionId,

          status:
            AppTripState.PROCURANDO_MOTORISTA,

          updatedAt:
            serverTimestamp(),
        }
      );

      await firebaseRealtimeService.updateTripRealtime(
        freteId,
        {
          pagamentoStatus:
            'aprovado',

          transactionId,

          status:
            AppTripState.PROCURANDO_MOTORISTA,
        }
      );
    } catch (error) {
      console.error(
        'SYNC PAYMENT ERROR:',
        error
      );
    }
  }

  async processarReembolso(
    transactionId: string,
    freteId?: string
  ): Promise<boolean> {
    try {
      const response =
        await this.fetchWithTimeout(
          '/api/reembolso',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              transactionId,
            }),
          }
        );

      if (!response.ok) {
        return false;
      }

      if (freteId) {
        const freteRef = doc(
          db,
          'fretes',
          freteId
        );

        await updateDoc(
          freteRef,
          {
            pagamentoStatus:
              'reembolsado',

            updatedAt:
              serverTimestamp(),
          }
        );
      }

      eventBusService.emit(
        AppEvents.PAYMENT_REFUNDED,
        {
          transactionId,
          freteId,
        }
      );

      return true;
    } catch (error) {
      console.error(
        'REFUND ERROR:',
        error
      );

      return false;
    }
  }
}

export const paymentService =
  new PaymentService();
