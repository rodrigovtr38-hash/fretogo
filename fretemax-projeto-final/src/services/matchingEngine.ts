// src/services/matchingEngine.ts
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  runTransaction,
  where,
} from 'firebase/firestore';

import { db } from '../firebase';

export type CategoriaVeiculo =
  | 'moto'
  | 'carro_pequeno'
  | 'utilitario'
  | 'van'
  | 'hr'
  | 'toco'
  | 'truck'
  | 'carreta'
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
  categoria?: string | string[];
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
    const isPesado = ['toco', 'truck', 'carreta', 'carreta_ls', 'bi_trem_cegonha'].includes(categoriaFrete);
    const RAIO_MAXIMO_KM = isPesado ? 50 : 15;

    // // AJUSTE CTO: Filtro Triplo Estrito e GeoBox para zerar custo de leitura
    const box = getBoundingBox(frete.origem.lat, frete.origem.lng, RAIO_MAXIMO_KM);
    const motoristasRef = collection(db, 'motoristas');
    const motoristasQuery = query(
      motoristasRef, 
      where('online', '==', true),
      where('disponivel', '==', true), // // AJUSTE CTO: Só pega quem não está em corrida
      where('categoria', 'array-contains', categoriaFrete),
      where('latitude', '>=', box.latMin),
      where('latitude', '<=', box.latMax)
    );
    
    const snapshot = await getDocs(motoristasQuery);
    const tempoAtual = Date.now();

    const motoristas = snapshot.docs
      .map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nome: data.nome || 'Motorista',
          telefone: data.telefone || '',
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
        if (motorista.longitude! < box.lngMin || motorista.longitude! > box.lngMax) return false;

        // Validação Motorista Fantasma (Heartbeat de 2 min)
        if (motorista.ultimoHeartbeat && (tempoAtual - motorista.ultimoHeartbeat > 120000)) return false; 

        if (motorista.latitude && motorista.longitude && frete.origem.lat && frete.origem.lng) {
          const dist = calcularDistanciaGeografica(motorista.latitude, motorista.longitude, frete.origem.lat, frete.origem.lng);
          motorista.distanciaAteColeta = dist;
          if (dist > RAIO_MAXIMO_KM) return false;
        } else {
           return false;
        }
        return true;
      })
      .sort((a, b) => {
        const scoreA = (a.score || 5) - (a.distanciaAteColeta! * 0.1);
        const scoreB = (b.score || 5) - (b.distanciaAteColeta! * 0.1);
        return scoreB - scoreA;
      });

    return motoristas;
  } catch (error) {
    console.error('[MATCHING] ERRO BUSCAR MOTORISTAS:', error);
    return [];
  }
}

export async function enviarOfertaMotorista(motoristaId: string, frete: FretePayload): Promise<boolean> {
  try {
    const motoristaRef = doc(db, 'motoristas', motoristaId);
    
    // // AJUSTE CTO: Eliminação de Duplicidade por Transação (Concorrência Pesada)
    await runTransaction(db, async (transaction) => {
      const motoristaDoc = await transaction.get(motoristaRef);
      if (!motoristaDoc.exists()) throw new Error("Motorista não existe.");

      const dados = motoristaDoc.data();
      // O motorista só pode receber oferta se ele for a bola da vez. 
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
        },
        status: 'MATCHING',
        atualizadoEm: serverTimestamp(),
      });
    });

    return true;
  } catch (error) {
    console.error('[MATCHING] ERRO ENVIAR OFERTA:', error);
    return false; // Indica falha na atribuição
  }
}
