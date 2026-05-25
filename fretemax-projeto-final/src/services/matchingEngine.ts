import {
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  DriverMatchingService,
} from './driverMatchingService';

import {
  DispatchQueueService,
} from './dispatchQueueService';

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

async function atualizarFreteStatus(
  freteId: string,
  status: string,
  motoristaId?: string,
) {
  try {
    const freteRef = doc(
      db,
      'fretes',
      freteId,
    );

    await updateDoc(
      freteRef,
      {
        status,

        motoristaId:
          motoristaId || null,

        atualizadoEm:
          serverTimestamp(),
      },
    );
  } catch (error) {
    console.error(
      'ERRO AO ATUALIZAR FRETE:',
      error,
    );
  }
}

export async function iniciarMatchingFrete(
  frete: FretePayload,
) {
  try {
    await atualizarFreteStatus(
      frete.id,
      'buscando_motorista',
    );

    const motoristas =
      await DriverMatchingService.buscarMotoristas(
        {
          categoria:
            frete.categoria,

          origem: {
            lat: frete.origem.lat,
            lng: frete.origem.lng,
          },
        },
      );

    if (!motoristas.length) {
      await atualizarFreteStatus(
        frete.id,
        'sem_motorista',
      );

      return {
        sucesso: false,

        motivo:
          'SEM_MOTORISTA',
      };
    }

    await DispatchQueueService.iniciarFila(
      frete,
    );

    return {
      sucesso: true,

      motoristas:
        motoristas.length,
    };
  } catch (error) {
    console.error(
      'ERRO MATCHING:',
      error,
    );

    await atualizarFreteStatus(
      frete.id,
      'erro_matching',
    );

    return {
      sucesso: false,

      motivo:
        'ERRO_INTERNO',
    };
  }
}
