// =========================================================
// NOME DO ARQUIVO: src/services/tripLifecycleService.ts
// CTO-Log: FASE 4 - Correção de Build (Vercel) e Liquidação (Bloco 4).
// Status: Importação do DispatchQueueService ajustada (Maiúscula vs Minúscula).
// Evolução Fase 12 (Escrow): Blindagem atômica injetada no runTransaction.
// Correção Bloco 4: Injeção do status 'finalizado' no Tracker de Logs da Torre.
// Correção Bloco 04 (Execução): Preservação de campos financeiros (pagamentoStatus, pagoEm, reservaExpiraEm) no mapeamento genérico de transição.
// Correção Bloco de Agendamento: Bloqueio do Forced Reset para proteger cargas agendadas durante recusa de motoristas.
// =========================================================

import { doc, serverTimestamp, collection, addDoc, runTransaction } from 'firebase/firestore';
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
  [key: string]: unknown;
}

export interface TripStateTransitionContract {
  dispatchStatus?: string;
  dispatchIndex?: number;
  dispatchTentativa?: number;
  filaTotal?: number;
  motoristaAtualDestaque?: string | null;
  motoristaId?: string | null;
  motoristaNome?: string | null;
  motoristaZap?: string | null;
  motoristaTelefone?: string | null;
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

