// src/components/MapaCliente.tsx

import React, {
  memo,
  useCallback,
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

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   CONSTANTS
========================================================= */

const containerStyle = {
  width: '100%',

  height: '520px',

  borderRadius: '2rem',
};

const defaultCenter = {
  lat: -23.55052,

  lng: -46.633308,
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

/* =========================================================
   HELPERS
========================================================= */

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

function calculateHeading(
  from: Coordinates,
  to: Coordinates,
): number {
  const dx =
    to.lng - from.lng;

  const dy =
    to.lat - from.lat;

  return (
    (Math.atan2(
      dy,
      dx,
    ) *
      180) /
    Math.PI
  );
}

/* =========================================================
   COMPONENT
========================================================= */

function MapaCliente({
  origem,

  destino,

  motoristaPos,

  operationalMessage =
    'Sincronizando operação...',

  eta,
}: MapaClienteProps) {
  /* =======================================================
     REFS
  ======================================================= */

  const mountedRef =
    useRef(false);

  const mapRef =
    useRef<google.maps.Map | null>(
      null,
    );

  const mapIdleRef =
    useRef(false);

  const fitBoundsTimeoutRef =
    useRef<number>();

  const animationFrameRef =
    useRef<number>();

  const animationLockRef =
    useRef(false);

  const previousPosRef =
    useRef<Coordinates | null>(
      null,
    );

  /* =======================================================
     RUNTIME STATE
  ======================================================= */

  const [
    mapReady,
    setMapReady,
  ] = useState(false);

  const [
    mapStable,
    setMapStable,
  ] = useState(false);

  const [
    animatedPos,
    setAnimatedPos,
  ] = useState<
    Coordinates | null
  >(null);

  const [
    heading,
    setHeading,
  ] = useState(0);

  /* =======================================================
     GOOGLE READY
  ======================================================= */

  const googleReady =
    typeof window !==
      'undefined' &&
    !!window.google &&
    !!window.google.maps;

  /* =======================================================
     LIFECYCLE
  ======================================================= */

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      mapIdleRef.current =
        false;

      animationLockRef.current =
        false;

      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );
      }

      if (
        fitBoundsTimeoutRef.current
      ) {
        window.clearTimeout(
          fitBoundsTimeoutRef.current,
        );
      }
    };
  }, []);

  /* =======================================================
     CENTER
  ======================================================= */

  const center =
    useMemo(() => {
      if (motoristaPos) {
        return motoristaPos;
      }

      if (origem) {
        return origem;
      }

      return defaultCenter;
    }, [
      motoristaPos,
      origem,
    ]);

  /* =======================================================
     ROUTE PATH
  ======================================================= */

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

  /* =======================================================
     MAP LOAD
  ======================================================= */

  const handleMapLoad =
    useCallback(
      (
        map: google.maps.Map,
      ) => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        mapRef.current = map;

        setMapReady(true);

        /*
         * Aguarda mapa estabilizar.
         */

        window.setTimeout(
          () => {
            if (
              !mountedRef.current
            ) {
              return;
            }

            mapIdleRef.current =
              true;

            setMapStable(
              true,
            );
          },
          250,
        );
      },
      [],
    );

  /* =======================================================
     MAP UNMOUNT
  ======================================================= */

  const handleMapUnmount =
    useCallback(() => {
      mapIdleRef.current =
        false;

      setMapReady(false);

      setMapStable(false);

      mapRef.current =
        null;

      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );
      }

      if (
        fitBoundsTimeoutRef.current
      ) {
        clearTimeout(
          fitBoundsTimeoutRef.current,
        );
      }
    }, []);

  /* =======================================================
     FIT BOUNDS
  ======================================================= */

  useEffect(() => {
    if (
      !googleReady ||
      !mapReady ||
      !mapStable
    ) {
      return;
    }

    if (
      !mapRef.current
    ) {
      return;
    }

    if (
      routePath.length < 2
    ) {
      return;
    }

    if (
      fitBoundsTimeoutRef.current
    ) {
      clearTimeout(
        fitBoundsTimeoutRef.current,
      );
    }

    /*
     * IMPORTANTE:
     * Debounce para evitar:
     * - zoom loops
     * - flicker
     * - realtime storms
     */

    fitBoundsTimeoutRef.current =
      window.setTimeout(
        () => {
          try {
            if (
              !mapRef.current ||
              !mapIdleRef.current
            ) {
              return;
            }

            const bounds =
              new window.google.maps.LatLngBounds();

            routePath.forEach(
              pos => {
                bounds.extend(
                  pos,
                );
              },
            );

            mapRef.current.fitBounds(
              bounds,
              80,
            );
          } catch (error) {
            console.error(
              '❌ fitBounds error:',
              error,
            );
          }
        },
        450,
      );

    return () => {
      if (
        fitBoundsTimeoutRef.current
      ) {
        clearTimeout(
          fitBoundsTimeoutRef.current,
        );
      }
    };
  }, [
    googleReady,
    mapReady,
    mapStable,
    routePath,
  ]);

  /* =======================================================
     TRACKING ANIMATION
  ======================================================= */

  useEffect(() => {
    if (!motoristaPos) {
      return;
    }

    /*
     * Primeira posição.
     */

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

    /*
     * Evita overlap animation.
     */

    if (
      animationFrameRef.current
    ) {
      cancelAnimationFrame(
        animationFrameRef.current,
      );
    }

    animationLockRef.current =
      true;

    const start =
      previousPosRef.current;

    const end =
      motoristaPos;

    let progress = 0;

    const localHeading =
      calculateHeading(
        start,
        end,
      );

    const animate = () => {
      if (
        !mountedRef.current
      ) {
        return;
      }

      progress += 0.03;

      if (progress >= 1) {
        setAnimatedPos(end);

        setHeading(
          localHeading,
        );

        previousPosRef.current =
          end;

        animationLockRef.current =
          false;

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

      setHeading(
        localHeading,
      );

      animationFrameRef.current =
        requestAnimationFrame(
          animate,
        );
    };

    animationFrameRef.current =
      requestAnimationFrame(
        animate,
      );

    return () => {
      animationLockRef.current =
        false;

      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );
      }
    };
  }, [motoristaPos]);

  /* =======================================================
     DRIVER ICON
  ======================================================= */

  const driverIcon =
    useMemo(() => {
      if (
        !googleReady
      ) {
        return undefined;
      }

      return {
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

        rotation: heading,
      };
    }, [
      googleReady,
      heading,
    ]);

  /* =======================================================
     POLYLINE OPTIONS
  ======================================================= */

  const polylineOptions =
    useMemo(
      () => ({
        strokeColor:
          '#22d3ee',

        strokeOpacity:
          0.9,

        strokeWeight:
          4,

        geodesic: true,
      }),
      [],
    );

  /* =======================================================
     MAP OPTIONS
  ======================================================= */

  const mapOptions =
    useMemo(
      () => ({
        disableDefaultUI:
          true,

        clickableIcons:
          false,

        gestureHandling:
          'greedy' as const,

        styles: mapStyles,

        fullscreenControl:
          false,

        streetViewControl:
          false,

        mapTypeControl:
          false,

        keyboardShortcuts:
          false,

        mapId: undefined,
      }),
      [],
    );

  /* =======================================================
     RUNTIME GATE
  ======================================================= */

  if (!googleReady) {
    return (
      <div
        className="
          relative
          flex
          h-[520px]
          w-full
          items-center
          justify-center
          overflow-hidden
          rounded-[2rem]
          border
          border-white/10
          bg-slate-950
        "
      >
        <div
          className="
            flex
            flex-col
            items-center
            gap-4
          "
        >
          <div
            className="
              h-12
              w-12
              animate-spin
              rounded-full
              border-4
              border-cyan-500/20
              border-t-cyan-400
            "
          />

          <p
            className="
              text-xs
              font-black
              uppercase
              tracking-[0.24em]
              text-cyan-300
            "
          >
            Carregando mapa...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-[2rem]
        border
        border-white/10
        bg-slate-950
        shadow-2xl
      "
    >
      {/* ===================================================
          OVERLAY LEFT
      =================================================== */}

      <div
        className="
          absolute
          left-5
          top-5
          z-20
        "
      >
        <div
          className="
            rounded-2xl
            border
            border-white/10
            bg-slate-950/85
            px-4
            py-3
            backdrop-blur-xl
          "
        >
          <p
            className="
              text-[9px]
              font-black
              uppercase
              tracking-[0.22em]
              text-cyan-300
            "
          >
            Rastreamento
          </p>

          <div
            className="
              mt-2
              flex
              items-center
              gap-2
            "
          >
            <div
              className="
                h-2
                w-2
                animate-pulse
                rounded-full
                bg-emerald-400
              "
            />

            <span
              className="
                text-[9px]
                font-black
                uppercase
                tracking-[0.25em]
                text-cyan-200
              "
            >
              GPS REALTIME
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================
          OVERLAY RIGHT
      =================================================== */}

      <div
        className="
          absolute
          right-5
          top-5
          z-20
        "
      >
        <div
          className="
            rounded-2xl
            border
            border-white/10
            bg-slate-950/85
            px-4
            py-3
            backdrop-blur-xl
          "
        >
          <p
            className="
              text-[9px]
              font-black
              uppercase
              tracking-[0.22em]
              text-cyan-300
            "
          >
            Status Operacional
          </p>

          <p
            className="
              mt-2
              text-xs
              font-bold
              text-white
            "
          >
            {operationalMessage}
          </p>

          {eta && (
            <p
              className="
                mt-1
                text-[10px]
                font-black
                uppercase
                tracking-[0.18em]
                text-green-400
              "
            >
              ETA {eta} min
            </p>
          )}
        </div>
      </div>

      {/* ===================================================
          MAP
      =================================================== */}

      <GoogleMap
        mapContainerStyle={
          containerStyle
        }
        center={center}
        zoom={12}
        onLoad={
          handleMapLoad
        }
        onUnmount={
          handleMapUnmount
        }
        options={mapOptions}
      >
        {/* ===============================================
            ROUTE
        =============================================== */}

        {routePath.length >=
          2 && (
          <Polyline
            path={routePath}
            options={
              polylineOptions
            }
          />
        )}

        {/* ===============================================
            ORIGIN
        =============================================== */}

        {origem && (
          <Marker
            position={origem}
          />
        )}

        {/* ===============================================
            DESTINATION
        =============================================== */}

        {destino && (
          <Marker
            position={destino}
          />
        )}

        {/* ===============================================
            DRIVER
        =============================================== */}

        {animatedPos &&
          driverIcon && (
            <Marker
              position={
                animatedPos
              }
              icon={
                driverIcon
              }
            />
          )}
      </GoogleMap>
    </div>
  );
}

export default memo(
  MapaCliente,
);
