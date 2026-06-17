// src/services/locationRealtimeService.ts

import {
  firebaseRealtimeService,
} from './firebaseRealtimeService';

/* =========================================================
   TYPES
========================================================= */

type Coordinates = {
  lat: number;
  lng: number;
};

type DriverRealtimePayload = {
  location: Coordinates;
  gpsAccuracy: number;
  gpsHeading: number;
  gpsSpeed: number;
  gpsUpdatedAt: number;
  gpsFalhou?: boolean; 
};

type TrackingStatus =
  | 'idle'
  | 'starting'
  | 'tracking'
  | 'paused'
  | 'stopped';

/* =========================================================
   GLOBAL TYPES
========================================================= */

declare global {
  interface Window {
    __FRETOGO_TRACKING_ACTIVE__?: boolean;
  }
}

/* =========================================================
   LOCATION REALTIME SERVICE
========================================================= */

class LocationRealtimeService {
  private watchId: number | null = null;
  private trackingDriverId: string | null = null;
  private currentTripId: string | null = null; 
  private trackingStatus: TrackingStatus = 'idle';
  private lastSentAt = 0;
  private lastPosition: Coordinates | null = null;
  private inflightWrite = false;
  private queuedPayload: DriverRealtimePayload | null = null;
  private visibilityPaused = false;
  private reconnectTimeout: number | null = null;
  private gpsWatchdogInterval: number | null = null; 

  private readonly MIN_DISTANCE_METERS = 35;
  private readonly MIN_UPDATE_INTERVAL = 12000;
  private readonly MAX_BACKGROUND_INTERVAL = 30000;
  
  // // AJUSTE CTO: Ampliada a tolerância de precisão do GPS de 120m para 300m para sobreviver a túneis e viadutos.
  private readonly MAX_GPS_ACCURACY = 300; 
  
