import { useEffect } from 'react';

import {
  realtimeOrchestrator,
} from '../services/realtimeOrchestrator';

import {
  driverRealtimeListener,
} from '../services/driverRealtimeListener';

import {
  tripRealtimeListener,
} from '../services/tripRealtimeListener';

export const useRealtimeSystem = (
  driverId?: string,
  tripId?: string
) => {
  useEffect(() => {
    realtimeOrchestrator.initialize(
      driverId,
      tripId
    );

    driverRealtimeListener.initialize();

    tripRealtimeListener.initialize();

    return () => {
      realtimeOrchestrator.destroy();
    };
  }, [driverId, tripId]);
};
