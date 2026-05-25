type EventCallback<T = any> = (
  payload: T,
) => void;

class EventBusService {
  private listeners: Map<
    string,
    Set<EventCallback>
  > = new Map();

  on<T = any>(
    event: string,
    callback: EventCallback<T>,
  ) {
    if (
      !this.listeners.has(
        event,
      )
    ) {
      this.listeners.set(
        event,
        new Set(),
      );
    }

    this.listeners
      .get(event)
      ?.add(callback);

    return () => {
      this.off(
        event,
        callback,
      );
    };
  }

  once<T = any>(
    event: string,
    callback: EventCallback<T>,
  ) {
    const unsubscribe =
      this.on(
        event,
        payload => {
          callback(payload);

          unsubscribe();
        },
      );

    return unsubscribe;
  }

  off<T = any>(
    event: string,
    callback: EventCallback<T>,
  ) {
    const listeners =
      this.listeners.get(
        event,
      );

    if (!listeners) return;

    listeners.delete(
      callback,
    );

    if (
      listeners.size === 0
    ) {
      this.listeners.delete(
        event,
      );
    }
  }

  emit<T = any>(
    event: string,
    payload?: T,
  ) {
    const listeners =
      this.listeners.get(
        event,
      );

    if (!listeners) return;

    listeners.forEach(
      listener => {
        try {
          listener(payload);
        } catch (error) {
          console.error(
            `EVENT BUS ERROR -> ${event}`,
            error,
          );
        }
      },
    );
  }

  clear(event?: string) {
    if (event) {
      this.listeners.delete(
        event,
      );

      return;
    }

    this.listeners.clear();
  }

  listenerCount(
    event: string,
  ) {
    return (
      this.listeners.get(
        event,
      )?.size || 0
    );
  }
}

export const eventBusService =
  new EventBusService();

export enum AppEvents {
  /*
  ===================================
  DRIVER
  ===================================
  */

  DRIVER_STATUS_CHANGED =
    'DRIVER_STATUS_CHANGED',

  DRIVER_ONLINE =
    'DRIVER_ONLINE',

  DRIVER_OFFLINE =
    'DRIVER_OFFLINE',

  DRIVER_LOCATION_UPDATED =
    'DRIVER_LOCATION_UPDATED',

  DRIVER_ACCEPTED_TRIP =
    'DRIVER_ACCEPTED_TRIP',

  DRIVER_REJECTED_TRIP =
    'DRIVER_REJECTED_TRIP',

  /*
  ===================================
  TRIP
  ===================================
  */

  TRIP_STATUS_CHANGED =
    'TRIP_STATUS_CHANGED',

  NEW_TRIP_REQUEST =
    'NEW_TRIP_REQUEST',

  TRIP_ACCEPTED =
    'TRIP_ACCEPTED',

  TRIP_STARTED =
    'TRIP_STARTED',

  TRIP_COLLECTED =
    'TRIP_COLLECTED',

  TRIP_IN_PROGRESS =
    'TRIP_IN_PROGRESS',

  TRIP_FINISHED =
    'TRIP_FINISHED',

  TRIP_CANCELLED =
    'TRIP_CANCELLED',

  TRIP_EXPIRED =
    'TRIP_EXPIRED',

  /*
  ===================================
  DISPATCH
  ===================================
  */

  DISPATCH_STARTED =
    'DISPATCH_STARTED',

  DISPATCH_EXPANDED =
    'DISPATCH_EXPANDED',

  DISPATCH_TIMEOUT =
    'DISPATCH_TIMEOUT',

  REDISPATCH_STARTED =
    'REDISPATCH_STARTED',

  QUEUE_FINISHED =
    'QUEUE_FINISHED',

  /*
  ===================================
  REALTIME
  ===================================
  */

  REALTIME_CONNECTED =
    'REALTIME_CONNECTED',

  REALTIME_DISCONNECTED =
    'REALTIME_DISCONNECTED',

  REALTIME_RECONNECTED =
    'REALTIME_RECONNECTED',

  /*
  ===================================
  OPERATIONAL
  ===================================
  */

  SYSTEM_ERROR =
    'SYSTEM_ERROR',

  PAYMENT_CONFIRMED =
    'PAYMENT_CONFIRMED',

  PAYMENT_FAILED =
    'PAYMENT_FAILED',
}
