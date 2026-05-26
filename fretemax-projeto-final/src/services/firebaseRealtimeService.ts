
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  eventBusService,
  AppEvents,
} from './eventBusService';

class FirebaseRealtimeService {
  private listeners = new Map<string, Unsubscribe>();

  private activeKeys = new Set<string>();

  private emitConnected() {
    eventBusService.emit(
      AppEvents.REALTIME_CONNECTED,
    );
  }

  private emitDisconnected() {
    eventBusService.emit(
      AppEvents.REALTIME_DISCONNECTED,
    );
  }

  private registerListener(
    key: string,
    unsubscribe: Unsubscribe,
  ) {
    if (this.listeners.has(key)) {
      return;
    }

    this.listeners.set(key, unsubscribe);

    this.activeKeys.add(key);
  }

  hasListener(key: string) {
    return this.activeKeys.has(key);
  }

  listenDriver(driverId: string) {
    try {
      if (!driverId) {
        return;
      }

      const key = `driver_${driverId}`;

      if (this.hasListener(key)) {
        return;
      }

      const driverRef = doc(
        db,
        'motoristas',
        driverId,
      );

      const unsubscribe = onSnapshot(
        driverRef,
        snapshot => {
          if (!snapshot.exists()) {
            return;
          }

          const data = {
            id: snapshot.id,
            ...snapshot.data(),
          };

          this.emitConnected();

          eventBusService.emit(
            AppEvents.DRIVER_STATUS_CHANGED,
            data,
          );
        },
        error => {
          console.error(
            'REALTIME DRIVER ERROR:',
            error,
          );

          this.emitDisconnected();
        },
      );

      this.registerListener(
        key,
        unsubscribe,
      );
    } catch (error) {
      console.error(
        'ERRO LISTEN DRIVER:',
        error,
      );
    }
  }

  listenTrip(tripId: string) {
    try {
      if (!tripId) {
        return;
      }

      const key = `trip_${tripId}`;

      if (this.hasListener(key)) {
        return;
      }

      const tripRef = doc(
        db,
        'fretes',
        tripId,
      );

      const unsubscribe = onSnapshot(
        tripRef,
        snapshot => {
          if (!snapshot.exists()) {
            return;
          }

          const data = {
            id: snapshot.id,
            ...snapshot.data(),
          };

          this.emitConnected();

          eventBusService.emit(
            AppEvents.TRIP_STATUS_CHANGED,
            data,
          );
        },
        error => {
          console.error(
            'REALTIME TRIP ERROR:',
            error,
          );

          this.emitDisconnected();
        },
      );

      this.registerListener(
        key,
        unsubscribe,
      );
    } catch (error) {
      console.error(
        'ERRO LISTEN TRIP:',
        error,
      );
    }
  }

  async updateDriverRealtime(
    driverId: string,
    payload: Record<string, any>,
  ) {
    try {
      if (!driverId) {
        return;
      }

      const driverRef = doc(
        db,
        'motoristas',
        driverId,
      );

      await updateDoc(driverRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(
        'ERRO UPDATE DRIVER:',
        error,
      );
    }
  }

  async updateTripRealtime(
    tripId: string,
    payload: Record<string, any>,
  ) {
    try {
      if (!tripId) {
        return;
      }

      const tripRef = doc(
        db,
        'fretes',
        tripId,
      );

      await updateDoc(tripRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(
        'ERRO UPDATE TRIP:',
        error,
      );
    }
  }

  stopListener(key: string) {
    const listener = this.listeners.get(key);

    if (!listener) {
      return;
    }

    listener();

    this.listeners.delete(key);

    this.activeKeys.delete(key);
  }

  stopDriverListener(driverId: string) {
    this.stopListener(
      `driver_${driverId}`,
    );
  }

  stopTripListener(tripId: string) {
    this.stopListener(
      `trip_${tripId}`,
    );
  }

  disconnectScoped(config: {
    driverId?: string;
    tripId?: string;
  }) {
    if (config.driverId) {
      this.stopDriverListener(
        config.driverId,
      );
    }

    if (config.tripId) {
      this.stopTripListener(
        config.tripId,
      );
    }
  }
}

export const firebaseRealtimeService =
  new FirebaseRealtimeService();
```

---

# src/services/locationRealtimeService.ts

```ts
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
            ) {
              const distance =
                this.calculateDistance(
                  this.lastPosition.lat,
                  this.lastPosition.lng,
                  current.lat,
                  current.lng,
                );

              const tooSoon =
                now - this.lastSentAt <
                this.MIN_UPDATE_INTERVAL;

              if (
                distance <
                  this.MIN_DISTANCE_METERS &&
                tooSoon
              ) {
                return;
              }
            }

