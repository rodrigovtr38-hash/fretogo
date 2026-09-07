// =========================================================
// NOME DO ARQUIVO: src/services/clientFreightService.ts
// CTO-Log: Refinamento e Sincronização do Motor de Cálculo (Bloco 3 / FASE 3).
// Evolução Fase 5: Integração do Payload Universal B2B.
// Correção Bloco 02: O frete agora nasce estritamente como 'aguardando_pagamento'.
// EXECUÇÃO BLOCO 01: Identificação de Bitrem/Carreta corrigida e exclusão de pedágio injetada.
// =========================================================

import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppTripState as TripState } from '../state/tripStateMachine';

const inflightRegistry = new Set<string>();

export interface FreightPayload {
  // Campos Universais (Retrocompatibilidade)
  clienteId: string;
  categoria: string;
  origem: { lat: number; lng: number; endereco?: string; cidade?: string };
  destino: { lat: number; lng: number; endereco?: string; cidade?: string };
  valor?: number;
  valorBruto?: number;
  distanciaTotalKm?: number;
  distanciaTarifada?: number;
  distanciaRealKm?: number;
  pesoKg?: string | number;
  tipoCarga?: string;
  paradas?: any[];
  valorPedagio?: number;
  
  // Campos B2B Integrados (Substituindo o antigo Cliente.tsx addDoc direto)
  empresaId?: string;
  tipoConta?: string;
  empresaNome?: string;
  empresaDocumento?: string;
  clienteNome?: string;
  clienteZap?: string;
  clienteDocumento?: string;
  distancia?: number;
  veiculo?: string;
  peso?: string;
  tipoMaterial?: string;
  qtdVolumes?: string;
  valorNF?: string;
  observacoes?: string;
  valorTotal?: number;
  valorFreteBruto?: number;
  valorMotorista?: number;
  valorLiquidoMotorista?: number;
  lucroPlataforma?: number;
  cidadeOrigem?: string;
  cidadeDestino?: string;
  enderecoColetaTexto?: string;
  enderecoEntregaTexto?: string;
  coleta?: any;
  entrega?: any;
  origemLat?: number;
  origemLng?: number;
  destinoLat?: number;
  destinoLng?: number;
  pinColeta?: string;
  pinEntregas?: string[];
  multiplasEntregas?: boolean;
  tipoFrete?: string;
  dataAgendada?: any;
  visualizacoes?: number;
  motoristasNotificados?: number;
  interressados?: number;
}

class ClientFreightService {
  
  private generatePin(): string { 
    return Math.floor(1000 + Math.random() * 9000).toString(); 
  }

  private round(value: number): number { 
    return Number(value.toFixed(2)); 
  }

  private buildInflightKey(payload: FreightPayload): string {
    const lat = payload.origem?.lat || payload.origemLat || 0;
    const destLat = payload.destino?.lat || payload.destinoLat || 0;
    return `${payload.clienteId}_${lat}_${destLat}`;
  }

  private normalizePayload(payload: FreightPayload) {
    const paradasTratadas = payload.paradas || [];
    return {
      normalizedPayload: {
        ...payload,
        paradasTratadas
      },
      pricingMetadata: {
        valorBruto: payload.valorFreteBruto || payload.valorBruto || payload.valorTotal || payload.valor || 0
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

      // Se o Cliente.tsx já mandou o cálculo pronto, aproveitamos. Senão, recálcula.
      let taxaFreto = 0;
      let valorComissao = payload.lucroPlataforma || 0;
      let valorLiquidoMotorista = payload.valorLiquidoMotorista || payload.valorMotorista || 0;

      if (valorComissao === 0 && valorLiquidoMotorista === 0) {
         const calc = this.calcularComissao(valorBruto, normalizedPayload.categoria || payload.veiculo || '', valorPedagio);
         taxaFreto = calc.taxaFreto;
         valorComissao = calc.valorComissao;
         valorLiquidoMotorista = calc.valorLiquidoMotorista;
      }
      
      if (valorLiquidoMotorista <= 0) return { success: false, error: 'VALOR_LIQUIDO_INVALIDO' };

      const pinColeta = payload.pinColeta || this.generatePin();
      const pinEntregas = payload.pinEntregas || normalizedPayload.paradasTratadas.map(() => this.generatePin());

      const cidadeDestinoFormatada = payload.cidadeDestino || payload.destino.cidade || this.extrairCidadeDoEndereco(payload.destino.endereco);

      const freteRef = await addDoc(collection(db, 'fretes'), {
        ...normalizedPayload,
        cidadeDestinoFormatada, 
        status: 'aguardando_pagamento', // 🔥 CTO FIX: Bloqueia ida pro Feed antes de pagar.
        pagamentoStatus: 'pendente',
        dispatchStatus: 'mural_aberto', 
        createdAt: serverTimestamp(), // Retrocompatibilidade B2B
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        pinColeta,
        pinEntregas,
        valorBruto,
        valorFreteBruto: valorBruto, // Salva nas duas chaves por segurança
        taxaFreto,
        valorComissao,
        valorLiquidoMotorista, 
      });
      
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
