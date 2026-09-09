// =========================================================
// NOME DO ARQUIVO: src/services/matchingEngine.ts
// CTO-Log: Refatoração de Busca e Sincronia de Coleção (Fase 3).
// Evolução Fase 6: Normalização de Categorias Canônicas.
// EXECUÇÃO BLOCO 8 (Prob #3): Proteção de resiliência no parsing da categoria. Evita crash do Dispatch caso payload chegue sem categoria (null/undefined).
// =========================================================

import {
  collection, doc, getDocs, query, serverTimestamp, runTransaction, where
} from 'firebase/firestore';
import { db } from '../firebase';

// 🔥 CTO FIX: Tipagem Canônica Estrita
export type CategoriaVeiculo =
  | 'moto'
  | 'carro'
  | 'utilitarios'
  | 'toco'
  | 'truck'
  | 'carreta'
  | 'bitrem';

export interface FretePayload {
  id: string;
  clienteId: string;
  categoria: CategoriaVeiculo;
  origem: { lat: number; lng: number; endereco: string; };
  destino: { lat: number; lng: number; endereco: string; };
  distanciaKm: number;
  valor: number;
  peso: number;
  descricao: string;
}

export interface MotoristaMatch {
  id: string;
  nome: string;
  telefone?: string;
  categoria?: string;
  latitude?: number;
  longitude?: number;
  online?: boolean;
  score?: number;
  ultimoHeartbeat?: number;
  distanciaAteColeta?: number;
}

function calcularDistanciaGeografica(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getBoundingBox(lat: number, lng: number, distanceKm: number) {
  const earthRadius = 6371;
  const latDelta = (distanceKm / earthRadius) * (180 / Math.PI);
  const lngDelta = (distanceKm / earthRadius) * (180 / Math.PI) / Math.cos(lat * (Math.PI / 180));
  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lngMin: lng - lngDelta,
    lngMax: lng + lngDelta
  };
}

export async function buscarMotoristasCompativeis(frete: FretePayload): Promise<MotoristaMatch[]> {
  try {
    // 🔥 CTO FIX [Bloco 8 - Prob #3]: Proteção contra payload malformado ausente/null/undefined
    const categoriaFrete = (frete.categoria || '').toLowerCase().trim();
    // 🔥 CTO FIX: Array atualizado com as nomenclaturas canônicas.
    const isPesado = ['toco', 'truck', 'carreta', 'bitrem'].includes(categoriaFrete);
    
    const RAIOS_BUSCA = isPesado ? [20, 50, 100] : [10, 30, 50, 100];

    const motoristasRef = collection(db, 'motoristas_online');
    let motoristasEncontrados: MotoristaMatch[] = [];
    let raioUtilizado = 0;

    for (const raio of RAIOS_BUSCA) {
      const box = getBoundingBox(frete.origem.lat, frete.origem.lng, raio);
      
      const motoristasQuery = query(
        motoristasRef, 
        where('online', '==', true),
        where('categoria', '==', categoriaFrete)
      );
      
      const snapshot = await getDocs(motoristasQuery);
      console.log(`[CTO-Log] Busca bruta encontrou ${snapshot.docs.length} motoristas da categoria ${categoriaFrete} online.`);

      motoristasEncontrados = snapshot.docs
        .map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nome: data.nome || 'Motorista',
            telefone: data.telefone || data.whatsapp || '',
            categoria: data.categoria || '',
            latitude: data.latitude,
            longitude: data.longitude,
            online: data.online,
            score: Number(data.score || 5),
            ultimoHeartbeat: data.heartbeat || 0,
            distanciaAteColeta: 9999,
          } as MotoristaMatch;
        })
        .filter(motorista => {
          if (motorista.latitude && motorista.longitude) {
            const dist = calcularDistanciaGeografica(motorista.latitude, motorista.longitude, frete.origem.lat, frete.origem.lng);
            motorista.distanciaAteColeta = dist;
            return dist <= raio;
          }
          
          motorista.distanciaAteColeta = 0;
          return true; 
        })
        .sort((a, b) => {
          const scoreA = (a.score || 5) - (a.distanciaAteColeta! * 0.1);
          const scoreB = (b.score || 5) - (b.distanciaAteColeta! * 0.1);
          return scoreB - scoreA;
        });

      if (motoristasEncontrados.length > 0) {
        raioUtilizado = raio;
        break;
      }
    }

    console.log(`[MATCHING] Encontrados ${motoristasEncontrados.length} motoristas no raio de ${raioUtilizado}km`);
    return motoristasEncontrados;
  } catch (error) {
    console.error('[MATCHING] ERRO BUSCAR MOTORISTAS:', error);
    return [];
  }
}

export async function enviarOfertaMotorista(motoristaId: string, frete: FretePayload): Promise<boolean> {
  try {
    const motoristaRef = doc(db, 'motoristas_cadastros', motoristaId);
    
    await runTransaction(db, async (transaction) => {
      const motoristaDoc = await transaction.get(motoristaRef);
      if (!motoristaDoc.exists()) throw new Error("Motorista não existe.");

      transaction.update(motoristaRef, {
        ofertaAtual: {
          freteId: frete.id,
          categoria: frete.categoria,
          valor: frete.valor,
          origem: frete.origem,
          destino: frete.destino,
          enviadaEm: serverTimestamp(),
          expiraEm: new Date(Date.now() + 600000), // 10 minutos
        },
        status: 'MATCHING',
        atualizadoEm: serverTimestamp(),
      });
    });

    return true;
  } catch (error) {
    console.error('[MATCHING] ERRO ENVIAR OFERTA:', error);
    return false;
  }
}
