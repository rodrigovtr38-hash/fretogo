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

/*
=====================================================
CONFIG
=====================================================
*/

const DRIVER_RESPONSE_TIMEOUT = 15000;

const MAX_REDISPATCH_ATTEMPTS = 10;

/*
=====================================================
TIPOS
=====================================================
*/

interface QueueState {
  index: number;
  tentativa: number;
}

/*
=====================================================
SERVICE
=====================================================
*/

export class DispatchQueueService {

  /*
  =====================================================
  START
  =====================================================
  */

  static async iniciarFila(
    frete: FretePayload,
  ) {

    try {

      console.log(
        '[DISPATCH] INICIANDO FILA:',
        frete.id,
      );

      /*
      ============================================
      BUSCA MOTORISTAS
      ============================================
      */

      const motoristas =
        await buscarMotoristasCompativeis(
          frete,
        );

      /*
      ============================================
      SEM MOTORISTA
      ============================================
      */

      if (!motoristas.length) {

        console.log(
          '[DISPATCH] NENHUM MOTORISTA',
        );

        await updateDoc(
          doc(db, 'fretes', frete.id),
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

      /*
      ============================================
      STATUS INICIAL
      ============================================
      */

      await updateDoc(
        doc(db, 'fretes', frete.id),
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

      /*
      ============================================
      PROCESSA FILA
      ============================================
      */

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
        doc(db, 'fretes', frete.id),
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

  /*
  =====================================================
  PROCESSAR FILA
  =====================================================
  */

  static async processarFila(
    frete: FretePayload,
    motoristas: MotoristaMatch[],
    state: QueueState,
  ) {

    try {

      /*
      ============================================
      LIMITADOR
      ============================================
      */

      if (
        state.tentativa >
        MAX_REDISPATCH_ATTEMPTS
      ) {

        console.log(
          '[DISPATCH] LIMITE REDISPATCH',
        );

        await updateDoc(
          doc(db, 'fretes', frete.id),
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

      /*
      ============================================
      FIM FILA
      ============================================
      */

      if (
        state.index >=
        motoristas.length
      ) {

        console.log(
          '[DISPATCH] FILA ESGOTADA',
        );

        await updateDoc(
          doc(db, 'fretes', frete.id),
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

      /*
      ============================================
      MOTORISTA
      ============================================
      */

      const motorista =
        motoristas[state.index];

      console.log(
        '[DISPATCH] ENVIANDO:',
        motorista.nome,
      );

      /*
      ============================================
      ENVIA OFERTA
      ============================================
      */

      const enviado =
        await enviarOfertaMotorista(
          motorista.id,
          frete,
        );

      /*
      ============================================
      FALHA ENVIO
      ============================================
      */

      if (!enviado) {

        console.log(
          '[DISPATCH] FALHA ENVIO',
        );

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

      /*
      ============================================
      STATUS AGUARDANDO
      ============================================
      */

      await updateDoc(
        doc(db, 'fretes', frete.id),
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

      console.log(
        '[DISPATCH] AGUARDANDO:',
        motorista.nome,
      );

      /*
      ============================================
      TIMEOUT WATCHDOG
      ============================================
      */

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

            /*
            ======================================
            FRETE REMOVIDO
            ======================================
            */

            if (
              !freteSnap.exists()
            ) {

              return;
            }

            const freteAtual =
              freteSnap.data();

            /*
            ======================================
            MOTORISTA ACEITOU
            ======================================
            */

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

              console.log(
                '[DISPATCH] MOTORISTA ACEITOU',
              );

              return;
            }

            /*
            ======================================
            REDISPATCH
            ======================================
            */

            console.log(
              '[DISPATCH] TIMEOUT REDISPATCH',
            );

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

            /*
            ======================================
            PRÓXIMO MOTORISTA
            ======================================
            */

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
        doc(db, 'fretes', frete.id),
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
