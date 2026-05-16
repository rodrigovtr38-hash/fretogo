import {
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  addDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

export type StatusMotorista =
  | 'OFFLINE'
  | 'ONLINE'
  | 'OCUPADO'
  | 'EM_COLETA'
  | 'EM_ENTREGA'
  | 'AGUARDANDO';

export interface OfertaFrete {
  freteId: string;

  clienteId: string;

  valor: number;

  categoria: string;

  distanciaKm: number;

  peso: number;

  descricao: string;

  origem: {
    endereco: string;
    lat: number;
    lng: number;
  };

  destino: {
    endereco: string;
    lat: number;
    lng: number;
  };

  criadaEm?: any;
}

export async function atualizarStatusMotorista(
  motoristaId: string,
  status: StatusMotorista
) {
  try {
    const motoristaRef = doc(
      db,
      'motoristas',
      motoristaId
    );

    await updateDoc(motoristaRef, {
      statusOperacional: status,

      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error(
      'ERRO STATUS MOTORISTA:',
      error
    );

    return false;
  }
}

export async function ativarMotoristaOnline(
  motoristaId: string
) {
  try {
    const motoristaRef = doc(
      db,
      'motoristas',
      motoristaId
    );

    await updateDoc(motoristaRef, {
      online: true,

      disponivel: true,

      statusOperacional: 'ONLINE',

      ultimoPing: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error(
      'ERRO AO ATIVAR MOTORISTA:',
      error
    );

    return false;
  }
}

export async function desativarMotorista(
  motoristaId: string
) {
  try {
    const motoristaRef = doc(
      db,
      'motoristas',
      motoristaId
    );

    await updateDoc(motoristaRef, {
      online: false,

      disponivel: false,

      statusOperacional: 'OFFLINE',

      ultimoPing: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error(
      'ERRO OFFLINE:',
      error
    );

    return false;
  }
}

export async function aceitarFrete(
  motoristaId: string,
  freteId: string
) {
  try {
    const motoristaRef = doc(
      db,
      'motoristas',
      motoristaId
    );

    const freteRef = doc(
      db,
      'fretes',
      freteId
    );

    await updateDoc(motoristaRef, {
      disponivel: false,

      statusOperacional: 'OCUPADO',

      freteAtual: freteId,

      aceitouEm: serverTimestamp(),
    });

    await updateDoc(freteRef, {
      status: 'MOTORISTA_CONFIRMADO',

      motoristaId,

      atualizadoEm: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error(
      'ERRO ACEITAR FRETE:',
      error
    );

    return false;
  }
}

export async function iniciarColeta(
  motoristaId: string,
  freteId: string
) {
  try {
    const motoristaRef = doc(
      db,
      'motoristas',
      motoristaId
    );

    const freteRef = doc(
      db,
      'fretes',
      freteId
    );

    await updateDoc(motoristaRef, {
      statusOperacional: 'EM_COLETA',
    });

    await updateDoc(freteRef, {
      status: 'EM_COLETA',

      coletaIniciadaEm: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error(
      'ERRO INICIAR COLETA:',
      error
    );

    return false;
  }
}

export async function iniciarEntrega(
  motoristaId: string,
  freteId: string
) {
  try {
    const motoristaRef = doc(
      db,
      'motoristas',
      motoristaId
    );

    const freteRef = doc(
      db,
      'fretes',
      freteId
    );

    await updateDoc(motoristaRef, {
      statusOperacional: 'EM_ENTREGA',
    });

    await updateDoc(freteRef, {
      status: 'EM_ENTREGA',

      entregaIniciadaEm: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error(
      'ERRO ENTREGA:',
      error
    );

    return false;
  }
}

export async function finalizarEntrega(
  motoristaId: string,
  freteId: string,
  comprovanteUrl: string
) {
  try {
    const motoristaRef = doc(
      db,
      'motoristas',
      motoristaId
    );

    const freteRef = doc(
      db,
      'fretes',
      freteId
    );

    await updateDoc(freteRef, {
      status: 'FINALIZADO',

      comprovanteEntrega: comprovanteUrl,

      finalizadoEm: serverTimestamp(),
    });

    await updateDoc(motoristaRef, {
      disponivel: true,

      statusOperacional: 'ONLINE',

      freteAtual: null,

      ultimaEntrega: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error(
      'ERRO FINALIZAR:',
      error
    );

    return false;
  }
}

export async function rejeitarFrete(
  motoristaId: string,
  freteId: string
) {
  try {
    await addDoc(
      collection(
        db,
        'fretes',
        freteId,
        'rejeicoes'
      ),
      {
        motoristaId,

        rejeitadoEm: serverTimestamp(),
      }
    );

    return true;
  } catch (error) {
    console.error(
      'ERRO REJEIÇÃO:',
      error
    );

    return false;
  }
}

export function escutarOfertaMotorista(
  motoristaId: string,
  callback: (oferta: OfertaFrete | null) => void
) {
  const motoristaRef = doc(
    db,
    'motoristas',
    motoristaId
  );

  return onSnapshot(motoristaRef, (snapshot) => {
    const data = snapshot.data();

    if (!data) {
      callback(null);

      return;
    }

    callback(
      data.novaOferta || null
    );
  });
}