            this.lastPosition =
              current;

            this.lastSentAt = now;

            await firebaseRealtimeService.updateDriverRealtime(
              driverId,
              {
                location: current,
              },
            );
          } catch (error) {
            console.error(
              'GPS REALTIME ERROR:',
              error,
            );
          }
        },
        error => {
          console.error(
            'GPS Error:',
            error,
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 15000,
          timeout: 20000,
        },
      );
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(
        this.watchId,
      );

      this.watchId = null;
    }

    this.lastPosition = null;

    this.lastSentAt = 0;
  }
}

export const locationRealtimeService =
  new LocationRealtimeService();
```

---

# src/hooks/useDriverRealtime.ts

```ts
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
```

---

# src/hooks/useTripRealtime.ts

```ts
import { useEffect } from 'react';

import {
  firebaseRealtimeService,
} from '../services/firebaseRealtimeService';

export const useTripRealtime = (
  tripId?: string,
) => {
  useEffect(() => {
    if (!tripId) {
      return;
    }

    firebaseRealtimeService.listenTrip(
      tripId,
    );

    return () => {
      firebaseRealtimeService.stopTripListener(
        tripId,
      );
    };
  }, [tripId]);
};
```

---

# src/hooks/useRealtimeSystem.ts

```ts
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
```

---

# src/services/realtimeOrchestrator.ts

```ts
import {
  firebaseRealtimeService,
} from './firebaseRealtimeService';

import {
  eventBusService,
  AppEvents,
} from './eventBusService';

import {
  StateSynchronizationService,
} from './stateSynchronizationService';

import {
  DriverState,
} from '../state/driverStateMachine';

import {
  AppTripState,
} from '../state/tripStateMachine';

class RealtimeOrchestrator {
  private initialized = false;

  private syncing = false;

  private eventsRegistered = false;

  initialize(config: {
    driverId?: string;
    tripId?: string;
  }) {
    try {
      if (!this.eventsRegistered) {
        this.registerEvents();

        this.eventsRegistered = true;
      }

      if (config.driverId) {
        firebaseRealtimeService.listenDriver(
          config.driverId,
        );
      }

      if (config.tripId) {
        firebaseRealtimeService.listenTrip(
          config.tripId,
        );
      }

      this.initialized = true;

      eventBusService.emit(
        AppEvents.REALTIME_CONNECTED,
      );
    } catch (error) {
      console.error(
        'REALTIME ORCHESTRATOR INIT ERROR:',
        error,
      );

      eventBusService.emit(
        AppEvents.SYSTEM_ERROR,
        {
          origem:
            'realtimeOrchestrator.initialize',

          error,
        },
      );
    }
  }

  private registerEvents() {
    eventBusService.on(
      AppEvents.TRIP_STATUS_CHANGED,
      async (tripData: any) => {
        try {
          if (this.syncing) {
            return;
          }

          if (!tripData) {
            return;
          }

          if (
            !tripData.driverId ||
            !tripData.status
          ) {
            return;
          }

          this.syncing = true;

          const synchronized =
            StateSynchronizationService.synchronize(
              tripData.driverState as DriverState,
              tripData.status as AppTripState,
            );

          if (
            synchronized.driverState &&
            synchronized.driverState !==
              tripData.driverState
          ) {
            await firebaseRealtimeService.updateDriverRealtime(
              tripData.driverId,
              {
                state:
                  synchronized.driverState,
              },
            );
          }
        } catch (error) {
          console.error(
            'TRIP SYNC ERROR:',
            error,
          );

          eventBusService.emit(
            AppEvents.SYSTEM_ERROR,
            {
              origem:
                'TRIP_STATUS_CHANGED',

              error,
            },
          );
        } finally {
          this.syncing = false;
        }
      },
    );

    eventBusService.on(
      AppEvents.REALTIME_DISCONNECTED,
      () => {
        console.warn(
          'REALTIME DISCONNECTED',
        );
      },
    );

    eventBusService.on(
      AppEvents.SYSTEM_ERROR,
      payload => {
        console.error(
          'SYSTEM ERROR:',
          payload,
        );
      },
    );
  }

