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

import {
  DispatchQueueService,
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

/* =========================================================
   SERVICE
========================================================= */

export class TripLifecycleService {
  private static inflight =
    new Set<string>();

  private static staleGuard =
    new Map<
      string,
      number
    >();

  /* =========================================================
     LOCKS
  ========================================================= */

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

  /* =========================================================
     STALE PROTECTION
  ========================================================= */

  private static isStale(
    key: string,
  ): boolean {
    const current =
      Date.now();

    const last =
      this.staleGuard.get(
        key,
      );

    if (
      last &&
      current - last <
        1000
    ) {
      return true;
    }

    this.staleGuard.set(
      key,
      current,
    );

    return false;
  }

  /* =========================================================
     STATUS VIAGEM
  ========================================================= */

  static async alterarStatusViagem(
    freteId: string,
    novoStatus: AppTripState,
    extras: Record<
      string,
      any
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

    if (
      this.isStale(
        lockKey,
      )
    ) {
      this.release(
        lockKey,
      );

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
        throw new Error(
          'FRETE NÃO ENCONTRADO',
        );
      }

      const data =
        snapshot.data();

      const statusAtual =
        data.status;

      const permitido =
        canTransition(
          statusAtual,
          novoStatus,
        );

      if (
        !permitido
      ) {
        console.error(
          `TRANSIÇÃO INVÁLIDA: ${statusAtual} -> ${novoStatus}`,
        );

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

          trackingAtivo:
            runtime
              .operationalRuntime
              .tracking,

          dispatchAtivo:
            runtime
              .operationalRuntime
              .dispatch,

          matchingAtivo:
            runtime
              .operationalRuntime
              .matching,

          atualizadoEm:
            serverTimestamp(),

          ...extras,
        },
      );

      if (
        data.motoristaId
      ) {
        await dispatchRealtimeService.atualizarTripRealtime(
          freteId,
          {
            runtime,
          },
        );
      }

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
    } catch (
      error
    ) {
      console.error(
        'ERRO ALTERAR STATUS:',
        error,
      );

      return false;
    } finally {
      this.release(
        lockKey,
      );
    }
  }

  /* =========================================================
     STATUS MOTORISTA
  ========================================================= */

  static async alterarStatusMotorista(
    motoristaId: string,
    novoStatus: DriverState,
    extras: Record<
      string,
      any
    > = {},
  ) {
    const lockKey =
      `driver-${motoristaId}-${novoStatus}`;

    if (
      !this.acquire(
        lockKey,
      )
    ) {
      return false;
    }

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

      const permitido =
        canDriverTransition(
          statusAtual,
          novoStatus,
        );

      if (
        !permitido
      ) {
        console.error(
          `TRANSIÇÃO MOTORISTA INVÁLIDA: ${statusAtual} -> ${novoStatus}`,
        );

        return false;
      }

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

      return true;
    } catch (
      error
    ) {
      console.error(
        'ERRO STATUS MOTORISTA:',
        error,
      );

      return false;
    } finally {
      this.release(
        lockKey,
      );
    }
  }

  /* =========================================================
     ACEITAR
  ========================================================= */

  static async aceitarCorrida(
    freteId: string,
    motoristaId: string,
  ) {
    const lockKey =
      `accept-${freteId}`;

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

      if (
        freteData.motoristaId
      ) {
        return false;
      }

      await this.alterarStatusViagem(
        freteId,
        AppTripState.ACEITO,
        {
          motoristaId,

          aceitoEm:
            serverTimestamp(),
        },
      );

      await this.alterarStatusMotorista(
        motoristaId,
        DriverState.ACEITOU,
        {
          disponivel:
            false,
        },
      );

      await dispatchRealtimeService.aceitarCorrida(
        motoristaId,
        freteId,
      );

      return true;
    } catch (
      error
    ) {
      console.error(
        'ERRO ACEITAR:',
        error,
      );

      return false;
    } finally {
      this.release(
        lockKey,
      );
    }
  }

  /* =========================================================
     REDISPATCH
  ========================================================= */

  static async executarRedispatch(
    frete: FretePayload,
  ) {
    try {
      await this.alterarStatusViagem(
        frete.id,
        AppTripState.BUSCANDO_MOTORISTA,
      );

      await DispatchQueueService.iniciarFila(
        frete,
      );
    } catch (
      error
    ) {
      console.error(
        'ERRO REDISPATCH:',
        error,
      );
    }
  }

  /* =========================================================
     FINALIZAR
  ========================================================= */

  static async finalizarCorrida(
    freteId: string,
    motoristaId: string,
    comprovante?: string,
  ) {
    const lockKey =
      `finish-${freteId}`;

    if (
      !this.acquire(
        lockKey,
      )
    ) {
      return false;
    }

    try {
      await this.alterarStatusViagem(
        freteId,
        AppTripState.ENTREGUE,
        {
          comprovante:
            comprovante ||
            null,

          entregueEm:
            serverTimestamp(),
        },
      );

      await this.alterarStatusMotorista(
        motoristaId,
        DriverState.ONLINE,
        {
          disponivel:
            true,

          matchingAtivo:
            true,

          novaOferta:
            null,

          returning:
            true,
        },
      );

      await dispatchRealtimeService.finalizarEntrega(
        motoristaId,
      );

      return true;
    } catch (
      error
    ) {
      console.error(
        'ERRO FINALIZAR:',
        error,
      );

      return false;
    } finally {
      this.release(
        lockKey,
      );
    }
  }

  /* =========================================================
     CANCELAMENTO
  ========================================================= */

  static async cancelarCorrida(
    freteId: string,
    motivo: string,
  ) {
    const lockKey =
      `cancel-${freteId}`;

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

      if (
        isFinalState(
          data.status,
        )
      ) {
        return false;
      }

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

      if (
        data.motoristaId
      ) {
        await this.alterarStatusMotorista(
          data.motoristaId,
          DriverState.ONLINE,
          {
            disponivel:
              true,

            matchingAtivo:
              true,

            novaOferta:
              null,
          },
        );

        await dispatchRealtimeService.setDriverOnline(
          data.motoristaId,
        );
      }

      return true;
    } catch (
      error
    ) {
      console.error(
        'ERRO CANCELAMENTO:',
        error,
      );

      return false;
    } finally {
      this.release(
        lockKey,
      );
    }
  }
}
