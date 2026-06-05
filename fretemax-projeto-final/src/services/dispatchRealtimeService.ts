// src/services/dispatchRealtimeService.ts
import { firebaseRealtimeService } from './firebaseRealtimeService';
import { locationRealtimeService } from './locationRealtimeService'; // 🔥 Injetamos a Antena!

class DispatchRealtimeService {
  async setDriverOnline(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        online: true,
        disponivel: true,
        state: 'ONLINE',
        atualizadoEm: Date.now(),
      });
      // 🔥 GATILHO DA ANTENA: Liga o GPS imediatamente ao ficar online
      locationRealtimeService.start(driverId);
    } catch (error) {
      console.error('ERRO DRIVER ONLINE:', error);
    }
  }

  async setDriverOffline(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        online: false,
        disponivel: false,
        state: 'OFFLINE',
        atualizadoEm: Date.now(),
      });
      // 🛑 DESLIGA A ANTENA para economizar bateria do motorista
      locationRealtimeService.stop();
    } catch (error) {
      console.error('ERRO DRIVER OFFLINE:', error);
    }
  }

  async enviarOfertaRealtime(driverId: string, payload: any) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        novaOferta: {
          ...payload,
          status: 'pendente',
          criadaEm: Date.now(),
        },
        state: 'RECEBENDO_OFERTA',
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO OFERTA REALTIME:', error);
    }
  }

  async aceitarCorrida(driverId: string, freteId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: 'ACEITOU',
        freteAtualId: freteId,
        disponivel: false, // Tira ele da roleta para não receber 2 viagens
        atualizadoEm: Date.now(),
      });
      // 🔥 Atualiza a Antena para injetar o GPS direto no Frete (Para o Cliente ver!)
      locationRealtimeService.start(driverId, freteId);
    } catch (error) {
      console.error('ERRO ACEITE:', error);
    }
  }

  async iniciarColeta(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: 'INDO_COLETA',
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO INICIAR COLETA:', error);
    }
  }

  async chegouColeta(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: 'COLETANDO',
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO CHEGADA COLETA:', error);
    }
  }

  async iniciarTransporte(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: 'EM_TRANSPORTE',
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO TRANSPORTE:', error);
    }
  }

  async finalizarEntrega(driverId: string) {
    try {
      await firebaseRealtimeService.updateDriverRealtime(driverId, {
        state: 'FINALIZANDO',
        disponivel: true, // Volta para a roleta!
        freteAtualId: null,
        atualizadoEm: Date.now(),
      });
      // 🔥 A viagem acabou, o GPS para de mandar dados para a corrida
      locationRealtimeService.start(driverId); 
    } catch (error) {
      console.error('ERRO FINALIZAÇÃO:', error);
    }
  }

  // Funções que o Motorista pode usar para atualizar a viagem em si (Ex: Heartbeat)
  async atualizarTripRealtime(tripId: string, payload: any) {
    try {
      await firebaseRealtimeService.updateTripRealtime(tripId, {
        ...payload,
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO TRIP REALTIME:', error);
    }
  }

  async atualizarStatusTrip(tripId: string, status: string) {
    try {
      await firebaseRealtimeService.updateTripRealtime(tripId, {
        status,
        atualizadoEm: Date.now(),
      });
    } catch (error) {
      console.error('ERRO STATUS TRIP:', error);
    }
  }
}

export const dispatchRealtimeService = new DispatchRealtimeService();
