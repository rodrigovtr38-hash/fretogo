import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, provider, db, storage } from '../firebase'; 
import { signInWithPopup, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, runTransaction } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging'; 
import { Loader2, Truck, CheckCircle, Navigation, MapPin, AlertTriangle, ShieldCheck, Camera, Zap, Power, XCircle, Package, Download, Radar, DollarSign, Clock, MessageCircle, UserPlus } from 'lucide-react';
import ChatFrete from '../components/ChatFrete';

// IMPORTS DA NOVA ARQUITETURA
import { TripState } from '../state/tripStateMachine';
import { triggerRedispatch } from '../services/orchestrator';

interface Coords { lat: number; lng: number; }
interface OrderData { id?: string; status: string; distancia?: number; veiculo: string; valorTotal?: number; valorMotorista?: number; enderecoColetaTexto?: string; enderecoEntregaTexto?: string; peso?: string; qtdVolumes?: string; tipoMaterial?: string; motoristaId?: string | null; motoristaNome?: string; motoristaZap?: string; filaMatching?: string[]; }
interface DriverData { id?: string; nome?: string; whatsapp?: string; placa?: string; categoria?: string; status?: 'pendente' | 'aprovado' | 'rejeitado'; score?: number; taxaAceite?: number; totalCorridas?: number; }
type VehicleType = 'moto' | 'carro_pequeno' | 'utilitario' | 'toco' | 'truck' | 'carreta_ls' | 'bi_trem_cegonha';

