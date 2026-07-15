// src/services/paymentService.ts
// CTO-Log: Auditoria Etapa 6 (Services)
// Ajuste: Refinamento de Tipagem TypeScript para garantir compilação limpa na Vercel (freteId vs idPedido) mantendo 100% do motor de Escrow.

import {
  doc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  getDoc,
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
  private readonly TIMEOUT = 15000;

  private async fetchWithTimeout(url: string, options: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, this.TIMEOUT);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async processarPagamento(payload: PaymentPayload): Promise<PaymentResponse> {
    try {
      // AJUSTE CTO: Defesa AntiFraude. Busca o valor inviolável direto do banco de dados antes de processar.
      const freteRef = doc(db, 'fretes', payload.freteId);
      const freteSnap = await getDoc(freteRef);
      
      if (!freteSnap.exists()) {
        return { success: false, error: 'FRETE_NAO_ENCONTRADO' };
      }
      
      const freteData = freteSnap.data();
      const valorEsperado = Number(freteData.valorTotal || freteData.valorFreteBruto || 0);
      
      // Validação rigorosa com margem de segurança de 2% para diferenças de arredondamento JavaScript
      if (Math.abs(payload.valor - valorEsperado) > valorEsperado * 0.02) {
        console.error('[FRAUDE_BLOQUEADA] Tentativa de manipulação de valor. Enviado:', payload.valor, 'Banco:', valorEsperado);
        eventBusService.emit(AppEvents.PAYMENT_FAILED, payload);
        return { success: false, error: 'VALOR_INVALIDO_FRAUDE' };
      }

      const response = await this.fetchWithTimeout('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Garantindo que a API legada que porventura peça 'idPedido' receba o 'freteId' mapeado
        body: JSON.stringify({ ...payload, idPedido: payload.freteId }),
      });

      if (!response.ok) {
        eventBusService.emit(AppEvents.PAYMENT_FAILED, payload);
        return { success: false, error: 'ERRO_PAGAMENTO' };
      }

      const data = await response.json();

      await this.sincronizarPagamento(payload.freteId, data.transactionId || data.id);

      eventBusService.emit(AppEvents.PAYMENT_APPROVED, {
        freteId: payload.freteId,
        transactionId: data.transactionId || data.id,
      });

      return { success: true, transactionId: data.transactionId || data.id };
    } catch (error) {
      console.error('PAYMENT ERROR:', error);
      eventBusService.emit(AppEvents.PAYMENT_FAILED, payload);
      return { success: false, error: 'FALHA_PROCESSAMENTO' };
    }
  }

  private async sincronizarPagamento(freteId: string, transactionId: string) {
    try {
      const freteRef = doc(db, 'fretes', freteId);

      // AJUSTE CTO: Converteu Update em Transação para não sobrescrever ID se houver cliques simultâneos
      await runTransaction(db, async (transaction) => {
        const freteSnap = await transaction.get(freteRef);
        if (!freteSnap.exists()) throw new Error('Frete não encontrado');

        const dados = freteSnap.data();
        
        // Proteção contra sobrescrita
        if (dados.pagamentoId || dados.transactionId) {
          console.warn('[ALERTA] Este frete já possui um ID de transação registrado.');
          return;
        }

        transaction.update(freteRef, {
          pagamentoStatus: 'confirmado',
          pagamentoId: transactionId, // Campo vital para o Reembolso Reverso
          transactionId: transactionId, 
          status: AppTripState.DISPONIVEL,
          updatedAt: serverTimestamp(),
        });
      });

      console.log(`[PAYMENT] Pagamento confirmado para frete ${freteId}. Status atualizado para DISPONIVEL. Iniciando busca por motoristas...`);

      // Dispara também para o cache Realtime (mantendo a funcionalidade original da interface)
      await firebaseRealtimeService.updateTripRealtime(freteId, {
        pagamentoStatus: 'confirmado',
        pagamentoId: transactionId,
        transactionId,
        status: AppTripState.DISPONIVEL,
      });
      
    } catch (error) {
      console.error('SYNC PAYMENT ERROR:', error);
      throw error; 
    }
  }

  async processarReembolso(transactionId: string, freteId?: string): Promise<boolean> {
    try {
      // AJUSTE CTO: Identificação de frete por engenharia reversa caso apenas a transação chegue
      let idPedido = freteId;
      if (!idPedido) {
        const q = await import('firebase/firestore').then(({ collection, query, where, getDocs, limit }) =>
          getDocs(query(collection(db, 'fretes'), where('pagamentoId', '==', transactionId), limit(1)))
        );
        if (!q.empty) idPedido = q.docs[0].id;
      }

      const response = await this.fetchWithTimeout('/api/reembolso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPedido, transactionId }), 
      });

      if (!response.ok) return false;

      if (idPedido) {
        const freteRef = doc(db, 'fretes', idPedido);
        await updateDoc(freteRef, {
          pagamentoStatus: 'reembolsado',
          reembolsado: true, // Trava crucial para o api/reembolso.js
          updatedAt: serverTimestamp(),
        });
      }

      eventBusService.emit(AppEvents.PAYMENT_REFUNDED, { transactionId, freteId: idPedido });
      return true;
    } catch (error) {
      console.error('REFUND ERROR:', error);
      return false;
    }
  }
}

export const paymentService = new PaymentService();
