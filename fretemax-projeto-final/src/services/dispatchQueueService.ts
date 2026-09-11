// =========================================================
// NOME DO ARQUIVO: src/services/dispatchQueueService.ts
// CTO-Log: Auditoria de Despacho Distribuído - LOTE 3.4
// Correção Crítica: Remoção da Morte Súbita baseada no relógio local do usuário.
// O Backend agora respeita 100% o modelo "Mural/Feed". A carga NUNCA expira sozinha na tela.
// Delegação total de estado para TripLifecycleService.
// Correção Bloco de Agendamento: Adição de Guard Clause contra Dispatch Imediato de Cargas Agendadas.
// EXECUÇÃO BLOCO 9: Proteção contra Vazamento de Fila Assíncrona (Timeout Zumbi) e Restauro Seguro de Estado.
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

interface QueueState {
  index: number;
  tentativa: number;
}

export class DispatchQueueService {
  static async iniciarFila(frete: FretePayload) {
    try {
      // 🔥 CTO FIX: Proteção Defensiva de Agendamento
      // Impede categoricamente que um frete agendado vaze para a fila de urgência.
      const isAgendado = (frete as any).tipoFrete === 'agendado' || (frete as any).agendado === true;
      if (isAgendado) {
        console.warn(`[DISPATCH] 🛡️ Carga ${frete.id} é AGENDADA. Abortando dispatch imediato para respeitar o tempo de coleta.`);
        return;
      }

      const motoristas = await buscarMotoristasCompativeis(frete);

      // 🔥 INTERVENÇÃO CTO: Se não achar motorista, NÃO MATAR A CARGA. 
      // Joga para o Mural (Feed Aberto) para que motoristas vejam passivamente.
      if (!motoristas || motoristas.length === 0) {
        console.warn(`[DISPATCH] 🛡️ Sem motoristas imediatos. Mantendo carga ${frete.id} VIVA no Feed Público.`);
        await TripLifecycleService.alterarStatusViagem(frete.id, AppTripState.DISPONIVEL, {
          dispatchStatus: 'aberto_no_feed',
          filaTotal: 0
        });
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

      // 🔥 INTERVENÇÃO CTO: O Cronômetro de Timeout Global baseado no celular foi ERRADICADO daqui.
      // Se a IA cansar de procurar ou os motoristas rejeitarem, a carga apenas desce para o Mural.

      if (state.index >= motoristas.length || state.tentativa > MAX_REDISPATCH_ATTEMPTS) {
        console.warn(`[DISPATCH] Fila esgotada. Mantendo carga ${frete.id} no Feed Público (Mural).`);
        await TripLifecycleService.alterarStatusViagem(frete.id, AppTripState.DISPONIVEL, {
          dispatchStatus: 'aberto_no_feed'
        });
        return;
      }

      const motorista = motoristas[state.index];
      const enviado = await enviarOfertaMotorista(motorista.id, frete);

      if (!enviado) {
        // Falhou ao enviar (ex: offline). Pula rápido pro próximo, mas não mata a carga ao final.
        await DispatchQueueService.processarFila(frete, motoristas, { index: state.index + 1, tentativa: state.tentativa + 1 });
        return;
      }

      const sucesso = await TripLifecycleService.alterarStatusViagem(frete.id, AppTripState.AGUARDANDO_ACEITE, {
        motoristaAtualDestaque: motorista.id,
        motoristaAtualNome: motorista.nome,
        dispatchIndex: state.index,
        dispatchTentativa: state.tentativa
      });

      // Se a máquina de estados rejeitou a transição (ex: já foi ACEITO por outro, ou CANCELADO), a fila aborta
      if (!sucesso) return;

      // Aguarda 30 segundos pela resposta do motorista antes de iterar
      setTimeout(async () => {
        try {
          // 🔥 CTO FIX [Bloco 9]: Confirma o estado atual ANTES de avançar para matar threads zumbis.
          const checkSnap = await getDoc(doc(db, 'fretes', frete.id));
          if (!checkSnap.exists()) return;
          const checkData = checkSnap.data();

          // Verifica se a viagem ainda está de fato aguardando ESTE motorista específico.
          if (checkData.status === AppTripState.AGUARDANDO_ACEITE && checkData.motoristaAtualDestaque === motorista.id) {
            console.log(`[DISPATCH] Timeout: Motorista ${motorista.id} ignorou a oferta. Restaurando viagem ${frete.id}.`);
            
            // Restaura o estado para DISPONIVEL (limpando o motoristaAtualDestaque associado via TripLifecycleService).
            // Enviamos 'aberto_no_feed' temporariamente para impedir que o TripLifecycleService 
            // dispare um iniciarFila() paralelo (fork), já que nós mesmos prosseguiremos a fila manualmente abaixo.
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
            // Se o status mudou (ex: recusado antes do timeout, aceito por outro, cancelado),
            // a thread zumbi morre silenciosamente aqui sem corromper a operação.
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
