// =========================================================
// NOME DO ARQUIVO: src/pages/Motorista.tsx
// CTO-Log: Auditoria Concluída - FASE 3 (Integração).
// Status: "Vírus dos 15km" e "Buraco Negro da Recusa" erradicados pela raiz da leitura do Firestore.
// Evolução Fase 12 (Escrow): Transação manual removida. Lock atômico centralizado no TripLifecycle.
// Correção "Execução Dois": Remoção do sequestro de tela. Motorista aguarda o pagamento no próprio Feed.
// =========================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, doc, limit, onSnapshot, query, serverTimestamp, updateDoc, where, increment } from 'firebase/firestore'; 
import { motion, AnimatePresence } from 'framer-motion';
import DriverApp from '../components/DriverApp';
import ChatFrete from '../components/ChatFrete';
import DriverHeader from '../components/motorista/DriverHeader';
import DriverAuth from '../components/motorista/DriverAuth';
import DriverCadastro from '../components/motorista/DriverCadastro';
import DriverRadar from '../components/motorista/DriverRadar';
import DriverActiveTrip from './DriverActiveTrip';
import { dispatchRealtimeService } from '../services/dispatchRealtimeService';
import type { OperationalFreight } from '../components/driver/dashboard/DriverDashboardLayout';
import { Download, Search, MapPin, Flame, Clock, ThumbsUp, Star, Share2, Truck, Power, WifiOff, Activity, CalendarDays, Ruler, Loader2 } from 'lucide-react'; 
import { NotificationService } from '../services/notificationService';

interface DriverData { 
  id?: string; 
  nome?: string; 
  whatsapp?: string; 
  categoria?: string; 
  status?: 'pendente' | 'aprovado' | 'rejeitado';
  modoRetorno?: boolean;
  destinoRetorno?: string;
  retornosUsadosHoje?: number; 
}

// 🔥 CTO FIX: Removido 'reservado_aguardando_pagamento' para evitar o sequestro da tela.
const ACTIVE_STATUSES = ['aceito', 'indo_coleta', 'chegou_coleta', 'coletando', 'em_transporte', 'em_entrega', 'returning'];

