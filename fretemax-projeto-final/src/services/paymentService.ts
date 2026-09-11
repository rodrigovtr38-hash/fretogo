// =========================================================
// NOME DO ARQUIVO: src/services/paymentService.ts
// CTO-Log: Fase 3 - Homologação Operacional Distribuída.
// Evolução: ownership, validação monetária, resposta segura e webhook autoritativo.
// =========================================================

import {
  doc, getDoc, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { eventBusService, AppEvents } from './eventBusService';

type PaymentPayload = {
  valor: number;
  descricao: string;
  clienteId: string;
  freteId: string;
};

type PaymentResponse = {
  success: boolean;
  transactionId?: string;
  url?: string;
  error?: string;
};

type CheckoutResponse = {
  url?: unknown;
  transactionId?: unknown;
  id?: unknown;
  error?: unknown;
};

const AUTHORIZED_SANDBOX_ACCOUNTS = new Set([
  'contato@fretogo.com.br',
  'rodrigovtr38@gmail.com',
]);

const ADMIN_UID = 'uV1yeZoGfhZTRWDVL1CnMW6b6NY2';
const ELIGIBLE_PAYMENT_STATUSES = new Set(['aguardando_pagamento', 'reservado_aguardando_pagamento']);
const MERCADO_PAGO_HOSTS = new Set(['mercadopago.com', 'mercadopago.com.br']);

const parseCheckoutUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return null;

    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = [...MERCADO_PAGO_HOSTS].some(host => hostname === host || hostname.endsWith(`.${host}`));
    return isAllowed ? parsed.toString() : null;
  } catch {
    return null;
  }
};

class PaymentService {
  private readonly TIMEOUT = 15000;
  private readonly inflightPayments = new Map<string, Promise<PaymentResponse>>();

  private async fetchWithTimeout(url: string, options: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.TIMEOUT);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseJsonResponse(response: Response): Promise<CheckoutResponse> {
    try {
      const data = await response.json();
      return data && typeof data === 'object' ? data as CheckoutResponse : {};
    } catch {
      return {};
    }
  }

