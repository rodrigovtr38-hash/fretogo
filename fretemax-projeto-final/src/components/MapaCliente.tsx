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

import {
  collection,
  onSnapshot,
  doc,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  AppTripState,
} from '../state/tripStateMachine';

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
   MAP STYLE
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

  tripStatus?: string;
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

  const [
    tripStatus,
    setTripStatus,
  ] = useState<string>(
    '',
  );

  const [
    operationalMessage,
    setOperationalMessage,
  ] = useState(
    'Buscando parceiros próximos...',
  );

  const [
    eta,
    setEta,
  ] = useState<
    number | null
  >(null);

  const mapRef =
    useRef<google.maps.Map | null>(
      null,
    );

  const prevPosRef = useRef<{
    lat: number;
    lng: number;
  } | null>(null);

  /* =========================================================
     GOOGLE MAPS
  ========================================================= */

  const {
    isLoaded,
    loadError,
  } = useJsApiLoader({
    googleMapsApiKey:
      import.meta.env
        .VITE_GOOGLE_MAPS_KEY || '',

    id: 'fretogo-map',
  });

  /* =========================================================
     REALTIME
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

        snap => {

          if (
            !snap.exists()
          ) {
            return;
          }

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

              tripStatus:
                data.tripStatus,
            });

            if (
              data?.tripStatus
            ) {
              setTripStatus(
                data.tripStatus,
              );
            }
          }
        },
      );

    } else {

      unsub = onSnapshot(
        collection(
          db,
          'motoristas_online',
        ),

        snap => {

          const lista =
            snap.docs
              .map(doc =>
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
      if (unsub)
        unsub();
    };

  }, [motoristaId]);

  /* =========================================================
     OPERATIONAL STATUS
  ========================================================= */

  useEffect(() => {

    switch (
      tripStatus
    ) {

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

  /* =========================================================
     SMOOTH TRACKING
  ========================================================= */

  useEffect(() => {

    if (
      !motoristaAtivo
    ) {
      return;
    }

    const newPos = {
      lat:
        motoristaAtivo.lat,

      lng:
        motoristaAtivo.lng,
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

    if (
      animatedPos
    ) {

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

    if (
      !hasPoints
    ) {
      return;
    }

    mapRef.current.fitBounds(
      bounds,
      {
        top: 80,
        bottom: 80,
        left: 80,
        right: 80,
      },
    );

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

      if (
        animatedPos
      ) {
        return animatedPos;
      }

      if (origem) {
        return origem;
      }

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
      <div className="flex h-64 items-center justify-center rounded-[2rem] border border-red-500/20 bg-slate-950">

        <p className="text-sm font-bold text-red-400">
          Radar indisponível
        </p>

      </div>
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */

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

  /* =========================================================
     UI
  ========================================================= */

  return (

    <div className="relative h-64 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_18px_60px_rgba(0,0,0,0.42)]">

      {/* overlay */}

      <div className="pointer-events-none absolute inset-0 z-10 bg-cyan-500/5 mix-blend-overlay" />

      {/* realtime */}

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

      {/* operational */}

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

      {/* MAP */}

      <GoogleMap
        mapContainerStyle={
          containerStyle
        }
        center={center}
        zoom={12}
        onLoad={(
          map,
        ) => {
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
        }}
      >

        {/* route */}

        {origem &&
          destino && (
            <Polyline
              path={[
                origem,

                animatedPos ||
                  origem,

                destino,
              ]}
              options={{
                strokeColor:
                  '#22d3ee',

                strokeOpacity:
                  0.9,

                strokeWeight: 3,

                geodesic: true,
              }}
            />
          )}

        {/* origem */}

        {origem && (
          <Marker
            position={origem}
          />
        )}

        {/* destino */}

        {destino && (
          <Marker
            position={destino}
          />
        )}

        {/* motorista */}

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
                  lat:
                    motorista.lat,

                  lng:
                    motorista.lng,
                }}
              />

            ),
          )

        )}

      </GoogleMap>

    </div>
  );
}
