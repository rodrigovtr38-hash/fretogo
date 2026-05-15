import React, { useEffect, useMemo, useState, useRef } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { db } from '../firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';

// ============================================================================
// 🎨 ESTILOS E CONFIGURAÇÕES DO MAPA (PREMIUM DARK LOGISTICS)
// ============================================================================

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1.5rem'
};

const centerDefault = {
  lat: -23.5505,
  lng: -46.6333
};

// Estilo customizado para remover poluição visual (Modo Foco Operacional)
const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

// ============================================================================
// 🧮 FUNÇÕES MATEMÁTICAS CORE (HEADING E INTERPOLAÇÃO)
// ============================================================================

// Calcula a direção (rotação 0-360) do marcador baseado na posição antiga e nova
const calculateHeading = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  
  const heading = toDeg(Math.atan2(y, x));
  return (heading + 360) % 360;
};

// ============================================================================
// 🚀 COMPONENTE PRINCIPAL
// ============================================================================

export default function MapaCliente({ 
  motoristaId, 
  origem, 
  destino 
}: { 
  motoristaId?: string | null;
  origem?: { lat: number; lng: number } | null;
  destino?: { lat: number; lng: number } | null;
}) {

  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [motoristaAtivo, setMotoristaAtivo] = useState<any>(null);
  
  // Ref para o GoogleMap instance para poder chamar o fitBounds
  const mapRef = useRef<google.maps.Map | null>(null);

  // Estados Animados para Movimento Suave (60fps)
  const [animatedPos, setAnimatedPos] = useState<{lat: number, lng: number} | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const prevPosRef = useRef<{lat: number, lng: number} | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
  });

  // 📡 BLINDAGEM REALTIME (Escuta do Banco de Dados)
  useEffect(() => {
    let unsub: () => void;

    if (motoristaId) {
      unsub = onSnapshot(doc(db, 'motoristas_online', motoristaId), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data?.lat === 'number' && typeof data?.lng === 'number') {
            setMotoristaAtivo(data);
          }
        }
      });
    } else {
      unsub = onSnapshot(collection(db, 'motoristas_online'), (snap) => {
        const lista = snap.docs
          .map((doc) => doc.data())
          .filter((m: any) => m?.status === 'disponivel' && typeof m?.lat === 'number' && typeof m?.lng === 'number');
        setMotoristas(lista);
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [motoristaId]);

  // 🎬 MOTOR DE ANIMAÇÃO E ROTAÇÃO (SMOOTH TRACKING)
  useEffect(() => {
    if (!motoristaAtivo) return;

    const newPos = { lat: motoristaAtivo.lat, lng: motoristaAtivo.lng };

    if (!prevPosRef.current) {
      // Primeira carga, teletransporta e define o heading 0
      setAnimatedPos(newPos);
      prevPosRef.current = newPos;
    } else {
      // Já tem posição anterior. Calcula rotação e interpola
      const oldPos = prevPosRef.current;
      
      // Se não andou o suficiente, não anima para economizar CPU
      const latDiff = Math.abs(newPos.lat - oldPos.lat);
      const lngDiff = Math.abs(newPos.lng - oldPos.lng);
      
      if (latDiff > 0.00001 || lngDiff > 0.00001) {
        const newHeading = calculateHeading(oldPos.lat, oldPos.lng, newPos.lat, newPos.lng);
        setHeading(newHeading);
        
        // CSS Transition handles the actual visual smoothing when state updates
        setAnimatedPos(newPos);
        prevPosRef.current = newPos;
      }
    }
  }, [motoristaAtivo]);

  // 🎯 AUTO FIT BOUNDS (Enquadramento Inteligente)
  useEffect(() => {
    if (!mapRef.current || !window.google || !isLoaded) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    if (animatedPos) {
      bounds.extend(animatedPos);
      hasPoints = true;
    }
    
    if (origem) {
      bounds.extend(origem);
      hasPoints = true;
    }
    
    if (destino) {
      bounds.extend(destino);
      hasPoints = true;
    }

    if (hasPoints) {
      // Se só tem 1 ponto (o motorista), centraliza com zoom 15
      if ((!origem && !destino) || (!animatedPos && (!origem || !destino))) {
         mapRef.current.setCenter(animatedPos || origem || centerDefault);
         mapRef.current.setZoom(15);
      } else {
         // Se tem rota, ajusta o quadro para caber tudo com padding
         mapRef.current.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
      }
    }
  }, [animatedPos, origem, destino, isLoaded]);

  const center = useMemo(() => {
    if (animatedPos) return animatedPos;
    if (origem) return origem;
    return centerDefault;
  }, [animatedPos, origem]);


  // ============================================================================
  // 🎨 ESTADOS DE LOADING (SKELETONS PREMIUM)
  // ============================================================================

  if (loadError) {
    return (
      <div className="h-48 md:h-64 w-full mb-6 rounded-3xl overflow-hidden border-4 border-slate-900 bg-slate-950 flex items-center justify-center shadow-inner">
        <div className="text-center px-6">
          <p className="text-red-400 font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span> Radar Indisponível
          </p>
          <p className="text-slate-500 text-xs mt-2 font-medium">Falha de comunicação com satélites. Verifique a conexão.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-48 md:h-64 w-full mb-6 rounded-3xl overflow-hidden border border-white/5 bg-slate-900 relative shadow-2xl">
        <div className="absolute inset-0 bg-cyan-500/5 animate-pulse"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-ping"></div>
            <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin relative z-10 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
          </div>
          <p className="mt-6 text-cyan-400 font-black uppercase text-[10px] tracking-[0.2em] shadow-sm">
            Estabelecendo Conexão Radar...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🗺️ RENDERIZAÇÃO DO MAPA VIVO
  // ============================================================================

  return (
    <div className="h-48 md:h-64 w-full mb-6 rounded-[2rem] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.3)] border border-slate-800 relative group">
      
      {/* Glow Layer Overlay */}
      <div className="absolute inset-0 bg-blue-500/10 pointer-events-none z-10 mix-blend-overlay"></div>
      
      {/* Status Badge Overlays (UX Operacional) */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        <span className="bg-slate-950/80 backdrop-blur-md text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
          GPS Live
        </span>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={(map) => { mapRef.current = map; }}
        onUnmount={() => { mapRef.current = null; }}
        options={{
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: mapStyles
        }}
      >
        
        {/* ROTA VIRTUAL (POLYLINE) - Só aparece se houver origem E destino */}
        {origem && destino && (
           <Polyline
             path={[
               origem,
               animatedPos ? animatedPos : origem, // Conecta Origem -> Caminhão atual
               destino
             ]}
             options={{
               strokeColor: '#06b6d4', // Cyan 500
               strokeOpacity: 0,
               strokeWeight: 3,
               icons: [{
                 icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                 offset: '0',
                 repeat: '20px'
               }]
             }}
           />
        )}

        {/* MARCADOR DE ORIGEM (Coleta) */}
        {origem && (
          <Marker
            position={origem}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#3b82f6', // Blue 500
              fillOpacity: 1,
              strokeWeight: 3,
              strokeColor: '#ffffff'
            }}
          />
        )}

        {/* MARCADOR DE DESTINO (Entrega) */}
        {destino && (
          <Marker
            position={destino}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#22c55e', // Green 500
              fillOpacity: 1,
              strokeWeight: 3,
              strokeColor: '#ffffff'
            }}
          />
        )}

        {/* MARCADOR DO MOTORISTA (Ativo ou Lista de Disponíveis) */}
        {animatedPos ? (
          <Marker
            position={animatedPos}
            icon={{
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 7,
              fillColor: '#06b6d4', // Cyan 500 (Premium)
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff',
              rotation: heading // 🔄 ROTAÇÃO DINÂMICA ATIVADA
            }}
            options={{
              optimized: false // Desliga otimização estática para permitir animação CSS suave nativa do Maps
            }}
          />
        ) : (
          motoristas.map((m, i) => (
            <Marker
              key={`${m.lat}-${m.lng}-${i}`}
              position={{ lat: m.lat, lng: m.lng }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 5,
                fillColor: '#64748b', // Slate 500 para radar passivo
                fillOpacity: 0.8,
                strokeWeight: 1,
                strokeColor: '#ffffff'
              }}
            />
          ))
        )}
      </GoogleMap>
    </div>
  );
}
