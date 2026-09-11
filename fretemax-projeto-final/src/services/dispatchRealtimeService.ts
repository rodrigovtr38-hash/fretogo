// =========================================================
// NOME DO ARQUIVO: src/services/dispatchRealtimeService.ts
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

  // 🔥 CTO FIX: Fim do modelo "Aceitar e Esperar". Motorista só entra em cena se estiver PAGO.
  async aceitarCorrida(driverId: string, freteId: string, driverData?: { nome?: string, whatsapp?: string, veiculo?: string, placa?: string, foto?: string, avaliacao?: number }) {
    try {
      // 1. Consulta obrigatória (Zero Trust)
      const freteRef = doc(db, 'fretes', freteId);
      const freteSnap = await getDoc(freteRef);

      if (!freteSnap.exists()) {
        throw new Error('FRETE_NAO_ENCONTRADO');
      }

      const freteData = freteSnap.data();
      const isPago = freteData.pagamentoStatus === 'aprovado';

      // 2. Trava de Arquitetura: Rejeita sumariamente o motorista se o frete não estiver aprovado financeiramente
      if (!isPago) {
        console.warn(`[DISPATCH] Tentativa de aceite rejeitada. Frete ${freteId} não possui pagamento aprovado.`);
        throw new Error('PAGAMENTO_PENDENTE_OU_INVALIDO');
      }

      const now = Date.now();

      // 3. Roteamento Direto para Operação Viva
      const nextTripState = AppTripState.ACEITO;
      const nextDriverState = DriverState.ACEITOU;

      // 4. Injeção dos dados visuais do motorista e alteração de status.
      const sucesso = await TripLifecycleService.alterarStatusViagem(freteId, nextTripState, { 
        motoristaId: driverId,
        motoristaNome: driverData?.nome || 'Motorista',
        motoristaTelefone: driverData?.whatsapp || '', // fallback
        motoristaZap: driverData?.whatsapp || null,
        veiculo: driverData?.veiculo || null,
        placa: driverData?.placa || null,
        foto: driverData?.foto || null,
        avaliacao: driverData?.avaliacao || 5.0,
        reservadoEm: now,
        reservaExpiraEm: null // Não existe mais reserva, viagem cravada.
      });

      if (!sucesso) {
        throw new Error('FRETE_JA_ATRIBUIDO_OU_CANCELADO');
      }

      // 5. Atualiza o radar do motorista direto pro front-line
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

  // Mantido apenas para evitar erros de importação antigos (Dead code para fretes novos)
  async cancelarReservaPorTimeout(driverId: string, freteId: string) {
    console.warn('[DEPRECATED] cancelarReservaPorTimeout invocado, porém reservas não são mais aplicáveis.');
  }

  // Mantido apenas para evitar erros de importação antigos (Dead code para fretes novos)
  async confirmarLiberacaoMotorista(freteId: string, motoristaId?: string) {
    console.warn('[DEPRECATED] confirmarLiberacaoMotorista invocado, porém fretes agora já nascem liberados após o aceite.');
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
