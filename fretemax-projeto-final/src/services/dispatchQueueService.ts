// src/services/dispatchQueueService.ts
import { doc, getDoc, serverTimestamp, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  buscarMotoristasCompativeis, 
  enviarOfertaMotorista, 
  FretePayload, 
  MotoristaMatch 
} from './matchingEngine';
import { AppTripState } from '../state/tripStateMachine'; // 🔥 Importação do Enum Oficial

const DRIVER_RESPONSE_TIMEOUT = 30000; 
const MAX_REDISPATCH_ATTEMPTS = 10;

interface QueueState {
  index: number;
  tentativa: number;
}

export class DispatchQueueService {
  static async iniciarFila(frete: FretePayload) {
    try {
      const motoristas = await buscarMotoristasCompativeis(frete);

      if (!motoristas || motoristas.length === 0) {
        await updateDoc(doc(db, 'fretes', frete.id), {
          status: AppTripState.SEM_MOTORISTA,
          dispatchStatus: 'encerrado',
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

      await DispatchQueueService.processarFila(frete, motoristas, { index: 0, tentativa: 1 });
    } catch (error) {
      console.error('[DISPATCH_QUEUE_ERROR]', error);
    }
  }

  static async processarFila(frete: FretePayload, motoristas: MotoristaMatch[], state: QueueState) {
    try {
      const freteSnap = await getDoc(doc(db, 'fretes', frete.id));
      
      // Se frete não existe ou não está mais para despacho, aborta.
      if (!freteSnap.exists() || (freteSnap.data().status !== AppTripState.DISPONIVEL && freteSnap.data().status !== AppTripState.AGUARDANDO_ACEITE)) {
        return;
      }

      if (state.index >= motoristas.length || state.tentativa > MAX_REDISPATCH_ATTEMPTS) {
        await updateDoc(doc(db, 'fretes', frete.id), {
          status: AppTripState.SEM_MOTORISTA,
          dispatchStatus: 'encerrado',
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const motorista = motoristas[state.index];
      const enviado = await enviarOfertaMotorista(motorista.id, frete);

      if (!enviado) {
        // Se a oferta não pôde ser enviada (motorista offline de última hora), pula imediatamente para o próximo
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

      // Watchdog de 30s blindado com Transação Atômica
      setTimeout(async () => {
        try {
          const freteRef = doc(db, 'fretes', frete.id);
          let deveMoverParaProximo = false;

          await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(freteRef);
            if (!snapshot.exists()) return;
            
            const data = snapshot.data();
            
            // Verificação atômica: se ainda está aguardando O MESMO motorista, encerra a vez dele
            if (data.status === AppTripState.AGUARDANDO_ACEITE && data.motoristaAtualDestaque === motorista.id) {
              transaction.update(freteRef, {
                status: AppTripState.DISPONIVEL,
                updatedAt: serverTimestamp(),
              });
              deveMoverParaProximo = true;
            }
          });

          // A chamada recursiva deve ficar fora da transação para não causar loops no Firebase
          if (deveMoverParaProximo) {
            await DispatchQueueService.processarFila(frete, motoristas, {
              index: state.index + 1,
              tentativa: state.tentativa + 1,
            });
          }

        } catch (error) {
          console.error('[DISPATCH_WATCHDOG_ERROR]', error);
          // Em caso de erro severo na transação, tenta forçar a fila para não travar o cliente
          await DispatchQueueService.processarFila(frete, motoristas, { index: state.index + 1, tentativa: state.tentativa + 1 });
        }
      }, DRIVER_RESPONSE_TIMEOUT);
      
    } catch (error) {
      console.error('[PROCESSAR_FILA_ERROR]', error);
    }
  }
}
