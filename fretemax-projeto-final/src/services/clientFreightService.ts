// =========================================================
// NOME DO ARQUIVO: src/services/clientFreightService.ts
// CTO-Log: Refinamento e Sincronização do Motor de Cálculo (Bloco 3 / FASE 3).
// Status: Corrigido - Chamada de pagamento prematura removida.
// EXECUÇÃO BLOCO 01: Identificação de Bitrem/Carreta corrigida e exclusão de pedágio injetada.
// =========================================================

import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppTripState as TripState } from '../state/tripStateMachine';

const inflightRegistry = new Set<string>();

export interface FreightPayload {
  clienteId: string;
  categoria: string;
  origem: { lat: number; lng: number; endereco?: string; cidade?: string };
  destino: { lat: number; lng: number; endereco?: string; cidade?: string };
  valor?: number;
  valorBruto?: number;
  distanciaTotalKm?: number;
  distanciaTarifada?: number;
  distanciaRealKm?: number;
  pesoKg?: number;
  tipoCarga?: string;
  paradas?: any[];
  valorPedagio?: number;
}

class ClientFreightService {
  
  private generatePin(): string { 
    return Math.floor(1000 + Math.random() * 9000).toString(); 
  }

  private round(value: number): number { 
    return Number(value.toFixed(2)); 
  }

  private buildInflightKey(payload: any): string {
    return `${payload.clienteId}_${payload.origem?.lat}_${payload.destino?.lat}`;
  }

  private normalizePayload(payload: any) {
    const paradasTratadas = payload.paradas || [];
    return {
      normalizedPayload: {
        ...payload,
        paradasTratadas
      },
      pricingMetadata: {
        valorBruto: payload.valorBruto || payload.valor || 0
      }
    };
  }

  private calcularComissao(valorBruto: number, categoria: string, valorPedagio: number = 0) {
    const cat = categoria ? categoria.toLowerCase().trim() : '';
    const isHeavy = ['toco', 'truck', 'carreta', 'bitrem', 'carreta_ls', 'bi_trem_cegonha'].some(c => cat.includes(c));
    const taxa = isHeavy ? 0.15 : 0.20; 
    
    // Subtrai o pedágio antes de calcular a comissão para proteger o custo do motorista
    const baseComissao = Math.max(0, valorBruto - valorPedagio);
    const valorComissao = this.round(baseComissao * taxa);
    const valorLiquidoMotorista = this.round(valorBruto - valorComissao);
    
    return {
      taxaFreto: taxa * 100, 
      valorComissao,
      valorLiquidoMotorista
    };
  }

  private extrairCidadeDoEndereco(endereco: string | undefined): string {
    if (!endereco) return '';
    const partes = endereco.split(',');
    if (partes.length > 2) {
       return partes[partes.length - 2].trim(); 
    }
    return endereco.trim();
  }

  async criarFrete(payload: FreightPayload): Promise<any> {
    const inflightKey = this.buildInflightKey(payload);
    if (inflightRegistry.has(inflightKey)) return { success: false, error: 'OPERACAO_EM_PROCESSAMENTO' };
    inflightRegistry.add(inflightKey);

    try {
      const { normalizedPayload, pricingMetadata } = this.normalizePayload(payload);
      if (!normalizedPayload.origem?.lat || !normalizedPayload.destino?.lat) {
        return { success: false, error: 'COORDENADAS_INVALIDAS' };
      }

      const valorBruto = pricingMetadata.valorBruto;
      const valorPedagio = payload.valorPedagio || 0;
      if (valorBruto <= 0) return { success: false, error: 'VALOR_BRUTO_INVALIDO' };

      const { taxaFreto, valorComissao, valorLiquidoMotorista } = this.calcularComissao(valorBruto, normalizedPayload.categoria, valorPedagio);
      
      if (valorLiquidoMotorista <= 0) return { success: false, error: 'VALOR_LIQUIDO_INVALIDO' };

      const pinColeta = this.generatePin();
      const pinEntregas = normalizedPayload.paradasTratadas.map(() => this.generatePin());

      const cidadeDestinoFormatada = payload.destino.cidade || this.extrairCidadeDoEndereco(payload.destino.endereco);

      const freteRef = await addDoc(collection(db, 'fretes'), {
        ...normalizedPayload,
        cidadeDestinoFormatada, 
        status: TripState.DISPONIVEL, 
        pagamentoStatus: 'pendente',
        dispatchStatus: 'mural_aberto', 
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        pinColeta,
        pinEntregas,
        valorBruto,
        taxaFreto,
        valorComissao,
        valorLiquidoMotorista, 
      });

      // 🔥 CTO FIX: Removido o fluxo prematuro de pagamento daqui. O frete apenas vai pro feed.
      
      return { success: true, freteId: freteRef.id };
    } catch (error) {
      console.error('ERRO CRÍTICO CRIAR FRETE:', error);
      return { success: false, error: 'ERRO_CRIAR_FRETE' };
    } finally {
      inflightRegistry.delete(inflightKey);
    }
  }

  async cancelarFrete(freteId: string): Promise<any> {
    try {
      await updateDoc(doc(db, 'fretes', freteId), {
        status: TripState.CANCELADO,
        atualizadoEm: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: 'ERRO_CANCELAR_FRETE' };
    }
  }

  async buscarFrete(freteId: string): Promise<any> {
    try {
      const snap = await getDoc(doc(db, 'fretes', freteId));
      if (snap.exists()) return { success: true, data: { id: snap.id, ...snap.data() } };
      return { success: false, error: 'FRETE_NAO_ENCONTRADO' };
    } catch (error) {
      return { success: false, error: 'ERRO_BUSCAR_FRETE' };
    }
  }
}

export const clientFreightService = new ClientFreightService();
