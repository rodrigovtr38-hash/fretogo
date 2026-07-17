// =========================================================
// NOME DO ARQUIVO: src/components/MapaCliente.tsx
// CTO-Log: Renderização Geográfica.
// Status: Trava de segurança para impedir erro 'window.google is undefined' em conexões lentas (3G/Edge).
// =========================================================

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { Flame } from 'lucide-react';

type Coordinates = { lat: number; lng: number; };

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

const containerStyle = { width: '100%', height: '100%', minHeight: '420px', borderRadius: '1.5rem' };
const defaultCenter = { lat: -23.55052, lng: -46.633308 }; // Padrão: São Paulo
const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

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
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [simulatedDrivers, setSimulatedDrivers] = useState<number>(0);

  useEffect(() => {
    const baseDrivers = ['toco', 'truck', 'carreta'].some(t => vehicleType.includes(t)) ? 3 : 12;
    setSimulatedDrivers(Math.floor(Math.random() * 5) + baseDrivers);
  }, [vehicleType]);

  const routePath = useMemo(() => {
    const path: Coordinates[] = [];
    if (motoristaPos && motoristaId) path.push(motoristaPos);
    if (origem) path.push(origem);
    if (paradasExtras && paradasExtras.length > 0) {
      paradasExtras.forEach(p => { if(p.lat && p.lng) path.push(p); });
    }
    if (destino) path.push(destino);
    return path;
  }, [origem, motoristaPos, destino, paradasExtras, motoristaId]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || routePath.length === 0 || !window.google || !window.google.maps) return;
    
    const bounds = new window.google.maps.LatLngBounds();
    routePath.forEach(pos => bounds.extend(pos));
    
    setTimeout(() => {
      mapRef.current?.fitBounds(bounds, { top: 60, bottom: 60, left: 40, right: 40 });
    }, 200);

  }, [isLoaded, routePath]);

  const polylineOptions = useMemo(() => ({ strokeColor: '#22d3ee', strokeOpacity: 0.8, strokeWeight: 5, geodesic: true }), []);
  const mapOptions = useMemo(() => ({ disableDefaultUI: true, clickableIcons: false, gestureHandling: 'greedy' as const, styles: mapStyles }), []);

  if (!isLoaded) {
    return (
      <div className="relative flex h-full min-h-[420px] w-full items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/5 bg-slate-900 shadow-inner">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-500 animate-pulse">Estabelecendo Conexão GPS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] w-full h-full min-h-[420px] border border-white/10 bg-slate-900 shadow-xl">
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-3 items-end pointer-events-none">
        <div className="rounded-[1rem] border border-cyan-500/20 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md shadow-lg flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Sinal Estável</p>
            <p className="text-[10px] font-bold text-white uppercase tracking-wider mt-0.5">{motoristaId ? 'Rastreio Ativo' : operationalMessage}</p>
          </div>
        </div>

        {!motoristaId && origem && (
          <div className="rounded-[1rem] border border-amber-500/30 bg-amber-500/10 px-4 py-2 backdrop-blur-md shadow-lg flex items-center gap-2 animate-in slide-in-from-right-8 duration-700 delay-500">
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">{simulatedDrivers} parceiros no setor</span>
          </div>
        )}
      </div>

      <GoogleMap mapContainerStyle={containerStyle} center={origem || defaultCenter} zoom={13} onLoad={(map) => { mapRef.current = map; }} options={mapOptions}>
        {routePath.length >= 2 && <Polyline path={routePath} options={polylineOptions} />}
        {origem && <Marker position={origem} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#10b981", fillOpacity: 1, strokeWeight: 3, strokeColor: "#ffffff" }} />}
        
        {paradasExtras && paradasExtras.length > 0 ? (
           paradasExtras.map((parada, idx) => (
             <Marker key={idx} position={parada} label={{ text: `${idx + 1}`, color: '#ffffff', fontSize: '10px', fontWeight: 'bold' }} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#22d3ee", fillOpacity: 1, strokeWeight: 2, strokeColor: "#020617" }} />
           ))
        ) : (
          destino && <Marker position={destino} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#22d3ee", fillOpacity: 1, strokeWeight: 3, strokeColor: "#020617" }} />
        )}
      </GoogleMap>
    </div>
  );
}

export default memo(MapaCliente);
