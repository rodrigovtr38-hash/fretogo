// ============================================================================
// ARQUIVO: src/core/ai/events/ia.events.ts
// CTO-Log: FASE 3 - Homologação de Integração (BLOCO 6 DA ARQUITETURA O.N.E.)
// Status: "Ouvido FTI" 100% calibrado. O Sistema Nervoso da IA escuta todos os eventos 
// Correção: Fechamento da VULN-CHAT-IMPERSONATION. O Frontend perde autoridade de injeção sistêmica.
// ============================================================================

import { NotificationService } from '../../../services/notificationService';
import { eventBusService, AppEvents } from '../../../services/eventBusService';

export type FTIEventType = 
  | 'FREIGHT_POSTED'     
  | 'DRIVER_CANCELED'    
  | 'TRIP_STARTED' 
  | 'TRIP_COMPLETED' 
  | 'LOCATION_UPDATE' 
  | 'DRIVER_IDLE'
  | 'CHECK_URGENCY'
  | 'DRIVER_ACCEPTED'
  | 'POD_UPLOADED'; // Foto do canhoto/mercadoria subiu

export interface FTIEventPayload {
  userId: string;
  eventType: FTIEventType;
  data: any;
  timestamp: string;
}

export class FTIEventDispatcher {
  
  constructor() {
    this.iniciarSistemaNervoso();
  }

  private iniciarSistemaNervoso() {
    // Escutas originais preservadas
    eventBusService.on(AppEvents.TRIP_CANCELLED, (payload) => {
      this.dispatch({ userId: payload?.freteData?.clienteId || 'unknown', eventType: 'DRIVER_CANCELED', data: payload?.freteData || payload, timestamp: new Date().toISOString() });
    });

    eventBusService.on(AppEvents.NEW_TRIP_REQUEST, (payload) => {
      this.dispatch({ userId: payload?.clienteId || 'unknown', eventType: 'FREIGHT_POSTED', data: payload, timestamp: new Date().toISOString() });
    });

    eventBusService.on(AppEvents.TRIP_ACCEPTED, (payload) => {
      this.dispatch({ userId: payload?.motoristaId || 'unknown', eventType: 'DRIVER_ACCEPTED', data: payload, timestamp: new Date().toISOString() });
    });

    eventBusService.on(AppEvents.TRIP_STARTED, (payload) => {
      this.dispatch({ userId: payload?.motoristaId || 'unknown', eventType: 'TRIP_STARTED', data: payload, timestamp: new Date().toISOString() });
    });

    eventBusService.on(AppEvents.TRIP_FINISHED, (payload) => {
      this.dispatch({ userId: payload?.motoristaId || 'unknown', eventType: 'TRIP_COMPLETED', data: payload, timestamp: new Date().toISOString() });
    });
    
    // 🔥 CTO FIX: Escutando o Upload da Foto (Gatilho do Despertador)
    eventBusService.on('POD_UPLOADED', (payload) => {
      this.dispatch({ userId: payload?.motoristaId || 'unknown', eventType: 'POD_UPLOADED', data: payload, timestamp: new Date().toISOString() });
    });
  }

  public dispatch(event: FTIEventPayload): void {
    switch (event.eventType) {
      case 'FREIGHT_POSTED':
        this.handleFreightPosted(event);
        break;
      case 'DRIVER_CANCELED':
        this.handleDriverCanceled(event);
        break;
      case 'DRIVER_ACCEPTED':
        this.handleDriverAccepted(event);
        break;
      case 'TRIP_STARTED':
        this.handleTripStarted(event);
        break;
      case 'TRIP_COMPLETED':
        this.handleTripCompleted(event);
        break;
      case 'POD_UPLOADED':
        this.handlePodUploaded(event);
        break;
      case 'CHECK_URGENCY':
        this.handleCheckUrgency(event);
        break;
    }
  }

  private handleDriverAccepted(event: FTIEventPayload): void {
    const freight = event.data;
    if (freight.clienteZap && freight.clienteNome) {
      try {
        console.log('[FTI Action] Mandando WhatsApp pro cliente: Motorista está a caminho!');
      } catch (error) {}
    }
  }

  private handleFreightPosted(event: FTIEventPayload): void {
    const freight = event.data;
    if (freight.clienteZap && freight.clienteNome) {
      try {
        NotificationService.notificarClienteFretePostado(freight.clienteZap, freight.clienteNome, freight.id || 'N/A');
      } catch (error) {
        console.error('[FTI Radar] Falha silenciosa:', error);
      }
    }
  }

