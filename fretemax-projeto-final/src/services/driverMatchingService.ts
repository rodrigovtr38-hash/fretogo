// src/services/driverMatchingService.ts

import {
  collection,
  getDocs,
  query,
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
  | 'carreta_ls'
  | 'bi_trem_cegonha';

export interface DriverMatchingPayload {
  categoria: CategoriaVeiculo;
  origem: {
    lat: number;
    lng: number;
  };
  cidadeDestino?: string; // 🔥 FASE 4: Passamos a cidade de destino do frete para cruzar com o Radar de Retorno
}

export interface MatchedDriver {
  id: string;
  nome: string;
  categoria: CategoriaVeiculo[];
  latitude: number;
  longitude: number;
  online: boolean;
  disponivel: boolean;
  modoRetorno?: boolean; 
  destinoRetorno?: string; 
  avaliacao?: number;
  viagens?: number;
  distanciaKm: number;
}

const CATEGORY_RADIUS: Record<
  CategoriaVeiculo,
  number[]
> = {
  moto: [5, 15, 30],
  carro_pequeno: [5, 15, 30],
  utilitario: [10, 25, 50],
  van: [15, 35, 70],
  hr: [20, 50, 120],
  toco: [20, 50, 120],
  truck: [20, 50, 120],
  carreta_ls: [100, 250],
  bi_trem_cegonha: [100, 250],
};

function calcularDistanciaKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class DriverMatchingService {
  static async buscarMotoristas(
    payload: DriverMatchingPayload,
  ): Promise<MatchedDriver[]> {
    try {
      const motoristasRef = collection(db, 'motoristas_online'); // 🔥 CTO FIX: A busca B2B real deve ser feita nos motoristas online, não no cadastro morto

      const q = query(
        motoristasRef,
        where('online', '==', true),
        where('disponivel', '==', true),
      );

      const snapshot = await getDocs(q);
      const motoristas: MatchedDriver[] = [];

      // Padroniza a string de destino do frete para comparar (Tira acentos e deixa minúsculo)
      const destinoFreteFormatado = payload.cidadeDestino?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      snapshot.forEach(
        (docSnap) => {
          const data = docSnap.data();

          const rawCategoria = data.categoria;
          const categorias = Array.isArray(rawCategoria) 
            ? rawCategoria 
            : [rawCategoria].filter(Boolean);

          const categoriaCompativel = categorias.includes(payload.categoria);
          if (!categoriaCompativel) return;

          // 🔥 CTO FIX: Filtro Mestre de Radar de Retorno (Bloqueia Duplicidade)
          // Se o motorista está com o "Modo Retorno" ativado
          if (data.modoRetorno && data.destinoRetorno) {
             const destinoMotoristaFormatado = data.destinoRetorno.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
             
             // Se o destino do frete NÃO for a cidade que ele quer voltar, a gente esconde esse frete dele.
             // Isso garante que ele só vai receber o frete de volta pra casa.
             if (destinoMotoristaFormatado && destinoFreteFormatado && !destinoFreteFormatado.includes(destinoMotoristaFormatado)) {
                return; // Pula este motorista
             }
          }

          const distanciaKm = calcularDistanciaKm(
            payload.origem.lat,
            payload.origem.lng,
            data.lat || data.latitude, // Suporte para formatos antigos e novos do Firestore
            data.lng || data.longitude,
          );

          motoristas.push({
            id: docSnap.id,
            nome: data.nome || 'Motorista',
            categoria: categorias,
            latitude: data.lat || data.latitude,
            longitude: data.lng || data.longitude,
            online: data.online,
            disponivel: data.disponivel,
            modoRetorno: data.modoRetorno,
            destinoRetorno: data.destinoRetorno,
            avaliacao: data.avaliacao || 5,
            viagens: data.viagens || 0,
            distanciaKm,
          });
        },
      );

      const raios = CATEGORY_RADIUS[payload.categoria];

      for (const raio of raios) {
        const encontrados = motoristas
          .filter(motorista => motorista.distanciaKm <= raio)
          .sort((a, b) => {
            // 🔥 CTO FIX: Bônus de Ranqueamento para Retorno
            // Se o cara ativou o modo retorno e a carga é para lá, ele passa na frente dos outros na fila!
            const bonusRetornoA = a.modoRetorno ? -50 : 0; 
            const bonusRetornoB = b.modoRetorno ? -50 : 0;
            return (a.distanciaKm + bonusRetornoA) - (b.distanciaKm + bonusRetornoB);
          });

        if (encontrados.length) {
          console.log(`MOTORISTAS ENCONTRADOS EM ${raio}KM`);
          return encontrados;
        }
      }

      return [];
    } catch (error) {
      console.error('ERRO DRIVER MATCHING:', error);
      return [];
    }
  }
}
