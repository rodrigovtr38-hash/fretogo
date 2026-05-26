// src/components/MapaCliente.tsx

import React, {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  GoogleMap,
  Marker,
  Polyline,
} from '@react-google-maps/api';

type Coordinates = {
  lat: number;
  lng: number;
};

interface MapaClienteProps {
  origem?: Coordinates | null;

  destino?: Coordinates | null;

  motoristaPos?: Coordinates | null;

  operationalMessage?: string;

  eta?: number | null;
}

const containerStyle = {
  width: '100%',
  height: '520px',
  borderRadius: '2rem',
};

const mapStyles = [
  {
    elementType: 'geometry',
    stylers: [
      {
        color: '#020617',
      },
    ],
  },

  {
    elementType:
      'labels.text.stroke',

    stylers: [
      {
        color: '#020617',
      },
    ],
  },

  {
    elementType:
      'labels.text.fill',

    stylers: [
      {
        color: '#94a3b8',
      },
    ],
  },

  {
    featureType: 'road',

    elementType: 'geometry',

    stylers: [
      {
        color: '#0f172a',
      },
    ],
  },

  {
    featureType: 'water',

    elementType: 'geometry',

    stylers: [
      {
        color: '#0f172a',
      },
    ],
  },
];

function interpolatePosition(
  from: Coordinates,
  to: Coordinates,
  factor: number,
): Coordinates {
  return {
    lat:
      from.lat +
      (to.lat - from.lat) *
        factor,

    lng:
      from.lng +
      (to.lng - from.lng) *
        factor,
  };
}

function MapaCliente({
  origem,
  destino,
  motoristaPos,
  operationalMessage =
    'Sincronizando operação...',
  eta,
}: MapaClienteProps) {
  const mapRef =
    useRef<google.maps.Map | null>(
      null,
    );

  const [
    animatedPos,
    setAnimatedPos,
  ] = useState<
    Coordinates | null
  >(null);

  const previousPosRef =
    useRef<Coordinates | null>(
      null,
    );

  const animationFrameRef =
    useRef<number>();

  /*
  =========================================================
  CENTER
  =========================================================
  */

  const center =
    useMemo(() => {
      if (motoristaPos) {
        return motoristaPos;
      }

      if (origem) {
        return origem;
      }

      return {
        lat: -23.55052,
        lng: -46.633308,
      };
    }, [
      motoristaPos,
      origem,
    ]);

  /*
  =========================================================
  ROUTE
  =========================================================
  */

  const routePath =
    useMemo(() => {
      const path: Coordinates[] =
        [];

      if (origem) {
        path.push(origem);
      }

      if (motoristaPos) {
        path.push(
          motoristaPos,
        );
      }

      if (destino) {
        path.push(destino);
      }

      return path;
    }, [
      origem,
      motoristaPos,
      destino,
    ]);

  /*
  =========================================================
  FIT BOUNDS
  =========================================================
  */

  useEffect(() => {
    if (
      !mapRef.current ||
      routePath.length < 2
    ) {
      return;
    }

    const bounds =
      new google.maps.LatLngBounds();

    routePath.forEach(pos => {
      bounds.extend(pos);
    });

    mapRef.current.fitBounds(
      bounds,
      80,
    );
  }, [routePath]);

  /*
  =========================================================
  ANIMATE DRIVER
  =========================================================
  */

  useEffect(() => {
    if (!motoristaPos) {
      return;
    }

    if (
      !previousPosRef.current
    ) {
      previousPosRef.current =
        motoristaPos;

      setAnimatedPos(
        motoristaPos,
      );

      return;
    }

    const start =
      previousPosRef.current;

    const end =
      motoristaPos;

    let progress = 0;

    const animate = () => {
      progress += 0.025;

      if (progress >= 1) {
        setAnimatedPos(end);

        previousPosRef.current =
          end;

        return;
      }

      const interpolated =
        interpolatePosition(
          start,
          end,
          progress,
        );

      setAnimatedPos(
        interpolated,
      );

      animationFrameRef.current =
        requestAnimationFrame(
          animate,
        );
    };

    animate();

    return () => {
      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );
      }
    };
  }, [motoristaPos]);

  /*
  =========================================================
  DRIVER HEADING
  =========================================================
  */

  const heading =
    useMemo(() => {
      if (
        !previousPosRef.current ||
        !animatedPos
      ) {
        return 0;
      }

      const dx =
        animatedPos.lng -
        previousPosRef.current.lng;

      const dy =
        animatedPos.lat -
        previousPosRef.current.lat;

      return (
        (Math.atan2(
          dy,
          dx,
        ) *
          180) /
        Math.PI
      );
    }, [animatedPos]);

  /*
  =========================================================
  UI
  =========================================================
  */

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl">

      <div className="absolute left-5 top-5 z-20">

        <div className="rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur-xl">

          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">
            Rastreamento
          </p>

          <div className="mt-2 flex items-center gap-2">

            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-200">
              GPS REALTIME
            </span>

          </div>

        </div>

      </div>

      <div className="absolute right-5 top-5 z-20">

        <div className="rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur-xl">

          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">
            Status Operacional
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
        mapContainerStyle={
          containerStyle
        }
        center={center}
        zoom={12}
        onLoad={map => {
          mapRef.current =
            map;
        }}
        onUnmount={() => {
          mapRef.current =
            null;
        }}
        options={{
          disableDefaultUI:
            true,

          clickableIcons:
            false,

          gestureHandling:
            'greedy',

          styles: mapStyles,

          fullscreenControl:
            false,

          streetViewControl:
            false,

          mapTypeControl:
            false,
        }}
      >

        {routePath.length >=
          2 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor:
                '#22d3ee',

              strokeOpacity:
                0.9,

              strokeWeight:
                4,

              geodesic: true,
            }}
          />
        )}

        {origem && (
          <Marker
            position={origem}
          />
        )}

        {destino && (
          <Marker
            position={destino}
          />
        )}

        {animatedPos && (
          <Marker
            position={
              animatedPos
            }
            icon={{
              path:
                window.google.maps
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
          />
        )}

      </GoogleMap>

    </div>
  );
}

export default memo(
  MapaCliente,
);