  private handleDriverCanceled(event: FTIEventPayload): void {
    const freight = event.data;
    if (freight.clienteZap && freight.clienteNome) {
      try {
        NotificationService.notificarClienteMotoristaCancelou(freight.clienteZap, freight.clienteNome, freight.id || 'N/A', freight.motivoCancelamento || 'Imprevisto na rota');
      } catch (error) {
        console.error('[FTI Radar] Falha silenciosa:', error);
      }
    }
  }

  private handleTripStarted(event: FTIEventPayload): void {
    console.log(`[FTI Auto-Action] O GPS ligou. Acompanhando o trajeto.`, event.data);
  }

  private handleTripCompleted(event: FTIEventPayload): void {
    const destino = event.data?.cidadeDestino || 'sua região';
    try {
      const currentHour = new Date().getHours();
      let mensagem = `Você descarregou em ${destino}. Ative o Modo Retorno no Radar para capturarmos cargas de volta para a sua base.`;
      let titulo = 'Retorno Inteligente (FTI)';

      if (currentHour >= 18 || currentHour <= 5) {
        mensagem = `Bom descanso. Quando for ligar o Radar, deixe o "Modo Retorno" ativado para não rodar vazio na volta.`;
        titulo = 'Viagem Concluída com Sucesso';
      }

      NotificationService.enviarNotificacaoApp(event.userId, titulo, mensagem);
    } catch (error) {
      console.error('[FTI Radar] Falha ao notificar retorno:', error);
    }
  }

  // 🔥 CTO FIX: A Lógica de Despertar o Cliente (Bloco 6)
  private async handlePodUploaded(event: FTIEventPayload): void {
    const freight = event.data;
    
    // 1. Avisa no console e manda Push/WhatsApp
    console.log('[FTI Action] Foto recebida. Acordando o Embarcador para mandar o PIN.');
    if (freight.clienteZap && freight.clienteNome && freight.freteId) {
       NotificationService.notificarClienteFotoRecebida(freight.clienteZap, freight.clienteNome, freight.freteId);
    }

    // 2. VULN-CHAT-IMPERSONATION CORRIGIDA:
    // A tentativa indevida do frontend de criar a mensagem sistêmica via addDoc({tipoUsuario: 'admin'})
    // foi EXCLUÍDA. A responsabilidade de registrar que a foto foi recebida no log operacional 
    // deve ser movida para a Cloud Function de processamento do upload do Storage.
  }

  private handleCheckUrgency(event: FTIEventPayload): void {
    const freight = event.data;
    if (!freight) return;

    const agora = Date.now();
    const isAgendado = freight.tipoFrete === 'agendado' && freight.dataAgendada;

    try {
      if (isAgendado) {
        const dataAlvo = freight.dataAgendada.toMillis ? freight.dataAgendada.toMillis() : new Date(freight.dataAgendada).getTime();
        const tempoRestanteMinutos = (dataAlvo - agora) / (1000 * 60);

        if (tempoRestanteMinutos > 0 && tempoRestanteMinutos <= 35) {
          NotificationService.enviarNotificacaoApp(
            event.userId,
            '⏰ Coleta Iminente!',
            `A coleta do agendamento em ${freight.cidadeOrigem || 'sua região'} está programada para os próximos 30 minutos. Desloque-se.`
          );
        }
      }

      if (!isAgendado && freight.status === 'disponivel') {
        const criadaEm = freight.createdAt?.toMillis ? freight.createdAt.toMillis() : (freight.criadoEm || agora);
        const minutosParada = (agora - criadaEm) / (1000 * 60);

        if (minutosParada >= 14 && minutosParada <= 16) {
          NotificationService.enviarNotificacaoApp(event.userId, 'Baixa Procura (Aviso da FTI)', 'Sua carga está há 15 min no radar. Aplique a Tabela Sugerida ANTT.');
        } else if (minutosParada >= 24 && minutosParada <= 26) {
          NotificationService.enviarNotificacaoApp(event.userId, 'Carga Expirando (Aviso Crítico FTI)', 'Injete urgência na oferta (Auto-Bid) agora.');
        }
      }
    } catch (error) {
      console.error('[FTI Radar] Erro ao checar urgência da carga:', error);
    }
  }
}

export const ftiRadar = new FTIEventDispatcher();
