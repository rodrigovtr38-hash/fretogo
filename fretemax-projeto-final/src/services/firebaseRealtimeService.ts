import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  eventBusService,
  AppEvents,
} from './eventBusService';

class FirebaseRealtimeService {
  private unsubscribers: (() => void)[] = [];

  listenDriver(driverId: string) {
    if (!driverId) return;

    const driverRef = doc(
      db,
      'motoristas',
      driverId
    );

    const unsubscribe = onSnapshot(
      driverRef,
      snapshot => {
        if (!snapshot.exists()) return;

        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        eventBusService.emit(
          AppEvents.DRIVER_STATUS_CHANGED,
          data
        );
      },
      error => {
        console.error(
          'Realtime Driver Error:',
          error
        );

        eventBusService.emit(
          AppEvents.REALTIME_DISCONNECTED
        );
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  listenTrip(tripId: string) {
    if (!tripId) return;

    const tripRef = doc(
      db,
      'fretes',
      tripId
    );

    const unsubscribe = onSnapshot(
      tripRef,
      snapshot => {
        if (!snapshot.exists()) return;

        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        eventBusService.emit(
          AppEvents.TRIP_STATUS_CHANGED,
          data
        );
      },
      error => {
        console.error(
          'Realtime Trip Error:',
          error
        );

        eventBusService.emit(
          AppEvents.REALTIME_DISCONNECTED
        );
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  async updateDriverRealtime(
    driverId: string,
    payload: Record<string, any>
  ) {
    if (!driverId) return;

    const driverRef = doc(
      db,
      'motoristas',
      driverId
    );

    await updateDoc(driverRef, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async updateTripRealtime(
    tripId: string,
    payload: Record<string, any>
  ) {
    if (!tripId) return;

    const tripRef = doc(
      db,
      'fretes',
      tripId
    );

    await updateDoc(tripRef, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  disconnectAll() {
    this.unsubscribers.forEach(
      unsubscribe => unsubscribe()
    );

    this.unsubscribers = [];

    eventBusService.emit(
      AppEvents.REALTIME_DISCONNECTED
    );
  }
}

export const firebaseRealtimeService =
  new FirebaseRealtimeService();
