// =========================================================
// NOME DO ARQUIVO: src/services/matchingEngine.ts
// CTO-Log: Correção Crítica de Busca (LOTE 4.1)
// 1. Sincronizado com as 7 categorias oficiais.
// 2. Erro fatal de query ('array-contains' alterado para '==') corrigido para que o match ocorra.
// 3. Integração com Modo Retorno preservada.
// =========================================================

import {
  collection, doc, getDocs, query, serverTimestamp, runTransaction, where
} from 'firebase/firestore';
import { db } from '../firebase';

// Categorias Oficiais Sincronizadas
export type CategoriaVeiculo =
  | 'moto'
  | 'carro_pequeno'
  | 'utilitario'
  | 'toco'
  | 'truck'
  | 'carreta_ls'
  | 'bi_trem_cegonha';

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
    const categoriaFrete = frete.categoria.toLowerCase().trim();
    const isPesado = ['toco', 'truck', 'carreta_ls', 'bi_trem_cegonha'].includes(categoriaFrete);
    
    // Matriz de raios de busca progressivos para leve vs pesado
    const RAIOS_BUSCA = isPesado ? [10, 20, 30, 50] : [5, 10, 15, 20, 30];

    const motoristasRef = collection(db, 'motoristas_online');
    let motoristasEncontrados: MotoristaMatch[] = [];
    let raioUtilizado = 0;

    // Laço sequencial de busca iterativa expandindo a GeoBox
    for (const raio of RAIOS_BUSCA) {
      const box = getBoundingBox(frete.origem.lat, frete.origem.lng, raio);
      
      // 🔥 CTO FIX: '==' em vez de 'array-contains' e busca correta em motoristas_online
      const motoristasQuery = query(
        motoristasRef, 
        where('online', '==', true),
        where('disponivel', '==', true),
        where('categoria', '==', categoriaFrete),
        where('latitude', '>=', box.latMin),
        where('latitude', '<=', box.latMax)
      );
      
      const snapshot = await getDocs(motoristasQuery);
      const tempoAtual = Date.now();

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
          // Filtro de longitude do bounding box
          if (motorista.longitude! < box.lngMin || motorista.longitude! > box.lngMax) return false;

          // Regra de Ouro: Validação estrita de batimento cardíaco (Heartbeat) de 2 min
          if (motorista.ultimoHeartbeat && (tempoAtual - motorista.ultimoHeartbeat > 120000)) return false; 

          if (motorista.latitude && motorista.longitude) {
            const dist = calcularDistanciaGeografica(motorista.latitude, motorista.longitude, frete.origem.lat, frete.origem.lng);
            motorista.distanciaAteColeta = dist;
            return dist <= raio;
          }
          return false;
        })
        .sort((a, b) => {
          const scoreA = (a.score || 5) - (a.distanciaAteColeta! * 0.1);
          const scoreB = (b.score || 5) - (b.distanciaAteColeta! * 0.1);
          return scoreB - scoreA;
        });

      // Se encontrar candidatos qualificados, para o loop e designa
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
    const motoristaRef = doc(db, 'motoristas', motoristaId);
    
    // Transação isolada anticoncorrência
    await runTransaction(db, async (transaction) => {
      const motoristaDoc = await transaction.get(motoristaRef);
      if (!motoristaDoc.exists()) throw new Error("Motorista não existe.");

      const dados = motoristaDoc.data();
      if (!dados.disponivel || dados.ofertaAtual) {
         throw new Error("Motorista não está disponível ou já possui oferta em andamento.");
      }

      transaction.update(motoristaRef, {
        ofertaAtual: {
          freteId: frete.id,
          categoria: frete.categoria,
          valor: frete.valor,
          origem: frete.origem,
          destino: frete.destino,
          enviadaEm: serverTimestamp(),
          expiraEm: new Date(Date.now() + 30000), // Timeout estrito de 30 segundos
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
