import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';

interface ClientContextData {
  activeRequest: string | null;

  destinationCode: string | null;

  driverAccepted: boolean;

  setActiveRequest: (
    value: string | null,
  ) => void;

  setDestinationCode: (
    value: string | null,
  ) => void;

  setDriverAccepted: (
    value: boolean,
  ) => void;
}

const ClientContext =
  createContext<
    ClientContextData | undefined
  >(undefined);

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({
  children,
}: ClientProviderProps) {

  const [
    activeRequest,
    setActiveRequest,
  ] = useState<string | null>(
    null,
  );

  const [
    destinationCode,
    setDestinationCode,
  ] = useState<string | null>(
    null,
  );

  const [
    driverAccepted,
    setDriverAccepted,
  ] = useState(false);

  return (
    <ClientContext.Provider
      value={{
        activeRequest,
        destinationCode,
        driverAccepted,

        setActiveRequest,
        setDestinationCode,
        setDriverAccepted,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {

  const context =
    useContext(ClientContext);

  if (!context) {

    throw new Error(
      'useClientContext deve ser usado dentro de ClientProvider',
    );

  }

  return context;
}
src/services/matchingEngine.ts
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

  categoria?: string;

  latitude?: number;

  longitude?: number;

  online?: boolean;

  score?: number;
}

function normalizeCategoria(
  categoria?: string,
) {

  return (
    categoria
      ?.toLowerCase()
      .trim() || ''
  );

}

export async function buscarMotoristasCompativeis(
  frete: FretePayload,
): Promise<
  MotoristaMatch[]
> {

  try {

    const categoria =
      normalizeCategoria(
        frete.categoria,
      );

    const motoristasRef =
      collection(
        db,
        'motoristas',
      );

    const motoristasQuery =
      query(
        motoristasRef,
        where(
          'online',
          '==',
          true,
        ),
      );

    const snapshot =
      await getDocs(
        motoristasQuery,
      );

    const motoristas =
      snapshot.docs
        .map(docSnap => {

          const data =
            docSnap.data();

          return {
            id:
              docSnap.id,

            nome:
              data.nome ||
              'Motorista',

            telefone:
              data.telefone ||
              '',

            categoria:
              data.categoria ||
              '',

            latitude:
              data.latitude,

            longitude:
              data.longitude,

            online:
              data.online,

            score:
              Number(
                data.score || 0,
              ),
          } as MotoristaMatch;

        })
        .filter(
          motorista => {

            const motoristaCategoria =
              normalizeCategoria(
                motorista.categoria,
              );

            return (
              motoristaCategoria ===
                categoria ||
              categoria ===
                'utilitario'
            );

          },
        )
        .sort(
          (a, b) =>
            (b.score || 0) -
            (a.score || 0),
        );

    return motoristas;

  } catch (error) {

    console.error(
      '[MATCHING] ERRO BUSCAR MOTORISTAS:',
      error,
    );

    return [];

  }

}

export async function enviarOfertaMotorista(
  motoristaId: string,
  frete: FretePayload,
): Promise<boolean> {

  try {

    const motoristaRef =
      doc(
        db,
        'motoristas',
        motoristaId,
      );

    await updateDoc(
      motoristaRef,
      {
        ofertaAtual: {
          freteId:
            frete.id,

          categoria:
            frete.categoria,

          valor:
            frete.valor,

          origem:
            frete.origem,

          destino:
            frete.destino,

          enviadaEm:
            serverTimestamp(),
        },

        status:
          'MATCHING',

        atualizadoEm:
          serverTimestamp(),
      },
    );

    return true;

  } catch (error) {

    console.error(
      '[MATCHING] ERRO ENVIAR OFERTA:',
      error,
    );

    return false;

  }

}
