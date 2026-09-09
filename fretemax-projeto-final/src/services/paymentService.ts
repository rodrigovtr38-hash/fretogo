// =========================================================
// NOME DO ARQUIVO: src/services/paymentService.ts
// CTO-Log: Fase 3 - Homologação Operacional Distribuída.
// Evolução Fase 5: Remoção da sobrescrita otimista do TripState.
// EXECUÇÃO BLOCO 01 (ETAPA 2): Fonte autoritativa (Zero Trust) injetada. 
// O payload da API recebe apenas o valor real guardado e calculado pelo backend.
// =========================================================

import {
  doc, updateDoc, serverTimestamp, runTransaction, getDoc, 
  collection, query, where, getDocs, limit
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { eventBusService, AppEvents } from './eventBusService';
import { firebaseRealtimeService } from './firebaseRealtimeService';

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
      const freteRef = doc(db, 'fretes', payload.freteId);
      const freteSnap = await getDoc(freteRef);
      
      if (!freteSnap.exists()) {
        return { success: false, error: 'FRETE_NAO_ENCONTRADO' };
      }
      
      const freteData = freteSnap.data();
      
      // 🔥 CTO FIX ZERO TRUST: A fonte da verdade agora é o banco. 
      // Ignoramos qualquer valor calculado no client-side para formar o link de pagamento.
      const valorEsperado = Number(freteData.valorTotal || freteData.valorBruto || freteData.valorFreteBruto || 0);
      
      if (valorEsperado <= 0) {
         console.error('[CTO-Log] VALOR INVÁLIDO NO BANCO. Operação Abortada.');
         return { success: false, error: 'VALOR_INVALIDO_BASE_DADOS' };
      }

      // Trava de Alerta Forense
      if (payload.valor < valorEsperado * 0.98) {
        console.error('[CTO-Log] ALERTA DE MANIPULAÇÃO - Tentativa de gerar pagamento inferior. Enviado:', payload.valor, 'Banco:', valorEsperado);
        eventBusService.emit(AppEvents.PAYMENT_FAILED, payload);
      }

      // 🔥 CTO FIX: MODO DE TESTE EXPLÍCITO / SANDBOX (Bloco 05-B)
      const AUTHORIZED_SANDBOX_ACCOUNTS = ['contato@fretogo.com.br', 'rodrigovtr38@gmail.com'];
      const currentUserEmail = auth.currentUser?.email;
      const isSandboxMode = (currentUserEmail && AUTHORIZED_SANDBOX_ACCOUNTS.includes(currentUserEmail)) ||
                            (typeof window !== 'undefined' && localStorage.getItem('FRETOGO_SANDBOX') === 'true');

      if (isSandboxMode) {
        console.log('[CTO-Log] 🧪 MODO SANDBOX ATIVADO. Simulando aprovação para:', currentUserEmail || 'Tester com Flag Local');
        const txId = 'QA_BYPASS_' + Date.now();
        
        await runTransaction(db, async (transaction) => {
            transaction.update(freteRef, {
                pagamentoStatus: 'aprovado',
                status: 'disponivel',
                pagamentoId: txId,
                transactionId: txId,
                updatedAt: serverTimestamp(),
            });
        });

        await firebaseRealtimeService.updateTripRealtime(payload.freteId, {
            pagamentoStatus: 'aprovado',
            status: 'disponivel',
            pagamentoId: txId,
            transactionId: txId,
        });

        console.log('[CTO-Log] Carga postada e liberada no Feed em modo de teste.');
        return { success: true, transactionId: txId, url: `/cliente?order=${payload.freteId}` };
      }

      // 🚀 FLUXO DE PRODUÇÃO (Clientes Reais)
      // O Payload Final força a quantia ancorada pela CF do servidor
      const finalPayload = { 
        ...payload, 
        valor: valorEsperado, 
        idPedido: payload.freteId 
      };

      const response = await this.fetchWithTimeout('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CTO-Log] FALHA NA API DE PAGAMENTO (Backend):', response.status, errorText);
        
        let errorMessage = 'ERRO_PAGAMENTO';
        try {
          const parsedErr = JSON.parse(errorText);
          if (parsedErr.error) errorMessage = parsedErr.error;
        } catch (e) {}

        eventBusService.emit(AppEvents.PAYMENT_FAILED, payload);
        return { success: false, error: errorMessage };
      }

      const data = await response.json();
      const txId = data.transactionId || data.id || 'checkout_gerado';

      await this.sincronizarPagamento(payload.freteId, txId);

      console.log(`[CTO-Log] Redirecionando para Mercado Pago Seguro...`);
      return { success: true, transactionId: txId, url: data.url };
      
    } catch (error) {
      console.error('[CTO-Log] PAYMENT ERROR:', error);
      eventBusService.emit(AppEvents.PAYMENT_FAILED, payload);
      return { success: false, error: 'FALHA_PROCESSAMENTO' };
    }
  }

  private async sincronizarPagamento(freteId: string, transactionId: string) {
    try {
      const freteRef = doc(db, 'fretes', freteId);

      await runTransaction(db, async (transaction) => {
        const freteSnap = await transaction.get(freteRef);
        if (!freteSnap.exists()) throw new Error('Frete não encontrado');

        const dados = freteSnap.data();
        
        if (dados.pagamentoId || dados.transactionId) {
          console.warn('[CTO-Log] Este frete já possui um ID de transação registrado.');
          return;
        }

        transaction.update(freteRef, {
          pagamentoStatus: 'processando',
          pagamentoId: transactionId,
          transactionId: transactionId, 
          updatedAt: serverTimestamp(),
        });
      });

      console.log(`[CTO-Log] Checkout ${transactionId} gerado. Aguardando Webhook do Banco...`);

      await firebaseRealtimeService.updateTripRealtime(freteId, {
        pagamentoStatus: 'processando',
        pagamentoId: transactionId,
        transactionId,
      });
      
    } catch (error) {
      console.error('[CTO-Log] SYNC PAYMENT ERROR:', error);
      throw error; 
    }
  }

  async processarReembolso(transactionId: string, freteId?: string): Promise<boolean> {
    try {
      let idPedido = freteId;
      
      if (!idPedido) {
        const q = query(collection(db, 'fretes'), where('pagamentoId', '==', transactionId), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          idPedido = querySnapshot.docs[0].id;
        }
      }

      if (transactionId.startsWith('QA_BYPASS_')) {
          console.log('[CTO-Log] Reembolso simulado (Bypass QA).');
          if (idPedido) {
              const freteRef = doc(db, 'fretes', idPedido);
              await updateDoc(freteRef, {
                  pagamentoStatus: 'reembolsado',
                  reembolsado: true,
                  updatedAt: serverTimestamp(),
              });
          }
          eventBusService.emit(AppEvents.PAYMENT_REFUNDED, { transactionId, freteId: idPedido });
          return true;
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
          reembolsado: true,
          updatedAt: serverTimestamp(),
        });
      }

      eventBusService.emit(AppEvents.PAYMENT_REFUNDED, { transactionId, freteId: idPedido });
      return true;
    } catch (error) {
      console.error('[CTO-Log] REFUND ERROR:', error);
      return false;
    }
  }
}

export const paymentService = new PaymentService();
