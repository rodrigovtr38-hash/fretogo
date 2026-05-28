import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import {
  db,
} from '../firebase';

import {
  buscarMotoristasCompativeis,
  enviarOfertaMotorista,
  FretePayload,
  MotoristaMatch,
} from './matchingEngine';

const DRIVER_RESPONSE_TIMEOUT =
  15000;

const MAX_REDISPATCH_ATTEMPTS =
  10;

interface QueueState {
  index: number;
  tentativa: number;
}

export class DispatchQueueService {
  static async iniciarFila(
    frete: FretePayload,
  ) {
    try {
      const motoristas =
        await buscarMotoristasCompativeis(
          frete,
        );

      if (
        !motoristas.length
      ) {
        await updateDoc(
          doc(
            db,
            'fretes',
            frete.id,
          ),
          {
            status:
              'sem_motorista',

            dispatchStatus:
              'encerrado',

            atualizadoEm:
              serverTimestamp(),
          },
        );

        return;
      }

      await updateDoc(
        doc(
          db,
          'fretes',
          frete.id,
        ),
        {
          status:
            'buscando_motorista',

          dispatchStatus:
            'em_andamento',

          filaTotal:
            motoristas.length,

          atualizadoEm:
            serverTimestamp(),
        },
      );

      await this.processarFila(
        frete,
        motoristas,
        {
          index: 0,
          tentativa: 1,
        },
      );
    } catch (error) {
      console.error(
        '[DISPATCH_QUEUE_ERROR]',
        error,
      );
    }
  }

  static async processarFila(
    frete: FretePayload,
    motoristas: MotoristaMatch[],
    state: QueueState,
  ) {
    try {
      if (
        state.index >=
          motoristas.length ||

        state.tentativa >
          MAX_REDISPATCH_ATTEMPTS
      ) {
        await updateDoc(
          doc(
            db,
            'fretes',
            frete.id,
          ),
          {
            status:
              'fila_esgotada',

            dispatchStatus:
              'encerrado',

            atualizadoEm:
              serverTimestamp(),
          },
        );

        return;
      }

      const motorista =
        motoristas[
          state.index
        ];

      const enviado =
        await enviarOfertaMotorista(
          motorista.id,
          frete,
        );

      if (!enviado) {
        await this.processarFila(
          frete,
          motoristas,
          {
            index:
              state.index + 1,

            tentativa:
              state.tentativa + 1,
          },
        );

        return;
      }

      await updateDoc(
        doc(
          db,
          'fretes',
          frete.id,
        ),
        {
          status:
            'aguardando_motorista',

          motoristaAtual:
            motorista.id,

          motoristaAtualNome:
            motorista.nome,

          dispatchIndex:
            state.index,

          dispatchTentativa:
            state.tentativa,

          aguardandoResposta:
            true,

          atualizadoEm:
            serverTimestamp(),
        },
      );

      setTimeout(
        async () => {
          try {
            const freteRef =
              doc(
                db,
                'fretes',
                frete.id,
              );

            const snapshot =
              await getDoc(
                freteRef,
              );

            if (
              !snapshot.exists()
            ) {
              return;
            }

            const data =
              snapshot.data();

            if (
              [
                'aceito',
                'coleta',
                'em_transporte',
                'entregue',
              ].includes(
                data.status,
              )
            ) {
              return;
            }

            await updateDoc(
              freteRef,
              {
                status:
                  'redispatch',

                aguardandoResposta:
                  false,

                atualizadoEm:
                  serverTimestamp(),
              },
            );

            await this.processarFila(
              frete,
              motoristas,
              {
                index:
                  state.index + 1,

                tentativa:
                  state.tentativa + 1,
              },
            );
          } catch (error) {
            console.error(
              '[DISPATCH_WATCHDOG_ERROR]',
              error,
            );
          }
        },
        DRIVER_RESPONSE_TIMEOUT,
      );
    } catch (error) {
      console.error(
        '[PROCESSAR_FILA_ERROR]',
        error,
      );
    }
  }
}

export default DispatchQueueService;
