// src/services/dispatchQueueService.ts
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  buscarMotoristasCompativeis, 
  enviarOfertaMotorista, 
  FretePayload, 
  MotoristaMatch 
} from './matchingEngine';

// 🔥 FASE 3: REDISPATCH AUTOMÁTICO (60 Segundos cravados)
const DRIVER_RESPONSE_TIMEOUT = 60000; 
const MAX_REDISPATCH_ATTEMPTS = 10;

interface QueueState {
  index: number;
  tentativa: number;
}

export class DispatchQueueService {
  static async iniciarFila(frete: FretePayload) {
    try {
      // 1. Busca quem está online, com heartbeat em dia e dentro do raio GPS
      const motoristas = await buscarMotoristasCompativeis(frete);

      if (!motoristas || motoristas.length === 0) {
        await updateDoc(doc(db, 'fretes', frete.id), {
          status: 'sem_motorista',
          dispatchStatus: 'encerrado',
          atualizadoEm: serverTimestamp(),
        });
        return;
      }

      // 2. Coloca no Radar Geral, mas comanda a fila nos bastidores
      await updateDoc(doc(db, 'fretes', frete.id), {
        status: 'disponivel',
        dispatchStatus: 'em_andamento',
        filaTotal: motoristas.length,
        atualizadoEm: serverTimestamp(),
      });

      // 3. Inicia o disparo um a um
      await DispatchQueueService.processarFila(frete, motoristas, { index: 0, tentativa: 1 });
      
    } catch (error) {
      console.error('[DISPATCH_QUEUE_ERROR]', error);
    }
  }

  static async processarFila(frete: FretePayload, motoristas: MotoristaMatch[], state: QueueState) {
    try {
      // Se acabou a lista de motoristas ou passou de 10 tentativas, encerra.
      if (state.index >= motoristas.length || state.tentativa > MAX_REDISPATCH_ATTEMPTS) {
        await updateDoc(doc(db, 'fretes', frete.id), {
          status: 'sem_motorista',
          dispatchStatus: 'encerrado',
          atualizadoEm: serverTimestamp(),
        });
        return;
      }

      const motorista = motoristas[state.index];
      const enviado = await enviarOfertaMotorista(motorista.id, frete);

      // Se falhou ao entregar no celular do motorista, pula pro próximo imediatamente
      if (!enviado) {
        await DispatchQueueService.processarFila(frete, motoristas, {
          index: state.index + 1,
          tentativa: state.tentativa + 1,
        });
        return;
      }

      // Atualiza o banco indicando com quem está a bola da vez
      await updateDoc(doc(db, 'fretes', frete.id), {
        motoristaAtualDestaque: motorista.id,
        motoristaAtualNome: motorista.nome,
        dispatchIndex: state.index,
        dispatchTentativa: state.tentativa,
        aguardandoResposta: true,
        atualizadoEm: serverTimestamp(),
      });

      // 🔥 A BOMBA RELÓGIO (60 SEGUNDOS)
      setTimeout(async () => {
        try {
          const freteRef = doc(db, 'fretes', frete.id);
          const snapshot = await getDoc(freteRef);

          if (!snapshot.exists()) return;
          const data = snapshot.data();

          // Se o motorista clicou em aceitar nesse meio tempo, aborta a fila. Sucesso!
          if (['aceito', 'indo_coleta', 'coletando', 'em_transporte', 'entregue', 'cancelado'].includes(data.status)) {
            return;
          }

          // Ninguém aceitou. O tempo acabou. Retira a oferta e passa pro próximo.
          await updateDoc(freteRef, {
            aguardandoResposta: false,
            atualizadoEm: serverTimestamp(),
          });

          await DispatchQueueService.processarFila(frete, motoristas, {
            index: state.index + 1,
            tentativa: state.tentativa + 1,
          });
          
        } catch (error) {
          console.error('[DISPATCH_WATCHDOG_ERROR]', error);
        }
      }, DRIVER_RESPONSE_TIMEOUT);
      
    } catch (error) {
      console.error('[PROCESSAR_FILA_ERROR]', error);
    }
  }
}

export default DispatchQueueService;
