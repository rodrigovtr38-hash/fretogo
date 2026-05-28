```ts
import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

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

      console.log(
        '[DISPATCH] INICIANDO FILA:',
        frete.id,
      );

      const motoristas =
        await buscarMotoristasCompativeis(
          frete,
        );

      if (!motoristas.length) {

        console.log(
          '[DISPATCH] NENHUM MOTORISTA',
        );

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
        '[DISPATCH] ERRO INICIAR FILA:',
        error,
      );

      await updateDoc(
        doc(
          db,
          'fretes',
          frete.id,
        ),
        {
          status:
            'erro_dispatch',

          dispatchStatus:
            'erro',

          atualizadoEm:
            serverTimestamp(),
        },
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

      if (
        state.index >=
        motoristas.length
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

        return await this.processarFila(
          frete,
          motoristas,
          {
            index:
              state.index + 1,

            tentativa:
              state.tentativa + 1,
          },
        );
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

            const freteSnap =
              await getDoc(
                freteRef,
              );

            if (
              !freteSnap.exists()
            ) {
              return;
            }

            const freteAtual =
              freteSnap.data();

            if (
              freteAtual.status ===
                'aceito' ||

              freteAtual.status ===
                'coleta' ||

              freteAtual.status ===
                'em_transporte' ||

              freteAtual.status ===
                'entregue'
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
              '[DISPATCH] WATCHDOG:',
              error,
            );

          }
        },
        DRIVER_RESPONSE_TIMEOUT,
      );

    } catch (error) {

      console.error(
        '[DISPATCH] PROCESSAR:',
        error,
      );

      await updateDoc(
        doc(
          db,
          'fretes',
          frete.id,
        ),
        {
          status:
            'erro_dispatch',

          dispatchStatus:
            'erro',

          atualizadoEm:
            serverTimestamp(),
        },
      );
    }
  }
}
```
