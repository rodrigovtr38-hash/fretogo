import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
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
  | 'carreta';

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

  online: boolean;

  disponivel: boolean;

  categoria: CategoriaVeiculo[];

  latitude: number;

  longitude: number;

  avaliacao?: number;

  viagens?: number;
}

function calcularDistanciaKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;

  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function buscarMotoristasCompativeis(
  frete: FretePayload
) {
  try {
    const motoristasRef = collection(db, 'motoristas');

    const q = query(
      motoristasRef,
      where('online', '==', true),
      where('disponivel', '==', true)
    );

    const snapshot = await getDocs(q);

    const motoristas: MotoristaMatch[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const categorias = data.categoria || [];

      const categoriaCompativel =
        categorias.includes(frete.categoria);

      if (!categoriaCompativel) return;

      const distanciaAteColeta = calcularDistanciaKm(
        frete.origem.lat,
        frete.origem.lng,
        data.latitude,
        data.longitude
      );

      motoristas.push({
        id: docSnap.id,

        nome: data.nome || 'Motorista',

        online: data.online,

        disponivel: data.disponivel,

        categoria: categorias,

        latitude: data.latitude,

        longitude: data.longitude,

        avaliacao: data.avaliacao || 5,

        viagens: data.viagens || 0,

        distanciaAteColeta,
      } as any);
    });

    const ordenados = motoristas.sort((a: any, b: any) => {
      return a.distanciaAteColeta - b.distanciaAteColeta;
    });

    return ordenados;
  } catch (error) {
    console.error(
      'ERRO AO BUSCAR MOTORISTAS:',
      error
    );

    return [];
  }
}

export async function enviarOfertaMotorista(
  motoristaId: string,
  frete: FretePayload
) {
  try {
    const motoristaRef = doc(
      db,
      'motoristas',
      motoristaId
    );

    await updateDoc(motoristaRef, {
      novaOferta: {
        freteId: frete.id,

        valor: frete.valor,

        categoria: frete.categoria,

        peso: frete.peso,

        descricao: frete.descricao,

        distanciaKm: frete.distanciaKm,

        origem: frete.origem,

        destino: frete.destino,

        criadaEm: serverTimestamp(),
      },
    });

    return true;
  } catch (error) {
    console.error(
      'ERRO AO ENVIAR OFERTA:',
      error
    );

    return false;
  }
}

export async function iniciarMatchingFrete(
  frete: FretePayload
) {
  try {
    const motoristas =
      await buscarMotoristasCompativeis(frete);

    if (!motoristas.length) {
      console.log(
        'NENHUM MOTORISTA DISPONÍVEL'
      );

      return {
        sucesso: false,
        motivo: 'SEM_MOTORISTA',
      };
    }

    for (const motorista of motoristas) {
      const enviado =
        await enviarOfertaMotorista(
          motorista.id,
          frete
        );

      if (enviado) {
        console.log(
          `OFERTA ENVIADA PARA ${motorista.nome}`
        );

        return {
          sucesso: true,
          motorista,
        };
      }
    }

    return {
      sucesso: false,
      motivo: 'FILA_ESGOTADA',
    };
  } catch (error) {
    console.error(
      'ERRO MATCHING:',
      error
    );

    return {
      sucesso: false,
      motivo: 'ERRO_INTERNO',
    };
  }
}
