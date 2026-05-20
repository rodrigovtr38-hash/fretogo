// src/services/orchestrator.ts
import { doc, runTransaction, serverTimestamp, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppTripState, canTransition } from '../state/tripStateMachine';
import { httpsCallable, getFunctions } from 'firebase/functions';

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
    // Busca motoristas em raio de 50km
    const functions = getFunctions();
    const findDrivers = httpsCallable(functions, 'findAvailableDrivers');
    const result = await findDrivers(criteria);
    const drivers = (result.data as any).drivers || [];

    const scoredDrivers = drivers.map((d: any) => ({
      uid: d.id,
      score: calculateMatchScore(d.dist, d.taxaAceite || 1, d.score || 5)
    }));

    scoredDrivers.sort((a, b) => b.score - a.score);
    return scoredDrivers.map(d => d.uid);
  } catch (e) {
    console.error("Match Engine Falhou: ", e);
    return [];
  }
};

export const executeDispatch = async (freteId: string, freteData: MatchCriteria) => {
  try {
    const newQueue = await buildIntelligentQueue(freteData);
    const freteRef = doc(db, 'fretes', freteId);

    if (newQueue.length === 0) {
      await updateDoc(freteRef, { status: AppTripState.SEM_MOTORISTA, updatedAt: serverTimestamp() });
      return false;
    }

    await runTransaction(db, async (t) => {
      const snap = await t.get(freteRef);
      if (!snap.exists()) throw new Error("Order not found");
      
      const currentStatus = snap.data().status as AppTripState;
      
      // Guard de transição
      if (!canTransition(currentStatus, AppTripState.DISPONIVEL)) {
        throw new Error("Invalid operational state for dispatch");
      }

      t.update(freteRef, {
        status: AppTripState.DISPONIVEL,
        filaMatching: newQueue,
        ofertaTimestamp: serverTimestamp(),
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
      if (!canTransition(data.status, AppTripState.REDISPATCH)) return; 

      t.update(freteRef, {
        status: AppTripState.REDISPATCH,
        filaMatching: arrayRemove(motoristaIdFalho),
        ofertaTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    return true;
  } catch (e) {
    console.error("Redispatch Failed: ", e);
    return false;
  }
};