  private static async registrarEventoDeIA(freteId: string, novoStatus: AppTripState | string, contract?: TripStateTransitionContract) {
    try {
      const messagesRef = collection(db, 'fretes', freteId, 'chat');
      let mensagemLog = '';

      switch (novoStatus) {
        case AppTripState.RESERVADO_AGUARDANDO_PAGAMENTO as any:
          mensagemLog = "⏳ [Torre Operacional]: Motorista reservado. Aguardando confirmação financeira do Embarcador para liberar a rota.";
          break;
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
        case AppTripState.EM_TRANSPORTE:
          mensagemLog = "✅ [Torre Operacional]: Coleta finalizada (PIN validado). Motorista a caminho do Destino Final.";
          break;
        case AppTripState.ENTREGUE:
          mensagemLog = "🏁 [Torre Operacional]: Rota Finalizada com Sucesso! Valores aguardando liquidação pelo sistema Escrow.";
          break;
        case 'finalizado':
          // 🔥 CTO FIX: Registro financeiro definitivo (Bloco 4)
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
    const lockKey = `trip-${freteId}-${novoStatus}`;

    if (!this.acquire(lockKey)) return false;

    try {
      const freteRef = doc(db, 'fretes', freteId);
      
      let statusCalculado = novoStatus;
      let wasForcedReset = false;
      let finalDocumentState: TripDocumentData | null = null;

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(freteRef);

        if (!snapshot.exists()) {
          throw new Error("FRETE_NAO_ENCONTRADO");
        }

        const data = snapshot.data() as TripDocumentData;
        
        // 🔥 CTO FIX: Verifica proativamente se é uma carga agendada
        const isAgendado = data.tipoFrete === 'agendado' || data.agendado === true;

        // 🔥 CTO FIX (Escrow Atomic Lock): Impede que dois motoristas acessem ao mesmo tempo
        if (novoStatus === AppTripState.RESERVADO_AGUARDANDO_PAGAMENTO as any) {
            if (data.motoristaId && data.motoristaId !== contract?.motoristaId) {
                throw new Error("FRETE_JA_ATRIBUIDO");
            }
            if (!['disponivel', 'buscando_motorista'].includes(data.status as string)) {
                throw new Error("FRETE_JA_ATRIBUIDO");
            }
        }

        const isForcedReset = (novoStatus === AppTripState.DISPONIVEL || novoStatus === AppTripState.EXPIRADO) && 
          [
            AppTripState.RESERVADO_AGUARDANDO_PAGAMENTO as any,
            AppTripState.ACEITO, 
            AppTripState.INDO_COLETA, 
            AppTripState.CHEGOU_COLETA, 
            AppTripState.COLETANDO, 
            AppTripState.EM_TRANSPORTE, 
            AppTripState.SEM_MOTORISTA, 
            AppTripState.EXPIRADO,
            AppTripState.OFERTANDO,
            AppTripState.AGUARDANDO_ACEITE
          ].includes(data.status as AppTripState);

        wasForcedReset = isForcedReset;
        
        // Permite a transição para 'finalizado' que é gerenciada externamente pelo Admin
        if (novoStatus !== 'finalizado') {
            const permitido = canTransition(data.status as AppTripState, novoStatus as AppTripState);
            if (!permitido && !isForcedReset) {
              throw new Error(`TRANSICAO_BLOQUEADA: De ${data.status} para ${novoStatus}`);
            }
        }

        const payloadUpdate: Partial<TripDocumentData> = {};

        // 🔥 CTO FIX: Bypass rigoroso para satisfazer a regra do Firestore (Apenas chaves autorizadas)
        if (novoStatus === AppTripState.RESERVADO_AGUARDANDO_PAGAMENTO as any) {
            payloadUpdate.status = novoStatus;
            payloadUpdate.updatedAt = serverTimestamp() as unknown;
            
            if (contract) {
                if (contract.motoristaId !== undefined) payloadUpdate.motoristaId = contract.motoristaId;
                if (contract.motoristaNome !== undefined) payloadUpdate.motoristaNome = contract.motoristaNome;
                if (contract.motoristaTelefone !== undefined) payloadUpdate.motoristaTelefone = contract.motoristaTelefone;
                if (contract.reservadoEm !== undefined) payloadUpdate.reservadoEm = contract.reservadoEm;
                if (contract.reservaExpiraEm !== undefined) payloadUpdate.reservaExpiraEm = contract.reservaExpiraEm;
                if (contract.pagamentoStatus !== undefined) payloadUpdate.pagamentoStatus = contract.pagamentoStatus;
            }
            statusCalculado = novoStatus;
        } else if (novoStatus === 'finalizado') {
            payloadUpdate.status = novoStatus;
            payloadUpdate.atualizadoEm = serverTimestamp() as unknown;
            statusCalculado = novoStatus;
        } else {
            // Comportamento original para todos os outros fluxos operacionais
            const runtime = StateSynchronizationService.synchronize(
              (data.driverState as DriverState) || DriverState.ONLINE,
              novoStatus as AppTripState
            );

            let paradaAtualIndex = (data.paradaAtualIndex as number) || 0;
            const totalParadas = data.paradas && Array.isArray(data.paradas) ? data.paradas.length : 1;

            statusCalculado = runtime.tripState;
            
            // 🔥 CTO FIX: Intercepta o Forced Reset de Agendamento
            // Impede categoricamente que a recusa do motorista transforme uma carga futura em carga imediata
            if (isForcedReset && novoStatus === AppTripState.DISPONIVEL && isAgendado) {
                statusCalculado = 'agendado';
                payloadUpdate.dispatchStatus = 'retido_agendamento';
            }

            if (novoStatus === AppTripState.ENTREGUE && paradaAtualIndex + 1 < totalParadas) {
              paradaAtualIndex += 1;
              statusCalculado = AppTripState.EM_TRANSPORTE; 
            }

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
              if (contract.motoristaId !== undefined) payloadUpdate.motoristaId = contract.motoristaId;
              if (contract.motoristaNome !== undefined) payloadUpdate.motoristaNome = contract.motoristaNome;
              if (contract.motoristaZap !== undefined) payloadUpdate.motoristaZap = contract.motoristaZap;
              if (contract.motoristaTelefone !== undefined) payloadUpdate.motoristaTelefone = contract.motoristaTelefone;
              if (contract.alertaInsucesso !== undefined) payloadUpdate.alertaInsucesso = contract.alertaInsucesso;
              if (contract.motivoCancelamento !== undefined) payloadUpdate.motivoCancelamento = contract.motivoCancelamento;
              if (contract.entregueEm !== undefined) payloadUpdate.entregueEm = contract.entregueEm;
              if (contract.canceladoPorMotoristaEm !== undefined) payloadUpdate.canceladoPorMotoristaEm = contract.canceladoPorMotoristaEm;
              
              if (contract.pagamentoStatus !== undefined) payloadUpdate.pagamentoStatus = contract.pagamentoStatus;
              if (contract.pagoEm !== undefined) payloadUpdate.pagoEm = contract.pagoEm;
              if (contract.reservaExpiraEm !== undefined) payloadUpdate.reservaExpiraEm = contract.reservaExpiraEm;
            }

            if (isForcedReset) {
              payloadUpdate.motoristaId = null;
              payloadUpdate.motoristaNome = null;
              payloadUpdate.motoristaZap = null;
              payloadUpdate.motoristaTelefone = null;
              payloadUpdate.motoristaAtualDestaque = null;
              payloadUpdate.motoristaLat = null;
              payloadUpdate.motoristaLng = null;
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

      await this.registrarEventoDeIA(freteId, statusCalculado as string, contract);

      const freightPayloadToBroadcast = { ...finalDocumentState } as unknown as FretePayload;
      
      // CTO FIX: Emite evento de cancelamento tanto para disponíveis quanto agendados
      if ((statusCalculado === AppTripState.DISPONIVEL || statusCalculado === 'agendado') && wasForcedReset) {
         ftiRadar.dispatch({ userId: 'system', eventType: 'DRIVER_CANCELED', data: freightPayloadToBroadcast, timestamp: new Date().toISOString() });
      }
      if (statusCalculado === AppTripState.EM_TRANSPORTE) {
         ftiRadar.dispatch({ userId: finalDocumentState.motoristaId || 'unknown', eventType: 'TRIP_STARTED', data: freightPayloadToBroadcast, timestamp: new Date().toISOString() });
      }
      if (statusCalculado === AppTripState.ENTREGUE || statusCalculado === 'finalizado') {
         ftiRadar.dispatch({ userId: finalDocumentState.motoristaId || 'unknown', eventType: 'TRIP_COMPLETED', data: freightPayloadToBroadcast, timestamp: new Date().toISOString() });
      }

      // O Dispatch Ativo SÓ RODA se for DISPONIVEL
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
