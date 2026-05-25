import { useEffect } from 'react';

import {
  firebaseRealtimeService,
} from '../services/firebaseRealtimeService';

export const useTripRealtime = (
  tripId?: string
) => {
  useEffect(() => {
    if (!tripId) return;

    firebaseRealtimeService.listenTrip(
      tripId
    );

    return () => {
      firebaseRealtimeService.disconnectAll();
    };
  }, [tripId]);
};
