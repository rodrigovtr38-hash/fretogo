// =========================================================
// NOME DO ARQUIVO: src/services/dispatchQueueService.ts
// CTO-Log: Auditoria de Despacho Distribuído
// =========================================================

import { doc, getDoc, serverTimestamp, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  buscarMotoristasCompativeis, 
  enviarOfertaMotorista, 
  FretePayload, 
  MotoristaMatch 
} from './matchingEngine';
import { AppTripState } from '../state/tripStateMachine';

const DRIVER_RESPONSE_TIMEOUT = 30000; 
const MAX_REDISPATCH_ATTEMPTS = 10;
const GLOBAL_TIMEOUT_MS = 15 * 60 * 1000; // Tolerância máxima: 15 minutos (Zumbi Killer)

interface QueueState {
  index: number;
  tentativa: number;
}

export class DispatchQueueService {
  static async iniciarFila(frete: FretePayload) {
    try {
      const motoristas = await buscarMotoristasCompativeis(frete);

      if (!motoristas || motoristas.length === 0) {
        console.warn(`[DISPATCH] Sem motoristas para a carga ${frete.id}`);
        await updateDoc(doc(db, 'fretes', frete.id), {
          status: AppTripState.SEM_MOTORISTA,
          dispatchStatus: 'encerrado',
          motivoEncerramento: 'Nenhum motorista no raio operacional',
          updatedAt: serverTimestamp(),
        });
        return;
      }

      await updateDoc(doc(db, 'fretes', frete.id), {
        status: AppTripState.DISPONIVEL,
        dispatchStatus: 'em_andamento',
        filaTotal: motoristas.length,
        updatedAt: serverTimestamp(),
      });

      console.log(`[DISPATCH] Iniciando fila para ${motoristas.length} motoristas. Carga: ${frete.id}`);
      await DispatchQueueService.processarFila(frete, motoristas, { index: 0, tentativa: 1 });
    } catch (error) {
      console.error('[DISPATCH_QUEUE_ERROR]', error);
    }
  }

  static async processarFila(frete: FretePayload, motoristas: MotoristaMatch[], state: QueueState) {
    try {
      const freteSnap = await getDoc(doc(db, 'fretes', frete.id));
      
      if (!freteSnap.exists()) return;
      
      const data = freteSnap.data();

      // Blindagem: Se alguém já aceitou ou a carga foi cancelada, encerra o ciclo.
      if (data.status !== AppTripState.DISPONIVEL && data.status !== AppTripState.AGUARDANDO_ACEITE) {
        return;
      }

      // Guilhotina Global de 15 Minutos (Previne Frete Zumbi)
      let tempoDecorrido = 0;
      if (data.createdAt && typeof data.createdAt.toMillis === 'function') {
        tempoDecorrido = Date.now() - data.createdAt.toMillis();
      }
      
      if (tempoDecorrido > GLOBAL_TIMEOUT_MS) {
        await updateDoc(doc(db, 'fretes', frete.id), {
          status: AppTripState.SEM_MOTORISTA,
          dispatchStatus: 'timeout_global',
          alertaInsucesso: true, 
          updatedAt: serverTimestamp(),
        });
        console.warn(`[DISPATCH] Carga ${frete.id} abortada. Timeout Global de 15 min excedido.`);
        return;
      }

      // Limite de motoristas ou fila esgotada
      if (state.index >= motoristas.length || state.tentativa > MAX_REDISPATCH_ATTEMPTS) {
        await updateDoc(doc(db, 'fretes', frete.id), {
          status: AppTripState.SEM_MOTORISTA,
          dispatchStatus: 'encerrado',
          motivoEncerramento: 'Fila de motoristas esgotada',
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const motorista = motoristas[state.index];
      const enviado = await enviarOfertaMotorista(motorista.id, frete);

      if (!enviado) {
        // Se a notificação falhou (ex: motorista perdeu sinal 4G), repassa imediatamente
        await DispatchQueueService.processarFila(frete, motoristas, { index: state.index + 1, tentativa: state.tentativa + 1 });
        return;
      }

      await updateDoc(doc(db, 'fretes', frete.id), {
        motoristaAtualDestaque: motorista.id,
        motoristaAtualNome: motorista.nome,
        dispatchIndex: state.index,
        dispatchTentativa: state.tentativa,
        status: AppTripState.AGUARDANDO_ACEITE,
        updatedAt: serverTimestamp(),
      });

      // Transação Atômica: Garante que o motorista não seja penalizado se aceitar no último segundo
      setTimeout(async () => {
        try {
          const freteRef = doc(db, 'fretes', frete.id);
          let deveMoverParaProximo = false;

          await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(freteRef);
            if (!snapshot.exists()) return;
            
            const freteDados = snapshot.data();
            
            // Só tira a carga se AINDA estiver aguardando o exato mesmo motorista
            if (freteDados.status === AppTripState.AGUARDANDO_ACEITE && freteDados.motoristaAtualDestaque === motorista.id) {
              transaction.update(freteRef, {
                status: AppTripState.DISPONIVEL,
                updatedAt: serverTimestamp(),
              });
              deveMoverParaProximo = true;
            }
          });

          if (deveMoverParaProximo) {
            await DispatchQueueService.processarFila(frete, motoristas, {
              index: state.index + 1,
              tentativa: state.tentativa + 1,
            });
          }

        } catch (error) {
          console.error('[DISPATCH_WATCHDOG_RACE_ERROR]', error);
          await DispatchQueueService.processarFila(frete, motoristas, { index: state.index + 1, tentativa: state.tentativa + 1 });
        }
      }, DRIVER_RESPONSE_TIMEOUT);
      
    } catch (error) {
      console.error('[PROCESSAR_FILA_ERROR]', error);
    }
  }
}