const FeedSkeleton = () => (
  <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 shadow-2xl animate-pulse mb-6">
    <div className="flex justify-between items-start mb-6">
      <div>
        <div className="h-3 w-24 bg-slate-800 rounded-full mb-2"></div>
        <div className="h-10 w-40 bg-slate-800 rounded-full"></div>
      </div>
      <div className="h-8 w-20 bg-slate-800 rounded-xl"></div>
    </div>
    <div className="h-28 w-full bg-slate-800/50 rounded-2xl mb-6"></div>
    <div className="grid grid-cols-3 gap-2">
      <div className="h-14 bg-slate-800 rounded-xl"></div>
      <div className="h-14 bg-slate-800 rounded-xl"></div>
      <div className="h-14 bg-slate-800 rounded-xl"></div>
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

  const [emptyMessageIndex, setEmptyMessageIndex] = useState(0);
  const emptyMessages = [
    "Radar monitorando oportunidades na região...",
    "Central Operacional escaneando a malha logística...",
    "Aguardando publicação de empresas embarcadoras...",
    "Filtros ativos. Pronto para interceptar cargas..."
  ];

  const operationalCategory = useMemo(() => {
    if (!driverData?.categoria) return 'carro';
    return driverData.categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }, [driverData]);

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
    const createdTime = data.criadoEm || (data.createdAt?.toMillis ? data.createdAt.toMillis() : now);
    const horasParada = (now - createdTime) / (1000 * 60 * 60);
    const prioridadeMural = horasParada >= 24 || Boolean(data.prioridade);

    return {
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
      dataAgendada: data.dataAgendada,
    } as any;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const frame = requestAnimationFrame(() => { if (mountedRef.current) setRuntimeReady(true); });
    return () => { mountedRef.current = false; cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (!user?.uid || !isOnline) return;
    const sendHeartbeat = async () => {
      try { 
        if (activeFreight?.id) {
          await dispatchRealtimeService.atualizarTripRealtime(activeFreight.id, { heartbeat: Date.now() }); 
        } else {
          await dispatchRealtimeService.setDriverOnline(user.uid); 
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
    if (!runtimeReady || !user?.uid || !driverData) {
      setAvailableFreights([]); return;
    }
    setRadarLoading(true);
    
    // O Feed aceita somente fretes publicados após a confirmação do pagamento.
    const freightsQuery = query(
      collection(db, 'fretes'), 
      where('status', 'in', ['disponivel', 'buscando_motorista']),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(freightsQuery, snapshot => {
      if (!mountedRef.current) return;

      let next = snapshot.docs.map(document => normalizeFreight(document.id, document.data()));

      next = next.filter(freight => freight.categoria === operationalCategory);
      next = next.filter(freight => !freight.motoristaId || freight.motoristaId === user.uid || snapshot.docs.find(d => d.id === freight.id)?.data().motoristaAtualDestaque === user.uid); 

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
    setIsOnline(next);
    if (!user?.uid) return;
    try {
      if (next) await dispatchRealtimeService.setDriverOnline(user.uid);
      else await dispatchRealtimeService.setDriverOffline(user.uid);
    } catch (error) { console.error('ONLINE TOGGLE ERROR:', error); }
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
      showToast(error.message === 'FRETE_JA_ATRIBUIDO' ? "Esta carga já foi fechada por outro parceiro." : "Erro ao aceitar frete.", 'warning');
      setSelectedFreight(null); 
    }
  }, [user, driverData]);

  const handleSocialAction = async (action: string, freightId: string) => {
    try {
      if (action === 'interesse') {
        await updateDoc(doc(db, 'fretes', freightId), { interessados: increment(1) });
        showToast('Interesse registrado! A Empresa foi notificada.', 'success');
      }
      if (action === 'favorito') {
        await updateDoc(doc(db, 'fretes', freightId), { favoritos: increment(1) });
        showToast('Carga salva na sua lista.', 'info');
      }
      if (action === 'share') {
        showToast('Link da oportunidade copiado!', 'info');
      }
    } catch (error) {
      console.error('Erro ao interagir:', error);
      showToast('Falha na comunicação de rede.', 'warning');
    }
  };

  const fretesFiltradosOrdenados = useMemo(() => {
    let filtrados = availableFreights.filter(freight => {
      const origemMatch = filtroOrigem === '' || freight.enderecoColetaTexto?.toLowerCase().includes(filtroOrigem.toLowerCase());
      const destinoMatch = filtroDestino === '' || freight.enderecoEntregaTexto?.toLowerCase().includes(filtroDestino.toLowerCase());
      return origemMatch && destinoMatch;
    });

    if (driverData?.modoRetorno && driverData?.destinoRetorno) {
      const destinoAlvo = driverData.destinoRetorno.toLowerCase();
      filtrados = filtrados.filter(freight => 
        freight.enderecoEntregaTexto?.toLowerCase().includes(destinoAlvo) || 
        (freight as any).cidadeDestino?.toLowerCase().includes(destinoAlvo)
      );
    }

    return filtrados.sort((a, b) => {
      if (a.prioridade !== b.prioridade) return a.prioridade ? -1 : 1;
      if (a.distanciaColetaKm !== b.distanciaColetaKm) return (a.distanciaColetaKm || 0) - (b.distanciaColetaKm || 0);
      if (b.valorMotorista !== a.valorMotorista) return (b.valorMotorista || 0) - (a.valorMotorista || 0);
      
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA; 
    });
  }, [availableFreights, filtroOrigem, filtroDestino, driverData?.modoRetorno, driverData?.destinoRetorno]);

  useEffect(() => {
    if (isOnline && fretesFiltradosOrdenados.length > 0) {
      fretesFiltradosOrdenados.forEach(freight => {
        if (!viewedFreights.current.has(freight.id)) {
          viewedFreights.current.add(freight.id);
          updateDoc(doc(db, 'fretes', freight.id), { visualizacoes: increment(1) }).catch(() => {});
        }
      });
    }
  }, [fretesFiltradosOrdenados, isOnline]);

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
    <div className="min-h-[100dvh] bg-[#020617] text-white pb-24 relative overflow-hidden">
      
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] -z-10" />

      <AnimatePresence>
        {!hasInternet && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }} className="sticky top-0 z-[200] w-full bg-red-600 px-4 py-2 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.5)]">
            <WifiOff size={16} className="text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Sem conexão. Aguardando sinal...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isInstallable && (
        <div className="sticky top-0 z-[100] w-full bg-cyan-600 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(8,145,178,0.3)]">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white">Baixe o Aplicativo</p>
            <p className="text-[10px] text-cyan-100 font-medium mt-0.5">Instale e feche fretes mais rápido.</p>
          </div>
          <button onClick={handleInstallClick} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shrink-0">
            <Download size={14} /> Instalar
          </button>
        </div>
      )}

      <DriverHeader user={user} />

      {activeFreight?.id ? (
        <div className="mx-auto mt-10 max-w-7xl px-4 pb-24 md:px-6">
          <DriverActiveTrip freteId={activeFreight.id} />
          <div className="mt-8">
            <ChatFrete freteId={activeFreight.id} tipoUsuario="motorista" nome={driverData.nome || 'Motorista'} />
          </div>
        </div>
      ) : (
        <>
          <DriverRadar isOnline={isOnline} setIsOnline={handleToggleOnline} user={user} driver={driverData} />
          
          <div className="mx-auto max-w-4xl px-4 mt-8 animate-in fade-in slide-in-from-bottom-4 relative z-20">
            
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-[2rem] p-5 md:p-6 shadow-2xl mb-8">
              <div className="flex items-center justify-between mb-5">
                 <div className="flex items-center gap-2">
                   <Search className="text-cyan-500 w-5 h-5" />
                   <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">Feed de Fretes</h3>
                 </div>
                 <div className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">
                   {fretesFiltradosOrdenados.length} Oportunidades
                 </div>
              </div>
              
              {!driverData?.modoRetorno && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Origem da Carga" value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all" />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input type="text" placeholder="Destino da Carga" value={filtroDestino} onChange={e => setFiltroDestino(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {isOnline && radarLoading && fretesFiltradosOrdenados.length === 0 ? (
                <>
                   <FeedSkeleton />
                   <FeedSkeleton />
                </>
              ) : fretesFiltradosOrdenados.length === 0 ? (
                isOnline ? (
                  <div className="text-center py-24 bg-slate-900/40 rounded-[2rem] border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.05)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1),transparent_50%)] animate-pulse" style={{ animationDuration: '4s' }}></div>
                    <div className="relative z-10 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 relative">
                         <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-20"></div>
                         <Activity className="w-8 h-8 text-cyan-400" />
                      </div>
                      <p className="text-cyan-400 font-black uppercase tracking-widest text-lg mb-2">Radar Operacional Ativo</p>
                      <p className="text-sm font-bold text-slate-400 transition-all duration-500 max-w-sm mx-auto leading-relaxed">{emptyMessages[emptyMessageIndex]}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-900/30 rounded-[2rem] border border-slate-800 border-dashed">
                    <Power className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium text-lg">Sinal da Central Desligado.</p>
                    <p className="text-sm text-slate-600 mt-2">Fique online para receber ofertas no mural.</p>
                  </div>
                )
              ) : (
                <AnimatePresence>
                  {fretesFiltradosOrdenados.map((freight) => {
                    const km = freight.distanciaTotalKm && freight.distanciaTotalKm > 0 ? freight.distanciaTotalKm : 1;
                    const ganhoPorKm = (freight.valorMotorista || 0) / km;

                    return (
                      <motion.div 
                        key={freight.id} 
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, height: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.3 }}
                        className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden transition-all hover:border-slate-700 mb-6"
                      >
                        {freight.prioridade ? (
                           <div className="absolute top-0 right-0 bg-gradient-to-r from-red-600 to-orange-500 px-4 py-1.5 rounded-bl-2xl font-black text-[10px] uppercase tracking-widest text-white flex items-center gap-1.5 shadow-lg">
                              <Flame size={12} className="animate-pulse"/> Urgente
                           </div>
                        ) : freight.agendado ? (
                           <div className="absolute top-0 right-0 bg-purple-600 px-4 py-1.5 rounded-bl-2xl font-black text-[10px] uppercase tracking-widest text-white flex items-center gap-1.5 shadow-lg shadow-purple-900/50">
                              <CalendarDays size={12}/> Agendado
                           </div>
                        ) : (
                           <div className="absolute top-0 right-0 bg-cyan-600 px-4 py-1.5 rounded-bl-2xl font-black text-[10px] uppercase tracking-widest text-white flex items-center gap-1.5 shadow-lg shadow-cyan-900/50">
                              <Clock size={12}/> Imediato
                           </div>
                        )}

                        <div className="flex justify-between items-start mb-6 pt-2">
                           <div className="flex flex-col gap-1.5">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                 <Star size={10} className="text-slate-500"/> Cliente pagou: R$ {freight.valorCliente?.toFixed(2).replace('.', ',')}
                              </p>
                              <div className="flex items-end gap-2">
                                 <h3 className="text-4xl font-black text-emerald-400 tracking-tighter">R$ {freight.valorMotorista?.toFixed(2).replace('.', ',')}</h3>
                                 <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1.5">Líquido</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Publicado</p>
                              <span className="bg-slate-950 text-slate-400 text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest border border-slate-800">{formatTimeAgo(freight.createdAt)}</span>
                           </div>
                        </div>

                        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800/50 mb-6 relative">
                           <div className="absolute left-[31px] top-10 bottom-10 w-px bg-slate-800"></div>
                           <div className="flex items-start gap-4 mb-6 relative z-10">
                              <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center shrink-0 mt-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div></div>
                              <div>
                                 <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-1">Coleta</p>
                                 <p className="text-sm font-bold text-white leading-snug">{freight.enderecoColetaTexto}</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-4 relative z-10">
                              <div className="w-6 h-6 rounded-full bg-emerald-900/50 border-2 border-emerald-50 flex items-center justify-center shrink-0 mt-1"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div></div>
                              <div>
                                 <p className="text-[10px] uppercase tracking-widest font-black text-emerald-500 mb-1">Destino</p>
                                 <p className="text-sm font-bold text-white leading-snug">{freight.enderecoEntregaTexto}</p>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-6">
                          <div className="bg-slate-900 rounded-xl p-3 text-center border border-slate-800">
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1 flex items-center justify-center gap-1"><Ruler size={10}/> Renda Bruta</p>
                            <p className="text-xs font-black text-emerald-400">R$ {ganhoPorKm.toFixed(2)}/km</p>
                          </div>
                          <div className="bg-slate-900 rounded-xl p-3 text-center border border-slate-800">
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Distância</p>
                            <p className="text-xs font-bold text-slate-300">{freight.distanciaTotalKm?.toFixed(1)} km</p>
                          </div>
                          <div className="bg-slate-900 rounded-xl p-3 text-center border border-slate-800">
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Peso/Vol</p>
                            <p className="text-xs font-bold text-slate-300">{freight.pesoKg ? `${freight.pesoKg}kg` : freight.volumes}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-5 border-t border-slate-800 pt-5">
                            <button onClick={() => handleSocialAction('interesse', freight.id)} className="flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-blue-400 transition-colors">
                               <ThumbsUp size={20}/>
                               <span className="text-[9px] font-black uppercase tracking-widest">Interesse</span>
                            </button>
                            <button onClick={() => handleSocialAction('favorito', freight.id)} className="flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-amber-400 transition-colors">
                               <Star size={20}/>
                               <span className="text-[9px] font-black uppercase tracking-widest">Salvar</span>
                            </button>
                            <button onClick={() => handleSocialAction('share', freight.id)} className="flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-cyan-400 transition-colors">
                               <Share2 size={20}/>
                               <span className="text-[9px] font-black uppercase tracking-widest">Enviar</span>
                            </button>
                        </div>

                        {!isOnline ? (
                          <button onClick={() => {
                            handleToggleOnline(true);
                            showToast('Você está online! Confirme os detalhes e aceite o frete.', 'success');
                          }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-95 flex items-center justify-center gap-2 border border-blue-500">
                              <Power size={18} /> Ficar Online para Aceitar
                          </button>
                        ) : (
                          <button onClick={() => handleSelectFreight(freight)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg shadow-emerald-900/50 transition-all active:scale-95 flex items-center justify-center gap-2 border border-emerald-500">
                              <Truck size={18} /> Aceitar e Viajar
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          <div className={selectedFreight ? "block" : "hidden"}>
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
        </>
      )}

      {toast && (
        <div className="fixed bottom-10 left-1/2 z-[120] -translate-x-1/2 animate-in slide-in-from-bottom-5 w-[90%] max-w-sm">
          <div className={`rounded-[1.5rem] border px-6 py-4 text-xs font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 ${
            toast.type === 'success' ? 'border-emerald-500/30 bg-emerald-900/90 text-emerald-400' : 
            toast.type === 'warning' ? 'border-amber-500/30 bg-amber-900/90 text-amber-400' : 
            'border-blue-500/30 bg-blue-900/90 text-blue-400'
          } backdrop-blur-md text-center justify-center`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
