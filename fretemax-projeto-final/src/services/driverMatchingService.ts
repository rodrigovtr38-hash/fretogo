// src/services/driverMatchingService.ts
import { collection, getDocs, query, where } from 'firebase/firestore';
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
  origem: { lat: number; lng: number; };
  cidadeDestino?: string; 
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

const CATEGORY_RADIUS: Record<CategoriaVeiculo, number[]> = {
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

function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {
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

// // AJUSTE CTO: Cálculo das Bordas do Quadrado para não ler 10k motoristas (Geo-Bounding Box)
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

export class DriverMatchingService {
  static async buscarMotoristas(payload: DriverMatchingPayload): Promise<MatchedDriver[]> {
    try {
      const raios = CATEGORY_RADIUS[payload.categoria];
      const maxRaio = raios[raios.length - 1]; // Maior raio possível para a categoria

      // // AJUSTE CTO: Define a caixa geográfica baseada no raio máximo da categoria
      const box = getBoundingBox(payload.origem.lat, payload.origem.lng, maxRaio);

      const motoristasRef = collection(db, 'motoristas_online'); 
      
      // // AJUSTE CTO: Query Mestra Blindada. Consulta apenas dentro do quadrado + array-contains para Categoria exata
      const q = query(
        motoristasRef,
        where('online', '==', true),
        where('disponivel', '==', true),
        where('categoria', 'array-contains', payload.categoria),
        where('latitude', '>=', box.latMin),
        where('latitude', '<=', box.latMax)
      );

      const snapshot = await getDocs(q);
      const motoristas: MatchedDriver[] = [];
      const destinoFreteFormatado = payload.cidadeDestino?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      // DEBUG: Loga quantos motoristas passaram na query inicial
      console.log(`[DriverMatching] Motoristas encontrados na Query Base: ${snapshot.size}`);

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // Segunda checagem de longitude (pois o Firestore só aceita >= em um campo por vez)
        if (data.longitude < box.lngMin || data.longitude > box.lngMax) return;

        // Filtro de Retorno Anti-Fraude
        if (data.modoRetorno && data.destinoRetorno) {
           const destinoMotoristaFormatado = data.destinoRetorno.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
           if (destinoMotoristaFormatado && destinoFreteFormatado && !destinoFreteFormatado.includes(destinoMotoristaFormatado)) {
              return; 
           }
        }

        const distanciaKm = calcularDistanciaKm(
          payload.origem.lat, payload.origem.lng,
          data.latitude, data.longitude
        );

        // Se está fora até do raio máximo (mesmo estando no quadrado), ignora
        if (distanciaKm > maxRaio) return;

        motoristas.push({
          id: docSnap.id,
          nome: data.nome || 'Motorista',
          categoria: data.categoria,
          latitude: data.latitude,
          longitude: data.longitude,
          online: data.online,
          disponivel: data.disponivel,
          modoRetorno: data.modoRetorno,
          destinoRetorno: data.destinoRetorno,
          avaliacao: data.avaliacao || 5,
          viagens: data.viagens || 0,
          distanciaKm,
        });
      });

      for (const raio of raios) {
        const encontrados = motoristas
          .filter(motorista => motorista.distanciaKm <= raio)
          .sort((a, b) => {
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
