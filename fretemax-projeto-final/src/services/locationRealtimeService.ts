// src/services/locationRealtimeService.ts

import {
  firebaseRealtimeService,
} from './firebaseRealtimeService';

/* =========================================================
   TYPES
========================================================= */

type Coordinates = {
  lat: number;
  lng: number;
};

type DriverRealtimePayload = {
  location: Coordinates;

  gpsAccuracy: number;

  gpsHeading: number;

  gpsSpeed: number;

  gpsUpdatedAt: number;
};

type TrackingStatus =
  | 'idle'
  | 'starting'
  | 'tracking'
  | 'paused'
  | 'stopped';

/* =========================================================
   GLOBAL TYPES
========================================================= */

declare global {
  interface Window {
    __FRETOGO_TRACKING_ACTIVE__?: boolean;
  }
}

/* =========================================================
   LOCATION REALTIME SERVICE
========================================================= */

class LocationRealtimeService {
  private watchId: number | null =
    null;

  private trackingDriverId:
    | string
    | null = null;

  private trackingStatus: TrackingStatus =
    'idle';

  private lastSentAt = 0;

  private lastPosition: Coordinates | null =
    null;

  private inflightWrite =
    false;

  private queuedPayload:
    | DriverRealtimePayload
    | null = null;

  private visibilityPaused =
    false;

  private reconnectTimeout:
    | number
    | null = null;

  private readonly MIN_DISTANCE_METERS =
    35;

  private readonly MIN_UPDATE_INTERVAL =
    12000;

  private readonly MAX_BACKGROUND_INTERVAL =
    30000;

  private readonly MAX_GPS_ACCURACY =
    120;

  /* =======================================================
     CONSTRUCTOR
  ======================================================= */

  constructor() {
    if (
      typeof document !==
      'undefined'
    ) {
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
        {
          passive: true,
        },
      );
    }

