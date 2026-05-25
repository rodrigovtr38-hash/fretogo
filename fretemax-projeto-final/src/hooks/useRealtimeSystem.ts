import { useEffect } from 'react';

import { realtimeOrchestrator }
  from '../services/realtimeOrchestrator';

import { driverRealtimeListener }
  from '../services/driverRealtimeListener';

import { tripRealtimeListener }
  from '../services/tripRealtimeListener';

export const useRealtimeSystem = () => {
  useEffect(() => {
    console.log(
      'Initializing Realtime System...'
    );

    realtimeOrchestrator.initialize();

    driverRealtimeListener.initialize();

    tripRealtimeListener.initialize();

    return () => {
      console.log(
        'Destroying Realtime System...'
      );

      realtimeOrchestrator.destroy();
    };
  }, []);
};
