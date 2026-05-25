// src/services/paymentService.ts

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
        return {
          success: false,
          error:
            'ERRO_PAGAMENTO',
        };
      }

      const data =
        await response.json();

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

      return {
        success: false,
        error:
          'FALHA_PROCESSAMENTO',
      };
    }
  }

  async processarReembolso(
    transactionId: string
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

      return response.ok;
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