  private readonly GPS_TIMEOUT_THRESHOLD = 60000; 

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange, { passive: true });
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleReconnect);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    this.visibilityPaused = document.hidden;
    if (this.visibilityPaused) {
      console.log('📴 Tracking em background.');
    } else {
      console.log('📡 Tracking retomado.');
      this.handleReconnect(); 
    }
  };

  private handleOffline = () => {
    console.log('⚠ Sem internet (Modo Offline).');
    this.trackingStatus = 'paused';
  };

  private handleReconnect = () => {
    if (!this.trackingDriverId) return;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    this.reconnectTimeout = window.setTimeout(() => {
      if (!this.trackingDriverId) return;
      console.log('♻ Reconnect tracking realtime (Túnel/Sinal).');
      
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
      
      this.start(this.trackingDriverId, this.currentTripId || undefined);
    }, 2500);
  };

  private startGpsWatchdog() {
    if (this.gpsWatchdogInterval) window.clearInterval(this.gpsWatchdogInterval);
    
    this.gpsWatchdogInterval = window.setInterval(() => {
      if (this.trackingStatus === 'stopped') return;
      
      const now = Date.now();
      if (now - this.lastSentAt > this.GPS_TIMEOUT_THRESHOLD) {
        console.warn('⚠ Alerta Crítico: GPS parado ou sem permissão há muito tempo!');
        
        this.enqueueWrite({
          location: this.lastPosition || { lat: 0, lng: 0 },
          gpsAccuracy: 0,
          gpsHeading: 0,
          gpsSpeed: 0,
          gpsUpdatedAt: now,
          gpsFalhou: true 
        });
      }
    }, 30000); 
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async flushWriteQueue() {
    if (this.inflightWrite || !this.queuedPayload || !this.trackingDriverId) return;

    this.inflightWrite = true;
    const payload = this.queuedPayload;
    this.queuedPayload = null;

    try {
      await firebaseRealtimeService.updateDriverRealtime(this.trackingDriverId, payload);
      
      if (this.currentTripId) {
         await firebaseRealtimeService.updateTripRealtime(this.currentTripId, {
             motoristaLat: payload.location.lat,
             motoristaLng: payload.location.lng,
             motoristaHeading: payload.gpsHeading,
             gpsFalhou: payload.gpsFalhou || false 
         });
      }
    } catch (error) {
      console.error('❌ GPS WRITE ERROR:', error);
      this.queuedPayload = payload;
    } finally {
      this.inflightWrite = false;
      if (this.queuedPayload) void this.flushWriteQueue();
    }
  }

  private enqueueWrite(payload: DriverRealtimePayload) {
    this.queuedPayload = payload;
    void this.flushWriteQueue();
  }

  private shouldUpdatePosition(current: Coordinates, now: number) {
    if (!this.lastPosition) return true;
    const distance = this.calculateDistance(this.lastPosition.lat, this.lastPosition.lng, current.lat, current.lng);
    const interval = now - this.lastSentAt;
    const effectiveInterval = this.visibilityPaused ? this.MAX_BACKGROUND_INTERVAL : this.MIN_UPDATE_INTERVAL;
    return distance >= this.MIN_DISTANCE_METERS || interval >= effectiveInterval;
  }

  start(driverId: string, tripId?: string) {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      console.error('❌ Geolocation não suportada.');
      return;
    }

    if (!driverId) return;
    if (tripId) this.currentTripId = tripId;

    if (this.watchId !== null) {
      if (this.trackingDriverId === driverId) return;
      this.stop();
    }

    if (window.__FRETOGO_TRACKING_ACTIVE__) return;

    window.__FRETOGO_TRACKING_ACTIVE__ = true;
    this.trackingDriverId = driverId;
    this.trackingStatus = 'starting';
    console.log('📡 Tracking realtime iniciado.');

    this.startGpsWatchdog();

    this.watchId = navigator.geolocation.watchPosition(
      async position => {
        try {
          const now = Date.now();
          const accuracy = position.coords.accuracy;
          if (accuracy > this.MAX_GPS_ACCURACY) return;

          const current: Coordinates = { lat: position.coords.latitude, lng: position.coords.longitude };

          if (!this.shouldUpdatePosition(current, now)) return;

          this.lastPosition = current;
          this.lastSentAt = now;
          this.trackingStatus = 'tracking';

          this.enqueueWrite({
            location: current,
            gpsAccuracy: accuracy,
            gpsHeading: position.coords.heading || 0,
            gpsSpeed: position.coords.speed || 0,
            gpsUpdatedAt: now,
            gpsFalhou: false 
          });
        } catch (error) {
          console.error('❌ GPS REALTIME ERROR:', error);
        }
      },
      error => {
        console.error('❌ GPS WATCH ERROR:', error);
        this.trackingStatus = 'paused';
        
        if (error.code === error.PERMISSION_DENIED) {
          this.enqueueWrite({
            location: this.lastPosition || { lat: 0, lng: 0 },
            gpsAccuracy: 0, gpsHeading: 0, gpsSpeed: 0, gpsUpdatedAt: Date.now(),
            gpsFalhou: true
          });
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: this.visibilityPaused ? 30000 : 10000,
        timeout: this.visibilityPaused ? 30000 : 20000,
      }
    );
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.gpsWatchdogInterval) {
      clearInterval(this.gpsWatchdogInterval);
      this.gpsWatchdogInterval = null;
    }
    this.trackingDriverId = null;
    this.currentTripId = null;
    this.lastPosition = null;
    this.lastSentAt = 0;
    this.inflightWrite = false;
    this.queuedPayload = null;
    this.trackingStatus = 'stopped';
    window.__FRETOGO_TRACKING_ACTIVE__ = false;
    console.log('🛑 Tracking realtime finalizado.');
  }

  isTracking() { return this.watchId !== null; }
  getTrackingStatus() { return this.trackingStatus; }
}

export const locationRealtimeService = new LocationRealtimeService();
