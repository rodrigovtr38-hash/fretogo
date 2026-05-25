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
}

export interface MatchedDriver {
  id: string;

  nome: string;

  categoria: CategoriaVeiculo[];

  latitude: number;

  longitude: number;

  online: boolean;

  disponivel: boolean;

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

  const dLat =
    ((lat2 - lat1) * Math.PI) /
    180;

  const dLon =
    ((lon2 - lon1) * Math.PI) /
    180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(
      (lat1 * Math.PI) / 180,
    ) *
      Math.cos(
        (lat2 * Math.PI) / 180,
      ) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );

  return R * c;
}

export class DriverMatchingService {
  static async buscarMotoristas(
    payload: DriverMatchingPayload,
  ): Promise<MatchedDriver[]> {
    try {
      const motoristasRef =
        collection(
          db,
          'motoristas',
        );

      const q = query(
        motoristasRef,
        where(
          'online',
          '==',
          true,
        ),
        where(
          'disponivel',
          '==',
          true,
        ),
      );

      const snapshot =
        await getDocs(q);

      const motoristas: MatchedDriver[] =
        [];

      snapshot.forEach(
        (docSnap) => {
          const data =
            docSnap.data();

          const categorias =
            data.categoria || [];

          const categoriaCompativel =
            categorias.includes(
              payload.categoria,
            );

          if (
            !categoriaCompativel
          ) {
            return;
          }

          const distanciaKm =
            calcularDistanciaKm(
              payload.origem.lat,
              payload.origem.lng,
              data.latitude,
              data.longitude,
            );

          motoristas.push({
            id: docSnap.id,

            nome:
              data.nome ||
              'Motorista',

            categoria:
              categorias,

            latitude:
              data.latitude,

            longitude:
              data.longitude,

            online:
              data.online,

            disponivel:
              data.disponivel,

            avaliacao:
              data.avaliacao ||
              5,

            viagens:
              data.viagens ||
              0,

            distanciaKm,
          });
        },
      );

      const raios =
        CATEGORY_RADIUS[
          payload.categoria
        ];

      for (const raio of raios) {
        const encontrados =
          motoristas
            .filter(
              (
                motorista,
              ) =>
                motorista.distanciaKm <=
                raio,
            )
            .sort(
              (a, b) =>
                a.distanciaKm -
                b.distanciaKm,
            );

        if (
          encontrados.length
        ) {
          console.log(
            `MOTORISTAS ENCONTRADOS EM ${raio}KM`,
          );

          return encontrados;
        }
      }

      return [];
    } catch (error) {
      console.error(
        'ERRO DRIVER MATCHING:',
        error,
      );

      return [];
    }
  }
}
