import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { auth, provider, db, storage } from '../firebase'; 
import { signInWithPopup, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, runTransaction } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging'; 
import { Loader2, Truck, CheckCircle, Navigation, MapPin, AlertTriangle, ShieldCheck, UserPlus, Camera, Zap, Power, XCircle, Package, Download, Radar, DollarSign, Clock, MessageCircle } from 'lucide-react';
import ChatFrete from '../components/ChatFrete';

// IMPORTS DA NOVA ARQUITETURA
import { TripState } from '../state/tripStateMachine';
import { triggerRedispatch } from '../services/orchestrator';

// Tipos
interface Coords { lat: number; lng: number; }
interface OrderData { id?: string; status: string; distancia?: number; veiculo: string; valorTotal?: number; valorMotorista?: number; enderecoColetaTexto?: string; enderecoEntregaTexto?: string; peso?: string; qtdVolumes?: string; tipoMaterial?: string; motoristaId?: string | null; motoristaNome?: string; motoristaZap?: string; filaMatching?: string[]; }
interface DriverData { id?: string; nome: string; whatsapp: string; placa: string; categoria: string; status: 'pendente' | 'aprovado' | 'rejeitado'; score?: number; taxaAceite?: number; totalCorridas?: number; }
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

  // REFS DA ARQUITETURA
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
      audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audioRef.current.loop = true;
    }
    audioRef.current.play().then(() => {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }).catch(() => {});
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }, []);

  // PWA Prompt
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

  // Anti-Fantasma
  useEffect(() => {
    const handleBeforeUnload = () => { if (user && isOnline) deleteDoc(doc(db, 'motoristas_online', user.uid)).catch(); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, isOnline]);

  // GPS Heartbeat
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

  // Radar Ofertas Integrado com Orchestrator
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
               if (!actionLock.current) handleRecusar(docSnap.id); // Redispatch
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
    if (exibindoOferta && tempoRestante > 0) {
      timer = setTimeout(() => setTempoRestante(p => p - 1), 1000);
    }
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
    } finally {
      setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null;
    }
  };

  const handleRecusar = async (targetId?: string) => {
    const idToReject = targetId || ofertaFrete?.id;
    if (!idToReject || !user || actionLock.current) return;
    actionLock.current = true; stopAudio();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try {
      await triggerRedispatch(idToReject, user.uid);
    } catch (e) {}
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
          if (docSnap.exists()) { setDriverData({ id: docSnap.id, ...docSnap.data() } as DriverData); setFormStep(false); } 
          else { setFormStep(true); }
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
      <div className="w-20 h-20 bg-cyan-600 rounded-3xl flex items-center justify-center animate-pulse"><Truck className="text-white w-10 h-10" /></div>
      <Loader2 className="animate-spin text-cyan-500 w-8 h-8 mt-4" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-cyan-500/30 pb-20">
      
      {/* HEADER SIMPLES E FUNCIONAL */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/20"><Zap className="text-cyan-400 w-5 h-5"/></div>
          <span className="font-black text-xl italic tracking-tighter">FRETOGO</span>
        </div>
        {user && <button onClick={() => signOut(auth)} className="text-xs bg-slate-900 border border-white/10 px-4 py-2 rounded-full uppercase font-bold hover:bg-white/10 transition-colors">Sair</button>}
      </nav>

      <main className="max-w-xl mx-auto p-6">
        
        {toast && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-sm font-bold shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-red-500/20 text-red-300 border-red-500/30' : toast.type === 'success' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
            {toast.msg}
          </div>
        )}

        {/* MODAL OFERTA */}
        {exibindoOferta && ofertaFrete && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
            <div className="bg-slate-900 border-2 border-green-500 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1.5 bg-green-500 transition-all duration-1000" style={{ width: `${(tempoRestante / 15) * 100}%` }}></div>
              <h2 className="text-2xl font-black uppercase italic text-center mb-4 mt-2">Carga no Radar!</h2>
              <div className="bg-slate-950 p-4 rounded-xl mb-4">
                <p className="text-xs text-slate-400 uppercase font-black mb-1">Coleta</p>
                <p className="font-bold text-sm mb-3">{ofertaFrete.enderecoColetaTexto}</p>
                <p className="text-xs text-slate-400 uppercase font-black mb-1">Entrega</p>
                <p className="font-bold text-sm">{ofertaFrete.enderecoEntregaTexto}</p>
              </div>
              <div className="text-center mb-6">
                <p className="text-xs uppercase font-black text-slate-500 mb-1">Pagamento Líquido</p>
                <p className="text-4xl font-black text-green-400">R$ {ofertaFrete.valorMotorista?.toFixed(2).replace('.', ',')}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleRecusar()} className="flex-1 bg-slate-800 py-4 rounded-xl font-black uppercase text-sm">Recusar</button>
                <button onClick={handleAceitar} className="flex-[2] bg-green-500 text-slate-950 py-4 rounded-xl font-black uppercase text-sm shadow-lg hover:bg-green-400">Aceitar ( {tempoRestante}s )</button>
              </div>
            </div>
          </div>
        )}

        {!user ? (
          <div className="text-center mt-20">
            <h1 className="text-4xl font-black uppercase italic mb-8">Painel do Motorista</h1>
            <button onClick={() => signInWithPopup(auth, provider)} className="w-full bg-cyan-500 text-slate-950 py-5 rounded-2xl font-black uppercase text-lg flex justify-center items-center gap-2 hover:bg-cyan-400 transition-all">
              <Truck size={24}/> Acessar Conta
            </button>
          </div>
        ) : formStep ? (
          <div className="bg-slate-900 border border-white/10 p-6 rounded-[2rem]">
            <h2 className="text-2xl font-black uppercase italic mb-6">Seu Cadastro</h2>
            <div className="space-y-4">
              <input className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl font-bold text-sm outline-none" placeholder="Nome Completo" onChange={e => setForm({...form, nome: e.target.value})} />
              <input className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl font-bold text-sm outline-none" placeholder="CPF" onChange={e => setForm({...form, cpf: e.target.value})} />
              <input className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl font-bold text-sm outline-none" placeholder="Cidade/Estado" onChange={e => setForm({...form, cidadeEstado: e.target.value})} />
              <input className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl font-bold text-sm outline-none" placeholder="WhatsApp" onChange={e => setForm({...form, whatsapp: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input className="bg-slate-950 border border-white/10 p-4 rounded-xl font-bold text-sm outline-none uppercase" placeholder="Placa" onChange={e => setForm({...form, placa: e.target.value})} />
                <input className="bg-slate-950 border border-white/10 p-4 rounded-xl font-bold text-sm outline-none" placeholder="CNH" onChange={e => setForm({...form, cnh: e.target.value})} />
              </div>
              <select className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl font-bold text-sm outline-none" onChange={e => setForm({...form, categoria: e.target.value as VehicleType})}>
                <option value="carro_pequeno">Carro Pequeno</option><option value="utilitario">Utilitário</option><option value="toco">Caminhão Toco</option><option value="truck">Truck</option><option value="moto">Moto</option>
              </select>
              <label className="border-2 border-dashed border-white/20 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-colors">
                <Camera size={24} className="mb-2 text-cyan-400"/>
                <span className="text-xs font-bold uppercase">{docFile ? 'Foto Anexada' : 'Tirar Selfie com CNH'}</span>
                <input type="file" hidden accept="image/jpeg,image/png" capture="user" onChange={(e) => handleFileChange(e, setDocFile)} />
              </label>
              <button onClick={handleCadastro} disabled={uploadingDocs} className="w-full bg-cyan-500 text-slate-950 py-5 rounded-2xl font-black uppercase mt-4 flex items-center justify-center gap-2">
                {uploadingDocs ? <Loader2 className="animate-spin" /> : 'Enviar Cadastro'}
              </button>
            </div>
          </div>
        ) : driverData?.status !== 'aprovado' ? (
          <div className="text-center mt-20 bg-slate-900 border border-white/10 p-8 rounded-[2rem]">
            <ShieldCheck className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black uppercase italic mb-2">Em Análise</h2>
            <p className="text-sm text-slate-400 mb-8">Sua conta está sendo validada pelo time.</p>
            <a href="https://chat.whatsapp.com/IGylgsZPYhsDfMZDKzVjHT" target="_blank" rel="noreferrer" className="block bg-green-500 text-slate-950 py-4 rounded-xl font-black uppercase text-sm">
              Entrar no Grupo VIP
            </a>
          </div>
        ) : activeFrete ? (
          <div className="bg-slate-900 border border-cyan-500/30 p-6 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic mb-6 flex items-center gap-2"><Truck className="text-cyan-400"/> Em Operação</h2>
            <div className="bg-slate-950 p-5 rounded-2xl mb-6">
              <p className="text-[10px] font-black uppercase text-slate-500">Coleta</p>
              <p className="text-sm font-bold mb-4">{activeFrete.enderecoColetaTexto}</p>
              <p className="text-[10px] font-black uppercase text-slate-500">Entrega</p>
              <p className="text-sm font-bold">{activeFrete.enderecoEntregaTexto}</p>
            </div>
            
            <div className="space-y-4">
              <button onClick={() => openMaps(activeFrete.status === TripState.ACEITO ? activeFrete.origemLat! : activeFrete.destinoLat!, activeFrete.status === TripState.ACEITO ? activeFrete.origemLng! : activeFrete.destinoLng!)} className="w-full bg-slate-800 py-4 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-2"><Navigation size={18}/> GPS</button>
              
              {activeFrete.status === TripState.ACEITO && <button onClick={() => updateStatusFrete(TripState.COLETANDO)} className="w-full bg-cyan-500 text-slate-950 py-5 rounded-xl font-black uppercase text-sm">Cheguei na Coleta</button>}
              {activeFrete.status === TripState.COLETANDO && <button onClick={() => updateStatusFrete(TripState.EM_TRANSPORTE)} className="w-full bg-yellow-400 text-slate-950 py-5 rounded-xl font-black uppercase text-sm">Carga Embarcada</button>}
              {activeFrete.status === TripState.EM_TRANSPORTE && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                  <input type="file" id="foto" hidden capture="environment" onChange={(e) => handleFileChange(e, setComprovante)} />
                  <label htmlFor="foto" className="flex justify-center items-center gap-2 border-2 border-dashed border-white/20 py-4 rounded-xl mb-4 font-bold text-xs uppercase cursor-pointer hover:border-cyan-500/50 text-slate-300">
                    <Camera size={16}/> {comprovante ? "FOTO ANEXADA!" : "TIRAR FOTO DO CANHOTO"}
                  </label>
                  <button onClick={() => updateStatusFrete(TripState.ENTREGUE)} className="w-full bg-green-500 text-slate-950 py-5 rounded-xl font-black uppercase text-sm">Finalizar Corrida</button>
                </div>
              )}
            </div>
            {activeFrete.id && <div className="mt-8 pt-6 border-t border-white/10"><ChatFrete freteId={activeFrete.id} tipoUsuario="motorista" nome={driverData?.nome || "Motorista"} /></div>}
          </div>
        ) : (
          <div className="text-center mt-10">
            <button onClick={toggleStatus} className={`w-40 h-40 rounded-full flex flex-col items-center justify-center mx-auto mb-10 transition-all border-4 ${isOnline ? 'bg-slate-950 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.4)]' : 'bg-slate-900 border-slate-700'}`}>
              <Power className={`w-12 h-12 mb-2 ${isOnline ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className={`text-xs font-black uppercase tracking-widest ${isOnline ? 'text-cyan-400' : 'text-slate-500'}`}>{isOnline ? 'Online' : 'Offline'}</span>
            </button>
            {isOnline ? (
              <div className="animate-in fade-in">
                <h2 className="text-2xl font-black italic uppercase mb-2">Radar Ativo</h2>
                <p className="text-cyan-400 font-bold text-sm mb-8 animate-pulse">{loadingMessage}</p>
                <div className="bg-slate-900 p-6 rounded-3xl border border-white/10 text-left">
                  <p className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><MapPin size={14}/> Destino Preferencial (Volta)</p>
                  <input className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 font-bold text-sm outline-none text-white focus:border-cyan-500/50" placeholder="Ex: Guarulhos" value={backhaulDestino} onChange={e => setBackhaulDestino(e.target.value)} />
                </div>
              </div>
            ) : (
              <p className="text-slate-500 font-medium px-6">Você está invisível. Ligue o radar para receber fretes.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
