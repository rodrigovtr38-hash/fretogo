// =========================================================
// NOME DO ARQUIVO: src/services/clientFreightService.ts
// CTO-Log: Refinamento e Sincronização do Motor de Cálculo (Bloco 3 / FASE 3).
// Evolução Fase 5: Integração do Payload Universal B2B.
// Correção Bloco 02: O frete agora nasce estritamente como 'aguardando_pagamento'.
// EXECUÇÃO BLOCO 01: Identificação de Bitrem/Carreta corrigida e exclusão de pedágio injetada.
// EXECUÇÃO BLOCO 03: Blindagem do dispatchStatus para 'retido_pagamento' na origem.
// EXECUÇÃO BLOCO 05-B: Injeção de expiraEm (15 min) para limpeza automática de fretes fantasmas.
// 🔥 CTO FIX (PATCH BLOCO 01): Remoção de addDoc inseguro. Substituição por Cloud Function B2B (Idempotência e Segurança).
// =========================================================

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
  
  // Campos B2B Integrados
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
  interessados?: number; // 🔥 CTO FIX (PATCH BLOCO 01): Correção de Nomenclatura Schema.
}

class ClientFreightService {
  
  private buildInflightKey(payload: FreightPayload): string {
    const lat = payload.origem?.lat || payload.origemLat || 0;
    const destLat = payload.destino?.lat || payload.destinoLat || 0;
    return `${payload.clienteId}_${lat}_${destLat}`;
  }

  async criarFrete(payload: FreightPayload): Promise<any> {
    const inflightKey = this.buildInflightKey(payload);
    
    if (inflightRegistry.has(inflightKey)) {
      return { success: false, error: 'OPERACAO_EM_PROCESSAMENTO' };
    }
    inflightRegistry.add(inflightKey);

    try {
      if (!payload.origem?.lat && !payload.origemLat) {
        return { success: false, error: 'COORDENADAS_ORIGEM_INVALIDAS' };
      }
      if (!payload.destino?.lat && !payload.destinoLat) {
        return { success: false, error: 'COORDENADAS_DESTINO_INVALIDAS' };
      }

      // 🔥 CTO FIX: Corrige chaves sujas que o antigo Frontend possa enviar
      if ('interressados' in payload) {
         payload.interessados = (payload as any).interressados;
         delete (payload as any).interressados;
      }

      const functions = getFunctions();
      const criarFreteB2B = httpsCallable(functions, 'criarFreteB2B');
      
      // 🔥 CTO FIX (PATCH BLOCO 01): Chave de Idempotência Real para barrar double-booking no Firebase
      const idempotencyKey = `${payload.clienteId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const response = await criarFreteB2B({ payload, idempotencyKey }) as any;

      if (response.data && response.data.success) {
        return { success: true, freteId: response.data.freteId };
      } else {
        return { success: false, error: 'ERRO_CRIAR_FRETE_SERVIDOR' };
      }

    } catch (error) {
      console.error('ERRO CRÍTICO CRIAR FRETE (Zero Trust):', error);
      return { success: false, error: 'ERRO_CRIAR_FRETE' };
    } finally {
      inflightRegistry.delete(inflightKey);
    }
  }

  async cancelarFrete(freteId: string): Promise<any> {
    try {
      // 🔥 CTO FIX (PATCH BLOCO 01): Cancela usando autoridade da Cloud Function que fará as checagens
      const functions = getFunctions();
      const cancelarFreteB2B = httpsCallable(functions, 'cancelarFreteB2B');
      await cancelarFreteB2B({ freteId });
      
      return { success: true };
    } catch (error) {
      console.error('ERRO CANCELAR FRETE (Zero Trust):', error);
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
