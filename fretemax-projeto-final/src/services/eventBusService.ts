type EventCallback<T = any> = (payload: T) => void;

class EventBusService {
  private listeners: Map<string, EventCallback[]> = new Map();

  on<T = any>(event: string, callback: EventCallback<T>) {
    const currentListeners = this.listeners.get(event) || [];

    this.listeners.set(event, [...currentListeners, callback]);

    return () => {
      this.off(event, callback);
    };
  }

  off<T = any>(event: string, callback: EventCallback<T>) {
    const currentListeners = this.listeners.get(event);

    if (!currentListeners) return;

    this.listeners.set(
      event,
      currentListeners.filter(listener => listener !== callback)
    );
  }

  emit<T = any>(event: string, payload?: T) {
    const currentListeners = this.listeners.get(event);

    if (!currentListeners) return;

    currentListeners.forEach(listener => {
      listener(payload);
    });
  }

  clear(event?: string) {
    if (event) {
      this.listeners.delete(event);
      return;
    }

    this.listeners.clear();
  }
}

export const eventBusService = new EventBusService();

export enum AppEvents {
  DRIVER_STATUS_CHANGED = 'DRIVER_STATUS_CHANGED',
  TRIP_STATUS_CHANGED = 'TRIP_STATUS_CHANGED',
  DRIVER_ONLINE = 'DRIVER_ONLINE',
  DRIVER_OFFLINE = 'DRIVER_OFFLINE',
  NEW_TRIP_REQUEST = 'NEW_TRIP_REQUEST',
  TRIP_ACCEPTED = 'TRIP_ACCEPTED',
  TRIP_STARTED = 'TRIP_STARTED',
  TRIP_FINISHED = 'TRIP_FINISHED',
  TRIP_CANCELLED = 'TRIP_CANCELLED',
  REALTIME_CONNECTED = 'REALTIME_CONNECTED',
  REALTIME_DISCONNECTED = 'REALTIME_DISCONNECTED',
}
