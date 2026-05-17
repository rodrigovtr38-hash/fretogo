// src/engine/orchestrator.ts
import { doc, runTransaction, serverTimestamp, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { TripState, isValidTransition } from '../state/tripStateMachine';
import { buildIntelligentQueue, MatchCriteria } from './matchingEngine';

/**
 * DISPATCHER AUTOMÁTICO
 * Acionado quando o cliente paga, ou quando um Redispatch é necessário.
 */
export const executeDispatch = async (freteId: string, freteData: MatchCriteria) => {
  try {
    // 1. O Engine processa a fila de motoristas inteligentes
    const newQueue = await buildIntelligentQueue(freteData);
    
    if (newQueue.length === 0) {
      // Falha Crítica Logística: Sem parceiros na região
      const freteRef = doc(db, 'fretes', freteId);
      await updateDoc(freteRef, {
        status: TripState.SEM_MOTORISTA,
        updatedAt: serverTimestamp()
      });
      return false;
    }

    // 2. Transação Segura: Sobrescreve a fila no Firestore e ativa a Oferta
    const freteRef = doc(db, 'fretes', freteId);
    await runTransaction(db, async (t) => {
      const snap = await t.get(freteRef);
      if (!snap.exists()) throw new Error("Orphaned Order");
      
      const currentState = snap.data().status as TripState;
      
      // Só podemos dar dispatch se estiver disponivel, aguardando ou no estado efêmero de redispatch
      if (![TripState.AGUARDANDO_PAGAMENTO, TripState.DISPONIVEL, TripState.REDISPATCH].includes(currentState)) {
         throw new Error("Lock Operacional: Ordem já está em andamento.");
      }

      t.update(freteRef, {
        status: TripState.DISPONIVEL,
        filaMatching: newQueue,
        ofertaTimestamp: serverTimestamp(), // Marca o início da corrida de 15 segundos
        updatedAt: serverTimestamp()
      });
    });

    return true;

  } catch (e) {
    console.error("Dispatcher Flow Error: ", e);
    return false;
  }
};

/**
 * REDISPATCH SILENCIOSO
 * Usado quando há timeout do motorista ou quando ele clica em "Recusar".
 */
export const triggerRedispatch = async (freteId: string, motoristaIdFalho: string) => {
  try {
    const freteRef = doc(db, 'fretes', freteId);
    
    await runTransaction(db, async (t) => {
      const snap = await t.get(freteRef);
      if (!snap.exists()) return;
      
      const data = snap.data();
      // Proteção: Se a corrida já foi aceita por outro antes do Redispatch tentar rodar, aborta.
      if (data.status === TripState.ACEITO || data.motoristaId) {
        return; 
      }

      // Remove o motorista falho da array do Firebase (Pop() queue logic)
      t.update(freteRef, {
        filaMatching: arrayRemove(motoristaIdFalho),
        ofertaTimestamp: serverTimestamp(), // Reseta os 15s para o PRÓXIMO motorista da fila
        logs: [...(data.logs || []), { type: 'redispatch', driver: motoristaIdFalho, time: new Date().toISOString() }]
      });
    });

    // Fallback: Se a fila esvaziou pós-remoção, checamos via leitor normal para reativar o executeDispatch total se necessário.
    const checkSnap = await getDoc(freteRef);
    if (checkSnap.exists() && checkSnap.data().filaMatching?.length === 0) {
       // Fila esvaziou. Passa pro status SEM MOTORISTA para avisar o cliente ou tentar forçar novo build
       await updateDoc(freteRef, { status: TripState.SEM_MOTORISTA });
    }

    return true;
  } catch (e) {
    console.error("Redispatch Failed: ", e);
    return false;
  }
};
