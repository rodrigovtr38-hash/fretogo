import {
  GoogleMap,
  Marker,
  useJsApiLoader
} from '@react-google-maps/api';

import {
  useEffect,
  useMemo,
  useState
} from 'react';

import { db } from '../firebase';

import {
  collection,
  onSnapshot,
  doc
} from 'firebase/firestore';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1.5rem'
};

const centerDefault = {
  lat: -23.5505,
  lng: -46.6333
};

export default function MapaCliente({
  motoristaId
}: {
  motoristaId?: string | null
}) {

  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [motoristaAtivo, setMotoristaAtivo] = useState<any>(null);

  const {
    isLoaded,
    loadError
  } = useJsApiLoader({
    googleMapsApiKey:
      import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
  });

  useEffect(() => {

    if (motoristaId) {

      const unsub = onSnapshot(
        doc(db, 'motoristas_online', motoristaId),
        (snap) => {

          if (snap.exists()) {

            const data = snap.data();

            if (
              typeof data?.lat === 'number' &&
              typeof data?.lng === 'number'
            ) {
              setMotoristaAtivo(data);
            }
          }
        }
      );

      return () => unsub();

    } else {

      const unsub = onSnapshot(
        collection(db, 'motoristas_online'),
        (snap) => {

          const lista = snap.docs
            .map((doc) => doc.data())
            .filter(
              (m: any) =>
                m?.status === 'disponivel' &&
                typeof m?.lat === 'number' &&
                typeof m?.lng === 'number'
            );

          setMotoristas(lista);
        }
      );

      return () => unsub();
    }

  }, [motoristaId]);

  const center = useMemo(() => {

    if (
      motoristaAtivo?.lat &&
      motoristaAtivo?.lng
    ) {

      return {
        lat: motoristaAtivo.lat,
        lng: motoristaAtivo.lng
      };
    }

    return centerDefault;

  }, [motoristaAtivo]);

  if (loadError) {

    return (
      <div className="h-48 w-full mb-6 rounded-3xl overflow-hidden border-4 border-slate-100 bg-slate-950 flex items-center justify-center">

        <div className="text-center px-6">

          <p className="text-white font-black uppercase text-sm">
            Radar temporariamente indisponível
          </p>

          <p className="text-slate-400 text-xs mt-2">
            Verificando conexão com o mapa...
          </p>

        </div>

      </div>
    );
  }

  if (!isLoaded) {

    return (
      <div className="h-48 w-full mb-6 rounded-3xl overflow-hidden border-4 border-slate-100 bg-slate-200 relative">

        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200"></div>

        <div className="absolute inset-0 flex items-center justify-center">

          <div className="text-center">

            <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto"></div>

            <p className="mt-4 text-slate-600 font-black uppercase text-xs tracking-widest">
              Ativando Radar...
            </p>

          </div>

        </div>

      </div>
    );
  }

  return (

    <div className="h-48 w-full mb-6 rounded-3xl overflow-hidden shadow-inner border-4 border-slate-100 relative">

      {/* Glow */}
      <div className="absolute inset-0 bg-blue-500/5 pointer-events-none z-10"></div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={motoristaAtivo ? 15 : 11}
        options={{
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi',
              stylers: [{ visibility: 'off' }]
            }
          ]
        }}
      >

        {motoristaAtivo ? (

          <Marker
            position={{
              lat: motoristaAtivo.lat,
              lng: motoristaAtivo.lng
            }}
            icon={{
              path:
                window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff',
              rotation: 0
            }}
          />

        ) : (

          motoristas.map((m, i) => (

            <Marker
              key={`${m.lat}-${m.lng}-${i}`}
              position={{
                lat: m.lat,
                lng: m.lng
              }}
              icon={{
                path:
                  window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#22c55e',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#ffffff'
              }}
            />

          ))

        )}

      </GoogleMap>

    </div>
  );
}
