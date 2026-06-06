// src/hooks/useRealtimeSystem.ts
import { useEffect } from 'react';
import { realtimeOrchestrator } from '../services/realtimeOrchestrator';
import { firebaseRealtimeService } from '../services/firebaseRealtimeService';

export const useRealtimeSystem = (driverId?: string, tripId?: string) => {
  useEffect(() => {
    // 1. Inicia o orquestrador para esse usuário
    realtimeOrchestrator.initialize({ driverId, tripId });

    // 2. Limpeza segura (Evita Memory Leak quando a tela fecha)
    return () => {
      if (driverId) {
        firebaseRealtimeService.stopDriverListener(driverId);
      }
      if (tripId) {
        firebaseRealtimeService.stopTripListener(tripId);
      }
    };
  }, [driverId, tripId]);
};
