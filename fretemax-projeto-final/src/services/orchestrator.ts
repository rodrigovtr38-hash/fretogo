// src/services/orchestrator.ts
import { doc, runTransaction, serverTimestamp, updateDoc, arrayRemove, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { TripState } from '../state/tripStateMachine';

export interface MatchCriteria {
  categoria: string;
  origemLat: number;
  origemLng: number;
  destinoLat: number;
  destinoLng: number;
}

const calcularDistanciaKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const calculateMatchScore = (distanciaKm: number, taxaAceite: number = 1, reputacao: number = 5.0): number => {
  let score = 1000 - (distanciaKm * 10);
  score *= taxaAceite;
  score += (reputacao * 10); 
  return score > 0 ? score : 0; 
};

export const buildIntelligentQueue = async (criteria: MatchCriteria): Promise<string[]> => {
  try {
    const onlineRef = collection(db, 'motoristas_online');
    const q = query(onlineRef, where('status', '==', 'disponivel'), where('categoria', '==', criteria.categoria));
    
    const snapshot = await getDocs(q);
    const scoredDrivers: { uid: string, score: number }[] = [];
    const now = Date.now();

    snapshot.forEach(docSnap => {
      const driver = docSnap.data();
      const lastSeen = driver.lastSeen?.toMillis ? driver.lastSeen.toMillis() : 0;
      if (now - lastSeen > 120000) return; // Heartbeat check

      const dist = calcularDistanciaKm(criteria.origemLat, criteria.origemLng, driver.lat, driver.lng);
      if (dist > 50) return; // Hard Limit 50km

      const score = calculateMatchScore(dist, driver.taxaAceite || 1, driver.score || 5);
      scoredDrivers.push({ uid: docSnap.id, score });
    });

    scoredDrivers.sort((a, b) => b.score - a.score);
    return scoredDrivers.map(d => d.uid);
  } catch (e) {
    console.error("Match Engine Falhou: ", e);
    return [];
  }
};

/**
 * DISPATCHER AUTOMÁTICO
 * Acionado quando o cliente paga, ou quando um Redispatch é necessário.
 */
export const executeDispatch = async (freteId: string, freteData: MatchCriteria) => {
  try {
    // 1. O Engine processa a fila de motoristas inteligentes
    const newQueue = await buildIntelligentQueue(freteData);
    
    const freteRef = doc(db, 'fretes', freteId);

    if (newQueue.length === 0) {
      // Falha Crítica Logística: Sem parceiros na região
      await updateDoc(freteRef, {
        status: TripState.SEM_MOTORISTA,
        updatedAt: serverTimestamp()
      });
      return false;
    }

    // 2. Transação Segura: Sobrescreve a fila no Firestore e ativa a Oferta
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

export const triggerRedispatch = async (freteId: string, motoristaIdFalho: string) => {
  try {
    const freteRef = doc(db, 'fretes', freteId);
    
    await runTransaction(db, async (t) => {
      const snap = await t.get(freteRef);
      if (!snap.exists()) return;
      
      const data = snap.data();
      if (data.status === TripState.ACEITO || data.motoristaId) return; 

      t.update(freteRef, {
        filaMatching: arrayRemove(motoristaIdFalho),
        ofertaTimestamp: serverTimestamp(),
      });
    });

    const checkSnap = await getDoc(freteRef);
    if (checkSnap.exists() && checkSnap.data().filaMatching?.length === 0) {
       await updateDoc(freteRef, { status: TripState.SEM_MOTORISTA });
    }
    return true;
  } catch (e) {
    console.error("Redispatch Failed: ", e);
    return false;
  }
};
