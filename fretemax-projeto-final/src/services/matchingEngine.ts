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

  online: boolean;

  disponivel: boolean;

  categoria: CategoriaVeiculo[];

  latitude: number;

  longitude: number;

  avaliacao?: number;

  viagens?: number;

  distanciaAteColeta?: number;
}

const MATCH_TIMEOUT_MS = 20000;

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

  const c = 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );

  return R * c;
}

function obterRaiosCategoria(
  categoria: CategoriaVeiculo
) {
  switch (categoria) {
    case 'moto':
    case 'carro_pequeno':
      return [5, 15, 30];

    case 'utilitario':
    case 'van':
    case 'hr':
    case 'toco':
    case 'truck':
    case 'carreta':
    case 'carreta_ls':
      return [20, 50, 120];

    case 'bi_trem_cegonha':
      return [100, 250];

    default:
      return [15, 30];
  }
}

async function marcarMotoristaOcupado(
  motoristaId: string,
  freteId: string
) {
  try {
    const motoristaRef = doc(
      db,
      'motoristas',
      motoristaId
    );

    await updateDoc(motoristaRef, {
      disponivel: false,

      freteAtualId: freteId,

      atualizadoEm: serverTimestamp(),
    });
  } catch (error) {
    console.error(
      'ERRO AO MARCAR MOTORISTA:',
      error
    );
  }
}

export async function buscarMotoristasCompativeis(
  frete: FretePayload
) {
  try {
    const motoristasRef = collection(
      db,
      'motoristas'
    );

    const q = query(
      motoristasRef,
      where('online', '==', true),
      where('disponivel', '==', true)
    );

    const snapshot = await getDocs(q);

    const motoristas: MotoristaMatch[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const categorias: CategoriaVeiculo[] =
        data.categoria || [];

      const categoriaCompativel =
        categorias.includes(frete.categoria);

      if (!categoriaCompativel) return;

      if (
        typeof data.latitude !== 'number' ||
        typeof data.longitude !== 'number'
      ) {
        return;
      }

      const distanciaAteColeta =
        calcularDistanciaKm(
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
      });
    });

    const ordenados = motoristas.sort(
      (a, b) =>
        (a.distanciaAteColeta || 0) -
        (b.distanciaAteColeta || 0)
    );

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
  frete: FretePayload,
  tentativa: number
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

        tentativa,

        status: 'pendente',

        expiraEm:
          Date.now() + MATCH_TIMEOUT_MS,

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

async function atualizarFreteStatus(
  freteId: string,
  status: string,
  motoristaId?: string
) {
  try {
    const freteRef = doc(
      db,
      'fretes',
      freteId
    );

    await updateDoc(freteRef, {
      status,

      motoristaId: motoristaId || null,

      atualizadoEm: serverTimestamp(),
    });
  } catch (error) {
    console.error(
      'ERRO AO ATUALIZAR FRETE:',
      error
    );
  }
}

export async function iniciarMatchingFrete(
  frete: FretePayload
) {
  try {
    await atualizarFreteStatus(
      frete.id,
      'buscando_motorista'
    );

    const motoristas =
      await buscarMotoristasCompativeis(
        frete
      );

    if (!motoristas.length) {
      await atualizarFreteStatus(
        frete.id,
        'sem_motorista'
      );

      return {
        sucesso: false,
        motivo: 'SEM_MOTORISTA',
      };
    }

    const raios =
      obterRaiosCategoria(
        frete.categoria
      );

    let tentativa = 1;

    for (const raio of raios) {
      const candidatos = motoristas.filter(
        (motorista) =>
          (motorista.distanciaAteColeta || 0) <=
          raio
      );

      for (const motorista of candidatos) {
        const enviado =
          await enviarOfertaMotorista(
            motorista.id,
            frete,
            tentativa
          );

        if (!enviado) continue;

        console.log(
          `OFERTA ENVIADA -> ${motorista.nome}`
        );

        await marcarMotoristaOcupado(
          motorista.id,
          frete.id
        );

        await atualizarFreteStatus(
          frete.id,
          'aguardando_aceite',
          motorista.id
        );

        return {
          sucesso: true,

          motorista,

          tentativa,

          raio,
        };
      }

      tentativa++;
    }

    await atualizarFreteStatus(
      frete.id,
      'fila_esgotada'
    );

    return {
      sucesso: false,
      motivo: 'FILA_ESGOTADA',
    };
  } catch (error) {
    console.error(
      'ERRO MATCHING:',
      error
    );

    await atualizarFreteStatus(
      frete.id,
      'erro_matching'
    );

    return {
      sucesso: false,
      motivo: 'ERRO_INTERNO',
    };
  }
}
