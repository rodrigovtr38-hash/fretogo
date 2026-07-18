// =========================================================
// NOME DO ARQUIVO: src/components/MapaCliente.tsx
// CTO-Log: Renderização Geográfica.
// Status: Trava de segurança Linter resolvida. 
// Sincronização: Sistema de ícones dinâmicos injetado (Moto vs Caminhões) conforme regra de negócios.
// =========================================================

import { memo, useEffect, useMemo, useRef, useState } from 'react';
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
  motoristaId, 
  vehicleType = 'utilitario' 
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

  // 🔥 CTO FIX: Sistema de Ícones Vivos baseado na Categoria
  const getVehicleIcon = (category: string) => {
    if (!isLoaded || !window.google) return null;
    
    // Caminhos SVG escaláveis para o mapa
    const svgCar = "M17.402 2.048c-.286-.682-.94-1.144-1.681-1.187l-7.442-.437c-.74-.043-1.42.38-1.748 1.045L4.03 6H1.5A1.5 1.5 0 0 0 0 7.5v6A1.5 1.5 0 0 0 1.5 15h.71a2.992 2.992 0 0 0 5.58 0h8.42a2.992 2.992 0 0 0 5.58 0h.71A1.5 1.5 0 0 0 24 13.5v-3.8c0-.663-.44-1.24-1.085-1.436l-5.513-1.654z";
    const svgTruck = "M22 10h-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8H1v2h1c0 1.66 1.34 3 3 3s3-1.34 3-3h8c0 1.66 1.34 3 3 3s3-1.34 3-3h1v-4c0-2.21-1.79-4-4-4zm-17 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm14 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-4-9H4V6h11v4zm4-2h1c.55 0 1 .45 1 1v1h-3V7c1.1 0 2 .9 2 2z";
    const svgMoto = "M19 14.5c0 1.93-1.57 3.5-3.5 3.5s-3.5-1.57-3.5-3.5c0-.47.1-.91.27-1.32l-1.92-1.92c-.24.08-.5.14-.75.14-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5c.34 0 .67.07.96.2l3.41-3.4c-.16-.39-.27-.8-.27-1.24C13.7 1.28 15.28 0 17.5 0S21 1.57 21 3.5c0 .48-.1.93-.28 1.34l-3.39 3.4c.12.28.17.58.17.88 0 1.05-.65 1.95-1.58 2.33l1.83 1.83c.41-.17.85-.28 1.32-.28 1.93 0 3.5 1.57 3.5 3.5zm-3.5-1.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5 14.5c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5-3.5 1.57-3.5 3.5zm3.5-1.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z";

    let path = svgCar;
    let color = "#22d3ee"; // Ciano Padrão

    if (category.includes('toco') || category.includes('truck') || category.includes('carreta')) {
      path = svgTruck;
      color = "#f59e0b"; // Caminhões: Âmbar
    } else if (category.includes('moto')) {
      path = svgMoto;
      color = "#10b981"; // Moto: Esmeralda
    }

    return {
      path: path,
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: "#020617",
      scale: 1.2,
      anchor: new window.google.maps.Point(12, 12)
    };
  };

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
        
        {/* Ponto de Origem */}
        {origem && <Marker position={origem} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#10b981", fillOpacity: 1, strokeWeight: 3, strokeColor: "#ffffff" }} />}
        
        {/* Posição do Motorista (Ícone Dinâmico) */}
        {motoristaPos && motoristaId && (
          <Marker position={motoristaPos} icon={getVehicleIcon(vehicleType) as any} zIndex={999} />
        )}

        {/* Paradas Multi-drop ou Destino Final */}
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