  destroy(config: {
    driverId?: string;
    tripId?: string;
  }) {
    try {
      firebaseRealtimeService.disconnectScoped(
        config,
      );

      this.initialized = false;

      this.syncing = false;
    } catch (error) {
      console.error(
        'REALTIME DESTROY ERROR:',
        error,
      );
    }
  }
}

export const realtimeOrchestrator =
  new RealtimeOrchestrator();
```

---

# src/components/MapaCliente.tsx

```tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from '@react-google-maps/api';

import {
  doc,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  AppTripState,
} from '../state/tripStateMachine';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '2rem',
};

const centerDefault = {
  lat: -23.5505,
  lng: -46.6333,
};

const libraries: (
  | 'places'
  | 'geometry'
)[] = ['geometry'];

const mapStyles = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }],
  },
  {
    elementType:
      'labels.text.stroke',
    stylers: [{ color: '#0f172a' }],
  },
  {
    elementType:
      'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'poi',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType:
      'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#020617' }],
  },
];

interface MapProps {
  motoristaId?: string | null;

  origem?: {
    lat: number;
    lng: number;
  } | null;

  destino?: {
    lat: number;
    lng: number;
  } | null;
}

interface MotoristaData {
  lat: number;
  lng: number;
  status?: string;
  tripStatus?: string;
}

const calculateHeading = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const toRad = (
    deg: number,
  ) =>
    (deg * Math.PI) / 180;

  const toDeg = (
    rad: number,
  ) =>
    (rad * 180) / Math.PI;

  const dLng = toRad(
    lng2 - lng1,
  );

  const y =
    Math.sin(dLng) *
    Math.cos(toRad(lat2));

  const x =
    Math.cos(toRad(lat1)) *
      Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(dLng);

  return (
    toDeg(
      Math.atan2(y, x),
    ) + 360
  ) % 360;
};

