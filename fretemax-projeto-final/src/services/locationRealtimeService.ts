import {
  firebaseRealtimeService,
} from './firebaseRealtimeService';

class LocationRealtimeService {
  private watchId: number | null =
    null;

  start(
    driverId: string
  ) {
    if (!navigator.geolocation) {
      return;
    }

    this.watchId =
      navigator.geolocation.watchPosition(
        async position => {
          await firebaseRealtimeService.updateDriverRealtime(
            driverId,
            {
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              },
            }
          );
        },
        error => {
          console.error(
            'GPS Error:',
            error
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000,
        }
      );
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(
        this.watchId
      );
    }
  }
}

export const locationRealtimeService =
  new LocationRealtimeService();
