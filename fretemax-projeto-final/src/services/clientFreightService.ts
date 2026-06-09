// src/services/clientFreightService.ts
import { addDoc, collection, doc, getDoc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { paymentService } from './paymentService';
import { AppEvents, eventBusService } from './eventBusService';
import { AppTripState } from '../state/tripStateMachine';

// 🔥 CTO FIX: Trocamos o orquestrador antigo pelo novo sistema de fila que auditamos
import { DispatchQueueService } from './dispatchQueueService';

// ... (Mantenha todos os seus types e interfaces originais aqui para não quebrar a tipagem)

class ClientFreightService {
  /* ... (Mantenha seus helpers: generatePin, normalizeNumber, etc) ... */
  private generatePin(): string { return Math.floor(1000 + Math.random() * 9000).toString(); }
  private round(value: number) { return Number(value.toFixed(2)); }
  // ... (Mantenha o resto dos seus helpers exatamente como estão)

  async criarFrete(payload: any): Promise<any> {
    // Nota: Mantive as tipagens como 'any' ou dinâmicas no construtor com base no seu snippet 
    // para garantir que não vai quebrar se você usar as tipagens reais no topo do arquivo.
    const inflightKey = this.buildInflightKey(payload);
    if (inflightRegistry.has(inflightKey)) return { success: false, error: 'OPERACAO_EM_PROCESSAMENTO' };
    inflightRegistry.add(inflightKey);

    try {
      const { normalizedPayload, pricingMetadata } = this.normalizePayload(payload);
      if (!normalizedPayload.origem?.lat || !normalizedPayload.destino?.lat) return { success: false, error: 'COORDENADAS_INVALIDAS' };

      const pinColeta = this.generatePin();
      const pinEntregas = normalizedPayload.paradasTratadas.map(() => this.generatePin());

      // 🔥 CORREÇÃO: Usando estados oficiais da sua tripStateMachine
      const freteRef = await addDoc(collection(db, 'fretes'), {
        ...normalizedPayload,
        status: AppTripState.DISPONIVEL, // Estado inicial oficial
        pagamentoStatus: 'pendente',
        dispatchStatus: 'aguardando_dispatch',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        pinColeta,
        pinEntregas,
        pricingMetadata,
      });

      const pagamento = await paymentService.processarPagamento({
        valor: pricingMetadata.valorBruto,
        descricao: `Frete ${normalizedPayload.categoria}`,
        clienteId: normalizedPayload.clienteId,
        freteId: freteRef.id,
      });

      if (!pagamento.success) {
        await updateDoc(doc(db, 'fretes', freteRef.id), { status: AppTripState.CANCELADO, pagamentoStatus: 'falhou' });
        return { success: false, error: 'PAGAMENTO_NEGADO' };
      }

      // 🔥 CORREÇÃO: Após pagamento, transitamos para BUSCANDO_MOTORISTA
      await updateDoc(doc(db, 'fretes', freteRef.id), {
        pagamentoStatus: 'aprovado',
        status: AppTripState.BUSCANDO_MOTORISTA, 
        atualizadoEm: serverTimestamp(),
      });

      // 🔥 CTO FIX: Aciona a esteira de distribuição real (DispatchQueueService) com os dados exatos do frete
      await DispatchQueueService.iniciarFila({
        id: freteRef.id,
        clienteId: normalizedPayload.clienteId,
        categoria: normalizedPayload.categoria as any,
        origem: {
          lat: normalizedPayload.origem.lat,
          lng: normalizedPayload.origem.lng,
          endereco: normalizedPayload.origem.endereco || ''
        },
        destino: {
          lat: normalizedPayload.destino.lat,
          lng: normalizedPayload.destino.lng,
          endereco: normalizedPayload.destino.endereco || ''
        },
        distanciaKm: normalizedPayload.distanciaTotalKm || 0,
        valor: pricingMetadata.valorMotorista || 0,
        peso: normalizedPayload.pesoKg || 0,
        descricao: normalizedPayload.tipoCarga || ''
      });

      return { success: true, freteId: freteRef.id };
    } catch (error) {
      console.error('ERRO CRIAR FRETE:', error);
      return { success: false, error: 'ERRO_CRIAR_FRETE' };
    } finally {
      inflightRegistry.delete(inflightKey);
    }
  }

  // ... (Mantenha cancelarFrete, atualizarFrete, buscarFrete e finalizarFrete originais)
}
export const clientFreightService = new ClientFreightService();
