// =========================================================
// NOME DO ARQUIVO: src/services/tripLifecycleService.ts
// CTO-Log: FASE 4 - Integração de Segurança Zero Trust (Bloco Backend).
// Status: Adição do método de ligação (validarPinEAvancarEtapa) com Firebase Functions.
// As demais operações atômicas locais (runTransaction) permanecem inalteradas.
// EXECUÇÃO BLOCO 6 (Prob #1): Correção de ciclo de vida Multi-Stop (Runtime gerado pós-intervenção).
// EXECUÇÃO BLOCO 6 (Prob #2): Correção de Race Condition no Lock (Trava por freteId exclusivo).
// EXECUÇÃO BLOCO 6 (Prob #4): Prevenção de duplicidade do evento TRIP_STARTED em multi-stop.
// Fluxo vigente: o aceite é permitido somente após pagamento aprovado e segue direto para ACEITO.
// EXECUÇÃO BLOCO 7 (Prob #2): Expansão da regra de isForcedReset para garantir limpeza de motorista em CANCELADO_MOTORISTA, REDISPATCH e ERRO.
// EXECUÇÃO BLOCO 7 (Prob #4): Correção do log de Torre de Controle para registrar Entregas Parciais (Multi-Stop) preservando o status EM_TRANSPORTE.
// EXECUÇÃO BLOCO 8 (Prob #1): Expansão de Contrato Logístico (veiculo, placa, foto, avaliacao) e Trava Atômica para RESERVA.
// =========================================================

