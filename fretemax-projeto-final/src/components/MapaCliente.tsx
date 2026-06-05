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
  useJsApiLoader,
} from '@react-google-maps/api';

import { Radar, Flame } from 'lucide-react';

/* =========================================================
   TYPES E CONSTANTES
========================================================= */

type Coordinates = {
  lat: number;
  lng: number;
};

interface MapaClienteProps {
  origem?: Coordinates | null;
  destino?: Coordinates | null;
  paradasExtras?: Coordinates[] | null; 
  motoristaPos?: Coordinates | null;
  operationalMessage?: string;
  eta?: number | null;
  motoristaId?: string | null;
  vehicleType?: string;
}

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '420px',
  borderRadius: '1.5rem',
};

const defaultCenter = {
  lat: -23.55052,
  lng: -46.633308, // SP 
};

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

/* =========================================================
   COMPONENT
========================================================= */

function MapaCliente({
  origem,
  destino,
  paradasExtras = [],
  motoristaPos,
  operationalMessage = 'Roteirizando caminhos otimizados...',
  eta,
  motoristaId,
  vehicleType = 'motoristas'
}: MapaClienteProps) {
  
  // 🔥 FASE 4: CARREGAMENTO OFICIAL DO GOOGLE MAPS NA VERCEL
  // Certifique-se de que no seu painel da Vercel existe a variável VITE_GOOGLE_MAPS_API_KEY
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [simulatedDrivers, setSimulatedDrivers] = useState<number>(0);

  useEffect(() => {
    // Simulador Vendas
    const baseDrivers = ['toco', 'truck', 'carreta'].some(t => vehicleType.includes(t)) ? 3 : 12;
    setSimulatedDrivers(Math.floor(Math.random() * 5) + baseDrivers);
  }, [vehicleType]);

  const routePath = useMemo(() => {
    const path: Coordinates[] = [];
    if (motoristaPos && motoristaId) path.push(motoristaPos);
    if (origem) path.push(origem);
    if (paradasExtras && paradasExtras.length > 0) {
      paradasExtras.forEach(p => {
          if(p.lat && p.lng) path.push(p);
      });
    }
    if (destino) path.push(destino);
    return path;
  }, [origem, motoristaPos, destino, paradasExtras, motoristaId]);

  // Efeito para forçar o Zoom nos pontos ativos quando a rota mudar
  useEffect(() => {
    if (!isLoaded || !mapRef.current || routePath.length === 0) return;
    
    const bounds = new window.google.maps.LatLngBounds();
    routePath.forEach(pos => bounds.extend(pos));
    
    // Pequeno atraso para a animação do mapa ficar suave
    setTimeout(() => {
      mapRef.current?.fitBounds(bounds, { top: 60, bottom: 60, left: 40, right: 40 });
    }, 200);

  }, [isLoaded, routePath]);

  const polylineOptions = useMemo(() => ({
    strokeColor: '#3b82f6', 
    strokeOpacity: 0.8,
    strokeWeight: 4,
    geodesic: true,
  }), []);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    clickableIcons: false,
    gestureHandling: 'greedy' as const,
    styles: mapStyles,
  }), []);

  // Tela de Bloqueio enquanto o satélite liga
  if (!isLoaded) {
    return (
      <div className="relative flex h-full min-h-[420px] w-full items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 shadow-inner">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-600" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            Conectando Satélites...
          </p>
        </div>
      </div>
    );
  }

  // Mapa Vivo!
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] w-full h-full min-h-[420px] border border-slate-200 bg-slate-900 shadow-xl">
      
      {/* MARKETING OVERLAY */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-3 items-end pointer-events-none">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-3 backdrop-blur-md shadow-lg flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">GPS Live</p>
            <p className="text-xs font-bold text-white mt-0.5">{motoristaId ? 'Rastreio em Tempo Real' : operationalMessage}</p>
          </div>
        </div>

        {!motoristaId && origem && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 backdrop-blur-md shadow-lg flex items-center gap-2 animate-in slide-in-from-right-8 duration-700 delay-500">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
              {simulatedDrivers} veículos na região
            </span>
          </div>
        )}
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={origem || defaultCenter}
        zoom={13}
        onLoad={(map) => { mapRef.current = map; }}
        options={mapOptions}
      >
        {routePath.length >= 2 && (
          <Polyline path={routePath} options={polylineOptions} />
        )}

        {/* PONTO VERDE - COLETA */}
        {origem && (
          <Marker 
            position={origem} 
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#10b981", 
              fillOpacity: 1,
              strokeWeight: 3,
              strokeColor: "#ffffff",
            }}
          />
        )}

        {/* PONTOS AZUIS - ENTREGAS MULTI-DROP */}
        {paradasExtras && paradasExtras.length > 0 ? (
           paradasExtras.map((parada, idx) => (
             <Marker 
               key={idx}
               position={parada}
               label={{ text: `${idx + 1}`, color: '#ffffff', fontSize: '10px', fontWeight: 'bold' }}
               icon={{
                 path: window.google.maps.SymbolPath.CIRCLE,
                 scale: 10,
                 fillColor: "#3b82f6", 
                 fillOpacity: 1,
                 strokeWeight: 2,
                 strokeColor: "#ffffff",
               }}
             />
           ))
        ) : (
          destino && (
            <Marker 
              position={destino} 
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#3b82f6", 
                fillOpacity: 1,
                strokeWeight: 3,
                strokeColor: "#ffffff",
              }}
            />
          )
        )}
      </GoogleMap>
    </div>
  );
}

export default memo(MapaCliente);
