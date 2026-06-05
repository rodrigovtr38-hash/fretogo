// src/pages/Motorista.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import DriverApp from '../components/DriverApp';
import ChatFrete from '../components/ChatFrete';
import DriverHeader from '../components/motorista/DriverHeader';
import DriverAuth from '../components/motorista/DriverAuth';
import DriverCadastro from '../components/motorista/DriverCadastro';
import DriverRadar from '../components/motorista/DriverRadar';
import DriverActiveTrip from '../components/motorista/DriverActiveTrip';
import { dispatchRealtimeService } from '../services/dispatchRealtimeService';
import type { OperationalFreight } from '../components/driver/dashboard/DriverDashboardLayout';
import { Download } from 'lucide-react'; 

interface DriverData { id?: string; nome?: string; whatsapp?: string; categoria?: string; status?: 'pendente' | 'aprovado' | 'rejeitado'; }

const CATEGORY_FEES: Record<string, number> = { moto: 0.2, carro: 0.2, utilitario: 0.2, toco: 0.15, truck: 0.15, carreta: 0.15, bitrem: 0.15 };
const ACTIVE_STATUSES = ['aceito', 'indo_coleta', 'chegou_coleta', 'coletando', 'em_transporte', 'em_entrega', 'returning'];

export default function Motorista() {
  const mountedRef = useRef(false);
  const heartbeatRef = useRef<number | null>(null);
  const authReadyRef = useRef(false);
  const listenerRegistryRef = useRef<{ freights?: () => void; active?: () => void; driver?: () => void; }>({});

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

  // Instalação PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const operationalCategory = useMemo(() => {
    if (!driverData?.categoria) return 'carro';
    return driverData.categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }, [driverData]);

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
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Centraliza o preenchimento de Oferta visual
  const normalizeFreight = useCallback((id: string, data: any): OperationalFreight => {
    const feePercent = CATEGORY_FEES[data.categoria] ?? 0.2;
    const valorCliente = Number(data.valorCliente || data.valorTotal || data.valor || 0); // Correção do valor pro radar
    const valorMotorista = data.valorMotorista ?? valorCliente * (1 - feePercent);
    const distanciaColetaKm = Number(data.distanciaColetaKm || 0);
    const distanciaEntregaKm = Number(data.distanciaEntregaKm || data.distancia || 0);

    return {
      id,
      status: data.status || 'disponivel',
      prioridade: Boolean(data.prioridade),
      agendado: Boolean(data.agendado),
      categoria: data.categoria || 'carro',
      enderecoColetaTexto: data.enderecoColetaTexto || 'Coleta não informada',
      enderecoEntregaTexto: data.enderecoEntregaTexto || 'Entrega não informada',
      distanciaColetaKm,
      distanciaEntregaKm,
      distanciaTotalKm: distanciaColetaKm + distanciaEntregaKm,
      valorCliente,
      valorMotorista,
      pesoKg: Number(data.pesoKg || data.peso || 0), // Puxa dado da string antiga do formulário
      volumes: Number(data.volumes || data.qtdVolumes || 1), // Puxa do formulário antigo
      tipoCarga: data.tipoMaterial || data.tipoCarga || 'Geral', // Tipo da Carga
      etaMinutes: Number(data.etaMinutes || 20),
      motoristaId: data.motoristaId || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      multiplasEntregas: Boolean(data.multiplasEntregas),
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const frame = requestAnimationFrame(() => { if (mountedRef.current) setRuntimeReady(true); });
    return () => { mountedRef.current = false; cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (!user?.uid || !isOnline) return;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = window.setInterval(async () => {
      try { await dispatchRealtimeService.atualizarTripRealtime(user.uid, { heartbeat: Date.now() }); } 
      catch (error) { console.error('HEARTBEAT ERROR:', error); }
    }, 30000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [user, isOnline]);

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

  // MOTOR DE BUSCA (A Roleta)
  useEffect(() => {
    if (!runtimeReady || !user?.uid || !driverData || !isOnline) {
      setAvailableFreights([]); return;
    }
    setRadarLoading(true);
    // 🔥 Agora busca "disponivel" ou "aguardando_resposta"
    const freightsQuery = query(collection(db, 'fretes'), where('veiculo', '==', operationalCategory), where('status', 'in', ['disponivel', 'aguardando_resposta']), orderBy('createdAt', 'desc'), limit(10));
    
    const unsubscribe = onSnapshot(freightsQuery, snapshot => {
      if (!mountedRef.current) return;
      
      const next = snapshot.docs.map(document => normalizeFreight(document.id, document.data()))
        .filter(freight => !freight.motoristaId || freight.motoristaId === user.uid); // Exibe se for aberto ou mandado pro Motorista

      setAvailableFreights(next); 
      setRadarLoading(false);
    }, error => {
      console.error('FREIGHTS REALTIME ERROR:', error); setRadarLoading(false);
    });
    
    listenerRegistryRef.current.freights = unsubscribe;
    return () => unsubscribe();
  }, [runtimeReady, user, driverData, isOnline, operationalCategory, normalizeFreight]);

  // MOTOR DE VIAGEM ATIVA
  useEffect(() => {
    if (!runtimeReady || !user?.uid) { setActiveFreight(null); return; }
    const activeQuery = query(collection(db, 'fretes'), where('motoristaId', '==', user.uid), where('status', 'in', ACTIVE_STATUSES), orderBy('atualizadoEm', 'desc'), limit(1));
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
      await updateDoc(doc(db, 'fretes', freight.id), {
        status: 'aceito', 
        motoristaId: user.uid, 
        motoristaNome: driverData.nome || 'Motorista',
        motoristaZap: driverData.whatsapp || '', 
        acceptedAt: serverTimestamp(), 
        atualizadoEm: serverTimestamp(),
        aguardandoResposta: false // Remove a tag da roleta para o webhook parar!
      });
      await dispatchRealtimeService.aceitarCorrida(user.uid, freight.id);
      setSelectedFreight(null);
    } catch (error) { console.error('ACCEPT FREIGHT ERROR:', error); }
  }, [user, driverData]);

  const handleRejectFreight = useCallback(async (freight: OperationalFreight) => {
    setAvailableFreights(current => current.filter(item => item.id !== freight.id));
    setSelectedFreight(null);
  }, []);

  if (!runtimeReady || loading || checkingDriver) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="text-center">
          <h1 className="text-4xl font-black">FRETOGO</h1>
          <p className="mt-4 text-slate-400">Iniciando cockpit de voo...</p>
        </div>
      </div>
    );
  }

  if (!user) return <div className="min-h-screen bg-[#020617]"><DriverAuth /></div>;
  if (!driverData) return <div className="min-h-screen bg-[#020617]"><DriverCadastro onFinish={() => setCheckingDriver(true)} /></div>;

  if (driverData.status !== 'aprovado') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] px-4">
        <div className="w-full max-w-lg rounded-[2rem] border border-cyan-500/20 bg-slate-900/80 p-10 text-center backdrop-blur-xl">
          <h1 className="text-4xl font-black text-white">Cadastro em Análise</h1>
          <p className="mt-4 text-slate-400">Nossa central de tráfego está validando seu veículo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-10">
      
      {/* BANNER INSTALAÇÃO PWA */}
      {isInstallable && (
        <div className="sticky top-0 z-[100] w-full bg-cyan-600 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(8,145,178,0.3)]">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white">Baixe o Aplicativo</p>
            <p className="text-[10px] text-cyan-100 font-medium mt-0.5">Instale e feche fretes mais rápido.</p>
          </div>
          <button 
            onClick={handleInstallClick}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shrink-0"
          >
            <Download size={14} /> Instalar
          </button>
        </div>
      )}

      <DriverHeader user={user} />

      <DriverRadar isOnline={isOnline} setIsOnline={setIsOnline} user={user} driver={driverData} />
      
      <DriverApp freights={availableFreights} selectedFreight={selectedFreight} activeFreight={activeFreight} isOnline={isOnline} loading={radarLoading} driverCategory={operationalCategory} driverName={driverData.nome} onToggleOnline={handleToggleOnline} onSelectFreight={handleSelectFreight} onCloseFreight={handleCloseFreight} onAcceptFreight={handleAcceptFreight} onRejectFreight={handleRejectFreight}>
        
        {/* 🔥 TELA DE VIAGEM (QUANDO ACEITOU O FRETE) INJETADA AQUI */}
        {activeFreight?.id && (
          <div className="mx-auto mt-10 max-w-7xl px-4 pb-24 md:px-6">
            <DriverActiveTrip freteId={activeFreight.id} />
            <div className="mt-8">
              <ChatFrete freteId={activeFreight.id} tipoUsuario="motorista" nome={driverData.nome || 'Motorista'} />
            </div>
          </div>
        )}
      </DriverApp>
    </div>
  );
}
