// =========================================================
// NOME DO ARQUIVO: src/services/tripRealtimeListener.ts
// CTO-Log: Fase 6 - Homologação Operacional Distribuída (Liberação Financeira)
// Evolução Fase 10: Reação Ativa ao Rollback do Servidor (DISPONIVEL).
// Evolução Fase 18: Sincronismo Atômico de RTDB e Autoridade Logística (Firestore -> RTDB).
// Evolução Fase 23: Hydration Bug Fix (F5), Correção de PreviousState e Ghost Driver Fix.
// Evolução Fase 24 (Bloco 9): Correção da tipagem de payload e emissão do evento TRIP_RESERVED para a UI.
// =========================================================

import {
  eventBusService,
  AppEvents,
} from './eventBusService';

import {
  AppTripState,
  canTransition,
} from '../state/tripStateMachine';

import { dispatchRealtimeService } from './dispatchRealtimeService'; 
import { auth } from '../firebase';

// 🔥 CTO FIX [Bloco 9]: Expansão do Payload para contemplar metadados da UI do Cliente.
type TripRealtimePayload = {
  id: string;
  status: AppTripState;
  motoristaId?: string;
  motoristaNome?: string;
  motoristaTelefone?: string;
  veiculo?: string;
  placa?: string;
  foto?: string;
  avaliacao?: number;
  clienteId?: string;
  tracking?: any;
};

class TripRealtimeListener {
  private currentState: AppTripState | null = null; // 🔥 CTO FIX: Removido Hardcode. Permite Hydration dinâmica.

  initialize() {
    eventBusService.on(
      AppEvents.TRIP_STATUS_CHANGED,
      this.handleTripUpdate.bind(this),
    );
  }

  private handleTripUpdate(
    payload: TripRealtimePayload,
  ) {
    try {
      if (!payload?.status) {
        return;
      }

      const nextState = payload.status;

      // 🔥 CTO FIX: Hydration Bypass.
      // Se for a primeira vez que o listener roda após um F5/Abertura, ele adota o estado atual do Firestore
      // sem passar pelo validador de transição.
      if (this.currentState === null) {
        console.log(`[CTO-Log] Hydration Inicial. Adotando estado logístico: ${nextState}`);
        this.currentState = nextState;
      }

      if (this.currentState === nextState) {
        return;
      }

      const isValid = canTransition(this.currentState, nextState);

      if (!isValid) {
        console.warn(
          `INVALID TRIP TRANSITION: ${this.currentState} -> ${nextState}`,
        );

        eventBusService.emit(
          AppEvents.SYSTEM_ERROR,
          {
            origem: 'tripRealtimeListener',
            currentState: this.currentState,
            nextState,
          },
        );

        return;
      }

      console.log(`TRIP STATE: ${this.currentState} -> ${nextState}`);

      // 🔥 CTO FIX: Preservação segura do estado anterior ANTES de sobrescrever
      const previousState = this.currentState;
      this.currentState = nextState;

      // Titularidade da Sessão
      const currentUid = auth.currentUser?.uid;
      const isOwner = currentUid && currentUid === payload.motoristaId;

      switch (nextState) {

        case AppTripState.RESERVADO_AGUARDANDO_PAGAMENTO as any:
          console.log('[CTO-Log] Viagem entrou em RESERVA. Aguardando pagamento do Embarcador.');
          // 🔥 CTO FIX [Bloco 9]: O evento deixará de ser estrangulado. Emitindo aviso ao Front-End (Tela 03).
          // Usaremos AppEvents.TRIP_STATUS_CHANGED para o Front, mas dispararemos a mutação contendo o payload visual.
          // NOTA DE ENGENHARIA: Como AppEvents.TRIP_RESERVED não está mapeado previamente, emitiremos o estado através do evento guarda-chuva de alteração genérica (geralmente escutado pelo React) e também engatilharemos o disparo do webhook de pagamentos, se houver ouvintes.
          if ((AppEvents as any).TRIP_RESERVED) {
              eventBusService.emit((AppEvents as any).TRIP_RESERVED, payload);
          } else {
              eventBusService.emit(AppEvents.TRIP_STATUS_CHANGED, payload); 
          }
          break;

        case AppTripState.DISPONIVEL as any:
          // 🔥 CTO FIX: Ghost Driver Fix.
          // Se a carga foi para DISPONIVEL e o usuário atual era o dono, ele DEVE ser limpo,
          // independentemente se ele estava na Reserva, Indo pra Coleta ou em Transporte.
          if (isOwner) {
            console.log(`[CTO-Log] Cancelamento Operacional/Financeiro detectado (Origem: ${previousState}). Desvinculando motorista local via Cleanup Canônico.`);
            dispatchRealtimeService.cancelarViagemMotorista(
              currentUid,
              payload.id,
              'Operação cancelada ou abortada. Frete retornou ao Radar.'
            ).catch(err => console.error('[CTO-Log] Erro no cleanup de cancelamento:', err));
          }
          break;

        case AppTripState.OFERTANDO:
          eventBusService.emit(AppEvents.NEW_TRIP_REQUEST, payload);
          eventBusService.emit(AppEvents.DISPATCH_STARTED, payload);
          break;

        case AppTripState.ACEITO:
          eventBusService.emit(AppEvents.TRIP_ACCEPTED, payload);
          if (payload.id) {
            dispatchRealtimeService.confirmarLiberacaoMotorista(payload.id, payload.motoristaId).catch(err => {
              console.error('[CTO-Log] Falha sistêmica ao tentar liberar o motorista:', err);
            });
          }
          break;

        case AppTripState.INDO_COLETA as any:
          if (isOwner) dispatchRealtimeService.iniciarColeta(currentUid);
          break;

        case AppTripState.CHEGOU_COLETA as any:
          if (isOwner) dispatchRealtimeService.chegouColeta(currentUid);
          break;

        case AppTripState.COLETANDO:
          eventBusService.emit(AppEvents.TRIP_COLLECTED, payload);
          if (isOwner) dispatchRealtimeService.iniciouColetando(currentUid);
          break;

        case AppTripState.EM_TRANSPORTE:
          eventBusService.emit(AppEvents.TRIP_IN_PROGRESS, payload);
          eventBusService.emit(AppEvents.TRIP_STARTED, payload);
          if (isOwner) dispatchRealtimeService.iniciarTransporte(currentUid);
          break;

        case AppTripState.FINALIZANDO:
          eventBusService.emit(AppEvents.TRIP_FINISHED, payload);
          if (isOwner) dispatchRealtimeService.finalizarEntrega(currentUid);
          break;

        case AppTripState.ENTREGUE:
          eventBusService.emit(AppEvents.TRIP_FINISHED, payload);
          break;

        case AppTripState.REDISPATCH:
          eventBusService.emit(AppEvents.REDISPATCH_STARTED, payload);
          break;

        case AppTripState.SEM_MOTORISTA:
          eventBusService.emit(AppEvents.QUEUE_FINISHED, payload);
          break;

        case AppTripState.CANCELADO:
          eventBusService.emit(AppEvents.TRIP_CANCELLED, payload);
          break;

        case AppTripState.EXPIRADO:
          eventBusService.emit(AppEvents.DISPATCH_TIMEOUT, payload);
          break;
      }
    } catch (error) {
      console.error('TRIP REALTIME LISTENER ERROR:', error);
      eventBusService.emit(AppEvents.SYSTEM_ERROR, { origem: 'tripRealtimeListener', error });
    }
  }
}

export const tripRealtimeListener = new TripRealtimeListener();
