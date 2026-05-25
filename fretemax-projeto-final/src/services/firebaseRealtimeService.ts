import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  eventBusService,
  AppEvents,
} from './eventBusService';

class FirebaseRealtimeService {
  private listeners:
    Map<string, Unsubscribe> =
    new Map();

  private emitConnected() {
    eventBusService.emit(
      AppEvents.REALTIME_CONNECTED,
    );
  }

  private emitDisconnected() {
    eventBusService.emit(
      AppEvents.REALTIME_DISCONNECTED,
    );
  }

  listenDriver(
    driverId: string,
  ) {
    try {
      if (!driverId) return;

      const key =
        `driver_${driverId}`;

      if (
        this.listeners.has(key)
      ) {
        return;
      }

      const driverRef = doc(
        db,
        'motoristas',
        driverId,
      );

      const unsubscribe =
        onSnapshot(
          driverRef,
          snapshot => {
            if (
              !snapshot.exists()
            ) {
              return;
            }

            const data = {
              id: snapshot.id,

              ...snapshot.data(),
            };

            this.emitConnected();

            eventBusService.emit(
              AppEvents.DRIVER_STATUS_CHANGED,
              data,
            );
          },
          error => {
            console.error(
              'REALTIME DRIVER ERROR:',
              error,
            );

            this.emitDisconnected();
          },
        );

      this.listeners.set(
        key,
        unsubscribe,
      );
    } catch (error) {
      console.error(
        'ERRO LISTEN DRIVER:',
        error,
      );
    }
  }

  listenTrip(
    tripId: string,
  ) {
    try {
      if (!tripId) return;

      const key =
        `trip_${tripId}`;

      if (
        this.listeners.has(key)
      ) {
        return;
      }

      const tripRef = doc(
        db,
        'fretes',
        tripId,
      );

      const unsubscribe =
        onSnapshot(
          tripRef,
          snapshot => {
            if (
              !snapshot.exists()
            ) {
              return;
            }

            const data = {
              id: snapshot.id,

              ...snapshot.data(),
            };

            this.emitConnected();

            eventBusService.emit(
              AppEvents.TRIP_STATUS_CHANGED,
              data,
            );
          },
          error => {
            console.error(
              'REALTIME TRIP ERROR:',
              error,
            );

            this.emitDisconnected();
          },
        );

      this.listeners.set(
        key,
        unsubscribe,
      );
    } catch (error) {
      console.error(
        'ERRO LISTEN TRIP:',
        error,
      );
    }
  }

  async updateDriverRealtime(
    driverId: string,
    payload: Record<
      string,
      any
    >,
  ) {
    try {
      if (!driverId) return;

      const driverRef = doc(
        db,
        'motoristas',
        driverId,
      );

      await updateDoc(
        driverRef,
        {
          ...payload,

          updatedAt:
            serverTimestamp(),
        },
      );
    } catch (error) {
      console.error(
        'ERRO UPDATE DRIVER:',
        error,
      );
    }
  }

  async updateTripRealtime(
    tripId: string,
    payload: Record<
      string,
      any
    >,
  ) {
    try {
      if (!tripId) return;

      const tripRef = doc(
        db,
        'fretes',
        tripId,
      );

      await updateDoc(
        tripRef,
        {
          ...payload,

          updatedAt:
            serverTimestamp(),
        },
      );
    } catch (error) {
      console.error(
        'ERRO UPDATE TRIP:',
        error,
      );
    }
  }

  stopListener(
    key: string,
  ) {
    const listener =
      this.listeners.get(
        key,
      );

    if (listener) {
      listener();

      this.listeners.delete(
        key,
      );
    }
  }

  disconnectAll() {
    this.listeners.forEach(
      unsubscribe => {
        unsubscribe();
      },
    );

    this.listeners.clear();

    this.emitDisconnected();
  }
}

export const firebaseRealtimeService =
  new FirebaseRealtimeService();
