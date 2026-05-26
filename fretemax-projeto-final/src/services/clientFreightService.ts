// src/services/clientFreightService.ts

import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  paymentService,
} from './paymentService';

import {
  executeDispatch,
} from './orchestrator';

import {
  AppEvents,
  eventBusService,
} from './eventBusService';

import {
  AppTripState,
} from '../state/tripStateMachine';

type CreateFreightPayload =
  {
    clienteId: string;

    origem: any;

    destino: any;

    categoria: string;

    tipoCarga: string;

    pesoKg: number;

    volumes: number;

    prioridade:
      | 'normal'
      | 'urgente';

    observacoes?: string;

    distancia: number;

    valorTotal: number;

    agendado?: boolean;

    dataAgendamento?: string;

    retornoDisponivel?: boolean;
  };

class ClientFreightService {
  async criarFrete(
    payload: CreateFreightPayload,
  ) {
    try {
      /*
      =========================================================
      CREATE FREIGHT FIRST
      =========================================================
      */

      const freteRef =
        await addDoc(
          collection(
            db,
            'fretes',
          ),
          {
            clienteId:
              payload.clienteId,

            origem:
              payload.origem,

            destino:
              payload.destino,

            categoria:
              payload.categoria,

            tipoCarga:
              payload.tipoCarga,

            pesoKg:
              payload.pesoKg,

            volumes:
              payload.volumes,

            prioridade:
              payload.prioridade,

            observacoes:
              payload.observacoes ||
              '',

            distancia:
              payload.distancia,

            valorTotal:
              payload.valorTotal,

            agendado:
              payload.agendado ||
              false,

            dataAgendamento:
              payload.dataAgendamento ||
              null,

            retornoDisponivel:
              payload.retornoDisponivel ||
              false,

            pagamentoStatus:
              'pendente',

            status:
              AppTripState.PENDENTE,

            criadoEm:
              serverTimestamp(),

            atualizadoEm:
              serverTimestamp(),
          },
        );

      /*
      =========================================================
      PAYMENT
      =========================================================
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
              freteRef.id,
          },
        );

      /*
      =========================================================
      PAYMENT FAILED
      =========================================================
      */

      if (
        !pagamento.success
      ) {
        await updateDoc(
          doc(
            db,
            'fretes',
            freteRef.id,
          ),
          {
            pagamentoStatus:
              'falhou',

            status:
              AppTripState.CANCELADO,

            atualizadoEm:
              serverTimestamp(),
          },
        );

        return {
          success: false,
          error:
            'PAGAMENTO_NEGADO',
        };
      }

      /*
      =========================================================
      PAYMENT APPROVED
      =========================================================
      */

      await updateDoc(
        doc(
          db,
          'fretes',
          freteRef.id,
        ),
        {
          pagamentoStatus:
            'aprovado',

          transactionId:
            pagamento.transactionId,

          status:
            AppTripState.PROCURANDO_MOTORISTA,

          atualizadoEm:
            serverTimestamp(),
        },
      );

      /*
      =========================================================
      DISPATCH
      =========================================================
      */

      await executeDispatch(
        freteRef.id,
        {
          categoria:
            payload.categoria,

          origemLat:
            payload.origem.lat,

          origemLng:
            payload.origem.lng,

          destinoLat:
            payload.destino.lat,

          destinoLng:
            payload.destino.lng,
        },
      );

      /*
      =========================================================
      EVENTS
      =========================================================
      */

      eventBusService.emit(
        AppEvents.NEW_TRIP_REQUEST,
        {
          freteId:
            freteRef.id,
        },
      );

      return {
        success: true,

        freteId:
          freteRef.id,
      };
    } catch (error) {
      console.error(
        'ERRO CRIAR FRETE:',
        error,
      );

      return {
        success: false,
        error:
          'ERRO_CRIAR_FRETE',
      };
    }
  }

  async cancelarFrete(
    freteId: string,
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
          status:
            AppTripState.CANCELADO,

          atualizadoEm:
            serverTimestamp(),
        },
      );

      eventBusService.emit(
        AppEvents.TRIP_CANCELLED,
        {
          freteId,
        },
      );

      return true;
    } catch (error) {
      console.error(
        'ERRO CANCELAR FRETE:',
        error,
      );

      return false;
    }
  }

  async atualizarFrete(
    freteId: string,
    payload: Record<
      string,
      any
    >,
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
          ...payload,

          atualizadoEm:
            serverTimestamp(),
        },
      );

      return true;
    } catch (error) {
      console.error(
        'ERRO UPDATE FRETE:',
        error,
      );

      return false;
    }
  }

  async buscarFrete(
    freteId: string,
  ) {
    try {
      const freteRef = doc(
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
        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
      };
    } catch (error) {
      console.error(
        'ERRO BUSCAR FRETE:',
        error,
      );

      return null;
    }
  }

  async finalizarFrete(
    freteId: string,
  ) {
    try {
      const freteRef = doc(
        db,
        'fretes',
        freteId,
      );

      await runTransaction(
        db,
        async transaction => {
          const snapshot =
            await transaction.get(
              freteRef,
            );

          if (
            !snapshot.exists()
          ) {
            throw new Error(
              'Frete não encontrado',
            );
          }

          transaction.update(
            freteRef,
            {
              status:
                AppTripState.ENTREGUE,

              atualizadoEm:
                serverTimestamp(),
            },
          );
        },
      );

      eventBusService.emit(
        AppEvents.TRIP_FINISHED,
        {
          freteId,
        },
      );

      return true;
    } catch (error) {
      console.error(
        'ERRO FINALIZAR FRETE:',
        error,
      );

      return false;
    }
  }
}

export const clientFreightService =
  new ClientFreightService();
