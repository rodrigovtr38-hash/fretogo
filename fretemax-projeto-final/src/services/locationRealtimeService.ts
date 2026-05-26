import {
  firebaseRealtimeService,
} from './firebaseRealtimeService';

class LocationRealtimeService {
  private watchId: number | null =
    null;

  private lastSentAt = 0;

  private lastPosition: {
    lat: number;
    lng: number;
  } | null = null;

  private readonly MIN_DISTANCE_METERS =
    35;

  private readonly MIN_UPDATE_INTERVAL =
    12000;

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

    return (
      R *
      (2 *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(1 - a),
        ))
    );
  }

  start(driverId: string) {
    if (!navigator.geolocation) {
      return;
    }

    if (this.watchId !== null) {
      return;
    }

    this.watchId =
      navigator.geolocation.watchPosition(
        async position => {
          try {
            const now = Date.now();

            const current = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            if (
              this.lastPosition
  new LocationRealtimeService();
