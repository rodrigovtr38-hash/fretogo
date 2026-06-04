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
  AppTripState,
  canTransition,
} from '../state/tripStateMachine';

import {
  DriverState,
} from '../state/driverStateMachine';

import DispatchQueueService, {
  DispatchQueueService as DispatchQueueRuntime,
} from './dispatchQueueService';

import {
  StateSynchronizationService,
} from './stateSynchronizationService';

import type {
  FretePayload,
} from './matchingEngine';

export class TripLifecycleService {
  private static inflight =
    new Set<string>();

  private static acquire(
    key: string,
  ): boolean {
    if (
      this.inflight.has(
        key,
      )
    ) {
      return false;
    }

    this.inflight.add(
      key,
    );

    return true;
  }

  private static release(
    key: string,
  ) {
    this.inflight.delete(
      key,
    );
  }

  static async alterarStatusViagem(
    freteId: string,
    novoStatus: AppTripState,
    extras: Record<
      string,
      unknown
    > = {},
  ) {
    const lockKey =
      `trip-${freteId}-${novoStatus}`;

    if (
      !this.acquire(
        lockKey,
      )
    ) {
      return false;
    }

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

      // Verifica se a transição é válida matematicamente
      const permitido =
        canTransition(
          data.status,
          novoStatus,
        );

      if (
        !permitido
      ) {
        console.warn(`[TRIP_LIFECYCLE] Transição Bloqueada: De ${data.status} para ${novoStatus}`);
        return false;
      }

      // Sincroniza o estado do motorista baseado no status da viagem
      const runtime =
        StateSynchronizationService.synchronize(
          data.driverState ||
            DriverState.ONLINE,
          novoStatus,
        );

      // 🔥 FASE 5 (MULTI-DROP): Lógica para controlar as múltiplas entregas
      let paradaAtualIndex = data.paradaAtualIndex || 0;
      const totalParadas = data.paradas ? data.paradas.length : 1;

      // Se o status tentar ir para 'entregue', mas ainda faltam paradas, 
      // interceptamos a atualização e mantemos em 'em_transporte' mudando apenas o índice
      let statusReal = runtime.tripState;
      if (novoStatus === AppTripState.ENTREGUE && paradaAtualIndex + 1 < totalParadas) {
        paradaAtualIndex += 1;
        statusReal = AppTripState.EM_TRANSPORTE; // Mantém a roda girando
      }

      await updateDoc(
        freteRef,
        {
          status:
            statusReal,

          paradaAtualIndex: 
            paradaAtualIndex,

          runtime,

          atualizadoEm:
            serverTimestamp(),

          ...extras,
        },
      );

      return true;
    } catch (error) {
      console.error(
        '[TRIP_LIFECYCLE_ERROR]',
        error,
      );

      return false;
    } finally {
      this.release(
        lockKey,
      );
    }
  }

  static async executarRedispatch(
    frete: FretePayload,
  ) {
    try {
      await this.alterarStatusViagem(
        frete.id,
        AppTripState.BUSCANDO_MOTORISTA,
      );

      await DispatchQueueRuntime.iniciarFila(
        frete,
      );
    } catch (error) {
      console.error(
        '[REDISPATCH_ERROR]',
        error,
      );
    }
  }
}

export default TripLifecycleService;
