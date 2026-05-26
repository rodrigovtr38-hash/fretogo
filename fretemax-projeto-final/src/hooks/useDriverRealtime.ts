import { useEffect } from 'react';

import {
  locationRealtimeService,
} from '../services/locationRealtimeService';

export const useDriverRealtime = (
  driverId?: string,
  isOnline?: boolean,
) => {
  useEffect(() => {
    if (!driverId) {
      return;
    }

    if (isOnline) {
      locationRealtimeService.start(
        driverId,
      );
    } else {
      locationRealtimeService.stop();
    }

    return () => {
      locationRealtimeService.stop();
    };
  }, [driverId, isOnline]);
};
