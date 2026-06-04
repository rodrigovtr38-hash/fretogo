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

import { Radar, Users, Flame } from 'lucide-react';

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
  // 🔥 NOVO: Suporte para múltiplas paradas no mapa
  paradasExtras?: Coordinates[] | null; 
  motoristaPos?: Coordinates | null;
  operationalMessage?: string;
  eta?: number | null;
  motoristaId?: string | null;
  vehicleType?: string; // Para gatilhos dinâmicos
}

/* =========================================================
   CONSTANTS (Estilo Híbrido Corporativo)
========================================================= */

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '420px',
  borderRadius: '1.5rem',
};

const defaultCenter = {
  lat: -23.55052,
  lng: -46.633308, // Centro SP como fallback
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
   HELPERS DE ANIMAÇÃO
========================================================= */

function interpolatePosition(from: Coordinates, to: Coordinates, factor: number): Coordinates {
  return {
    lat: from.lat + (to.lat - from.lat) * factor,
    lng: from.lng + (to.lng - from.lng) * factor,
  };
}

function calculateHeading(from: Coordinates, to: Coordinates): number {
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

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
  
  /* =======================================================
     REFS & STATE
  ======================================================= */
  const mountedRef = useRef(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapIdleRef = useRef(false);
  const fitBoundsTimeoutRef = useRef<number>();
  const animationFrameRef = useRef<number>();

  const [mapReady, setMapReady] = useState(false);
  const [mapStable, setMapStable] = useState(false);
  const [animatedPos, setAnimatedPos] = useState<Coordinates | null>(null);
  const [heading, setHeading] = useState(0);
  
  // Gatilho de Vendas
  const [simulatedDrivers, setSimulatedDrivers] = useState<number>(0);

  const googleReady = typeof window !== 'undefined' && !!window.google && !!window.google.maps;

  /* =======================================================
     LIFECYCLE & GATILHO DE DEMANDA
  ======================================================= */
  useEffect(() => {
    mountedRef.current = true;
    
    // 🔥 Simulador de Demanda Local (Gatilho Psicológico)
    const baseDrivers = ['toco', 'truck', 'carreta'].some(t => vehicleType.includes(t)) ? 3 : 12;
    setSimulatedDrivers(Math.floor(Math.random() * 5) + baseDrivers);

    return () => {
      mountedRef.current = false;
      mapIdleRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (fitBoundsTimeoutRef.current) window.clearTimeout(fitBoundsTimeoutRef.current);
    };
  }, [vehicleType]);

  /* =======================================================
     ROUTE PATH (COMPLETO COM MULTI-DROP)
  ======================================================= */
  const routePath = useMemo(() => {
    const path: Coordinates[] = [];
    if (motoristaPos && motoristaId) path.push(motoristaPos);
    if (origem) path.push(origem);
    
    // Adiciona paradas extras na linha do GPS
    if (paradasExtras && paradasExtras.length > 0) {
      paradasExtras.forEach(p => {
          if(p.lat && p.lng) path.push(p);
      });
    } else if (destino) {
      path.push(destino);
    }
    
    return path;
  }, [origem, motoristaPos, destino, paradasExtras, motoristaId]);

  /* =======================================================
     MAP INITIALIZATION
  ======================================================= */
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    if (!mountedRef.current) return;
    mapRef.current = map;
    setMapReady(true);
    window.setTimeout(() => {
      if (!mountedRef.current) return;
      mapIdleRef.current = true;
      setMapStable(true);
    }, 300);
  }, []);

  const handleMapUnmount = useCallback(() => {
    mapIdleRef.current = false;
    setMapReady(false);
    setMapStable(false);
    mapRef.current = null;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  /* =======================================================
     AUTO-ZOOM (FIT BOUNDS)
  ======================================================= */
  useEffect(() => {
    if (!googleReady || !mapReady || !mapStable || !mapRef.current) return;
    if (routePath.length === 0) return;

    if (fitBoundsTimeoutRef.current) clearTimeout(fitBoundsTimeoutRef.current);

    fitBoundsTimeoutRef.current = window.setTimeout(() => {
      try {
        if (!mapRef.current || !mapIdleRef.current) return;
        const bounds = new window.google.maps.LatLngBounds();
        
        // Se tem só origem, dá zoom nela
        if(routePath.length === 1) {
            mapRef.current.setCenter(routePath[0]);
            mapRef.current.setZoom(15);
            return;
        }

        routePath.forEach(pos => bounds.extend(pos));
        mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 40, right: 40 });
      } catch (error) {
        console.error('FitBounds erro:', error);
      }
    }, 450);
  }, [googleReady, mapReady, mapStable, routePath]);

  /* =======================================================
     ESTILOS DO GOOGLE MAPS
  ======================================================= */
  const polylineOptions = useMemo(() => ({
    strokeColor: '#3b82f6', // blue-500 corporativo
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

  /* =======================================================
     LOADING STATE
  ======================================================= */
  if (!googleReady) {
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

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] w-full h-full min-h-[420px] border border-slate-200 bg-slate-900 shadow-xl">
      
      {/* ===================================================
          OVERLAY DE MARKETING E STATUS (TOPO DIREITA)
      =================================================== */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-3 items-end pointer-events-none">
        
        {/* Status Operacional */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-3 backdrop-blur-md shadow-lg flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">GPS Live</p>
            <p className="text-xs font-bold text-white mt-0.5">{motoristaId ? 'Rastreio em Tempo Real' : operationalMessage}</p>
          </div>
        </div>

        {/* Gatilho de Vendas (Simulador de Demanda) - Só aparece na cotação */}
        {!motoristaId && origem && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 backdrop-blur-md shadow-lg flex items-center gap-2 animate-in slide-in-from-right-8 duration-700 delay-500">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
              {simulatedDrivers} veículos na região
            </span>
          </div>
        )}
      </div>

      {/* ===================================================
          OVERLAY DE ETA E DISTÂNCIA (BASE ESQUERDA)
      =================================================== */}
      {(eta || routePath.length > 1) && (
        <div className="absolute left-4 bottom-4 z-20 pointer-events-none">
          <div className="rounded-2xl border border-blue-500/30 bg-blue-900/80 px-5 py-3 backdrop-blur-md shadow-[0_10px_30px_rgba(37,99,235,0.2)]">
            <div className="flex items-center gap-3">
              <Radar className="w-5 h-5 text-blue-400 animate-[spin_3s_linear_infinite]" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-300">Roteamento Inteligente</p>
                <p className="text-sm font-black text-white mt-0.5">
                  {eta ? `Chegada em ${eta} min` : 'Rota Otimizada Ativa'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MAPA DO GOOGLE
      =================================================== */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={origem || defaultCenter}
        zoom={13}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        options={mapOptions}
      >
        {/* LINHA DO GPS */}
        {routePath.length >= 2 && (
          <Polyline path={routePath} options={polylineOptions} />
        )}

        {/* MARCADOR DE ORIGEM (Verde) */}
        {origem && (
          <Marker 
            position={origem} 
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#10b981", // Emerald 500
              fillOpacity: 1,
              strokeWeight: 3,
              strokeColor: "#ffffff",
            }}
          />
        )}

        {/* MARCADOR DE DESTINOS / MULTI-DROP (Azul) */}
        {paradasExtras && paradasExtras.length > 0 ? (
           paradasExtras.map((parada, idx) => (
             <Marker 
               key={idx}
               position={parada}
               label={{ text: `${idx + 1}`, color: '#ffffff', fontSize: '10px', fontWeight: 'bold' }}
               icon={{
                 path: window.google.maps.SymbolPath.CIRCLE,
                 scale: 10,
                 fillColor: "#3b82f6", // Blue 500
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
                fillColor: "#3b82f6", // Blue 500
                fillOpacity: 1,
                strokeWeight: 3,
                strokeColor: "#ffffff",
              }}
            />
          )
        )}

        {/* MARCADOR DO MOTORISTA (Ícone de Carro animado) */}
        {motoristaPos && motoristaId && (
          <Marker
            position={motoristaPos}
            icon={{
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#f59e0b', // Amber 500
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

export default memo(MapaCliente);
