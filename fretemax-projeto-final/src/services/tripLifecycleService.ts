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
  isFinalState,
} from '../state/tripStateMachine';

import {
  DriverState,
  canDriverTransition,
} from '../state/driverStateMachine';

import DispatchQueueService, {
  DispatchQueueService as DispatchQueueRuntime,
} from './dispatchQueueService';

import {
  dispatchRealtimeService,
} from './dispatchRealtimeService';

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

      const permitido =
        canTransition(
          data.status,
          novoStatus,
        );

      if (
        !permitido
      ) {
        return false;
      }

      const runtime =
        StateSynchronizationService.synchronize(
          data.driverState ||
            DriverState.ONLINE,
          novoStatus,
        );

      await updateDoc(
        freteRef,
        {
          status:
            runtime.tripState,

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
