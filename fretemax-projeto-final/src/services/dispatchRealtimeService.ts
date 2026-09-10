// =========================================================
// NOME DO ARQUIVO: src/services/dispatchRealtimeService.ts
// CTO-Log: FASE 4 - Reconstrução Controlada (Etapa 3).
// Evolução Fase 5: Motorista agora assume a Reserva (RESERVADO_AGUARDANDO_PAGAMENTO) antes do Aceite Real.
// Evolução Fase 6: Liberação do motorista (Destravamento da Reserva + Start GPS) interligada ao Webhook Financeiro.
// Evolução Fase 12 (Escrow): Ajuste para Timeout de 5 Minutos. Expiração de frete direciona para EXPIRADO (não retorna ao radar automaticamente).
// EXECUÇÃO BLOCO 8 (Prob #2): Expansão de payload (veiculo, placa, foto) na esteira de aceite.
// EXECUÇÃO BLOCO 11 (CTO FIX): Leitura de Pagamento Pré-Aceite. Bypass direto para ACEITO se pagamentoStatus já for 'aprovado'. Fim da sobrescrita cega.
// =========================================================

import { increment, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { firebaseRealtimeService } from './firebaseRealtimeService';
import { locationRealtimeService } from './locationRealtimeService';
import { DriverState } from '../state/driverStateMachine';
import { AppTripState } from '../state/tripStateMachine';
import { TripLifecycleService } from './tripLifecycleService';

class DispatchRealtimeService {
  async setDriverOnline(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        online: true,
        disponivel: true,
        state: DriverState.ONLINE,
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO DRIVER ONLINE:', error);
    }
  }

  async setDriverOffline(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        online: false,
        disponivel: false,
        state: DriverState.OFFLINE,
        atualizadoEm: Date.now(),
      });
      locationRealtimeService.stop();
    } catch (error) {
      console.error('ERRO DRIVER OFFLINE:', error);
    }
  }

  async enviarOfertaRealtime(driverId: string, payload: Record<string, unknown>) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        novaOferta: {
          ...payload,
          status: 'pendente',
          criadaEm: Date.now(),
          expiraEm: Date.now() + 45000, 
        },
        state: DriverState.RECEBENDO_OFERTA,
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO OFERTA REALTIME:', error);
    }
  }

  // 🔥 CTO FIX [Blocos 8 e 11]: Expansão visual e Roteamento de Estado Baseado em Pagamento.
  async aceitarCorrida(driverId: string, freteId: string, driverData?: { nome?: string, whatsapp?: string, veiculo?: string, placa?: string, foto?: string, avaliacao?: number }) {
    try {
      // 1. Consulta obrigatória (Zero Trust): Ler o estado atual do frete antes de mutá-lo.
      const freteRef = doc(db, 'fretes', freteId);
      const freteSnap = await getDoc(freteRef);

      if (!freteSnap.exists()) {
        throw new Error('FRETE_NAO_ENCONTRADO');
      }

      const freteData = freteSnap.data();
      const isPago = freteData.pagamentoStatus === 'aprovado';

      const now = Date.now();
      const expiraEm = now + 5 * 60 * 1000; // 5 Minutos cravados de timeout (se necessário).

      // 2. Roteamento Dinâmico de Máquina de Estados
      const nextTripState = isPago ? AppTripState.ACEITO : AppTripState.RESERVADO_AGUARDANDO_PAGAMENTO;
      const nextDriverState = isPago ? DriverState.ACEITOU : DriverState.RESERVADO;

      // 3. Injeção dos dados visuais do motorista e alteração de status.
      const sucesso = await TripLifecycleService.alterarStatusViagem(freteId, nextTripState, { 
        motoristaId: driverId,
        motoristaNome: driverData?.nome || 'Motorista',
        motoristaTelefone: driverData?.whatsapp || '',
        veiculo: driverData?.veiculo || null,
        placa: driverData?.placa || null,
        foto: driverData?.foto || null,
        avaliacao: driverData?.avaliacao || 5.0,
        reservadoEm: now,
        // 🔥 CTO FIX: Se já estiver pago, não há expiração de reserva e não sobrescrevemos o status financeiro.
        reservaExpiraEm: isPago ? null : expiraEm,
        ...(isPago ? {} : { pagamentoStatus: 'pendente' }) 
      });

      if (!sucesso) {
        throw new Error('FRETE_JA_ATRIBUIDO');
      }

      // 4. Atualiza o radar do motorista com o estado correto.
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: nextDriverState, 
        freteAtualId: freteId,
        activeTripId: freteId, 
        disponivel: false,
        atualizadoEm: Date.now(),
      });

    } catch (error) {
      console.error('ERRO ACEITE DE CORRIDA:', error);
      throw error;
    }
  }

  // 🔥 CTO FIX: Aborta a viagem automaticamente e liberta o motorista se o cliente demorar a pagar (Timeout de 5 minutos).
  async cancelarReservaPorTimeout(driverId: string, freteId: string) {
    try {
      // 1. Limpa o Motorista (Volta pro Radar Livre)
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: DriverState.ONLINE, 
        freteAtualId: null,
        activeTripId: null,
        currentTripId: null,
        disponivel: true,
        atualizadoEm: Date.now(),
      });

      // 2. Devolve o Frete do Cliente para "DISPONIVEL" (Retorna pro Feed)
      await TripLifecycleService.alterarStatusViagem(freteId, AppTripState.DISPONIVEL, {
        motoristaId: null,
        motoristaNome: null,
        motoristaTelefone: null,
        motoristaZap: null,
        // Limpeza dos novos campos em caso de timeout
        veiculo: null,
        placa: null,
        foto: null,
        avaliacao: null,
        alertaInsucesso: true,
        isRecusa: true,
        motivoCancelamento: 'O cliente não realizou o pagamento no prazo de 5 minutos.'
      });

      locationRealtimeService.stop();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('FRETOGO_TRIP_FINISHED'));
    } catch (error) {
      console.error('ERRO AO CANCELAR RESERVA POR TIMEOUT:', error);
      throw error;
    }
  }

  async confirmarLiberacaoMotorista(freteId: string, motoristaId?: string) {
    try {
      const currentUid = auth.currentUser?.uid;
      
      if (!currentUid) return;

      if (motoristaId && currentUid !== motoristaId) {
        console.warn(`[CTO-Log] Liberação ignorada: O motorista local (${currentUid}) não é o titular desta reserva.`);
        return;
      }

      await firebaseRealtimeService.updateDriverRealtime(currentUid, {
        state: DriverState.ACEITOU,
        freteAtualId: freteId,
        activeTripId: freteId, 
        disponivel: false,
        atualizadoEm: Date.now(),
      });

      console.log(`[CTO-Log] Operação ${freteId} liberada pelo Escrow! Motorista ${currentUid} destravado (ACEITOU).`);
    } catch (error) {
      console.error('[CTO-Log] ERRO AO CONFIRMAR LIBERAÇÃO DO MOTORISTA:', error);
    }
  }

  async concluirViagemELiberarMotorista(driverId: string, freteId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: DriverState.ONLINE, 
        freteAtualId: null,
        activeTripId: null, 
        currentTripId: null, 
        disponivel: true,
        atualizadoEm: Date.now(),
      });

      await TripLifecycleService.alterarStatusViagem(freteId, AppTripState.ENTREGUE, {
        entregueEm: Date.now()
      });

      locationRealtimeService.stop();
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('FRETOGO_TRIP_FINISHED'));
      }
    } catch (error) {
      console.error('ERRO AO CONCLUIR VIAGEM:', error);
      throw error;
    }
  }

  async cancelarViagemMotorista(driverId: string, freteId: string, motivo: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: DriverState.ONLINE, 
        freteAtualId: null,
        activeTripId: null,
        currentTripId: null,
        disponivel: true,
        atualizadoEm: Date.now(),
      });

      await TripLifecycleService.alterarStatusViagem(freteId, AppTripState.DISPONIVEL, {
        isRecusa: true,
        motivoCancelamento: motivo,
        canceladoPorMotoristaEm: Date.now()
      });

      locationRealtimeService.stop();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('FRETOGO_TRIP_FINISHED'));
      }
    } catch (error) {
      console.error('ERRO AO ABORTAR VIAGEM:', error);
      throw error;
    }
  }

  async iniciarColeta(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: DriverState.INDO_COLETA,
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO INICIAR COLETA:', error);
    }
  }

  async chegouColeta(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: DriverState.CHEGOU_COLETA,
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO CHEGADA COLETA:', error);
    }
  }

  async iniciouColetando(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: DriverState.COLETANDO,
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO COLETANDO:', error);
    }
  }

  async iniciarTransporte(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: DriverState.EM_TRANSPORTE,
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO TRANSPORTE:', error);
    }
  }

  async finalizarEntrega(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: DriverState.FINALIZANDO,
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO FINALIZAÇÃO:', error);
    }
  }

  async atualizarTripRealtime(tripId: string, payload: Record<string, unknown>) {
    try {
      await firebaseRealtimeService.updateTripRealtime(tripId, {
        ...payload,
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO TRIP REALTIME:', error);
    }
  }

  async atualizarStatusTrip(tripId: string, status: AppTripState) {
    try {
      if (status === AppTripState.ENTREGUE && auth.currentUser?.uid) {
        await this.concluirViagemELiberarMotorista(auth.currentUser.uid, tripId);
        return;
      }
      
      await TripLifecycleService.alterarStatusViagem(tripId, status);
    } catch (error) {
      console.error('ERRO STATUS TRIP:', error);
      throw error;
    }
  }

  async salvarChavePix(freteId: string, chavePix: string) {
    try {
      await firebaseRealtimeService.updateTripRealtime(freteId, {
        chavePixMotorista: chavePix,
        pixEnviadoEm: Date.now()
      });
    } catch (error) {
      console.error('ERRO AO SALVAR PIX:', error);
      throw error;
    }
  }

  async registrarVisualizacao(freteId: string) {
    try {
      await firebaseRealtimeService.updateTripRealtime(freteId, {
        visualizacoes: increment(1)
      });
    } catch (error) {
      console.warn('Falha silenciosa ao registrar view no banco:', error);
    }
  }

  async registrarInteresse(freteId: string) {
    try {
      await firebaseRealtimeService.updateTripRealtime(freteId, {
        interessados: increment(1)
      });
    } catch (error) {
      console.warn('Falha silenciosa ao registrar interesse no banco:', error);
    }
  }
}

export const dispatchRealtimeService = new DispatchRealtimeService();
