import { memo, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';

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
  realDriversCount?: number; // 🔥 INJETADO BLOCO 05 (Contador Real via RTDB)
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
  vehicleType = 'utilitario',
  realDriversCount = 0
}: MapaClienteProps) {
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const speed = useMemo(() => Math.floor(Math.random() * (60 - 30 + 1) + 30), [motoristaPos]);

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

  const getVehicleIcon = (category: string) => {
    if (!isLoaded || !window.google) return null;
    
    const svgCar = "M17.402 2.048c-.286-.682-.94-1.144-1.681-1.187l-7.442-.437c-.74-.043-1.42.38-1.748 1.045L4.03 6H1.5A1.5 1.5 0 0 0 0 7.5v6A1.5 1.5 0 0 0 1.5 15h.71a2.992 2.992 0 0 0 5.58 0h8.42a2.992 2.992 0 0 0 5.58 0h.71A1.5 1.5 0 0 0 24 13.5v-3.8c0-.663-.44-1.24-1.085-1.436l-5.513-1.654z";
    const svgFiorino = "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z";
    const svgTruck = "M22 10h-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8H1v2h1c0 1.66 1.34 3 3 3s3-1.34 3-3h8c0 1.66 1.34 3 3 3s3-1.34 3-3h1v-4c0-2.21-1.79-4-4-4zm-17 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm14 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-4-9H4V6h11v4zm4-2h1c.55 0 1 .45 1 1v1h-3V7c1.1 0 2 .9 2 2z";
    const svgMoto = "M19 14.5c0 1.93-1.57 3.5-3.5 3.5s-3.5-1.57-3.5-3.5c0-.47.1-.91.27-1.32l-1.92-1.92c-.24.08-.5.14-.75.14-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5c.34 0 .67.07.96.2l3.41-3.4c-.16-.39-.27-.8-.27-1.24C13.7 1.28 15.28 0 17.5 0S21 1.57 21 3.5c0 .48-.1.93-.28 1.34l-3.39 3.4c.12.28.17.58.17.88 0 1.05-.65 1.95-1.58 2.33l1.83 1.83c.41-.17.85-.28 1.32-.28 1.93 0 3.5 1.57 3.5 3.5zm-3.5-1.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5 14.5c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5-3.5 1.57-3.5 3.5zm3.5-1.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z";

    let path = svgCar;
    let color = "#22d3ee"; 
    let objScale = 1.2;

    const lowerCategory = category.toLowerCase();

    if (lowerCategory.includes('toco') || lowerCategory.includes('truck') || lowerCategory.includes('carreta') || lowerCategory.includes('trem') || lowerCategory.includes('cegonha')) {
      path = svgTruck;
      color = "#f59e0b"; 
      objScale = 1.4;
    } else if (lowerCategory.includes('moto')) {
      path = svgMoto;
      color = "#10b981"; 
      objScale = 1.2;
    } else if (lowerCategory.includes('utilitario') || lowerCategory.includes('van')) {
      path = svgFiorino;
      color = "#3b82f6"; 
      objScale = 1.3;
    }

    return {
      path: path,
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: "#020617",
      scale: objScale,
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
        
        {motoristaId ? (
          <div className="rounded-[1rem] border border-blue-500/20 bg-slate-950/90 px-4 py-3 backdrop-blur-md shadow-lg flex flex-col gap-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Telemetria Live</p>
            </div>
            <p className="text-[10px] font-bold text-white uppercase mt-1">Velocidade: <span className="text-cyan-400">{speed} km/h</span></p>
          </div>
        ) : (
          <div className="rounded-[1rem] border border-cyan-500/20 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md shadow-lg flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Sinal Estável</p>
              <p className="text-[10px] font-bold text-white uppercase tracking-wider mt-0.5">{operationalMessage}</p>
            </div>
          </div>
        )}

        {/* 🔥 BLOCO 05: UI do Contador Real */}
        {!motoristaId && origem && (
          <div className={`rounded-[1rem] border px-4 py-2 backdrop-blur-md shadow-lg flex items-center gap-2 animate-in slide-in-from-right-8 duration-700 delay-500 ${realDriversCount > 0 ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
            {realDriversCount > 0 ? (
              <>
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                  {realDriversCount} {realDriversCount === 1 ? 'parceiro no setor' : 'parceiros no setor'}
                </span>
              </>
            ) : (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-500/40 border-t-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Buscando parceiros...</span>
              </>
            )}
          </div>
        )}
      </div>

      <GoogleMap mapContainerStyle={containerStyle} center={origem || defaultCenter} zoom={13} onLoad={(map) => { mapRef.current = map; }} options={mapOptions}>
        {routePath.length >= 2 && <Polyline path={routePath} options={polylineOptions} />}
        
        {origem && <Marker position={origem} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#10b981", fillOpacity: 1, strokeWeight: 3, strokeColor: "#ffffff" }} />}
        
        {motoristaPos && motoristaId && (
          <Marker position={motoristaPos} icon={getVehicleIcon(vehicleType) as any} zIndex={999} />
        )}

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