import { doc, serverTimestamp, collection, addDoc, runTransaction } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; // NOVO: Conexão segura
import { db } from '../firebase';
import { AppTripState, canTransition } from '../state/tripStateMachine';
import { DriverState } from '../state/driverStateMachine';
import { StateSynchronizationService } from './stateSynchronizationService';
import type { FretePayload } from './matchingEngine';
import { DispatchQueueService } from './dispatchQueueService'; 
import { ftiRadar } from '../core/ai/events/ia.events';

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
  veiculo?: string | null; // NOVO: Bloco 8
  placa?: string | null;   // NOVO: Bloco 8
  foto?: string | null;    // NOVO: Bloco 8
  avaliacao?: number | null; // NOVO: Bloco 8
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
  // 🔥 CTO FIX [Bloco 8]: Atributos visuais cruciais para a UI (Tela 03)
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
  private static inflight = new Set<string>();

  private static acquire(key: string): boolean {
    if (this.inflight.has(key)) return false;
    this.inflight.add(key);
    return true;
  }

  private static release(key: string): void {
    this.inflight.delete(key);
  }

  // 🔥 CTO FIX: PONTE DE SEGURANÇA PARA A CLOUD FUNCTION
  static async validarPinEAvancarEtapa(freteId: string, pin: string): Promise<void> {
    const functions = getFunctions(db.app);
    const validarPinDaEtapa = httpsCallable(functions, 'validarPinDaEtapa');
    
    try {
      await validarPinDaEtapa({ freteId, pin });
    } catch (error: any) {
      console.error('[CTO-Log] Erro na validação de PIN no backend:', error);
      // O erro do HTTPS Callable traz a mensagem tratada da nuvem direto pro usuário
      throw new Error(error.message || 'Falha sistêmica ao comunicar com o servidor central.');
    }
  }

  static async executarAcaoMotorista(
    freteId: string,
    novoStatus: AppTripState | 'cancelar_motorista',
    motivo?: string,
  ): Promise<void> {
    const functions = getFunctions(db.app);
    const alterarStatusOperacionalMotorista = httpsCallable(functions, 'alterarStatusOperacionalMotorista');
    await alterarStatusOperacionalMotorista({ freteId, novoStatus, motivo });
  }

  static async atualizarDisponibilidadeMotorista(online: boolean): Promise<void> {
    const functions = getFunctions(db.app);
    const atualizarDisponibilidade = httpsCallable(functions, 'atualizarDisponibilidadeMotorista');
    await atualizarDisponibilidade({ online });
  }

  static async registrarInteracaoMotorista(
    freteId: string,
    tipo: 'visualizacao' | 'interesse' | 'favorito',
  ): Promise<void> {
    const functions = getFunctions(db.app);
    const registrarInteracaoFrete = httpsCallable(functions, 'registrarInteracaoFrete');
    await registrarInteracaoFrete({ freteId, tipo });
  }

  static async registrarEvidenciaMotorista(freteId: string, etapa: string, fotoUrl: string): Promise<void> {
    const functions = getFunctions(db.app);
    const registrarEvidenciaFrete = httpsCallable(functions, 'registrarEvidenciaFrete');
    await registrarEvidenciaFrete({ freteId, etapa, fotoUrl });
  }

  private static async registrarEventoDeIA(freteId: string, novoStatus: AppTripState | string, contract?: TripStateTransitionContract) {
    try {
      const messagesRef = collection(db, 'fretes', freteId, 'chat');
      let mensagemLog = '';

      switch (novoStatus) {
        case AppTripState.ACEITO:
          mensagemLog = "🔔 [Torre Operacional]: Vinculação confirmada. Motorista designado para a operação.";
          break;
        case AppTripState.INDO_COLETA:
          mensagemLog = "🚚 [Torre Operacional]: Deslocamento iniciado. Motorista a caminho do Ponto de Coleta.";
          break;
        case AppTripState.CHEGOU_COLETA:
          mensagemLog = "📍 [Torre Operacional]: Alerta Geográfico. Motorista reportou chegada ao local de coleta.";
          break;
        case AppTripState.COLETANDO:
          mensagemLog = "📦 [Torre Operacional]: Veículo em fase de carregamento na doca.";
          break;
        case AppTripState.EM_TRANSPORTE: // Nota: Esse print será substituído pelo print da Cloud Function quando houver PIN
          mensagemLog = "✅ [Torre Operacional]: Rota confirmada. Motorista em deslocamento logístico.";
          break;
        case 'entrega_parcial': // 🔥 CTO FIX [Bloco 7 - Problema #4]: Status virtual injetado exclusivamente para o Log de IA.
          mensagemLog = "📍 [Torre Operacional]: Entrega parcial concluída. Operação segue para a próxima parada da rota.";
          break;
        case AppTripState.ENTREGUE:
          mensagemLog = "🏁 [Torre Operacional]: Rota Finalizada com Sucesso! Valores aguardando liquidação pelo sistema Escrow.";
          break;
        case 'finalizado':
          mensagemLog = "💸 [Torre Operacional]: Repasse financeiro (PIX) liquidado com sucesso pela Administração. Operação arquivada.";
          break;
        case AppTripState.DISPONIVEL:
           if (contract?.isRecusa) {
             mensagemLog = "⚠️ [Torre Operacional]: Operação abortada/recusada. Carga devolvida ao Radar imediato.";
           }
           break;
        case 'agendado':
           if (contract?.isRecusa) {
             mensagemLog = "⚠️ [Torre Operacional]: Motorista cancelou a reserva. A operação retornou para o status Agendado aguardando o momento da coleta.";
           }
           break;
        case AppTripState.SEM_MOTORISTA:
           mensagemLog = "⚠️ [Torre Operacional]: Tempo limite do Radar excedido. Nenhum motorista disponível.";
           break;
        case AppTripState.EXPIRADO:
           mensagemLog = "⚠️ [Torre Operacional]: Reserva expirada por falta de pagamento. Operação abortada.";
           break;
        default:
          return; 
      }

      if (mensagemLog) {
        await addDoc(messagesRef, {
          texto: mensagemLog,
          nome: 'Torre de Controle (IA)',
          tipoUsuario: 'admin',
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn("[CTO-Log] Falha ao injetar log da IA no chat:", e);
    }
  }

  static async alterarStatusViagem(freteId: string, novoStatus: AppTripState | string, contract?: TripStateTransitionContract): Promise<boolean> {
    // 🔥 CTO FIX [Bloco 6 - Problema #2]: O Lock agora é na viagem, independente do status pretendido. Previne race conditions de comandos simultâneos.
    const lockKey = `trip-${freteId}`;

    if (!this.acquire(lockKey)) return false;

    try {
      const freteRef = doc(db, 'fretes', freteId);
      
      let statusCalculado = novoStatus;
      let wasForcedReset = false;
      let finalDocumentState: TripDocumentData | null = null;
      let statusAnterior: string | null = null; // 🔥 CTO FIX [Bloco 6 - Problema #4]: Cache do status pré-mutação
      let isEntregaParcial = false; // 🔥 CTO FIX [Bloco 7 - Problema #4]: Flag de controle local

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(freteRef);

        if (!snapshot.exists()) {
          throw new Error("FRETE_NAO_ENCONTRADO");
        }

        const data = snapshot.data() as TripDocumentData;
        statusAnterior = data.status as string; // Captura o estado original da base de dados
        
        const isAgendado = data.tipoFrete === 'agendado' || data.agendado === true;

        // 🔥 CTO FIX [Bloco 8]: Bloqueio de Concorrência atômico garantindo dupla proteção: tanto para o Aceite Direto quanto para a Reserva!
        if (novoStatus === AppTripState.ACEITO) {
            if (data.motoristaId && data.motoristaId !== contract?.motoristaId) {
                throw new Error("FRETE_JA_ATRIBUIDO");
            }
            if (data.pagamentoStatus !== 'aprovado') {
                throw new Error("PAGAMENTO_NAO_CONFIRMADO");
            }
            // Expansão da matriz de aceitação: Permite match com cargas no Dispatcher Ofertando/Aguardando e Agendamentos.
            if (!['disponivel', 'buscando_motorista', 'ofertando', 'aguardando_aceite', 'agendado'].includes(data.status as string)) {
                throw new Error("FRETE_JA_ATRIBUIDO");
            }
        }

        // 🔥 CTO FIX [Bloco 7 - Problema #2]: Expansão da matriz de estados cancelados para garantir a desvinculação completa
        const isForcedReset = novoStatus === AppTripState.DISPONIVEL && data.pagamentoStatus === 'aprovado' &&
          [
            AppTripState.SEM_MOTORISTA, 
            AppTripState.OFERTANDO,
            AppTripState.AGUARDANDO_ACEITE,
            AppTripState.REDISPATCH,
            AppTripState.TIMEOUT
          ].includes(data.status as AppTripState);

        wasForcedReset = isForcedReset;
        
        if (novoStatus !== 'finalizado') {
            const permitido = canTransition(data.status as AppTripState, novoStatus as AppTripState);
            if (!permitido && !isForcedReset) {
              throw new Error(`TRANSICAO_BLOQUEADA: De ${data.status} para ${novoStatus}`);
            }
        }

        const payloadUpdate: Partial<TripDocumentData> = {};

        if (novoStatus === 'finalizado') {
            payloadUpdate.status = novoStatus;
            payloadUpdate.atualizadoEm = serverTimestamp() as unknown;
            statusCalculado = novoStatus;
        } else {
            // 🔥 CTO FIX [Bloco 6 - Problema #1]: Cálculo de Múltiplas Paradas primeiro, Sincronização depois.
            let paradaAtualIndex = (data.paradaAtualIndex as number) || 0;
            const totalParadas = data.paradas && Array.isArray(data.paradas) ? data.paradas.length : 1;

            statusCalculado = novoStatus as string;

            if (isForcedReset && novoStatus === AppTripState.DISPONIVEL && isAgendado) {
                statusCalculado = 'agendado';
                payloadUpdate.dispatchStatus = 'retido_agendamento';
            }

            // Interceptação: Se a viagem tentar finalizar, mas houver mais paradas.
            if (novoStatus === AppTripState.ENTREGUE && paradaAtualIndex + 1 < totalParadas) {
              paradaAtualIndex += 1;
              statusCalculado = AppTripState.EM_TRANSPORTE; 
              isEntregaParcial = true; // 🔥 CTO FIX [Bloco 7 - Problema #4]: Ativa flag para a IA não se perder
            }

            // Geramos o runtime apenas DEPOIS de decidir o verdadeiro status (statusCalculado)
            const runtime = StateSynchronizationService.synchronize(
              (data.driverState as DriverState) || DriverState.ONLINE,
              statusCalculado as AppTripState
            );

            payloadUpdate.status = statusCalculado;
            payloadUpdate.paradaAtualIndex = paradaAtualIndex;
            payloadUpdate.runtime = runtime;
            payloadUpdate.atualizadoEm = serverTimestamp() as unknown;

            if (contract) {
              if (contract.dispatchStatus !== undefined) payloadUpdate.dispatchStatus = contract.dispatchStatus;
              if (contract.dispatchIndex !== undefined) payloadUpdate.dispatchIndex = contract.dispatchIndex;
              if (contract.dispatchTentativa !== undefined) payloadUpdate.dispatchTentativa = contract.dispatchTentativa;
              if (contract.filaTotal !== undefined) payloadUpdate.filaTotal = contract.filaTotal;
              if (contract.motoristaAtualDestaque !== undefined) payloadUpdate.motoristaAtualDestaque = contract.motoristaAtualDestaque;
              if (contract.motoristaAtualNome !== undefined) payloadUpdate.motoristaAtualNome = contract.motoristaAtualNome;
              if (contract.motoristaId !== undefined) payloadUpdate.motoristaId = contract.motoristaId;
              if (contract.motoristaNome !== undefined) payloadUpdate.motoristaNome = contract.motoristaNome;
              if (contract.motoristaZap !== undefined) payloadUpdate.motoristaZap = contract.motoristaZap;
              if (contract.motoristaTelefone !== undefined) payloadUpdate.motoristaTelefone = contract.motoristaTelefone;
              
              // 🔥 CTO FIX [Bloco 8]: Gravação dos metadados visuais do veículo/motorista
              if (contract.veiculo !== undefined) payloadUpdate.veiculo = contract.veiculo;
              if (contract.placa !== undefined) payloadUpdate.placa = contract.placa;
              if (contract.foto !== undefined) payloadUpdate.foto = contract.foto;
              if (contract.avaliacao !== undefined) payloadUpdate.avaliacao = contract.avaliacao;

              if (contract.alertaInsucesso !== undefined) payloadUpdate.alertaInsucesso = contract.alertaInsucesso;
              if (contract.motivoCancelamento !== undefined) payloadUpdate.motivoCancelamento = contract.motivoCancelamento;
              if (contract.entregueEm !== undefined) payloadUpdate.entregueEm = contract.entregueEm;
              if (contract.canceladoPorMotoristaEm !== undefined) payloadUpdate.canceladoPorMotoristaEm = contract.canceladoPorMotoristaEm;
              
              if (contract.pagamentoStatus !== undefined) payloadUpdate.pagamentoStatus = contract.pagamentoStatus;
              if (contract.pagoEm !== undefined) payloadUpdate.pagoEm = contract.pagoEm;
              if (contract.reservaExpiraEm !== undefined) payloadUpdate.reservaExpiraEm = contract.reservaExpiraEm;
              if (contract.reservadoEm !== undefined) payloadUpdate.reservadoEm = contract.reservadoEm;
            }

            if (isForcedReset) {
              payloadUpdate.motoristaId = null;
              payloadUpdate.motoristaNome = null;
              payloadUpdate.motoristaZap = null;
              payloadUpdate.motoristaTelefone = null;
              payloadUpdate.motoristaAtualDestaque = null;
              payloadUpdate.motoristaLat = null;
              payloadUpdate.motoristaLng = null;
              // Limpeza dos atributos visuais em caso de reset do frete
              payloadUpdate.veiculo = null;
              payloadUpdate.placa = null;
              payloadUpdate.foto = null;
              payloadUpdate.avaliacao = null;
            }
        }

        transaction.update(freteRef, payloadUpdate as { [x: string]: any });

        finalDocumentState = {
          ...data,
          ...payloadUpdate,
          id: freteId
        } as TripDocumentData;
      });

      if (!finalDocumentState) return false;

      // 🔥 CTO FIX [Bloco 7 - Problema #4]: Envia o status virtual de entrega parcial se a flag foi ativada.
      await this.registrarEventoDeIA(freteId, isEntregaParcial ? 'entrega_parcial' : (statusCalculado as string), contract);

      const freightPayloadToBroadcast = { ...finalDocumentState } as unknown as FretePayload;
      
      if ((statusCalculado === AppTripState.DISPONIVEL || statusCalculado === 'agendado') && wasForcedReset) {
         ftiRadar.dispatch({ userId: 'system', eventType: 'DRIVER_CANCELED', data: freightPayloadToBroadcast, timestamp: new Date().toISOString() });
      }
      
      // 🔥 CTO FIX [Bloco 6 - Problema #4]: Disparo restrito de TRIP_STARTED. Garante que só dispare ao sair de COLETANDO, evitando eco em Multi-Stop.
      if (statusCalculado === AppTripState.EM_TRANSPORTE && statusAnterior === AppTripState.COLETANDO) {
         ftiRadar.dispatch({ userId: finalDocumentState.motoristaId || 'unknown', eventType: 'TRIP_STARTED', data: freightPayloadToBroadcast, timestamp: new Date().toISOString() });
      }
      
      if (statusCalculado === AppTripState.ENTREGUE || statusCalculado === 'finalizado') {
         ftiRadar.dispatch({ userId: finalDocumentState.motoristaId || 'unknown', eventType: 'TRIP_COMPLETED', data: freightPayloadToBroadcast, timestamp: new Date().toISOString() });
      }

      if (statusCalculado === AppTripState.DISPONIVEL && finalDocumentState.dispatchStatus !== 'aberto_no_feed') {
        try {
          DispatchQueueService.iniciarFila(freightPayloadToBroadcast).catch((err: unknown) => 
            console.error('[CTO-Log] AUTO_DISPATCH_ERROR', err)
          );
        } catch (dispatchError: unknown) {
          console.error('[CTO-Log] Falha ao iniciar auto-dispatch:', dispatchError);
        }
      }

      return true;

    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn(`[CTO-Log] REJEICAO DE TRANSICAO: ${error.message}`);
      }
      return false;
    } finally {
      this.release(lockKey);
    }
  }

  static async executarRedispatch(frete: FretePayload): Promise<void> {
    try {
      await this.alterarStatusViagem(frete.id, AppTripState.DISPONIVEL, { isRecusa: true });
    } catch (error: unknown) {
      console.error('[CTO-Log] REDISPATCH_ERROR', error);
    }
  }
}

export default TripLifecycleService;