    if (
      typeof window !==
      'undefined'
    ) {
      window.addEventListener(
        'online',
        this.handleReconnect,
      );
    }
  }

  /* =======================================================
     VISIBILITY
  ======================================================= */

  private handleVisibilityChange =
    () => {
      if (
        typeof document ===
        'undefined'
      ) {
        return;
      }

      this.visibilityPaused =
        document.hidden;

      /*
       * IMPORTANTE:
       * Não interrompe tracking operacional.
       * Apenas reduz agressividade.
       */

      if (
        this.visibilityPaused
      ) {
        console.log(
          '📴 Tracking em background.',
        );
      } else {
        console.log(
          '📡 Tracking retomado.',
        );
      }
    };

  /* =======================================================
     RECONNECT
  ======================================================= */

  private handleReconnect =
    () => {
      if (
        !this.trackingDriverId
      ) {
        return;
      }

      if (
        this.watchId !== null
      ) {
        return;
      }

      if (
        this.reconnectTimeout
      ) {
        clearTimeout(
          this.reconnectTimeout,
        );
      }

      this.reconnectTimeout =
        window.setTimeout(
          () => {
            if (
              !this.trackingDriverId
            ) {
              return;
            }

            console.log(
              '♻️ Reconnect tracking realtime.',
            );

            this.start(
              this
                .trackingDriverId,
            );
          },
          2500,
        );
    };

  /* =======================================================
     DISTANCE
  ======================================================= */

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) {
    const R = 6371000;

    const dLat =
      ((lat2 - lat1) *
        Math.PI) /
      180;

    const dLng =
      ((lng2 - lng1) *
        Math.PI) /
      180;

    const a =
      Math.sin(
        dLat / 2,
      ) *
        Math.sin(
          dLat / 2,
        ) +
      Math.cos(
        (lat1 *
          Math.PI) /
          180,
      ) *
        Math.cos(
          (lat2 *
            Math.PI) /
            180,
        ) *
        Math.sin(
          dLng / 2,
        ) *
        Math.sin(
          dLng / 2,
        );

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return R * c;
  }

  /* =======================================================
     WRITE QUEUE
  ======================================================= */

  private async flushWriteQueue() {
    if (
      this.inflightWrite
    ) {
      return;
    }

    if (
      !this.queuedPayload
    ) {
      return;
    }

    if (
      !this.trackingDriverId
    ) {
      return;
    }

    this.inflightWrite =
      true;

    const payload =
      this.queuedPayload;

    this.queuedPayload =
      null;

    try {
      await firebaseRealtimeService.updateDriverRealtime(
        this
          .trackingDriverId,
        payload,
      );
    } catch (error) {
      console.error(
        '❌ GPS WRITE ERROR:',
        error,
      );

      /*
       * Requeue último payload.
       */

      this.queuedPayload =
        payload;
    } finally {
      this.inflightWrite =
        false;

      /*
       * Continua fila.
       */

      if (
        this.queuedPayload
      ) {
        void this.flushWriteQueue();
      }
    }
  }

  /* =======================================================
     ENQUEUE WRITE
  ======================================================= */

  private enqueueWrite(
    payload: DriverRealtimePayload,
  ) {
    /*
     * Collapse updates:
     * mantém apenas
     * último estado GPS.
     */

    this.queuedPayload =
      payload;

    void this.flushWriteQueue();
  }

  /* =======================================================
     SHOULD UPDATE
  ======================================================= */

  private shouldUpdatePosition(
    current: Coordinates,
    now: number,
  ) {
    if (
      !this.lastPosition
    ) {
      return true;
    }

    const distance =
      this.calculateDistance(
        this
          .lastPosition
          .lat,

        this
          .lastPosition
          .lng,

        current.lat,
        current.lng,
      );

    const interval =
      now -
      this.lastSentAt;

    /*
     * Background:
     * reduz writes.
     */

    const effectiveInterval =
      this.visibilityPaused
        ? this
            .MAX_BACKGROUND_INTERVAL
        : this
            .MIN_UPDATE_INTERVAL;

    /*
     * IMPORTANTE:
     * Só atualiza se:
     * - moveu significativamente
     * OU
     * - passou intervalo relevante
     */

    return (
      distance >=
        this
          .MIN_DISTANCE_METERS ||
      interval >=
        effectiveInterval
    );
  }

  /* =======================================================
     START
  ======================================================= */

  start(driverId: string) {
    if (
      typeof window ===
        'undefined' ||
      !navigator.geolocation
    ) {
      console.error(
        '❌ Geolocation não suportada.',
      );

      return;
    }

    if (!driverId) {
      return;
    }

    /*
     * StrictMode protection.
     */

    if (
      this.watchId !== null
    ) {
      if (
        this
          .trackingDriverId ===
        driverId
      ) {
        return;
      }

      this.stop();
    }

    if (
      window.__FRETOGO_TRACKING_ACTIVE__
    ) {
      return;
    }

    window.__FRETOGO_TRACKING_ACTIVE__ =
      true;

    this.trackingDriverId =
      driverId;

    this.trackingStatus =
      'starting';

    console.log(
      '📡 Tracking realtime iniciado.',
    );

    this.watchId =
      navigator.geolocation.watchPosition(
        async position => {
          try {
            const now =
              Date.now();

            const accuracy =
              position.coords
                .accuracy;

            /*
             * Ignora GPS extremamente ruim.
             */

            if (
              accuracy >
              this
                .MAX_GPS_ACCURACY
            ) {
              return;
            }

            const current: Coordinates =
              {
                lat:
                  position.coords
                    .latitude,

                lng:
                  position.coords
                    .longitude,
              };

            if (
              !this.shouldUpdatePosition(
                current,
                now,
              )
            ) {
              return;
            }

            this.lastPosition =
              current;

            this.lastSentAt =
              now;

            this.trackingStatus =
              'tracking';

            this.enqueueWrite(
              {
                location:
                  current,

                gpsAccuracy:
                  accuracy,

                gpsHeading:
                  position.coords
                    .heading ||
                  0,

                gpsSpeed:
                  position.coords
                    .speed ||
                  0,

                gpsUpdatedAt:
                  now,
              },
            );
          } catch (error) {
            console.error(
              '❌ GPS REALTIME ERROR:',
              error,
            );
          }
        },

        error => {
          console.error(
            '❌ GPS WATCH ERROR:',
            error,
          );

          this.trackingStatus =
            'paused';
        },

        {
          enableHighAccuracy:
            true,

          maximumAge:
            this
              .visibilityPaused
              ? 30000
              : 10000,

          timeout:
            this
              .visibilityPaused
              ? 30000
              : 20000,
        },
      );
  }

  /* =======================================================
     STOP
  ======================================================= */

  stop() {
    if (
      this.watchId !== null
    ) {
      navigator.geolocation.clearWatch(
        this.watchId,
      );

      this.watchId =
        null;
    }

    if (
      this.reconnectTimeout
    ) {
      clearTimeout(
        this
          .reconnectTimeout,
      );

      this.reconnectTimeout =
        null;
    }

    this.trackingDriverId =
      null;

    this.lastPosition =
      null;

    this.lastSentAt = 0;

    this.inflightWrite =
      false;

    this.queuedPayload =
      null;

    this.trackingStatus =
      'stopped';

    window.__FRETOGO_TRACKING_ACTIVE__ =
      false;

    console.log(
      '🛑 Tracking realtime finalizado.',
    );
  }

  /* =======================================================
     STATUS
  ======================================================= */

  isTracking() {
    return (
      this.watchId !==
      null
    );
  }

  getTrackingStatus() {
    return this
      .trackingStatus;
  }
}

export const locationRealtimeService =
  new LocationRealtimeService();
