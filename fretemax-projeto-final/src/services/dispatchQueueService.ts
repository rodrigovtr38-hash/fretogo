import {
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import {
  db,
} from '../firebase';

import {
  buscarMotoristasCompativeis,
  enviarOfertaMotorista,
  FretePayload,
} from './matchingEngine';

const DRIVER_RESPONSE_TIMEOUT =
  15000;

export class DispatchQueueService {

  static async iniciarFila(
    frete: FretePayload,
  ) {

    try {

      const motoristas =
        await buscarMotoristasCompativeis(
          frete,
        );

      if (!motoristas.length) {

        await updateDoc(
          doc(db, 'fretes', frete.id),
          {
            status:
              'sem_motorista',
            atualizadoEm:
              serverTimestamp(),
          },
        );

        return;
      }

      await this.processarFila(
        frete,
        motoristas,
        0,
      );

    } catch (error) {

      console.error(
        'ERRO FILA:',
        error,
      );

    }
  }

  static async processarFila(
    frete: FretePayload,
    motoristas: any[],
    index: number,
  ) {

    if (
      index >= motoristas.length
    ) {

      await updateDoc(
        doc(db, 'fretes', frete.id),
        {
          status:
            'fila_esgotada',
          atualizadoEm:
            serverTimestamp(),
        },
      );

      return;
    }

    const motorista =
      motoristas[index];

    const enviado =
      await enviarOfertaMotorista(
        motorista.id,
        frete,
      );

    if (!enviado) {

      return await this.processarFila(
        frete,
        motoristas,
        index + 1,
      );
    }

    console.log(
      `OFERTA ENVIADA: ${motorista.nome}`,
    );

    await updateDoc(
      doc(db, 'fretes', frete.id),
      {
        status:
          'aguardando_motorista',
        motoristaAtual:
          motorista.id,
        atualizadoEm:
          serverTimestamp(),
      },
    );

    setTimeout(
      async () => {

        const freteRef =
          doc(
            db,
            'fretes',
            frete.id,
          );

        await this.processarFila(
          frete,
          motoristas,
          index + 1,
        );

      },
      DRIVER_RESPONSE_TIMEOUT,
    );
  }
}
