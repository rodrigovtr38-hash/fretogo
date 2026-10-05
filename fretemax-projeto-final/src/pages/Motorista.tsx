// =========================================================
// NOME DO ARQUIVO: src/pages/Motorista.tsx
// CTO-Log: Auditoria Concluída - FASE 3 (Integração).
// Status: Nova Arquitetura Uber/99 (Mapa em Background + Bottom Sheets).
// Adicionado: Isolamento do Mapa na Raiz e Distribuição de Props em Tempo Real.
// Fix QA: Isolamento Bidirecional Estrito de Ambientes (QA vs PROD) no Feed.
// Fix Lote 1: Expansão tolerante de Categoria e Clock Skew Protection.
// =========================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore'; 
import { motion, AnimatePresence } from 'framer-motion';
import DriverApp from '../components/DriverApp';
import ChatFrete from '../components/ChatFrete';
import DriverHeader from '../components/motorista/DriverHeader';
import DriverAuth from '../components/motorista/DriverAuth';
import DriverCadastro from '../components/motorista/DriverCadastro';
import DriverRadar from '../components/motorista/DriverRadar';
import DriverActiveTrip from './DriverActiveTrip';
import MapaCliente from '../components/MapaCliente';
import { dispatchRealtimeService } from '../services/dispatchRealtimeService';
import { locationRealtimeService } from '../services/locationRealtimeService';
import type { OperationalFreight } from '../components/driver/dashboard/DriverDashboardLayout';
import { Download, Search, MapPin, Flame, Clock, ThumbsUp, Star, Share2, Truck, Power, WifiOff, Activity, CalendarDays, Ruler, Loader2 } from 'lucide-react'; 
import { NotificationService } from '../services/notificationService';
import { useDriverRealtime } from '../hooks/useDriverRealtime';

interface DriverData { 
  id?: string; 
  nome?: string; 
  whatsapp?: string; 
  categoria?: string; 
  status?: 'pendente' | 'aprovado' | 'rejeitado';
  modoRetorno?: boolean;
  destinoRetorno?: string;
  retornosUsadosHoje?: number; 
  veiculo?: string;
  placa?: string;
  fotoSelfie?: string;
  avaliacao?: number;
  online?: boolean;
  disponivel?: boolean;
  state?: string;
  isQA?: boolean; // Adicionado para ancorar a regra de negócio
}

const ACTIVE_STATUSES = ['aceito', 'indo_coleta', 'chegou_coleta', 'coletando', 'em_transporte', 'parado_operacional', 'chegou_entrega', 'entregando', 'finalizando', 'validando_comprovante'];
const BLOCKED_DISPATCH_STATUSES = new Set(['retido_pagamento', 'retido_agendamento', 'encerrado', 'encerrado_reembolso', 'encerrado_divergencia_financeira', 'encerrado_aprovacao_tardia']);

// Mantido apenas como fallback client-side para contas de dev locais. A fonte de verdade é driverData.isQA
const AUTHORIZED_SANDBOX_ACCOUNTS = new Set([
  'contato@fretogo.com.br',
  'rodrigovtr38@gmail.com',
]);

