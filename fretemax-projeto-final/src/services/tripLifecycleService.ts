// src/services/tripLifecycleService.ts

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  AppTripState,
  canTransition,
  isFinalState,
} from '../state/tripStateMachine';

import {
  DriverState,
  canDriverTransition,
} from '../state/driverStateMachine';

import {
  DispatchQueueService,
} from './dispatchQueueService';

import type {
  FretePayload,
} from './matchingEngine';

export class TripLifecycleService {

  /*
  =====================================================
  ALTERAR STATUS DA VIAGEM
  =====================================================
  */

  static async alterarStatusViagem(
    freteId: string,
    novoStatus: AppTripState,
    extras: Record<string, any> = {},
  ) {

    try {

      const freteRef =
        doc(
          db,
          'fretes',
          freteId,
        );

      const snapshot =
        await getDoc(
          freteRef,
        );

      if (
        !snapshot.exists()
      ) {

        throw new Error(
          'FRETE NÃO ENCONTRADO',
        );
      }

      const data =
        snapshot.data();

      const statusAtual =
        data.status;

      /*
      =====================================================
      VALIDAÇÃO STATE MACHINE
      =====================================================
      */

      const permitido =
        canTransition(
          statusAtual,
          novoStatus,
        );

      if (!permitido) {

        console.error(
          `TRANSIÇÃO INVÁLIDA: ${statusAtual} -> ${novoStatus}`,
        );

        return false;
      }

      /*
      =====================================================
      UPDATE REALTIME
      =====================================================
      */

      await updateDoc(
        freteRef,
        {
          status:
            novoStatus,

          atualizadoEm:
            serverTimestamp(),

          ...extras,
        },
      );

      console.log(
        `STATUS ALTERADO: ${statusAtual} -> ${novoStatus}`,
      );

      /*
      =====================================================
      REDISPATCH AUTOMÁTICO
      =====================================================
      */

      if (
        novoStatus ===
        AppTripState.REDISPATCH
      ) {

        await this.executarRedispatch(
          {
            ...data,
            id: freteId,
          } as FretePayload,
        );
      }

      return true;

    } catch (error) {

      console.error(
        'ERRO ALTERAR STATUS:',
        error,
      );

      return false;
    }
  }

  /*
  =====================================================
  ALTERAR STATUS MOTORISTA
  =====================================================
  */

  static async alterarStatusMotorista(
    motoristaId: string,
    novoStatus: DriverState,
    extras: Record<string, any> = {},
  ) {

    try {

      const motoristaRef =
        doc(
          db,
          'motoristas',
          motoristaId,
        );

      const snapshot =
        await getDoc(
          motoristaRef,
        );

      if (
        !snapshot.exists()
      ) {

        throw new Error(
          'MOTORISTA NÃO ENCONTRADO',
        );
      }

      const data =
        snapshot.data();

      const statusAtual =
        data.status ||
        DriverState.OFFLINE;

      /*
      =====================================================
      VALIDAR TRANSIÇÃO
      =====================================================
      */

      const permitido =
        canDriverTransition(
          statusAtual,
          novoStatus,
        );

      if (!permitido) {

        console.error(
          `TRANSIÇÃO MOTORISTA INVÁLIDA: ${statusAtual} -> ${novoStatus}`,
        );

        return false;
      }

      /*
      =====================================================
      UPDATE REALTIME
      =====================================================
      */

      await updateDoc(
        motoristaRef,
        {
          status:
            novoStatus,

          atualizadoEm:
            serverTimestamp(),

          ...extras,
        },
      );

      console.log(
        `STATUS MOTORISTA: ${statusAtual} -> ${novoStatus}`,
      );

      return true;

    } catch (error) {

      console.error(
        'ERRO STATUS MOTORISTA:',
        error,
      );

      return false;
    }
  }

  /*
  =====================================================
  ACEITAR CORRIDA
  =====================================================
  */

