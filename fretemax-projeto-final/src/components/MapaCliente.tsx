import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';

import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from '@react-google-maps/api';

import { db } from '../firebase';

import {
  collection,
  onSnapshot,
  doc,
} from 'firebase/firestore';

/* =========================================================
   MAP CONFIG
========================================================= */

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '2rem',
};

const centerDefault = {
  lat: -23.5505,
  lng: -46.6333,
};

/* =========================================================
   DARK OPERATIONAL STYLE
========================================================= */

const mapStyles = [
  {
    elementType: 'geometry',
    stylers: [
      {
        color: '#0f172a',
      },
    ],
  },

  {
    elementType:
      'labels.text.stroke',

    stylers: [
      {
        color: '#0f172a',
      },
    ],
  },

  {
    elementType:
      'labels.text.fill',

    stylers: [
      {
        color: '#64748b',
      },
    ],
  },

  {
    featureType:
      'administrative.locality',

    elementType:
      'labels.text.fill',

    stylers: [
      {
        color: '#94a3b8',
      },
    ],
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

    stylers: [
      {
        color: '#1e293b',
      },
    ],
  },

  {
    featureType:
      'road.highway',

    elementType: 'geometry',

    stylers: [
      {
        color: '#334155',
      },
    ],
  },

  {
    featureType: 'water',

    elementType: 'geometry',

    stylers: [
      {
        color: '#020617',
      },
    ],
  },
];

/* =========================================================
   TYPES
========================================================= */

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
}

/* =========================================================
   HEADING
========================================================= */

const calculateHeading = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const toRad = (
    deg: number,
  ) => {
    return (
      (deg * Math.PI) / 180
    );
  };

  const toDeg = (
    rad: number,
  ) => {
    return (
      (rad * 180) / Math.PI
    );
  };

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

  const heading = toDeg(
    Math.atan2(y, x),
  );

  return (
    (heading + 360) % 360
  );
};

/* =========================================================
   COMPONENT
========================================================= */