  private async processarPagamentoInterno(payload: PaymentPayload): Promise<PaymentResponse> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'USUARIO_NAO_AUTENTICADO' };
      }

      if (!payload || typeof payload.freteId !== 'string' || !payload.freteId.trim()) {
        return { success: false, error: 'FRETE_ID_INVALIDO' };
      }

      if (payload.clienteId !== currentUser.uid) {
        return { success: false, error: 'USUARIO_NAO_AUTORIZADO' };
      }

      const freteId = payload.freteId.trim();
      const freteRef = doc(db, 'fretes', freteId);
      const freteSnap = await getDoc(freteRef);

      if (!freteSnap.exists()) {
        return { success: false, error: 'FRETE_NAO_ENCONTRADO' };
      }

      const freteData = freteSnap.data();
      if (freteData.clienteId !== currentUser.uid) {
        return { success: false, error: 'USUARIO_NAO_AUTORIZADO' };
      }

      if (!ELIGIBLE_PAYMENT_STATUSES.has(String(freteData.status || ''))) {
        return { success: false, error: 'STATUS_NAO_PERMITE_PAGAMENTO' };
      }

      const valorEsperado = Number(freteData.valorTotal ?? freteData.valorBruto ?? freteData.valorFreteBruto);
      const valorInformado = Number(payload.valor);

      if (!Number.isFinite(valorEsperado) || valorEsperado <= 0) {
        console.error('[CTO-Log] VALOR INVÁLIDO NO BANCO. Operação abortada.');
        return { success: false, error: 'VALOR_INVALIDO_BASE_DADOS' };
      }

      if (!Number.isFinite(valorInformado) || valorInformado <= 0) {
        return { success: false, error: 'VALOR_INFORMADO_INVALIDO' };
      }

      if (Math.abs(valorInformado - valorEsperado) > 0.01) {
        console.error('[CTO-Log] ALERTA DE MANIPULAÇÃO - valor divergente.', {
          freteId,
          valorInformado,
          valorEsperado,
        });
        eventBusService.emit(AppEvents.PAYMENT_FAILED, payload);
        return { success: false, error: 'VALOR_DIVERGENTE' };
      }

      const currentUserEmail = currentUser.email?.trim().toLowerCase() || '';
      const isSandboxMode = currentUser.emailVerified && AUTHORIZED_SANDBOX_ACCOUNTS.has(currentUserEmail);

      if (isSandboxMode) {
        const txId = `QA_BYPASS_${freteId}`;

        await runTransaction(db, async transaction => {
          const latestSnap = await transaction.get(freteRef);
          if (!latestSnap.exists()) throw new Error('FRETE_NAO_ENCONTRADO');

          const latest = latestSnap.data();
          if (latest.clienteId !== currentUser.uid) throw new Error('USUARIO_NAO_AUTORIZADO');

          if (latest.pagamentoStatus === 'aprovado') return;
          if (!ELIGIBLE_PAYMENT_STATUSES.has(String(latest.status || ''))) {
            throw new Error('STATUS_NAO_PERMITE_PAGAMENTO');
          }

          transaction.update(freteRef, {
            pagamentoStatus: 'aprovado',
            status: 'disponivel',
            pagamentoId: txId,
            transactionId: txId,
            pagoEm: serverTimestamp(),
            updatedAt: serverTimestamp(),
            atualizadoEm: serverTimestamp(),
          });
        });

        console.log('[CTO-Log] Modo de homologação autorizado concluído para o frete:', freteId);
        return { success: true, transactionId: txId, url: `/cliente?order=${encodeURIComponent(freteId)}` };
      }

      const idToken = await currentUser.getIdToken();
      const finalPayload = {
        valor: valorEsperado,
        titulo: payload.descricao,
        descricao: payload.descricao,
        clienteId: currentUser.uid,
        freteId,
        idPedido: freteId,
      };

      const response = await this.fetchWithTimeout('/api/pagamento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(finalPayload),
      });

      const data = await this.parseJsonResponse(response);
      if (!response.ok) {
        const errorMessage = typeof data.error === 'string' && data.error.trim() ? data.error : 'ERRO_PAGAMENTO';
        console.error('[CTO-Log] FALHA NA API DE PAGAMENTO:', response.status, errorMessage);
        eventBusService.emit(AppEvents.PAYMENT_FAILED, payload);
        return { success: false, error: errorMessage };
      }

      const checkoutUrl = parseCheckoutUrl(data.url);
      if (!checkoutUrl) {
        eventBusService.emit(AppEvents.PAYMENT_FAILED, payload);
        return { success: false, error: 'URL_CHECKOUT_INVALIDA' };
      }

      const transactionId = typeof data.transactionId === 'string'
        ? data.transactionId
        : typeof data.id === 'string'
          ? data.id
          : undefined;

      // A confirmação, os IDs reais e a liberação operacional pertencem ao webhook.
      return { success: true, transactionId, url: checkoutUrl };
    } catch (error) {
      console.error('[CTO-Log] PAYMENT ERROR:', error);
      eventBusService.emit(AppEvents.PAYMENT_FAILED, payload);
      return { success: false, error: error instanceof Error && error.message ? error.message : 'FALHA_PROCESSAMENTO' };
    }
  }

  async processarPagamento(payload: PaymentPayload): Promise<PaymentResponse> {
    const freteId = typeof payload?.freteId === 'string' ? payload.freteId.trim() : '';
    if (!freteId) return { success: false, error: 'FRETE_ID_INVALIDO' };

    const existing = this.inflightPayments.get(freteId);
    if (existing) return existing;

    const operation = this.processarPagamentoInterno(payload)
      .finally(() => this.inflightPayments.delete(freteId));

    this.inflightPayments.set(freteId, operation);
    return operation;
  }

  async processarReembolso(transactionId: string, freteId?: string): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      const normalizedTransactionId = typeof transactionId === 'string' ? transactionId.trim() : '';
      const normalizedFreteId = typeof freteId === 'string' ? freteId.trim() : '';

      if (!currentUser || !normalizedTransactionId || !normalizedFreteId) return false;

      const freteRef = doc(db, 'fretes', normalizedFreteId);
      const freteSnap = await getDoc(freteRef);
      if (!freteSnap.exists()) return false;

      const freteData = freteSnap.data();
      const isOwner = freteData.clienteId === currentUser.uid;
      const isAdmin = currentUser.uid === ADMIN_UID;
      if (!isOwner && !isAdmin) return false;

      const currentUserEmail = currentUser.email?.trim().toLowerCase() || '';
      const isAuthorizedSandbox = currentUser.emailVerified && AUTHORIZED_SANDBOX_ACCOUNTS.has(currentUserEmail);

      if (normalizedTransactionId.startsWith('QA_BYPASS_')) {
        if (!isAuthorizedSandbox || freteData.transactionId !== normalizedTransactionId) return false;

        await runTransaction(db, async transaction => {
          const latestSnap = await transaction.get(freteRef);
          if (!latestSnap.exists()) throw new Error('FRETE_NAO_ENCONTRADO');

          const latest = latestSnap.data();
          if (latest.transactionId !== normalizedTransactionId) throw new Error('TRANSACAO_DIVERGENTE');
          if (latest.pagamentoStatus === 'reembolsado') return;

          transaction.update(freteRef, {
            pagamentoStatus: 'reembolsado',
            reembolsado: true,
            reembolsoData: serverTimestamp(),
            updatedAt: serverTimestamp(),
            atualizadoEm: serverTimestamp(),
          });
        });

        eventBusService.emit(AppEvents.PAYMENT_REFUNDED, { transactionId: normalizedTransactionId, freteId: normalizedFreteId });
        return true;
      }

      const idToken = await currentUser.getIdToken();
      const response = await this.fetchWithTimeout('/api/reembolso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ idPedido: normalizedFreteId, transactionId: normalizedTransactionId }),
      });

      if (!response.ok) return false;

      // O endpoint/webhook é a autoridade do reembolso; o navegador apenas solicita.
      eventBusService.emit(AppEvents.PAYMENT_REFUNDED, { transactionId: normalizedTransactionId, freteId: normalizedFreteId });
      return true;
    } catch (error) {
      console.error('[CTO-Log] REFUND ERROR:', error);
      return false;
    }
  }
}

export const paymentService = new PaymentService();
