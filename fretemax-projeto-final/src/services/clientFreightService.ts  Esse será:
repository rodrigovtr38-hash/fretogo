// src/services/clientFreightService.ts

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  runTransaction,
  getDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  paymentService,
} from './paymentService';

import {
  AppTripState,
} from '../state/tripStateMachine';

import {
  executeDispatch,
} from './orchestrator';

type CreateFreightPayload = {
  clienteId: string;
  origem: any;
  destino: any;
  vehicleType: string;
  distancia: number;
  valorTotal: number;
  observacoes?: string;
};

class ClientFreightService {
  async criarFrete(
    payload: CreateFreightPayload
  ) {
    try {
      /*
      ==========================
      PAGAMENTO
      ==========================
      */

      const pagamento =
        await paymentService.processarPagamento(
          {
            valor:
              payload.valorTotal,

            descricao:
              'Pagamento Frete',

            clienteId:
              payload.clienteId,

            freteId:
              'PENDING',
          }
        );

      if (!pagamento.success) {
        return {
          success: false,
          error:
            'PAGAMENTO_NEGADO',
        };
      }

      /*
      ==========================
      FRETE
      ==========================
      */

      const freteRef =
        await addDoc(
          collection(db, 'fretes'),
          {
            clienteId:
              payload.clienteId,

            origem:
              payload.origem,

            destino:
              payload.destino,

            vehicleType:
              payload.vehicleType,

            distancia:
              payload.distancia,

            valorTotal:
              payload.valorTotal,

            observacoes:
              payload.observacoes ||
              '',

            transactionId:
              pagamento.transactionId,

            status:
              AppTripState.DISPONIVEL,

            criadoEm:
              serverTimestamp(),

            atualizadoEm:
              serverTimestamp(),
          }
        );

      /*
      ==========================
      DISPATCH
      ==========================
      */

      await executeDispatch({
        id: freteRef.id,

        clienteId:
          payload.clienteId,

        origem:
          payload.origem,

        destino:
          payload.destino,

        vehicleType:
          payload.vehicleType,

        distancia:
          payload.distancia,

        valorTotal:
          payload.valorTotal,
      });

      return {
        success: true,
        freteId:
          freteRef.id,
      };
    } catch (error) {
      console.error(
        'ERRO CRIAR FRETE:',
        error
      );

      return {
        success: false,
        error:
          'ERRO_CRIAR_FRETE',
      };
    }
  }

  async cancelarFrete(
    freteId: string
  ) {
    try {
      const freteRef = doc(
        db,
        'fretes',
        freteId
      );

      await updateDoc(
        freteRef,
        {
          status:
            AppTripState.CANCELADO,

          atualizadoEm:
            serverTimestamp(),
        }
      );

      return true;
    } catch (error) {
      console.error(
        'ERRO CANCELAR FRETE:',
        error
      );

      return false;
    }
  }

  async atualizarFrete(
    freteId: string,
    payload: Record<string, any>
  ) {
    try {
      const freteRef = doc(
        db,
        'fretes',
        freteId
      );

      await updateDoc(
        freteRef,
        {
          ...payload,

          atualizadoEm:
            serverTimestamp(),
        }
      );

      return true;
    } catch (error) {
      console.error(
        'ERRO UPDATE FRETE:',
        error
      );

      return false;
    }
  }

  async buscarFrete(
    freteId: string
  ) {
    try {
      const freteRef = doc(
        db,
        'fretes',
        freteId
      );

      const snapshot =
        await getDoc(
          freteRef
        );

      if (!snapshot.exists()) {
        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
      };
    } catch (error) {
      console.error(
        'ERRO BUSCAR FRETE:',
        error
      );

      return null;
    }
  }

  async finalizarFrete(
    freteId: string
  ) {
    try {
      const freteRef = doc(
        db,
        'fretes',
        freteId
      );

      await runTransaction(
        db,
        async transaction => {
          const snapshot =
            await transaction.get(
              freteRef
            );

          if (
            !snapshot.exists()
          ) {
            throw new Error(
              'Frete não encontrado'
            );
          }

          transaction.update(
            freteRef,
            {
              status:
                AppTripState.ENTREGUE,

              atualizadoEm:
                serverTimestamp(),
            }
          );
        }
      );

      return true;
    } catch (error) {
      console.error(
        'ERRO FINALIZAR FRETE:',
        error
      );

      return false;
    }
  }
}

export const clientFreightService =
  new ClientFreightService();