const normalizeSearchText = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const timestampToMillis = (value: unknown): number => {
  if (!value) return 0;
  if (typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'number') return value;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

// Tolerância operacional de correspondência de categoria 
const isCategoriaCompativel = (freightCat: string, driverCat: string): boolean => {
  if (!freightCat || !driverCat) return false;
  if (freightCat === driverCat) return true;

  const gruposDeCompatibilidade = [
    ['moto', 'motocicleta'],
    ['carro', 'passeio', 'sedan', 'hatch'],
    ['utilitario', 'fiorino', 'van', 'vuc', 'caminhonete', 'pickup', 'hr', 'kombi'],
    ['caminhao', 'toco', 'truck', 'carreta', 'bau', 'sider', 'bitrem']
  ];

  for (const grupo of gruposDeCompatibilidade) {
    const fMatch = grupo.some(alias => freightCat.includes(alias));
    const dMatch = grupo.some(alias => driverCat.includes(alias));
    if (fMatch && dMatch) return true;
  }

  return false;
};

const FeedSkeleton = () => (
  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 animate-pulse mb-4">
    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="h-2 w-20 bg-slate-800 rounded-full mb-2"></div>
        <div className="h-8 w-32 bg-slate-800 rounded-full"></div>
      </div>
      <div className="h-6 w-16 bg-slate-800 rounded-lg"></div>
    </div>
    <div className="h-16 w-full bg-slate-800/50 rounded-xl mb-4"></div>
    <div className="grid grid-cols-4 gap-2">
      <div className="h-10 bg-slate-800 rounded-lg"></div>
      <div className="h-10 bg-slate-800 rounded-lg"></div>
      <div className="h-10 bg-slate-800 rounded-lg"></div>
      <div className="h-10 bg-slate-800 rounded-lg"></div>
    </div>
  </div>
);

export default function Motorista() {
  const mountedRef = useRef(false);
  const heartbeatRef = useRef<number | null>(null);
  const authReadyRef = useRef(false);
  const listenerRegistryRef = useRef<{ freights?: () => void; active?: () => void; driver?: () => void; }>({});
  
  const viewedFreights = useRef<Set<string>>(new Set());

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingDriver, setCheckingDriver] = useState(true);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [activeFreight, setActiveFreight] = useState<OperationalFreight | null>(null);
  const [availableFreights, setAvailableFreights] = useState<OperationalFreight[]>([]);
  const [selectedFreight, setSelectedFreight] = useState<OperationalFreight | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [radarLoading, setRadarLoading] = useState(false);
  
  const [hasInternet, setHasInternet] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [filtroDestino, setFiltroDestino] = useState('');
  
  const [currentGps, setCurrentGps] = useState<{lat: number, lng: number} | null>(null);
  const [etaAtiva, setEtaAtiva] = useState<number | null>(null);

  const [emptyMessageIndex, setEmptyMessageIndex] = useState(0);
  const emptyMessages = [
    "Radar monitorando oportunidades...",
    "Escaneando a malha logística...",
    "Aguardando publicação de empresas...",
    "Pronto para interceptar cargas..."
  ];

  const operationalCategory = useMemo(() => {
    if (!driverData?.categoria) return 'carro';
    return driverData.categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }, [driverData]);

  useDriverRealtime(user?.uid, isOnline, activeFreight?.id);

  useEffect(() => {
    const unsubscribeGps = locationRealtimeService.onPositionUpdate((pos) => {
      if (mountedRef.current) setCurrentGps(pos);
    });
    return () => unsubscribeGps();
  }, []);

  useEffect(() => {
    const handleOnline = () => setHasInternet(true);
    const handleOffline = () => setHasInternet(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstallable(false);
    setDeferredPrompt(null);
  };

  const showToast = (msg: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Agora';
    const seconds = Math.floor((Date.now() - (timestamp.toMillis ? timestamp.toMillis() : timestamp)) / 1000);
    if (seconds < 60) return 'Agora mesmo';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
    return `${Math.floor(seconds / 3600)}h atrás`;
  };

  const normalizeFreight = useCallback((id: string, data: any): OperationalFreight => {
    const categoriaBruta = data.veiculo || data.categoria || 'carro';
    const categoriaFormatada = categoriaBruta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const valorCliente = Number(data.valorCliente || data.valorTotal || data.valorFreteBruto || data.valor || 0); 
    const valorMotorista = Number(data.valorLiquidoMotorista || data.valorMotorista || valorCliente * 0.8);
    
    const distanciaColetaKm = Number(data.distanciaColetaKm || 0);
    const distanciaTotalLimpa = Number(data.distanciaRealKm || data.distanciaTotalKm || data.distancia || 0);

    const now = Date.now();
    const createdTime = timestampToMillis(data.criadoEm || data.createdAt) || now;
    const horasParada = (now - createdTime) / (1000 * 60 * 60);
    const prioridadeMural = horasParada >= 24 || Boolean(data.prioridade);

    const paradas = data.paradas || [];
    const pinEntregasArray = Array.isArray(data.pinEntregas) ? data.pinEntregas : (data.pinEntregas ? [data.pinEntregas] : []);
    const totalEntregas = pinEntregasArray.length > 0 ? pinEntregasArray.length : (paradas.length > 0 ? paradas.length + 1 : 1);

    return {
      ...data, 
      id,
      status: data.status || 'disponivel',
      prioridade: prioridadeMural,
      agendado: data.tipoFrete === 'agendado' || Boolean(data.agendado),
      categoria: categoriaFormatada,
      enderecoColetaTexto: data.enderecoColetaTexto || data.origem?.endereco || 'Coleta não informada',
      enderecoEntregaTexto: data.enderecoEntregaTexto || data.destino?.endereco || 'Entrega não informada',
      distanciaColetaKm,
      distanciaEntregaKm: distanciaTotalLimpa, 
      distanciaTotalKm: distanciaTotalLimpa,
      valorCliente, 
      valorMotorista,
      pesoKg: Number(data.pesoKg || data.peso || 0), 
      volumes: Number(data.volumes || data.qtdVolumes || 1), 
      tipoCarga: data.tipoMaterial || data.tipoCarga || 'Geral',
      etaMinutes: Number(data.etaMinutes || 20),
      motoristaId: data.motoristaId || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      multiplasEntregas: Boolean(data.multiplasEntregas),
      totalEntregas: totalEntregas,
      dataAgendada: data.dataAgendada,
      pagamentoStatus: data.pagamentoStatus,
      dispatchStatus: data.dispatchStatus,
      ofertaExpiraEm: data.ofertaExpiraEm,
      cidadeOrigem: data.cidadeOrigem || data.coleta?.cidade || '',
      cidadeDestino: data.cidadeDestino || data.entrega?.cidade || '',
      isQA: data.isQA || false,
    } as any;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const frame = requestAnimationFrame(() => { if (mountedRef.current) setRuntimeReady(true); });
    return () => { mountedRef.current = false; cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (activeFreight?.id) {
      setIsOnline(true);
      return;
    }
    if (typeof driverData?.online === 'boolean') setIsOnline(driverData.online);
  }, [activeFreight?.id, driverData?.online]);

  useEffect(() => {
    if (!user?.uid || !isOnline) return;
    const sendHeartbeat = async () => {
      try { 
        await dispatchRealtimeService.setDriverOnline(user.uid);
        if (activeFreight?.id) {
          await dispatchRealtimeService.atualizarTripRealtime(activeFreight.id, { heartbeat: Date.now() }); 
        }
      } catch (error) { console.error('HEARTBEAT ERROR:', error); }
    };

    sendHeartbeat();
    heartbeatRef.current = window.setInterval(sendHeartbeat, 30000);
    return () => { 
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    };
  }, [user, isOnline, activeFreight?.id]);

  useEffect(() => {
    if (!user?.uid || !driverData) return;
    NotificationService.solicitarPermissao(user.uid, 'motorista');
  }, [user, driverData]);

  useEffect(() => {
    if (authReadyRef.current) return;
    authReadyRef.current = true;
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (!mountedRef.current) return;
      setUser(firebaseUser);
      if (!firebaseUser) {
        setDriverData(null); setAvailableFreights([]); setActiveFreight(null);
        setCheckingDriver(false); setLoading(false);
        return;
      }
      setCheckingDriver(true);
      if (listenerRegistryRef.current.driver) listenerRegistryRef.current.driver();
      
      const unsubscribeDriver = onSnapshot(doc(db, 'motoristas_cadastros', firebaseUser.uid), snapshot => {
        if (!mountedRef.current) return;
        if (snapshot.exists()) { setDriverData({ id: snapshot.id, ...snapshot.data() } as DriverData); } 
        else { setDriverData(null); }
        setCheckingDriver(false); setLoading(false);
      });
      
      listenerRegistryRef.current.driver = unsubscribeDriver;
    });
    return () => {
      unsubscribe();
      Object.values(listenerRegistryRef.current).forEach(unsubscribeFn => {
        if (typeof unsubscribeFn === 'function') unsubscribeFn();
      });
    };
  }, []);

  useEffect(() => {
    if (isOnline && availableFreights.length === 0) {
      const interval = setInterval(() => {
        setEmptyMessageIndex((prev) => (prev + 1) % emptyMessages.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [isOnline, availableFreights.length]);

  useEffect(() => {
    if (!runtimeReady || !user?.uid || !driverData || driverData.status !== 'aprovado') {
      setAvailableFreights([]); return;
    }
    setRadarLoading(true);
    
    const freightsQuery = query(
      collection(db, 'fretes'), 
      where('status', 'in', ['disponivel', 'buscando_motorista']),
      where('pagamentoStatus', '==', 'aprovado'),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(freightsQuery, snapshot => {
      if (!mountedRef.current) return;
      
      // 🛡️ A Fonte de Verdade do QA migrou para o Documento do Motorista
      const isQADriver = driverData?.isQA === true || (user.email && AUTHORIZED_SANDBOX_ACCOUNTS.has(user.email.toLowerCase()));
      const now = Date.now();
      
      let next = snapshot.docs
        .filter(document => {
          const data = document.data();
          
          // BLINDAGEM DE ISOLAMENTO BIDIRECIONAL
          const isQAFreight = data.isQA === true;
          if (isQAFreight !== isQADriver) {
             return false;
          }

          const expiresAt = timestampToMillis(data.ofertaExpiraEm);
          const createdAtMillis = timestampToMillis(data.criadoEm || data.createdAt) || now;
          const isAgendado = data.tipoFrete === 'agendado' || Boolean(data.agendado);
          
          // Tolerância para desincronização de relógio local (Clock Skew)
          const TOLERANCIA_TEMPO_MS = 2 * 60 * 60 * 1000; // + 2 horas de tolerância

          let isTimeValid = false;
          if (isAgendado) {
            isTimeValid = expiresAt > 0 ? (expiresAt + TOLERANCIA_TEMPO_MS) >= now : true;
          } else {
            if (expiresAt > 0) {
              isTimeValid = (expiresAt + TOLERANCIA_TEMPO_MS) >= now;
            } else {
              const ageInHours = (now - createdAtMillis) / (1000 * 60 * 60);
              // Permitir até 26 horas para mitigar fuso/horário adiantado local
              isTimeValid = ageInHours <= 26; 
            }
          }

          return data.pagamentoStatus === 'aprovado'
            && !data.motoristaId
            && !BLOCKED_DISPATCH_STATUSES.has(String(data.dispatchStatus || ''))
            && isTimeValid;
        })
        .map(document => normalizeFreight(document.id, document.data()));

      // Filtragem por compatibilidade operacional segura
      next = next.filter(freight => isCategoriaCompativel(freight.categoria, operationalCategory));
      next = next.filter(freight => !freight.motoristaId); 

      setAvailableFreights(next); 
      setTimeout(() => { if (mountedRef.current) setRadarLoading(false); }, 1500);
    }, error => {
      console.error('FREIGHTS REALTIME ERROR:', error); 
      setRadarLoading(false);
    });
    
    listenerRegistryRef.current.freights = unsubscribe;
    return () => unsubscribe();
  }, [runtimeReady, user, driverData, operationalCategory, normalizeFreight]);

  useEffect(() => {
    if (!runtimeReady || !user?.uid) { setActiveFreight(null); return; }
    
    const activeQuery = query(collection(db, 'fretes'), where('motoristaId', '==', user.uid), where('status', 'in', ACTIVE_STATUSES), limit(1));
    const unsubscribe = onSnapshot(activeQuery, snapshot => {
      if (!mountedRef.current) return;
      if (snapshot.empty) { setActiveFreight(null); return; }
      const activeDoc = snapshot.docs[0];
      setActiveFreight(normalizeFreight(activeDoc.id, activeDoc.data()));
    });
    listenerRegistryRef.current.active = unsubscribe;
    return () => unsubscribe();
  }, [runtimeReady, user, normalizeFreight]);

  const handleToggleOnline = useCallback(async (next: boolean) => {
    if (!user?.uid) return;
    try {
      if (next) await dispatchRealtimeService.setDriverOnline(user.uid);
      else await dispatchRealtimeService.setDriverOffline(user.uid);
      setIsOnline(next);
    } catch (error) {
      console.error('ONLINE TOGGLE ERROR:', error);
      setIsOnline(!next);
      showToast('Não foi possível atualizar seu radar. Tente novamente.', 'warning');
    }
  }, [user]);

  const handleSelectFreight = useCallback((freight: OperationalFreight) => { setSelectedFreight(freight); }, []);
  const handleCloseFreight = useCallback(() => { setSelectedFreight(null); }, []);

  const handleAcceptFreight = useCallback(async (freight: OperationalFreight) => {
    if (!user?.uid || !driverData) return;
    try {
      await dispatchRealtimeService.aceitarCorrida(user.uid, freight.id, driverData);
      setSelectedFreight(null);
      showToast('Frete aceito! A operação está vinculada ao motorista.', 'success');
    } catch (error: any) { 
      const message = String(error?.message || '');
      showToast(message.includes('already-exists') || message.includes('não está mais disponível') ? "Esta carga já foi fechada por outro parceiro." : "Não foi possível aceitar este frete agora.", 'warning');
      setSelectedFreight(null); 
    }
  }, [user, driverData]);

  const handleSocialAction = async (action: string, freightId: string) => {
    try {
      if (action === 'interesse') {
        await dispatchRealtimeService.registrarInteresse(freightId);
        showToast('Interesse registrado!', 'success');
      }
      if (action === 'favorito') {
        await dispatchRealtimeService.registrarFavorito(freightId);
        showToast('Carga salva na sua lista.', 'info');
      }
      if (action === 'share') {
        const shareUrl = `${window.location.origin}/motorista?frete=${encodeURIComponent(freightId)}`;
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link da oportunidade copiado!', 'info');
      }
    } catch (error) {
      showToast('Falha na comunicação de rede.', 'warning');
    }
  };

  const fretesFiltradosOrdenados = useMemo(() => {
    let filtrados = availableFreights.filter(freight => {
      const origemSearch = normalizeSearchText(filtroOrigem);
      const destinoSearch = normalizeSearchText(filtroDestino);
      const origemValue = normalizeSearchText((freight as any).cidadeOrigem || freight.enderecoColetaTexto);
      const destinoValue = normalizeSearchText((freight as any).cidadeDestino || freight.enderecoEntregaTexto);
      const origemMatch = !origemSearch || origemValue.includes(origemSearch);
      const destinoMatch = !destinoSearch || destinoValue.includes(destinoSearch);
      return origemMatch && destinoMatch;
    });

    if (driverData?.modoRetorno && driverData?.destinoRetorno) {
      const destinoAlvo = normalizeSearchText(driverData.destinoRetorno);
      filtrados = filtrados.filter(freight => 
        normalizeSearchText((freight as any).cidadeDestino || freight.enderecoEntregaTexto).includes(destinoAlvo)
      );
    }

    return filtrados.sort((a, b) => {
      if (a.prioridade !== b.prioridade) return a.prioridade ? -1 : 1;
      if (a.distanciaColetaKm !== b.distanciaColetaKm) return (a.distanciaColetaKm || 0) - (b.distanciaColetaKm || 0);
      if (b.valorMotorista !== a.valorMotorista) return (b.valorMotorista || 0) - (a.valorMotorista || 0);
      
      const timeA = timestampToMillis(a.createdAt);
      const timeB = timestampToMillis(b.createdAt);
      return timeB - timeA; 
    });
  }, [availableFreights, filtroOrigem, filtroDestino, driverData?.modoRetorno, driverData?.destinoRetorno]);

  useEffect(() => {
    if (isOnline && fretesFiltradosOrdenados.length > 0) {
      fretesFiltradosOrdenados.forEach(freight => {
        if (!viewedFreights.current.has(freight.id)) {
          viewedFreights.current.add(freight.id);
          dispatchRealtimeService.registrarVisualizacao(freight.id).catch(() => {});
        }
      });
    }
  }, [fretesFiltradosOrdenados, isOnline]);

  const mapProps = useMemo(() => {
    if (!activeFreight) {
      return {
        origem: currentGps,
        destino: null,
        paradasExtras: [],
        motoristaPos: currentGps,
        operationalMessage: isOnline ? "Buscando Oportunidades..." : "Central Desconectada",
        motoristaId: user?.uid,
        vehicleType: driverData?.veiculo || driverData?.categoria || 'carro'
      };
    }

    const isFaseColeta = ['aceito', 'indo_coleta', 'chegou_coleta', 'coletando'].includes(activeFreight.status);
    const paradas = (activeFreight as any).paradas || [];
    const paradaAtualIndex = (activeFreight as any).paradaAtualIndex || 0;
    const entrega = (activeFreight as any).entrega;
    const destinoFinalMap = entrega?.lat ? { lat: entrega.lat, lng: entrega.lng } : null;
    const paradasExtrasMap = paradas.filter((p:any) => p.lat && p.lng).map((p:any) => ({ lat: p.lat, lng: p.lng }));
    
    const origemLat = (activeFreight as any).origemLat;
    const origemLng = (activeFreight as any).origemLng;

    const mapOriginGPS = currentGps || (activeFreight.status === 'em_transporte'
      ? (paradaAtualIndex === 0
          ? { lat: origemLat, lng: origemLng }
          : {
              lat: paradas[paradaAtualIndex-1]?.lat ?? origemLat,
              lng: paradas[paradaAtualIndex-1]?.lng ?? origemLng
            }
        )
      : null);

    return {
       origem: origemLat ? { lat: origemLat, lng: origemLng } : mapOriginGPS,
       destino: destinoFinalMap,
       paradasExtras: paradasExtrasMap,
       motoristaPos: currentGps,
       motoristaId: user?.uid || activeFreight.id,
       paradaAtualIndex,
       vehicleType: driverData?.veiculo || driverData?.categoria || 'carro',
       operationalMessage: isFaseColeta ? "Buscando Carga" : `Navegando para Entrega ${paradaAtualIndex + 1}/${(paradas.length > 0 ? paradas.length + 1 : 1)}`
    };
  }, [activeFreight, currentGps, isOnline, user, driverData]);

  if (!runtimeReady || loading || checkingDriver) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#020617] text-white">
        <div className="text-center">
          <h1 className="text-4xl font-black">FRETOGO</h1>
          <p className="mt-4 text-slate-400 animate-pulse">Iniciando cockpit de voo...</p>
        </div>
      </div>
    );
  }

  if (!user) return <div className="min-h-[100dvh] bg-[#020617]"><DriverAuth /></div>;
  if (!driverData) return <div className="min-h-[100dvh] bg-[#020617]"><DriverCadastro onFinish={() => setCheckingDriver(true)} /></div>;
  if (driverData.status !== 'aprovado') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#020617] px-4">
        <div className="w-full max-w-lg rounded-[2rem] border border-cyan-500/20 bg-slate-900/80 p-10 text-center backdrop-blur-xl">
          <h1 className="text-4xl font-black text-white">Cadastro em Análise</h1>
          <p className="mt-4 text-slate-400">Nossa central de tráfego está validando seu veículo e documentos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] text-white relative overflow-hidden pointer-events-none flex flex-col bg-[#020617]">
      
      <div className="fixed inset-0 z-0 pointer-events-auto">
         <MapaCliente {...(mapProps as any)} onRouteUpdate={(eta) => setEtaAtiva(eta)} />
         <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-[#020617]/90 to-transparent pointer-events-none" />
      </div>

      <AnimatePresence>
        {!hasInternet && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }} className="relative z-[200] w-full bg-red-600 px-4 py-2 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.5)] pointer-events-auto">
            <WifiOff size={16} className="text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Sem conexão. Aguardando sinal...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isInstallable && (
        <div className="relative z-[100] w-full bg-cyan-600 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(8,145,178,0.3)] pointer-events-auto">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white">Baixe o Aplicativo</p>
            <p className="text-[10px] text-cyan-100 font-medium mt-0.5">Instale e feche fretes mais rápido.</p>
          </div>
          <button onClick={handleInstallClick} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shrink-0">
            <Download size={14} /> Instalar
          </button>
        </div>
      )}

      <div className="relative z-20 pointer-events-auto">
        <DriverHeader user={user} />
      </div>

      {!activeFreight?.id && (
         <div className="relative z-20 pointer-events-auto mt-4 px-4 max-w-lg mx-auto w-full">
            <DriverRadar isOnline={isOnline} setIsOnline={handleToggleOnline} user={user} driver={driverData} />
         </div>
      )}

      {activeFreight?.id ? (
        <div className="relative z-30 pointer-events-auto w-full mt-auto">
          <DriverActiveTrip frete={activeFreight as any} currentGps={currentGps} etaAtiva={etaAtiva} />
          <div className="fixed top-24 right-4 z-40">
            <ChatFrete freteId={activeFreight.id} tipoUsuario="motorista" nome={driverData.nome || 'Motorista'} />
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-auto">
          <div className="bg-slate-950/85 backdrop-blur-xl border-t border-cyan-500/20 rounded-t-[2.5rem] shadow-[0_-10px_50px_rgba(0,0,0,0.8)] max-h-[60vh] md:max-h-[70vh] flex flex-col md:max-w-4xl md:mx-auto">
            
            <div className="p-5 pb-3 shrink-0 border-b border-white/5">
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-grab"></div>
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                   <Search className="text-cyan-500 w-5 h-5" />
                   <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">Radar de Ofertas</h3>
                 </div>
                 <div className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">
                   {fretesFiltradosOrdenados.length} Cargas
                 </div>
              </div>
              
              {!driverData?.modoRetorno && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Origem..." value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all" />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input type="text" placeholder="Destino..." value={filtroDestino} onChange={e => setFiltroDestino(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-y-auto p-4 space-y-4 pb-8">
              {isOnline && radarLoading && fretesFiltradosOrdenados.length === 0 ? (
                <><FeedSkeleton /><FeedSkeleton /></>
              ) : fretesFiltradosOrdenados.length === 0 ? (
                isOnline ? (
                  <div className="text-center py-10">
                    <Activity className="w-8 h-8 text-cyan-400 mx-auto mb-3 animate-pulse" />
                    <p className="text-cyan-400 font-black uppercase tracking-widest text-sm mb-1">Radar Ativo</p>
                    <p className="text-xs font-bold text-slate-400 transition-all duration-500">{emptyMessages[emptyMessageIndex]}</p>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Power className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Sinal da Central Desligado.</p>
                  </div>
                )
              ) : (
                <AnimatePresence>
                  {fretesFiltradosOrdenados.map((freight) => {
                    const km = freight.distanciaTotalKm && freight.distanciaTotalKm > 0 ? freight.distanciaTotalKm : 1;
                    const ganhoPorKm = (freight.valorMotorista || 0) / km;
                    const totalD = (freight as any).totalEntregas || 1;

                    return (
                      <motion.div key={freight.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, height: 0 }} className="bg-slate-900/80 border border-slate-800 rounded-[1.5rem] p-5 relative overflow-hidden hover:border-slate-700 transition-all">
                        
                        {freight.prioridade ? (
                           <div className="absolute top-0 right-0 bg-gradient-to-r from-red-600 to-orange-500 px-3 py-1 rounded-bl-xl font-black text-[9px] uppercase tracking-widest text-white flex items-center gap-1">
                              <Flame size={10}/> Urgente
                           </div>
                        ) : freight.agendado ? (
                           <div className="absolute top-0 right-0 bg-purple-600 px-3 py-1 rounded-bl-xl font-black text-[9px] uppercase tracking-widest text-white flex items-center gap-1">
                              <CalendarDays size={10}/> Agendado
                           </div>
                        ) : (
                           <div className="absolute top-0 right-0 bg-cyan-600 px-3 py-1 rounded-bl-xl font-black text-[9px] uppercase tracking-widest text-white flex items-center gap-1">
                              <Clock size={10}/> Imediato
                           </div>
                        )}

                        {(freight as any).isQA && (
                           <div className="absolute top-0 left-0 bg-amber-500 px-3 py-1 rounded-br-xl font-black text-[9px] uppercase tracking-widest text-black">
                              QA
                           </div>
                        )}

                        <div className="flex justify-between items-start mb-4 mt-2">
                           <div>
                              <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Valor Líquido</span>
                              <h3 className="text-3xl font-black text-emerald-400 tracking-tighter">R$ {freight.valorMotorista?.toFixed(2).replace('.', ',')}</h3>
                              {totalD > 1 ? (
                                <div className="inline-flex bg-cyan-500/20 border border-cyan-500/40 rounded px-2 py-0.5 mt-1"><span className="text-[9px] font-black text-cyan-400 uppercase">MULTI-DROP • {totalD} ENT</span></div>
                              ) : (
                                <div className="inline-flex bg-slate-800 border border-slate-700 rounded px-2 py-0.5 mt-1"><span className="text-[9px] font-black text-slate-400 uppercase">1 ENTREGA</span></div>
                              )}
                           </div>
                           <div className="text-right pt-1">
                              <span className="bg-slate-950 text-slate-400 text-[9px] px-2 py-1 rounded font-bold uppercase tracking-widest border border-slate-800">{formatTimeAgo(freight.createdAt)}</span>
                           </div>
                        </div>

                        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/50 mb-4">
                           <div className="flex items-start gap-3 mb-3">
                              <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div></div>
                              <div>
                                 <p className="text-[9px] uppercase tracking-widest font-black text-slate-500">Coleta</p>
                                 <p className="text-xs font-bold text-white truncate max-w-[200px]">{freight.enderecoColetaTexto}</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full bg-emerald-900/50 border border-emerald-50 flex items-center justify-center mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div></div>
                              <div>
                                 <p className="text-[9px] uppercase tracking-widest font-black text-emerald-500">{totalD > 1 ? 'Último Destino' : 'Entrega'}</p>
                                 <p className="text-xs font-bold text-white truncate max-w-[200px]">{freight.enderecoEntregaTexto}</p>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-4">
                          <div className="bg-slate-900 rounded-lg p-2 text-center border border-slate-800"><p className="text-[8px] text-emerald-500 uppercase font-black mb-0.5">Ganho/KM</p><p className="text-[10px] font-black text-emerald-400">R$ {ganhoPorKm.toFixed(2)}</p></div>
                          <div className="bg-slate-900 rounded-lg p-2 text-center border border-slate-800"><p className="text-[8px] text-slate-500 uppercase font-black mb-0.5">Dist.</p><p className="text-[10px] font-bold text-slate-300">{freight.distanciaTotalKm?.toFixed(1)}km</p></div>
                          <div className="bg-slate-900 rounded-lg p-2 text-center border border-slate-800"><p className="text-[8px] text-slate-500 uppercase font-black mb-0.5">Peso</p><p className="text-[10px] font-bold text-slate-300">{freight.pesoKg ? `${freight.pesoKg}kg` : `${freight.volumes}v`}</p></div>
                          <div className="bg-slate-900 rounded-lg p-2 text-center border border-slate-800 flex flex-col justify-center overflow-hidden"><p className="text-[8px] text-slate-500 uppercase font-black mb-0.5">Carga</p><p className="text-[9px] font-bold text-slate-300 truncate">{freight.tipoCarga || 'Geral'}</p></div>
                        </div>

                        {!isOnline ? (
                          <button onClick={() => { handleToggleOnline(true); showToast('Confirme os detalhes e aceite.', 'success'); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.2em] py-3 rounded-lg flex items-center justify-center gap-2">
                              <Power size={14} /> Ficar Online para Aceitar
                          </button>
                        ) : (
                          <button onClick={() => handleSelectFreight(freight)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-[0.2em] py-3 rounded-lg flex items-center justify-center gap-2">
                              <Truck size={14} /> Aceitar e Viajar
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`pointer-events-auto ${selectedFreight ? "fixed inset-0 z-[100]" : "hidden"}`}>
        <DriverApp 
          freights={[]} 
          selectedFreight={selectedFreight} 
          activeFreight={activeFreight} 
          isOnline={isOnline} 
          loading={radarLoading} 
          driverCategory={operationalCategory} 
          driverName={driverData.nome} 
          onToggleOnline={handleToggleOnline} 
          onSelectFreight={handleSelectFreight} 
          onCloseFreight={handleCloseFreight} 
          onAcceptFreight={handleAcceptFreight} 
        />
      </div>

      {toast && (
        <div className="fixed bottom-10 left-1/2 z-[120] -translate-x-1/2 animate-in slide-in-from-bottom-5 w-[90%] max-w-sm pointer-events-auto">
          <div className={`rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 justify-center ${
            toast.type === 'success' ? 'border-emerald-500/30 bg-emerald-900/90 text-emerald-400' : 
            toast.type === 'warning' ? 'border-amber-500/30 bg-amber-900/90 text-amber-400' : 
            'border-blue-500/30 bg-blue-900/90 text-blue-400'
          } backdrop-blur-md`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
