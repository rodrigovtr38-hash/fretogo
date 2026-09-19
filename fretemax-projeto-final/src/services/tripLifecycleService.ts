// =========================================================
// NOME DO ARQUIVO: src/services/tripLifecycleService.ts
// CTO-Log: EXECUÇÃO FINAL - Consolidação POD/PIN (Zero Trust).
// Status: Arquitetura paralela legada removida. 
// A autoridade de transição de status, consumo de PIN e avanço de parada 
// agora pertence 100% às Cloud Functions (Backend).
// O service atua exclusivamente como Forwarder (Ponte de Comunicação).
// =========================================================

import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { AppTripState } from '../state/tripStateMachine';
import { DriverState } from '../state/driverStateMachine';

// Tipagens preservadas para evitar quebra de contratos em outros arquivos importadores
export interface TripDocumentData {
  id?: string;
  status?: AppTripState | string;
  driverState?: DriverState;
  paradaAtualIndex?: number;
  paradas?: unknown[];
  motoristaId?: string | null;
  motoristaNome?: string | null;
  motoristaZap?: string | null;
  motoristaTelefone?: string | null;
  motoristaAtualDestaque?: string | null;
  dispatchStatus?: string;
  tipoFrete?: string;
  agendado?: boolean;
  veiculo?: string | null; 
  placa?: string | null;   
  foto?: string | null;    
  avaliacao?: number | null; 
  [key: string]: unknown;
}

export interface TripStateTransitionContract {
  dispatchStatus?: string;
  dispatchIndex?: number;
  dispatchTentativa?: number;
  filaTotal?: number;
  motoristaAtualDestaque?: string | null;
  motoristaAtualNome?: string | null;
  motoristaId?: string | null;
  motoristaNome?: string | null;
  motoristaZap?: string | null;
  motoristaTelefone?: string | null;
  veiculo?: string | null;
  placa?: string | null;
  foto?: string | null;
  avaliacao?: number | null;
  reservadoEm?: number;
  reservaExpiraEm?: number;
  pagamentoStatus?: string;
  pagoEm?: number;
  alertaInsucesso?: boolean;
  motivoCancelamento?: string;
  isRecusa?: boolean;
  entregueEm?: number;
  canceladoPorMotoristaEm?: number;
}

export class TripLifecycleService {
  
  // ========================================================================
  // PONTE ZERO TRUST: OPERAÇÕES DO MOTORISTA (FRONTEND -> CLOUD FUNCTIONS)
  // ========================================================================

  /**
   * Valida o PIN inserido pelo motorista e avança a etapa da viagem.
   * A transação, o consumo do PIN e o incremento da parada ocorrem no Backend.
   */
  static async validarPinEAvancarEtapa(freteId: string, pin: string): Promise<void> {
    const functions = getFunctions(db.app);
    const validarPinDaEtapa = httpsCallable(functions, 'validarPinDaEtapa');
    
    try {
      await validarPinDaEtapa({ freteId, pin });
    } catch (error: any) {
      console.error('[CTO-Log] Erro na validação de PIN no backend:', error);
      throw new Error(error.message || 'Falha sistêmica ao comunicar com o servidor central.');
    }
  }

  /**
   * Solicita mudança de status operacional (Ex: INDO_COLETA, CHEGOU_COLETA, COLETANDO).
   */
  static async executarAcaoMotorista(
    freteId: string,
    novoStatus: AppTripState | 'cancelar_motorista',
    motivo?: string,
  ): Promise<void> {
    const functions = getFunctions(db.app);
    const alterarStatusOperacionalMotorista = httpsCallable(functions, 'alterarStatusOperacionalMotorista');
    
    try {
      await alterarStatusOperacionalMotorista({ freteId, novoStatus, motivo });
    } catch (error: any) {
      console.error('[CTO-Log] Erro na transição de status no backend:', error);
      throw new Error(error.message || 'Falha sistêmica ao alterar status da viagem.');
    }
  }

  /**
   * Registra a URL da foto de evidência (POD) no banco de dados.
   * O upload é feito no cliente, mas a gravação e liberação do PIN ocorrem no Backend.
   */
  static async registrarEvidenciaMotorista(freteId: string, etapa: string, fotoUrl: string): Promise<void> {
    const functions = getFunctions(db.app);
    const registrarEvidenciaFrete = httpsCallable(functions, 'registrarEvidenciaFrete');
    
    try {
      await registrarEvidenciaFrete({ freteId, etapa, fotoUrl });
    } catch (error: any) {
      console.error('[CTO-Log] Erro ao registrar evidência no backend:', error);
      throw new Error(error.message || 'Falha sistêmica ao registrar a foto de evidência.');
    }
  }

  /**
   * Atualiza o status de disponibilidade do motorista no Radar.
   */
  static async atualizarDisponibilidadeMotorista(online: boolean): Promise<void> {
    const functions = getFunctions(db.app);
    const atualizarDisponibilidade = httpsCallable(functions, 'atualizarDisponibilidadeMotorista');
    
    try {
      await atualizarDisponibilidade({ online });
    } catch (error: any) {
      console.error('[CTO-Log] Erro ao atualizar disponibilidade:', error);
    }
  }

  /**
   * Registra interações menores (visualizações, cliques) no frete para auditoria/Analytics.
   */
  static async registrarInteracaoMotorista(
    freteId: string,
    tipo: 'visualizacao' | 'interesse' | 'favorito',
  ): Promise<void> {
    const functions = getFunctions(db.app);
    const registrarInteracaoFrete = httpsCallable(functions, 'registrarInteracaoFrete');
    
    try {
      await registrarInteracaoFrete({ freteId, tipo });
    } catch (error: any) {
      console.warn('[CTO-Log] Falha silenciosa ao registrar interação:', error);
    }
  }
}

export default TripLifecycleService;