  static async aceitarCorrida(
    freteId: string,
    motoristaId: string,
  ) {

    try {

      const freteRef =
        doc(
          db,
          'fretes',
          freteId,
        );

      const freteSnap =
        await getDoc(
          freteRef,
        );

      if (
        !freteSnap.exists()
      ) {

        throw new Error(
          'FRETE NÃO EXISTE',
        );
      }

      const freteData =
        freteSnap.data();

      /*
      =====================================================
      IMPEDIR DUPLO ACEITE
      =====================================================
      */

      if (
        freteData.motoristaId
      ) {

        console.error(
          'FRETE JÁ ACEITO',
        );

        return false;
      }

      /*
      =====================================================
      STATUS VIAGEM
      =====================================================
      */

      await this.alterarStatusViagem(
        freteId,
        AppTripState.ACEITO,
        {
          motoristaId,

          aceitoEm:
            serverTimestamp(),
        },
      );

      /*
      =====================================================
      STATUS MOTORISTA
      =====================================================
      */

      await this.alterarStatusMotorista(
        motoristaId,
        DriverState.ACEITOU,
        {
          disponivel:
            false,
        },
      );

      return true;

    } catch (error) {

      console.error(
        'ERRO ACEITAR:',
        error,
      );

      return false;
    }
  }

  /*
  =====================================================
  REDISPATCH
  =====================================================
  */

  static async executarRedispatch(
    frete: FretePayload,
  ) {

    try {

      console.log(
        'INICIANDO REDISPATCH...',
      );

      await this.alterarStatusViagem(
        frete.id,
        AppTripState.BUSCANDO_MOTORISTA,
      );

      await DispatchQueueService.iniciarFila(
        frete,
      );

    } catch (error) {

      console.error(
        'ERRO REDISPATCH:',
        error,
      );
    }
  }

  /*
  =====================================================
  FINALIZAR CORRIDA
  =====================================================
  */

  static async finalizarCorrida(
    freteId: string,
    motoristaId: string,
    comprovante?: string,
  ) {

    try {

      /*
      =====================================================
      STATUS ENTREGA
      =====================================================
      */

      await this.alterarStatusViagem(
        freteId,
        AppTripState.ENTREGUE,
        {
          comprovante:
            comprovante || null,

          entregueEm:
            serverTimestamp(),
        },
      );

      /*
      =====================================================
      LIBERAR MOTORISTA
      =====================================================
      */

      await this.alterarStatusMotorista(
        motoristaId,
        DriverState.ONLINE,
        {
          disponivel:
            true,

          novaOferta:
            null,
        },
      );

      return true;

    } catch (error) {

      console.error(
        'ERRO FINALIZAR:',
        error,
      );

      return false;
    }
  }

  /*
  =====================================================
  CANCELAR CORRIDA
  =====================================================
  */

  static async cancelarCorrida(
    freteId: string,
    motivo: string,
  ) {

    try {

      const freteRef =
        doc(
          db,
          'fretes',
          freteId,
        );

      const snapshot =
        await getDoc(
          freteRef,
        );

      if (
        !snapshot.exists()
      ) {

        return false;
      }

      const data =
        snapshot.data();

      /*
      =====================================================
      IMPEDIR CANCELAMENTO DUPLO
      =====================================================
      */

      if (
        isFinalState(
          data.status,
        )
      ) {

        return false;
      }

      /*
      =====================================================
      CANCELAR VIAGEM
      =====================================================
      */

      await this.alterarStatusViagem(
        freteId,
        AppTripState.CANCELADO,
        {
          motivoCancelamento:
            motivo,

          canceladoEm:
            serverTimestamp(),
        },
      );

      /*
      =====================================================
      LIBERAR MOTORISTA
      =====================================================
      */

      if (
        data.motoristaId
      ) {

        await this.alterarStatusMotorista(
          data.motoristaId,
          DriverState.ONLINE,
          {
            disponivel:
              true,

            novaOferta:
              null,
          },
        );
      }

      return true;

    } catch (error) {

      console.error(
        'ERRO CANCELAMENTO:',
        error,
      );

      return false;
    }
  }
}
