// src/services/locationRealtimeService.ts

import {
  firebaseRealtimeService,
} from './firebaseRealtimeService';

type Coordinates = {
  lat: number;
  lng: number;
};

class LocationRealtimeService {
  private watchId: number | null =
    null;

  private lastSentAt = 0;

  private lastPosition: Coordinates | null =
    null;

  private readonly MIN_DISTANCE_METERS =
    35;

  private readonly MIN_UPDATE_INTERVAL =
    12000;

  /*
  =========================================================
  CALCULATE DISTANCE
  =========================================================
  */

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) {
    const R = 6371000;

    const dLat =
      ((lat2 - lat1) * Math.PI) /
      180;

    const dLng =
      ((lng2 - lng1) * Math.PI) /
      180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
      Math.cos(
        (lat1 * Math.PI) / 180,
      ) *
        Math.cos(
          (lat2 * Math.PI) / 180,
        ) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return R * c;
  }

  /*
  =========================================================
  START REALTIME GPS
  =========================================================
  */

  start(driverId: string) {
    if (
      typeof window ===
        'undefined' ||
      !navigator.geolocation
    ) {
      console.error(
        'Geolocation não suportada.',
      );

      return;
    }

    if (!driverId) {
      return;
    }

    /*
    =========================================================
    AVOID DUPLICATED WATCHERS
    =========================================================
    */

    if (this.watchId !== null) {
      return;
    }

    this.watchId =
      navigator.geolocation.watchPosition(
        async position => {
          try {
            const now =
              Date.now();

            const current: Coordinates =
              {
                lat:
                  position.coords
                    .latitude,

                lng:
                  position.coords
                    .longitude,
              };

            /*
            =========================================================
            FIRST POSITION
            =========================================================
            */

            if (
              !this.lastPosition
            ) {
              this.lastPosition =
                current;

              this.lastSentAt =
                now;

              await firebaseRealtimeService.updateDriverRealtime(
                driverId,
                {
                  location:
                    current,

                  gpsAccuracy:
                    position.coords
                      .accuracy,

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

              return;
            }

            /*
            =========================================================
            DISTANCE CHECK
            =========================================================
            */

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
            =========================================================
            THROTTLE FIREBASE WRITES
            =========================================================
            */

            if (
              distance <
                this
                  .MIN_DISTANCE_METERS &&
              interval <
                this
                  .MIN_UPDATE_INTERVAL
            ) {
              return;
            }

            /*
            =========================================================
            UPDATE CACHE
            =========================================================
            */

            this.lastPosition =
              current;

            this.lastSentAt =
              now;

            /*
            =========================================================
            FIREBASE REALTIME UPDATE
            =========================================================
            */

            await firebaseRealtimeService.updateDriverRealtime(
              driverId,
              {
                location:
                  current,

                gpsAccuracy:
                  position.coords
                    .accuracy,

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
              'GPS REALTIME UPDATE ERROR:',
              error,
            );
          }
        },

        error => {
          console.error(
            'GPS WATCH ERROR:',
            error,
          );
        },

        {
          enableHighAccuracy:
            true,

          maximumAge: 10000,

          timeout: 20000,
        },
      );
  }

  /*
  =========================================================
  STOP REALTIME GPS
  =========================================================
  */

  stop() {
    if (
      this.watchId !== null
    ) {
      navigator.geolocation.clearWatch(
        this.watchId,
      );

      this.watchId = null;
    }

    this.lastPosition =
      null;

    this.lastSentAt = 0;
  }

  /*
  =========================================================
  STATUS
  =========================================================
  */

  isTracking() {
    return (
      this.watchId !== null
    );
  }
}

export const locationRealtimeService =
  new LocationRealtimeService();