export default function MapaCliente({
  motoristaId,
  origem,
  destino,
}: MapProps) {
  const [motoristaAtivo, setMotoristaAtivo] =
    useState<MotoristaData | null>(
      null,
    );

  const [animatedPos, setAnimatedPos] =
    useState<{
      lat: number;
      lng: number;
    } | null>(null);

  const [heading, setHeading] =
    useState(0);

  const [tripStatus, setTripStatus] =
    useState('');

  const [operationalMessage, setOperationalMessage] =
    useState(
      'Buscando parceiros próximos...',
    );

  const [eta, setEta] = useState<
    number | null
  >(null);

  const mapRef =
    useRef<google.maps.Map | null>(
      null,
    );

  const hasFittedBoundsRef =
    useRef(false);

  const prevPosRef = useRef<{
    lat: number;
    lng: number;
  } | null>(null);

  const {
    isLoaded,
    loadError,
  } = useJsApiLoader({
    id: 'fretogo-google-maps',
    googleMapsApiKey:
      import.meta.env
        .VITE_GOOGLE_MAPS_KEY || '',
    libraries,
    preventGoogleFontsLoading: true,
  });

  useEffect(() => {
    if (!motoristaId) {
      return;
    }

    const unsubscribe = onSnapshot(
      doc(
        db,
        'motoristas_online',
        motoristaId,
      ),
      snap => {
        if (!snap.exists()) {
          return;
        }

        const data = snap.data();

        if (
          typeof data?.lat !==
            'number' ||
          typeof data?.lng !==
            'number'
        ) {
          return;
        }

        setMotoristaAtivo({
          lat: data.lat,
          lng: data.lng,
          status: data.status,
          tripStatus:
            data.tripStatus,
        });

        if (data.tripStatus) {
          setTripStatus(
            data.tripStatus,
          );
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [motoristaId]);

  useEffect(() => {
    switch (tripStatus) {
      case AppTripState.DISPONIVEL:
        setOperationalMessage(
          'Buscando parceiro próximo...',
        );
        break;

      case AppTripState.OFERTANDO:
        setOperationalMessage(
          'Enviando oferta operacional...',
        );
        break;

      case AppTripState.REDISPATCH:
        setOperationalMessage(
          'Expandindo raio operacional...',
        );
        break;

      case AppTripState.ACEITO:
        setOperationalMessage(
          'Motorista confirmado.',
        );
        setEta(12);
        break;

      case AppTripState.INDO_COLETA:
        setOperationalMessage(
          'Motorista a caminho da coleta.',
        );
        setEta(8);
        break;

      case AppTripState.COLETANDO:
        setOperationalMessage(
          'Carga sendo coletada.',
        );
        break;

      case AppTripState.EM_TRANSPORTE:
        setOperationalMessage(
          'Carga em transporte.',
        );
        setEta(25);
        break;

      case AppTripState.FINALIZANDO:
        setOperationalMessage(
          'Finalizando entrega.',
        );
        break;

      case AppTripState.ENTREGUE:
        setOperationalMessage(
          'Entrega concluída.',
        );
        setEta(null);
        break;

      case AppTripState.SEM_MOTORISTA:
        setOperationalMessage(
          'Nenhum parceiro encontrado.',
        );
        break;
    }
  }, [tripStatus]);

  useEffect(() => {
    if (!motoristaAtivo) {
      return;
    }

    const newPos = {
      lat: motoristaAtivo.lat,
      lng: motoristaAtivo.lng,
    };

    if (!prevPosRef.current) {
      prevPosRef.current = newPos;

      setAnimatedPos(newPos);

      return;
    }

    const oldPos =
      prevPosRef.current;

    const newHeading =
      calculateHeading(
        oldPos.lat,
        oldPos.lng,
        newPos.lat,
        newPos.lng,
      );

    setHeading(newHeading);

    setAnimatedPos(newPos);

    prevPosRef.current = newPos;
  }, [motoristaAtivo]);

  useEffect(() => {
    if (
      !mapRef.current ||
      !window.google ||
      !isLoaded ||
      hasFittedBoundsRef.current
    ) {
      return;
    }

    const bounds =
      new window.google.maps.LatLngBounds();

    let hasPoints = false;

    if (animatedPos) {
      bounds.extend(animatedPos);
      hasPoints = true;
    }

    if (origem) {
      bounds.extend(origem);
      hasPoints = true;
    }

    if (destino) {
      bounds.extend(destino);
      hasPoints = true;
    }

    if (!hasPoints) {
      return;
    }

    mapRef.current.fitBounds(bounds, {
      top: 80,
      bottom: 80,
      left: 80,
      right: 80,
    });

    hasFittedBoundsRef.current = true;
  }, [
    animatedPos,
    origem,
    destino,
    isLoaded,
  ]);

  const center = useMemo(() => {
    if (animatedPos) {
      return animatedPos;
    }

    if (origem) {
      return origem;
    }

    return centerDefault;
  }, [animatedPos, origem]);

  const routePath = useMemo(() => {
    const points = [];

    if (origem) {
      points.push(origem);
    }

    if (animatedPos) {
      points.push(animatedPos);
    }

    if (destino) {
      points.push(destino);
    }

    return points;
  }, [
    origem,
    destino,
    animatedPos,
  ]);

  if (loadError) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[2rem] border border-red-500/20 bg-slate-950">
        <p className="text-sm font-bold text-red-400">
          Radar indisponível
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[2rem] border border-cyan-500/20 bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full border-[3px] border-cyan-400 border-t-transparent animate-spin" />

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
            Sincronizando radar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-64 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_18px_60px_rgba(0,0,0,0.42)]">
      <div className="pointer-events-none absolute inset-0 z-10 bg-cyan-500/5 mix-blend-overlay" />

      <div className="absolute left-5 top-5 z-20">
        <div className="flex items-center gap-2 rounded-full border border-cyan-500/20 bg-slate-950/80 px-4 py-2 backdrop-blur-xl">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 radar-pulse" />

            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </div>

          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-200">
            GPS REALTIME
          </span>
        </div>
      </div>

      <div className="absolute right-5 top-5 z-20">
        <div className="rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur-xl">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">
            STATUS OPERACIONAL
          </p>

          <p className="mt-2 text-xs font-bold text-white">
            {operationalMessage}
          </p>

          {eta && (
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-green-400">
              ETA {eta} min
            </p>
          )}
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={map => {
          mapRef.current = map;
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
        options={{
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: mapStyles,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        {routePath.length >= 2 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#22d3ee',
              strokeOpacity: 0.9,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        )}

        {origem && (
          <Marker position={origem} />
        )}

        {destino && (
          <Marker position={destino} />
        )}

        {animatedPos && (
          <Marker
            position={animatedPos}
            icon={{
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 7,
              fillColor: '#22d3ee',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff',
              rotation: heading,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
```