export default function MapaCliente({
  motoristaId,
  origem,
  destino,
}: MapProps) {
  const [motoristas, setMotoristas] =
    useState<
      MotoristaData[]
    >([]);

  const [
    motoristaAtivo,
    setMotoristaAtivo,
  ] =
    useState<MotoristaData | null>(
      null,
    );

  const [
    animatedPos,
    setAnimatedPos,
  ] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [heading, setHeading] =
    useState(0);

  const mapRef =
    useRef<google.maps.Map | null>(
      null,
    );

  const prevPosRef = useRef<{
    lat: number;
    lng: number;
  } | null>(null);

  /* =========================================================
     MAPS LOADER
  ========================================================= */

  const {
    isLoaded,
    loadError,
  } = useJsApiLoader({
    googleMapsApiKey:
      import.meta.env
        .VITE_GOOGLE_MAPS_KEY ||
      '',

    id: 'fretogo-map',
  });

  /* =========================================================
     REALTIME LISTENER
  ========================================================= */

  useEffect(() => {
    let unsub:
      | (() => void)
      | undefined;

    if (motoristaId) {
      unsub = onSnapshot(
        doc(
          db,
          'motoristas_online',
          motoristaId,
        ),
        (snap) => {
          if (!snap.exists())
            return;

          const data =
            snap.data();

          if (
            typeof data?.lat ===
              'number' &&
            typeof data?.lng ===
              'number'
          ) {
            setMotoristaAtivo({
              lat: data.lat,
              lng: data.lng,
              status:
                data.status,
            });
          }
        },
      );
    } else {
      unsub = onSnapshot(
        collection(
          db,
          'motoristas_online',
        ),
        (snap) => {
          const lista =
            snap.docs
              .map((doc) =>
                doc.data(),
              )
              .filter(
                (
                  m: any,
                ) =>
                  m?.status ===
                    'disponivel' &&
                  typeof m?.lat ===
                    'number' &&
                  typeof m?.lng ===
                    'number',
              );

          setMotoristas(
            lista,
          );
        },
      );
    }

    return () => {
      if (unsub) unsub();
    };
  }, [motoristaId]);

  /* =========================================================
     SMOOTH TRACKING
  ========================================================= */

  useEffect(() => {
    if (!motoristaAtivo)
      return;

    const newPos = {
      lat: motoristaAtivo.lat,
      lng: motoristaAtivo.lng,
    };

    if (
      !prevPosRef.current
    ) {
      setAnimatedPos(
        newPos,
      );

      prevPosRef.current =
        newPos;

      return;
    }

    const oldPos =
      prevPosRef.current;

    const latDiff =
      Math.abs(
        newPos.lat -
          oldPos.lat,
      );

    const lngDiff =
      Math.abs(
        newPos.lng -
          oldPos.lng,
      );

    /* evita jitter */
    if (
      latDiff < 0.00001 &&
      lngDiff < 0.00001
    ) {
      return;
    }

    const newHeading =
      calculateHeading(
        oldPos.lat,
        oldPos.lng,
        newPos.lat,
        newPos.lng,
      );

    setHeading(
      newHeading,
    );

    setAnimatedPos(
      newPos,
    );

    prevPosRef.current =
      newPos;
  }, [motoristaAtivo]);

  /* =========================================================
     AUTO FIT
  ========================================================= */

  useEffect(() => {
    if (
      !mapRef.current ||
      !window.google ||
      !isLoaded
    ) {
      return;
    }

    const bounds =
      new window.google.maps.LatLngBounds();

    let hasPoints =
      false;

    if (animatedPos) {
      bounds.extend(
        animatedPos,
      );

      hasPoints = true;
    }

    if (origem) {
      bounds.extend(
        origem,
      );

      hasPoints = true;
    }

    if (destino) {
      bounds.extend(
        destino,
      );

      hasPoints = true;
    }

    if (!hasPoints)
      return;

    if (
      (!origem &&
        !destino) ||
      (!animatedPos &&
        (!origem ||
          !destino))
    ) {
      mapRef.current.setCenter(
        animatedPos ||
          origem ||
          centerDefault,
      );

      mapRef.current.setZoom(
        15,
      );
    } else {
      mapRef.current.fitBounds(
        bounds,
        {
          top: 80,
          bottom: 80,
          left: 80,
          right: 80,
        },
      );
    }
  }, [
    animatedPos,
    origem,
    destino,
    isLoaded,
  ]);

  /* =========================================================
     CENTER
  ========================================================= */

  const center =
    useMemo(() => {
      if (animatedPos)
        return animatedPos;

      if (origem)
        return origem;

      return centerDefault;
    }, [
      animatedPos,
      origem,
    ]);

  /* =========================================================
     LOAD ERROR
  ========================================================= */

  if (loadError) {
    return (
      <div className="glass-card flex h-64 w-full items-center justify-center overflow-hidden border border-red-500/20">

        <div className="text-center">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">

            <div className="h-3 w-3 rounded-full bg-red-500" />

          </div>

          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-red-400">
            Radar indisponível
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Falha ao conectar satélites.
          </p>

        </div>

      </div>
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (!isLoaded) {
    return (
      <div className="glass-card relative h-64 w-full overflow-hidden border border-cyan-500/10">

        <div className="absolute inset-0 bg-cyan-500/5" />

        <div className="absolute inset-0 flex flex-col items-center justify-center">

          <div className="relative">

            <div className="absolute inset-0 rounded-full border border-cyan-400/20 radar-pulse" />

            <div className="h-16 w-16 rounded-full border-[3px] border-cyan-400 border-t-transparent animate-spin" />

          </div>

          <p className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
            Sincronizando radar
          </p>

        </div>

      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="group relative h-64 w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_18px_60px_rgba(0,0,0,0.42)]">

      {/* overlay */}

      <div className="pointer-events-none absolute inset-0 z-10 bg-cyan-500/5 mix-blend-overlay" />

      {/* live badge */}

      <div className="absolute left-5 top-5 z-20">

        <div className="flex items-center gap-2 rounded-full border border-cyan-500/20 bg-slate-950/80 px-4 py-2 backdrop-blur-xl">

          <div className="relative flex h-2 w-2">

            <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 radar-pulse" />

            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />

          </div>

          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-200">
            GPS realtime
          </span>

        </div>

      </div>

      {/* map */}

      <GoogleMap
        mapContainerStyle={
          containerStyle
        }
        center={center}
        zoom={12}
        onLoad={(map) => {
          mapRef.current =
            map;
        }}
        onUnmount={() => {
          mapRef.current =
            null;
        }}
        options={{
          disableDefaultUI: true,

          clickableIcons: false,

          gestureHandling:
            'greedy',

          styles: mapStyles,

          fullscreenControl: false,

          streetViewControl: false,

          mapTypeControl: false,

          keyboardShortcuts: false,
        }}
      >

        {/* ROUTE */}

        {origem &&
          destino && (
            <Polyline
              path={[
                origem,

                animatedPos
                  ? animatedPos
                  : origem,

                destino,
              ]}
              options={{
                strokeColor:
                  '#22d3ee',

                strokeOpacity:
                  0.9,

                strokeWeight: 3,

                geodesic: true,

                icons: [
                  {
                    icon: {
                      path: 'M 0,-1 0,1',
                      strokeOpacity: 1,
                      scale: 2.5,
                    },

                    offset: '0',

                    repeat:
                      '20px',
                  },
                ],
              }}
            />
          )}

        {/* ORIGEM */}

        {origem && (
          <Marker
            position={origem}
            icon={{
              path: window.google
                .maps
                .SymbolPath
                .CIRCLE,

              scale: 6,

              fillColor:
                '#3b82f6',

              fillOpacity: 1,

              strokeWeight: 3,

              strokeColor:
                '#ffffff',
            }}
          />
        )}

        {/* DESTINO */}

        {destino && (
          <Marker
            position={destino}
            icon={{
              path: window.google
                .maps
                .SymbolPath
                .CIRCLE,

              scale: 6,

              fillColor:
                '#22c55e',

              fillOpacity: 1,

              strokeWeight: 3,

              strokeColor:
                '#ffffff',
            }}
          />
        )}

        {/* MOTORISTA */}

        {animatedPos ? (
          <Marker
            position={
              animatedPos
            }
            icon={{
              path: window.google
                .maps
                .SymbolPath
                .FORWARD_CLOSED_ARROW,

              scale: 7,

              fillColor:
                '#22d3ee',

              fillOpacity: 1,

              strokeWeight: 2,

              strokeColor:
                '#ffffff',

              rotation:
                heading,
            }}
            options={{
              optimized: false,
            }}
          />
        ) : (
          motoristas.map(
            (
              motorista,
              index,
            ) => (
              <Marker
                key={`${motorista.lat}-${motorista.lng}-${index}`}
                position={{
                  lat: motorista.lat,
                  lng: motorista.lng,
                }}
                icon={{
                  path: window
                    .google
                    .maps
                    .SymbolPath
                    .CIRCLE,

                  scale: 4.5,

                  fillColor:
                    '#64748b',

                  fillOpacity: 0.8,

                  strokeWeight: 1,

                  strokeColor:
                    '#ffffff',
                }}
              />
            ),
          )
        )}

      </GoogleMap>

    </div>
  );
}
