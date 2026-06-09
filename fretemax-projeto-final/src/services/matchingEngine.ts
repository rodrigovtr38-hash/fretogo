import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
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
  origem: {
    lat: number;
    lng: number;
    endereco: string;
  };
  destino: {
    lat: number;
    lng: number;
    endereco: string;
  };
  distanciaKm: number;
  valor: number;
  peso: number;
  descricao: string;
}

export interface MotoristaMatch {
  id: string;
  nome: string;
  telefone?: string;
  categoria?: string | string[]; // Ajustado para aceitar Array
  latitude?: number;
  longitude?: number;
  online?: boolean;
  score?: number;
  ultimoHeartbeat?: number;
  destinoRetornoLat?: number;
  destinoRetornoLng?: number;
  distanciaAteColeta?: number;
}

// 🔥 UTILIDADE: Calcula a distância em linha reta via GPS (Fórmula de Haversine)
function calcularDistanciaGeografica(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeCategoria(categoria?: string) {
  return categoria?.toLowerCase().trim() || '';
}

export async function buscarMotoristasCompativeis(
  frete: FretePayload,
): Promise<MotoristaMatch[]> {
  try {
    const categoriaFrete = normalizeCategoria(frete.categoria);
    const isPesado = ['toco', 'truck', 'carreta', 'carreta_ls', 'bi_trem_cegonha'].includes(categoriaFrete);
    const RAIO_MAXIMO_KM = isPesado ? 50 : 15; // Pesados buscam mais longe, leves buscam perto

    const motoristasRef = collection(db, 'motoristas');
    const motoristasQuery = query(motoristasRef, where('online', '==', true));
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
          destinoRetornoLat: data.destinoRetornoLat,
          destinoRetornoLng: data.destinoRetornoLng,
          distanciaAteColeta: 9999, // Valor inicial padrão
        } as MotoristaMatch;
      })
      .filter(motorista => {
        // 🔥 AJUSTE CTO: Proteção caso a categoria seja um Array ou String
        const categoriasMotorista = Array.isArray(motorista.categoria) 
          ? motorista.categoria 
          : [motorista.categoria];
        
        const categoriaCompativel = categoriasMotorista.some(
          cat => normalizeCategoria(cat as string) === categoriaFrete
        );
        
        // 1. Validação Categoria Exata
        if (!categoriaCompativel) return false;

        // 2. Validação Motorista Fantasma (Heartbeat de 2 minutos)
        // Se o motorista não atualiza o app há mais de 120.000 ms (2 min), ele é ignorado.
        if (motorista.ultimoHeartbeat && (tempoAtual - motorista.ultimoHeartbeat > 120000)) {
          return false; 
        }

        // 3. Validação de Raio Geográfico
        if (motorista.latitude && motorista.longitude && frete.origem.lat && frete.origem.lng) {
          const dist = calcularDistanciaGeografica(
            motorista.latitude, 
            motorista.longitude, 
            frete.origem.lat, 
            frete.origem.lng
          );
          motorista.distanciaAteColeta = dist;
          
          if (dist > RAIO_MAXIMO_KM) return false;
        } else {
           // Se não tiver GPS, ignora para não mandar frete cego
           return false;
        }

        return true;
      })
      .sort((a, b) => {
        // RANKING DE DISTRIBUIÇÃO:
        // Prioriza quem tem score maior E está mais perto da coleta.
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

export async function enviarOfertaMotorista(
  motoristaId: string,
  frete: FretePayload,
): Promise<boolean> {
  try {
    const motoristaRef = doc(db, 'motoristas', motoristaId);

    await updateDoc(motoristaRef, {
      ofertaAtual: {
        freteId: frete.id,
        categoria: frete.categoria,
        valor: frete.valor,
        origem: frete.origem,
        destino: frete.destino,
        enviadaEm: serverTimestamp(),
        // Timeout automático será tratado pelo Orchestrator
      },
      status: 'MATCHING',
      atualizadoEm: serverTimestamp(),
    });

    return true;

  } catch (error) {
    console.error('[MATCHING] ERRO ENVIAR OFERTA:', error);
    return false;
  }
}
