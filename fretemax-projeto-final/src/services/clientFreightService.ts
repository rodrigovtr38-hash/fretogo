// src/services/clientFreightService.ts
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { paymentService } from './paymentService';
import { AppTripState } from '../state/tripStateMachine';
import { DispatchQueueService } from './dispatchQueueService';

const inflightRegistry = new Set<string>();

export interface FreightPayload {
  clienteId: string;
  categoria: string;
  origem: { lat: number; lng: number; endereco?: string; cidade?: string };
  destino: { lat: number; lng: number; endereco?: string; cidade?: string };
  valor?: number;
  valorBruto?: number;
  distanciaTotalKm?: number;
  pesoKg?: number;
  tipoCarga?: string;
  paradas?: any[];
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

  // Divisão de spread invisível por categoria operacional
  private calcularComissao(valorBruto: number, categoria: string) {
    const cat = categoria ? categoria.toLowerCase().trim() : '';
    
    // Categorias Leves: 20% | Pesadas: 15%
    const ehLeve = ['moto', 'carro', 'utilitario', 'furg', 'hr', 'bongo'].some(c => cat.includes(c));
    const taxa = ehLeve ? 0.20 : 0.15; 
    
    const valorComissao = this.round(valorBruto * taxa);
    const valorLiquidoMotorista = this.round(valorBruto - valorComissao);
    
    return {
      taxaFreto: taxa * 100, 
      valorComissao,
      valorLiquidoMotorista
    };
  }

  // // AJUSTE CTO: Função auxiliar para extrair a cidade do endereço bruto, se necessário
  private extrairCidadeDoEndereco(endereco: string | undefined): string {
    if (!endereco) return '';
    // Lógica simples: Pega a parte antes do "- Estado" ou tentar separar por vírgulas.
    // Em um sistema real, o ideal é o frontend já mandar payload.destino.cidade separadamente.
    const partes = endereco.split(',');
    if (partes.length > 2) {
       return partes[partes.length - 2].trim(); // Geralmente o bairro/cidade fica no penúltimo bloco antes do estado/país
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
      if (valorBruto <= 0) return { success: false, error: 'VALOR_BRUTO_INVALIDO' };

      const { taxaFreto, valorComissao, valorLiquidoMotorista } = this.calcularComissao(valorBruto, normalizedPayload.categoria);
      
      if (valorLiquidoMotorista <= 0) return { success: false, error: 'VALOR_LIQUIDO_INVALIDO' };

      const pinColeta = this.generatePin();
      const pinEntregas = normalizedPayload.paradasTratadas.map(() => this.generatePin());

      // Extrai a cidade para alimentar o Radar de Retorno
      const cidadeDestinoFormatada = payload.destino.cidade || this.extrairCidadeDoEndereco(payload.destino.endereco);

      const freteRef = await addDoc(collection(db, 'fretes'), {
        ...normalizedPayload,
        cidadeDestinoFormatada, // Novo campo para busca otimizada
        status: AppTripState.DISPONIVEL, 
        pagamentoStatus: 'pendente',
        dispatchStatus: 'aguardando_dispatch',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        pinColeta,
        pinEntregas,
        valorBruto,
        taxaFreto,
        valorComissao,
        valorLiquidoMotorista, 
      });

      const pagamento = await paymentService.processarPagamento({
        valor: valorBruto, 
        descricao: `Frete ${normalizedPayload.categoria} - ID ${freteRef.id}`,
        clienteId: normalizedPayload.clienteId,
        freteId: freteRef.id,
      });

      if (!pagamento.success) {
        await updateDoc(doc(db, 'fretes', freteRef.id), { 
          status: AppTripState.CANCELADO, 
          pagamentoStatus: 'falhou',
          atualizadoEm: serverTimestamp()
        });
        return { success: false, error: 'PAGAMENTO_NEGADO' };
      }

      await updateDoc(doc(db, 'fretes', freteRef.id), {
        pagamentoStatus: 'aprovado',
        status: AppTripState.BUSCANDO_MOTORISTA, 
        atualizadoEm: serverTimestamp(),
      });

      // // AJUSTE CTO: Dispara a fila enviando o 'cidadeDestino' explicitamente para o Radar
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
        cidadeDestino: cidadeDestinoFormatada, // Passa a cidade limpa para o Match!
        distanciaKm: normalizedPayload.distanciaTotalKm || 0,
        valor: valorLiquidoMotorista, 
        peso: normalizedPayload.pesoKg || 0,
        descricao: normalizedPayload.tipoCarga || ''
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
        status: AppTripState.CANCELADO,
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