const VEHICLE_CONFIG: Record<string, { nome: string; fator: number }> = {
  moto: { nome: 'Moto', fator: 0.6 }, carro_pequeno: { nome: 'Carro Pequeno', fator: 1.0 },
  utilitario: { nome: 'Utilitário', fator: 1.6 }, toco: { nome: 'Caminhão Toco', fator: 2.9 },
  truck: { nome: 'Caminhão Truck', fator: 3.8 }, carreta_ls: { nome: 'Carreta LS', fator: 5.5 },
  bi_trem_cegonha: { nome: 'Bi-trem / Cegonha', fator: 7.2 }
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const GPS_HEARTBEAT_MS = 15000;
const OFFER_TIMEOUT_MS = 15000;

export default function Motorista() {
  const [user, setUser] = useState<{uid: string, email: string|null} | null>(null);
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [activeFrete, setActiveFrete] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingDriver, setCheckingDriver] = useState(true);
  const [isOnline, setIsOnline] = useState(false); 
  const [backhaulDestino, setBackhaulDestino] = useState(''); 
  const [comprovante, setComprovante] = useState<File | null>(null);

  const [form, setForm] = useState({ nome: '', whatsapp: '', placa: '', categoria: 'carro_pequeno' as VehicleType, cnh: '', renavam: '', cpf: '', cidadeEstado: '' });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [formStep, setFormStep] = useState(false);

  const [ofertaFrete, setOfertaFrete] = useState<OrderData | null>(null);
  const [tempoRestante, setTempoRestante] = useState(15);
  const [exibindoOferta, setExibindoOferta] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Buscando cargas...');
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'warning' | 'success'} | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const actionLock = useRef(false);
  const lastGpsUpdate = useRef(0); 
  const currentOfferId = useRef<string | null>(null); 
  const watchIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = useCallback((msg: string, type: 'error' | 'warning' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const initAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('[https://actions.google.com/sounds/v1/alarms/beep_short.ogg](https://actions.google.com/sounds/v1/alarms/beep_short.ogg)');
      audioRef.current.loop = true;
    }
    audioRef.current.play().then(() => { audioRef.current?.pause(); if (audioRef.current) audioRef.current.currentTime = 0; }).catch(() => {});
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => { if (user && isOnline) deleteDoc(doc(db, 'motoristas_online', user.uid)).catch(); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, isOnline]);

  useEffect(() => {
    if (user && driverData?.status === 'aprovado' && isOnline) {
      const updatePosition = async (pos: GeolocationPosition) => {
        const now = Date.now();
        if (now - lastGpsUpdate.current >= GPS_HEARTBEAT_MS) {
          lastGpsUpdate.current = now;
          try {
            await setDoc(doc(db, 'motoristas_online', user.uid), {
              nome: driverData.nome, whatsapp: driverData.whatsapp, lat: pos.coords.latitude, lng: pos.coords.longitude,
              categoria: driverData.categoria, status: activeFrete ? 'ocupado' : 'disponivel', emRota: !!activeFrete,
              destinoPreferencial: backhaulDestino, lastSeen: serverTimestamp() 
            }, { merge: true });
          } catch (e) {}
        }
      };
      watchIdRef.current = navigator.geolocation.watchPosition(updatePosition, () => {}, { enableHighAccuracy: true });
    }
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [user, driverData, isOnline, activeFrete, backhaulDestino]);

  useEffect(() => {
    if (!user || !isOnline || activeFrete) {
      setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null; stopAudio(); return;
    }
    const q = query(collection(db, 'fretes'), where('status', '==', TripState.DISPONIVEL), where('filaMatching', 'array-contains', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!isOnline) return;
      let foundOffer = false;
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as OrderData;
        if (!data.motoristaId && data.filaMatching && data.filaMatching[0] === user.uid) {
          if (currentOfferId.current !== docSnap.id) {
            actionLock.current = false; currentOfferId.current = docSnap.id;
            setOfertaFrete({ id: docSnap.id, ...data }); setExibindoOferta(true); setTempoRestante(15); 
            if (audioRef.current) audioRef.current.play().catch(()=>{});
            
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
               if (!actionLock.current) handleRecusar(docSnap.id); 
            }, OFFER_TIMEOUT_MS);
          }
          foundOffer = true; break; 
        }
      }
      if (!foundOffer) { 
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null; stopAudio(); 
      }
    });
    return () => { unsub(); if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [user, isOnline, activeFrete]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (exibindoOferta && tempoRestante > 0) { timer = setTimeout(() => setTempoRestante(p => p - 1), 1000); }
    return () => clearTimeout(timer);
  }, [exibindoOferta, tempoRestante]);

  const handleAceitar = async () => {
    if (!ofertaFrete || !user || actionLock.current) return;
    actionLock.current = true; stopAudio();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try {
      const freteRef = doc(db, 'fretes', ofertaFrete.id!);
      await runTransaction(db, async (t) => {
        const snap = await t.get(freteRef);
        if (!snap.exists()) throw new Error("CANCELADO");
        const data = snap.data() as OrderData;
        if (data.status !== TripState.DISPONIVEL || data.motoristaId) throw new Error("JA_ACEITO");
        t.update(freteRef, { status: TripState.ACEITO, motoristaId: user.uid, motoristaNome: driverData?.nome || 'Motorista', motoristaZap: driverData?.whatsapp || '', aceitoEm: serverTimestamp() });
      });
      await updateDoc(doc(db, 'motoristas_online', user.uid), { status: 'ocupado', emRota: true });
      showToast("Corrida aceita com sucesso.", "success");
    } catch (e: any) {
      showToast("Esta corrida já não está disponível.", "warning");
    } finally { setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null; }
  };

  const handleRecusar = async (targetId?: string) => {
    const idToReject = targetId || ofertaFrete?.id;
    if (!idToReject || !user || actionLock.current) return;
    actionLock.current = true; stopAudio();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try { await triggerRedispatch(idToReject, user.uid); } catch (e) {}
    setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { showToast("A imagem é muito pesada (Max 10MB).", "warning"); return; }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) { showToast("Formato inválido. Use JPG ou PNG.", "error"); return; }
    setter(file);
  };

  const handleCadastro = async () => {
    if (!form.nome || !form.cpf || !form.cnh || !form.placa || !form.renavam || !form.whatsapp || !form.cidadeEstado || !docFile) {
      showToast("Preencha todos os campos e anexe a Selfie.", "warning"); return;
    }
    setUploadingDocs(true); 
    try {
      const docRef = ref(storage, `motoristas/${user!.uid}/documento_selfie`);
      await uploadBytes(docRef, docFile);
      const documentoUrl = await getDownloadURL(docRef);
      await setDoc(doc(db, 'motoristas_cadastros', user!.uid), { ...form, email: user!.email, documentoUrl, status: 'pendente', createdAt: serverTimestamp() });
      setDriverData({ id: user!.uid, ...form, status: 'pendente' } as any);
      setFormStep(false);
    } catch (e: any) { showToast("Erro ao cadastrar. Tente novamente.", "error"); } 
    finally { setUploadingDocs(false); }
  };

  useEffect(() => {
    let unsubCad: any; let unsubFretes: any;
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email });
        unsubCad = onSnapshot(doc(db, 'motoristas_cadastros', u.uid), (docSnap) => {
          if (docSnap.exists() && docSnap.data().status) { 
            setDriverData({ id: docSnap.id, ...docSnap.data() } as DriverData); 
            setFormStep(false); 
          } else { 
            setFormStep(true); 
          }
          setCheckingDriver(false);
        });
        unsubFretes = onSnapshot(query(collection(db, 'fretes'), where('motoristaId', '==', u.uid)), (s) => {
          const ativo = s.docs.map(d => ({id: d.id, ...d.data()}) as OrderData).find(f => [TripState.ACEITO, TripState.INDO_COLETA, TripState.COLETANDO, TripState.EM_TRANSPORTE].includes(f.status as TripState));
          setActiveFrete(ativo || null); setLoading(false);
        });
      } else { setUser(null); setLoading(false); setCheckingDriver(false); unsubCad?.(); unsubFretes?.(); }
    });
    return () => { unsubscribeAuth(); unsubCad?.(); unsubFretes?.(); };
  }, []);

  const toggleStatus = async () => {
    if (!user) return;
    initAudio(); 
    if (isOnline) { setIsOnline(false); try { await deleteDoc(doc(db, 'motoristas_online', user.uid)); } catch(e){} } 
    else { setIsOnline(true); }
  };

  const updateStatusFrete = async (nextStatus: TripState) => {
    if (!activeFrete || !activeFrete.id || !user) return;
    if (nextStatus === TripState.ENTREGUE) {
      if (!comprovante) { showToast("Anexe a foto do canhoto.", "warning"); return; }
      setLoading(true);
      try {
        const fileRef = ref(storage, `comprovantes/${activeFrete.id}`);
        await uploadBytes(fileRef, comprovante);
        const url = await getDownloadURL(fileRef);
        await updateDoc(doc(db, 'fretes', activeFrete.id), { status: nextStatus, comprovanteUrl: url, entregueEm: serverTimestamp() });
        await updateDoc(doc(db, 'motoristas_online', user.uid), { status: 'disponivel', emRota: false });
        setComprovante(null);
      } catch(e) { showToast("Erro no envio.", "error"); }
      setLoading(false);
    } else {
      const updateData: any = { status: nextStatus };
      if (nextStatus === TripState.COLETANDO) updateData.coletaEm = serverTimestamp();
      if (nextStatus === TripState.EM_TRANSPORTE) updateData.transporteEm = serverTimestamp();
      await updateDoc(doc(db, 'fretes', activeFrete.id), updateData);
    }
  };

  const openMaps = (lat: number, lng: number) => { window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank'); };

  if (loading || checkingDriver) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center animate-pulse shadow-[0_0_40px_rgba(37,99,235,0.4)]">
        <Truck className="text-white w-12 h-12" />
      </div>
      <Loader2 className="animate-spin text-cyan-500 w-8 h-8 mt-4" />
    </div>
  );

  return (
    <div className="relative min-h-screen w-full bg-[#020617] text-slate-200 font-sans overflow-x-hidden selection:bg-cyan-500/30">
      
      {/* BACKGROUND PREMIUM */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-[#020617]"></div>
        <div className="absolute left-[-10%] top-[-5%] h-[40rem] w-[40rem] rounded-full bg-cyan-600/15 blur-[140px] mix-blend-screen" />
        <div className="absolute right-[-10%] top-[10%] h-[35rem] w-[35rem] rounded-full bg-blue-600/15 blur-[160px] mix-blend-screen" />
      </div>

      {/* NAVBAR */}
      <header className="relative z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
              <Zap className="h-6 w-6 text-cyan-400 fill-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
            </div>
            <span className="text-2xl font-black italic tracking-tighter text-white">FRETOGO</span>
          </div>
          {user && (
            <button onClick={() => signOut(auth)} className="rounded-[1.25rem] border border-white/10 bg-white/5 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
              Sair
            </button>
          )}
        </nav>
      </header>

      {/* A CAIXA FORTE DO TAILWIND V4 */}
      <main className="relative z-10 w-full grid place-items-center px-4 py-8 pb-32 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl">
        
        {/* TOAST RENDER */}
        {toast && (
          <div className="fixed bottom-8 left-1/2 z-[120] -translate-x-1/2 animate-in slide-in-from-bottom-5">
            <div className={`rounded-2xl border px-8 py-5 text-sm font-black uppercase tracking-widest shadow-2xl backdrop-blur-xl ${toast.type === 'success' ? 'border-green-500/30 bg-green-950/80 text-green-300 shadow-[0_10px_40px_rgba(34,197,94,0.2)]' : toast.type === 'warning' ? 'border-yellow-500/30 bg-yellow-950/80 text-yellow-300 shadow-[0_10px_40px_rgba(250,204,21,0.2)]' : 'border-red-500/30 bg-red-950/80 text-red-300 shadow-[0_10px_40px_rgba(239,68,68,0.2)]'}`}>
              {toast.msg}
            </div>
          </div>
        )}

        {/* MODAL OFERTA */}
        {exibindoOferta && ofertaFrete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-md animate-in zoom-in-95 duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-[2.5rem] border border-green-500/30 bg-slate-900 p-8 text-center shadow-[0_20px_60px_rgba(34,197,94,0.2)] relative">
              <div className="absolute left-0 top-0 h-1.5 bg-green-500 transition-all duration-1000" style={{ width: `${(tempoRestante / 15) * 100}%` }}></div>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-green-500/20 bg-green-500/10">
                <Zap className="h-10 w-10 text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
              </div>
              <h2 className="mb-2 text-3xl font-black uppercase italic tracking-tight text-white">Carga no Radar!</h2>
              <p className="mb-6 flex justify-center items-center gap-2 text-sm font-black text-green-400 animate-pulse"><Clock size={16} /> 00:{tempoRestante.toString().padStart(2, '0')}</p>
              
              <div className="mb-6 rounded-3xl border border-white/5 bg-slate-950/60 p-6 text-left shadow-inner">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Local de Coleta</p>
                  <p className="text-sm font-bold text-white">{ofertaFrete.enderecoColetaTexto}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Local de Entrega</p>
                  <p className="text-sm font-bold text-white">{ofertaFrete.enderecoEntregaTexto}</p>
                </div>
              </div>
              
              <div className="mb-8 rounded-3xl border border-white/5 bg-slate-950/60 p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Ganhos Operacionais</p>
                <h3 className="text-5xl font-black tracking-tighter text-green-400 drop-shadow-md">R$ {ofertaFrete.valorMotorista?.toFixed(2).replace('.', ',')}</h3>
                <p className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">{ofertaFrete.distancia?.toFixed(1)} km percorridos</p>
              </div>
              
              <div className="flex gap-4">
                <button onClick={() => handleRecusar()} className="flex-1 rounded-[1.25rem] border border-white/10 bg-white/5 px-6 py-5 text-sm font-black uppercase tracking-widest text-slate-400 transition-colors hover:bg-white/10 hover:text-white">Recusar</button>
                <button onClick={handleAceitar} className="flex-[2] rounded-[1.25rem] bg-green-500 px-6 py-5 text-[15px] font-black uppercase italic tracking-widest text-slate-950 shadow-[0_15px_30px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] active:scale-95">Aceitar Carga</button>
              </div>
            </div>
          </div>
        )}

        {/* FLUXO AUTH / CADASTRO / RADAR / CORRIDA */}
        {!user ? (
          <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center min-h-[60vh] mt-10">
            <div className="w-full rounded-[3rem] border border-white/10 bg-slate-900/60 p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 shadow-inner">
                <Truck className="h-12 w-12 text-cyan-400" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">Acesso Restrito</p>
              <h1 className="mt-4 mb-8 text-4xl font-black italic tracking-tight text-white">Painel do Parceiro</h1>
              <button onClick={() => signInWithPopup(auth, provider)} className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-cyan-500 px-8 py-5 text-[15px] font-black uppercase italic tracking-[0.2em] text-slate-950 shadow-[0_15px_40px_rgba(6,182,212,0.35)] transition-all hover:scale-[1.02] active:scale-95 hover:bg-cyan-400">
                <Truck size={20}/> Entrar no Radar
              </button>
            </div>
          </div>
        ) : formStep ? (
          <div className="mx-auto w-full max-w-md rounded-[2.5rem] border border-white/10 bg-slate-900/60 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <div className="flex items-center justify-center gap-4 mb-8 pb-6 border-b border-slate-800">
              <div className="bg-cyan-500/20 p-3 rounded-2xl border border-cyan-500/30">
                 <UserPlus className="text-cyan-400 w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight leading-none text-white">Seu Veículo,<br/><span className="text-cyan-400">Seu Dinheiro.</span></h2>
            </div>
            <div className="space-y-4">
              <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none" placeholder="Nome Completo" onChange={e => setForm({...form, nome: e.target.value})} />
              <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none" placeholder="CPF" onChange={e => setForm({...form, cpf: e.target.value})} />
              <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none" placeholder="Cidade/Estado" onChange={e => setForm({...form, cidadeEstado: e.target.value})} />
              <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none" placeholder="WhatsApp" onChange={e => setForm({...form, whatsapp: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none uppercase" placeholder="Placa" onChange={e => setForm({...form, placa: e.target.value})} />
                <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none" placeholder="CNH" onChange={e => setForm({...form, cnh: e.target.value})} />
              </div>
              <select className="w-full cursor-pointer appearance-none rounded-2xl border border-white/10 bg-slate-950 p-5 text-sm font-bold text-white outline-none focus:border-cyan-500/50 transition-colors" onChange={e => setForm({...form, categoria: e.target.value as VehicleType})}>
                {Object.entries(VEHICLE_CONFIG).map(([key, conf]) => (<option key={key} value={key}>{conf.nome}</option>))}
              </select>
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 p-8 transition-colors hover:border-cyan-500/50 bg-slate-950/30">
                <Camera size={32} className="mb-3 text-cyan-400"/>
                <span className="text-xs font-black uppercase tracking-widest text-slate-300 mb-1">{docFile ? 'Foto Anexada' : 'Tirar Selfie com CNH'}</span>
                <span className="text-[10px] text-slate-500 font-medium">O documento deve estar legível ao lado do rosto.</span>
                <input type="file" hidden accept="image/jpeg,image/png,image/webp" capture="user" onChange={(e) => handleFileChange(e, setDocFile)} />
              </label>
              <button onClick={handleCadastro} disabled={uploadingDocs} className="mt-8 flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-cyan-500 px-6 py-5 text-[15px] font-black uppercase italic tracking-[0.2em] text-slate-950 shadow-[0_15px_40px_rgba(6,182,212,0.35)] transition-all hover:scale-[1.02] active:scale-95 disabled:bg-slate-800 disabled:text-slate-600">
                {uploadingDocs ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Enviar Cadastro'}
              </button>
            </div>
          </div>
        ) : driverData?.status !== 'aprovado' ? (
          <div className="mx-auto mt-20 flex w-full max-w-md flex-col items-center justify-center rounded-[3rem] border border-cyan-500/30 bg-slate-900/80 p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 shadow-inner">
              <ShieldCheck className="h-12 w-12 text-cyan-400" />
            </div>
            <h2 className="mb-4 text-3xl font-black uppercase italic tracking-tight text-white">Em Análise</h2>
            <p className="mb-10 text-sm font-medium leading-relaxed text-slate-400">Sua conta está sendo validada pelo time de segurança. Esse processo garante cargas seguras para todos os parceiros na plataforma.</p>
            <a href="[https://chat.whatsapp.com/IGylgsZPYhsDfMZDKzVjHT](https://chat.whatsapp.com/IGylgsZPYhsDfMZDKzVjHT)" target="_blank" rel="noreferrer" className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-green-500 px-6 py-5 text-[14px] font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_15px_40px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] active:scale-95">
              Entrar no Grupo VIP
            </a>
          </div>
        ) : activeFrete ? (
          <div className="mx-auto w-full max-w-lg rounded-[3rem] border border-cyan-500/30 bg-slate-900/80 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-10">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-black uppercase italic tracking-tight text-white"><Truck className="h-8 w-8 text-cyan-400"/> Em Operação</h2>
            
            <div className="mb-8 rounded-[2rem] border border-white/5 bg-slate-950/60 p-6 shadow-inner">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Coleta</p>
              <p className="mb-6 text-sm font-bold leading-relaxed text-white">{activeFrete.enderecoColetaTexto}</p>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Entrega</p>
              <p className="text-sm font-bold leading-relaxed text-white">{activeFrete.enderecoEntregaTexto}</p>
            </div>
            
            <div className="space-y-4">
              <button onClick={() => openMaps(activeFrete.status === TripState.ACEITO ? activeFrete.origemLat! : activeFrete.destinoLat!, activeFrete.status === TripState.ACEITO ? activeFrete.origemLng! : activeFrete.destinoLng!)} className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950 px-6 py-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-inner transition-colors hover:bg-slate-900">
                <Navigation size={20}/> Abrir no GPS
              </button>
              
              {activeFrete.status === TripState.ACEITO && <button onClick={() => updateStatusFrete(TripState.COLETANDO)} className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-cyan-500 px-6 py-5 text-[15px] font-black uppercase italic tracking-[0.2em] text-slate-950 shadow-[0_15px_40px_rgba(6,182,212,0.35)] transition-all hover:scale-[1.02] active:scale-95"><MapPin className="h-6 w-6"/> Cheguei na Coleta</button>}
              {activeFrete.status === TripState.COLETANDO && <button onClick={() => updateStatusFrete(TripState.EM_TRANSPORTE)} className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-yellow-400 px-6 py-5 text-[15px] font-black uppercase italic tracking-[0.2em] text-slate-950 shadow-[0_15px_40px_rgba(250,204,21,0.35)] transition-all hover:scale-[1.02] active:scale-95"><Truck className="h-6 w-6"/> Carga Embarcada</button>}
              {activeFrete.status === TripState.EM_TRANSPORTE && (
                <div className="rounded-[2rem] border border-white/5 bg-slate-950/60 p-6 shadow-inner mt-6">
                  <input type="file" id="foto" hidden capture="environment" onChange={(e) => handleFileChange(e, setComprovante)} />
                  <label htmlFor="foto" className={`mb-6 flex cursor-pointer items-center justify-center gap-3 rounded-[1.5rem] border-2 border-dashed py-6 text-xs font-black uppercase tracking-[0.2em] transition-colors ${comprovante ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-white/20 text-slate-400 hover:border-cyan-500/50'}`}>
                    <Camera size={20}/> {comprovante ? "FOTO ANEXADA" : "FOTOGRAFAR CANHOTO"}
                  </label>
                  <button onClick={() => updateStatusFrete(TripState.ENTREGUE)} className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-green-500 px-6 py-5 text-[15px] font-black uppercase italic tracking-[0.2em] text-slate-950 shadow-[0_15px_40px_rgba(34,197,94,0.35)] transition-all hover:scale-[1.02] active:scale-95"><CheckCircle className="h-6 w-6"/> Finalizar Corrida</button>
                </div>
              )}
            </div>
            {activeFrete.id && <div className="mt-8 border-t border-white/5 pt-8"><ChatFrete freteId={activeFrete.id} tipoUsuario="motorista" nome={driverData?.nome || "Motorista"} /></div>}
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-md text-center">
            <button onClick={toggleStatus} className={`relative mx-auto mb-12 flex h-48 w-48 flex-col items-center justify-center rounded-full border-[6px] transition-all duration-300 hover:scale-[1.02] active:scale-95 ${isOnline ? 'border-cyan-400 bg-slate-950 shadow-[0_0_80px_rgba(6,182,212,0.25)]' : 'border-slate-800 bg-slate-900 shadow-xl'}`}>
              <Power className={`mb-3 h-14 w-14 ${isOnline ? 'text-cyan-400' : 'text-slate-600'}`} />
              <span className={`text-xs font-black uppercase tracking-[0.25em] ${isOnline ? 'text-cyan-400' : 'text-slate-600'}`}>{isOnline ? 'Online' : 'Offline'}</span>
            </button>

            {isOnline ? (
              <div className="animate-in fade-in duration-500">
                <h2 className="mb-3 text-3xl font-black uppercase italic tracking-tight text-white">Radar Ativo</h2>
                <p className="mb-10 text-sm font-bold uppercase tracking-widest text-cyan-400 animate-pulse">{loadingMessage}</p>
                <div className="rounded-[2rem] border border-white/10 bg-slate-900/60 p-8 text-left shadow-xl backdrop-blur-md">
                  <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"><MapPin size={16} className="text-blue-400"/> Rota de Retorno</p>
                  <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500/50" placeholder="Ex: Campinas" value={backhaulDestino} onChange={e => setBackhaulDestino(e.target.value)} />
                  <p className="mt-4 text-center text-xs font-medium leading-relaxed text-slate-500">Vamos buscar cargas que voltem para essa região.</p>
                </div>
              </div>
            ) : (
              <p className="px-6 text-sm font-medium leading-relaxed text-slate-400">Você está invisível. Ligue o radar para receber fretes inteligentes na sua região.</p>
            )}

            {!isOnline && deferredPrompt && (
              <button onClick={handleInstallClick} className="mx-auto mt-12 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-300 transition-colors hover:bg-slate-800">
                <Download size={18} /> Instalar Painel
              </button>
            )}
          </div>
        )}
        
        </div>
      </main>
    </div>
  );
}
