// =========================================================
// NOME DO ARQUIVO: src/services/dispatchQueueService.ts
// =========================================================

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  buscarMotoristasCompativeis, 
  enviarOfertaMotorista, 
  FretePayload, 
  MotoristaMatch 
} from './matchingEngine';
import { AppTripState } from '../state/tripStateMachine';
import { TripLifecycleService } from './tripLifecycleService';

const DRIVER_RESPONSE_TIMEOUT = 30000; 
const MAX_REDISPATCH_ATTEMPTS = 10;
const FEED_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos de vida no Mural de Ofertas

interface QueueState {
  index: number;
  tentativa: number;
}

export class DispatchQueueService {
  
  // 🔥 CTO FIX: Gatilho de expiração de Mural / Feed
  static agendarExpiracaoFeed(freteId: string) {
    setTimeout(async () => {
      try {
        const snap = await getDoc(doc(db, 'fretes', freteId));
        if (!snap.exists()) return;
        
        const data = snap.data();

        // Extração robusta do timestamp criado
        const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now());
        const timeInFeed = Date.now() - createdAt;

        // Tolerância de 5 segundos pra não matar cargas na borda do relógio
        if (data.status === AppTripState.DISPONIVEL && timeInFeed >= (FEED_TIMEOUT_MS - 5000)) {
          console.log(`[DISPATCH] ⏰ Timeout de 10 minutos atingido. Expirando frete ${freteId}.`);
          await TripLifecycleService.alterarStatusViagem(freteId, AppTripState.EXPIRADO, {
            motivoCancelamento: 'Tempo limite no Feed expirado (10 minutos).'
          });
        }
      } catch (error) {
        console.error('[EXPIRACAO_FEED_ERROR]', error);
      }
    }, FEED_TIMEOUT_MS);
  }

  static async iniciarFila(frete: FretePayload) {
    try {
      const isAgendado = (frete as any).tipoFrete === 'agendado' || (frete as any).agendado === true;
      if (isAgendado) {
        console.warn(`[DISPATCH] 🛡️ Carga ${frete.id} é AGENDADA. Abortando dispatch imediato para respeitar o tempo de coleta.`);
        return;
      }

      const motoristas = await buscarMotoristasCompativeis(frete);

      // Joga para o Mural (Feed Aberto) se não achar motorista
      if (!motoristas || motoristas.length === 0) {
        console.warn(`[DISPATCH] 🛡️ Sem motoristas imediatos. Mantendo carga ${frete.id} VIVA no Feed Público (10 minutos).`);
        await TripLifecycleService.alterarStatusViagem(frete.id, AppTripState.DISPONIVEL, {
          dispatchStatus: 'aberto_no_feed',
          filaTotal: 0
        });
        
        DispatchQueueService.agendarExpiracaoFeed(frete.id);
        return;
      }

      await TripLifecycleService.alterarStatusViagem(frete.id, AppTripState.DISPONIVEL, {
        dispatchStatus: 'em_andamento',
        filaTotal: motoristas.length
      });

      console.log(`[DISPATCH] Iniciando fila para ${motoristas.length} motoristas. Carga: ${frete.id}`);
      await DispatchQueueService.processarFila(frete, motoristas, { index: 0, tentativa: 1 });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('[DISPATCH_QUEUE_ERROR]', error.message);
      }
    }
  }

  static async processarFila(frete: FretePayload, motoristas: MotoristaMatch[], state: QueueState) {
    try {
      const freteSnap = await getDoc(doc(db, 'fretes', frete.id));
      if (!freteSnap.exists()) return;
      
      const data = freteSnap.data();

      // Se a carga já foi aceita ou cancelada, interrompe a fila.
      if (data.status !== AppTripState.DISPONIVEL && data.status !== AppTripState.AGUARDANDO_ACEITE) {
        return;
      }

      if (state.index >= motoristas.length || state.tentativa > MAX_REDISPATCH_ATTEMPTS) {
        console.warn(`[DISPATCH] Fila esgotada. Carga ${frete.id} despachada para Feed Público (10 minutos).`);
        await TripLifecycleService.alterarStatusViagem(frete.id, AppTripState.DISPONIVEL, {
          dispatchStatus: 'aberto_no_feed'
        });
        
        DispatchQueueService.agendarExpiracaoFeed(frete.id);
        return;
      }

      const motorista = motoristas[state.index];
      const enviado = await enviarOfertaMotorista(motorista.id, frete);

      if (!enviado) {
        await DispatchQueueService.processarFila(frete, motoristas, { index: state.index + 1, tentativa: state.tentativa + 1 });
        return;
      }

      const sucesso = await TripLifecycleService.alterarStatusViagem(frete.id, AppTripState.AGUARDANDO_ACEITE, {
        motoristaAtualDestaque: motorista.id,
        motoristaAtualNome: motorista.nome,
        dispatchIndex: state.index,
        dispatchTentativa: state.tentativa
      });

      if (!sucesso) return;

      setTimeout(async () => {
        try {
          const checkSnap = await getDoc(doc(db, 'fretes', frete.id));
          if (!checkSnap.exists()) return;
          const checkData = checkSnap.data();

          if (checkData.status === AppTripState.AGUARDANDO_ACEITE && checkData.motoristaAtualDestaque === motorista.id) {
            console.log(`[DISPATCH] Timeout: Motorista ${motorista.id} ignorou a oferta. Restaurando viagem ${frete.id}.`);
            
            const restaurado = await TripLifecycleService.alterarStatusViagem(frete.id, AppTripState.DISPONIVEL, {
              dispatchStatus: 'aberto_no_feed'
            });

            if (restaurado) {
              await DispatchQueueService.processarFila(frete, motoristas, {
                index: state.index + 1,
                tentativa: state.tentativa + 1,
              });
            }
          } else {
            console.log(`[DISPATCH] Timeout zumbi ignorado. Viagem ${frete.id} não pertence mais ao motorista ${motorista.id}.`);
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error('[DISPATCH_WATCHDOG_RACE_ERROR]', error.message);
          }
        }
      }, DRIVER_RESPONSE_TIMEOUT);
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('[PROCESSAR_FILA_ERROR]', error.message);
      }
    }
  }
}
