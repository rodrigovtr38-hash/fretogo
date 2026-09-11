// =========================================================
// NOME DO ARQUIVO: src/services/dispatchRealtimeService.ts
// Fluxo vigente: somente frete pago entra no Feed e o aceite segue direto para ACEITO.
// Autoridade operacional: Cloud Functions autenticadas; navegador não decide status.
// =========================================================

import { auth } from '../firebase';
import { firebaseRealtimeService } from './firebaseRealtimeService';
import { locationRealtimeService } from './locationRealtimeService';
import { DriverState } from '../state/driverStateMachine';
import { AppTripState } from '../state/tripStateMachine';
import { TripLifecycleService } from './tripLifecycleService';

class DispatchRealtimeService {
  async setDriverOnline(driverId: string) {
    try {
      if (!driverId || auth.currentUser?.uid !== driverId) throw new Error('MOTORISTA_NAO_AUTENTICADO');
      await TripLifecycleService.atualizarDisponibilidadeMotorista(true);
    } catch (error) {
      console.error('ERRO DRIVER ONLINE:', error);
      throw error;
    }
  }

  async setDriverOffline(driverId: string) {
    try {
      if (!driverId || auth.currentUser?.uid !== driverId) throw new Error('MOTORISTA_NAO_AUTENTICADO');
      await TripLifecycleService.atualizarDisponibilidadeMotorista(false);
      locationRealtimeService.stop();
    } catch (error) {
      console.error('ERRO DRIVER OFFLINE:', error);
      throw error;
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
      if (!driverId || auth.currentUser?.uid !== driverId) throw new Error('MOTORISTA_NAO_AUTENTICADO');
      void driverData;
      await TripLifecycleService.executarAcaoMotorista(freteId, AppTripState.ACEITO);

    } catch (error) {
      console.error('ERRO ACEITE DE CORRIDA:', error);
      throw error;
    }
  }

  // 🔥 CTO FIX: Aborta a viagem automaticamente e liberta o motorista se o cliente demorar a pagar (Timeout de 5 minutos).
  async cancelarReservaPorTimeout(driverId: string, freteId: string) {
    void driverId;
    void freteId;
    throw new Error('FLUXO_OBSOLETO: o motorista nunca aguarda pagamento após o aceite.');
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
    void driverId;
    void freteId;
    throw new Error('FINALIZACAO_EXIGE_PIN_E_LIQUIDACAO_SEGURA');
  }

  async cancelarViagemMotorista(driverId: string, freteId: string, motivo: string) {
    try {
      if (!driverId || auth.currentUser?.uid !== driverId) throw new Error('MOTORISTA_NAO_AUTENTICADO');
      await TripLifecycleService.executarAcaoMotorista(freteId, 'cancelar_motorista', motivo);

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
      if (![AppTripState.INDO_COLETA, AppTripState.CHEGOU_COLETA, AppTripState.COLETANDO].includes(status)) {
        throw new Error('TRANSICAO_EXIGE_FLUXO_SEGURO_DE_PIN');
      }
      await TripLifecycleService.executarAcaoMotorista(tripId, status);
    } catch (error) {
      console.error('ERRO STATUS TRIP:', error);
      throw error;
    }
  }

  async salvarChavePix(freteId: string, chavePix: string) {
    void freteId;
    void chavePix;
    throw new Error('USE_LIQUIDAR_VIAGEM_MOTORISTA');
  }

  async registrarVisualizacao(freteId: string) {
    try {
      await TripLifecycleService.registrarInteracaoMotorista(freteId, 'visualizacao');
    } catch (error) {
      console.warn('Falha silenciosa ao registrar view no banco:', error);
    }
  }

  async registrarInteresse(freteId: string) {
    try {
      await TripLifecycleService.registrarInteracaoMotorista(freteId, 'interesse');
    } catch (error) {
      console.warn('Falha silenciosa ao registrar interesse no banco:', error);
    }
  }

  async registrarFavorito(freteId: string) {
    try {
      await TripLifecycleService.registrarInteracaoMotorista(freteId, 'favorito');
    } catch (error) {
      console.warn('Falha silenciosa ao registrar favorito no banco:', error);
    }
  }
}

export const dispatchRealtimeService = new DispatchRealtimeService();
