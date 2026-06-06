// src/services/dispatchQueueService.ts
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  buscarMotoristasCompativeis, 
  enviarOfertaMotorista, 
  FretePayload, 
  MotoristaMatch 
} from './matchingEngine';

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
          status: 'sem_motorista',
          dispatchStatus: 'encerrado',
          updatedAt: serverTimestamp(),
        });
        return;
      }

      await updateDoc(doc(db, 'fretes', frete.id), {
        status: 'disponivel',
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
      // 1. Check de segurança: O frete ainda está disponível?
      const freteSnap = await getDoc(doc(db, 'fretes', frete.id));
      if (!freteSnap.exists() || freteSnap.data().status !== 'disponivel') {
        return; // Frete já foi aceito ou cancelado, para a fila agora.
      }

      if (state.index >= motoristas.length || state.tentativa > MAX_REDISPATCH_ATTEMPTS) {
        await updateDoc(doc(db, 'fretes', frete.id), {
          status: 'sem_motorista',
          dispatchStatus: 'encerrado',
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const motorista = motoristas[state.index];
      const enviado = await enviarOfertaMotorista(motorista.id, frete);

      if (!enviado) {
        await DispatchQueueService.processarFila(frete, motoristas, { index: state.index + 1, tentativa: state.tentativa + 1 });
        return;
      }

      await updateDoc(doc(db, 'fretes', frete.id), {
        motoristaAtualDestaque: motorista.id,
        motoristaAtualNome: motorista.nome,
        dispatchIndex: state.index,
        dispatchTentativa: state.tentativa,
        status: 'aguardando_resposta',
        updatedAt: serverTimestamp(),
      });

      // 🔥 WATCHDOG: Trava de 30s com verificação atômica de status
      setTimeout(async () => {
        try {
          const snapshot = await getDoc(doc(db, 'fretes', frete.id));
          if (!snapshot.exists()) return;
          
          const data = snapshot.data();
          // Só prossegue se ainda estiver esperando a resposta deste motorista
          if (data.status === 'aguardando_resposta' && data.motoristaAtualDestaque === motorista.id) {
            await updateDoc(doc(db, 'fretes', frete.id), {
              status: 'disponivel', // Volta para disponível para pegar o próximo
              updatedAt: serverTimestamp(),
            });

            await DispatchQueueService.processarFila(frete, motoristas, {
              index: state.index + 1,
              tentativa: state.tentativa + 1,
            });
          }
        } catch (error) {
          console.error('[DISPATCH_WATCHDOG_ERROR]', error);
        }
      }, DRIVER_RESPONSE_TIMEOUT);
      
    } catch (error) {
      console.error('[PROCESSAR_FILA_ERROR]', error);
    }
  }
}
