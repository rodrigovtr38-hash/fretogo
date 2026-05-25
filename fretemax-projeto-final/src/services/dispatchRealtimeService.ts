import {
  firebaseRealtimeService,
} from './firebaseRealtimeService';

import {
  DriverState,
} from '../state/driverStateMachine';

class DispatchRealtimeService {
  async setDriverOnline(
    driverId: string
  ) {
    await firebaseRealtimeService.updateDriverRealtime(
      driverId,
      {
        online: true,
        state: DriverState.ONLINE,
      }
    );
  }

  async setDriverOffline(
    driverId: string
  ) {
    await firebaseRealtimeService.updateDriverRealtime(
      driverId,
      {
        online: false,
        state: DriverState.OFFLINE,
      }
    );
  }
}

export const dispatchRealtimeService =
  new DispatchRealtimeService();
