import { useEffect } from 'react';

import {
  realtimeOrchestrator,
} from '../services/realtimeOrchestrator';

export const useRealtimeSystem = (
  driverId?: string,
  tripId?: string,
) => {
  useEffect(() => {
    realtimeOrchestrator.initialize({
      driverId,
      tripId,
    });

    return () => {
      realtimeOrchestrator.destroy({
        driverId,
        tripId,
      });
    };
  }, [driverId, tripId]);
};
