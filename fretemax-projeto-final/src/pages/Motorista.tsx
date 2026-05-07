import { useState, useEffect, useRef } from 'react';
import { auth, provider, db, storage } from '../firebase'; 
import { signInWithPopup, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, runTransaction, arrayRemove } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging'; 
import { Loader2, Truck, CheckCircle, Navigation, MapPin, AlertCircle, ShieldCheck, UserPlus, Camera, Zap, Power, AlertTriangle, XCircle, Package } from 'lucide-react';
import ChatFrete from '../components/ChatFrete';
import { UserProfile, DriverData, OrderData, VehicleType } from '../types';

const VEHICLE_CONFIG: Record<string, { nome: string; fator: number }> = {
  'moto': { nome: 'Moto', fator: 0.6 },
  'carro_pequeno': { nome: 'Carro Pequeno', fator: 1.0 },
  'utilitario': { nome: 'Utilitário', fator: 1.6 },
  'toco': { nome: 'Caminhão Toco', fator: 2.9 },
  'truck': { nome: 'Caminhão Truck', fator: 3.8 },
  'carreta_ls': { nome: 'Carreta LS', fator: 5.5 },
  'bi_trem_cegonha': { nome: 'Bi-trem / Cegonha', fator: 7.2 }
};

export default function Motorista() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [activeFrete, setActiveFrete] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false); 
  const [backhaulDestino, setBackhaulDestino] = useState(''); 
  const [comprovante, setComprovante] = useState<File | null>(null);

  const [form, setForm] = useState({ nome: '', whatsapp: '', placa: '', categoria: 'carro_pequeno' as VehicleType, cnh: '', renavam: '' });
  const [formStep, setFormStep] = useState(false);

  const [ofertaFrete, setOfertaFrete] = useState<OrderData | null>(null);
  const [tempoRestante, setTempoRestante] = useState(15);
  const [exibindoOferta, setExibindoOferta] = useState(false);

  const [toast, setToast] = useState<{msg: string, type: 'error' | 'warning'} | null>(null);

  const actionHandled = useRef(false);
  const lastGpsUpdate = useRef(0); 
  const currentOfferId = useRef<string | null>(null); 
  
  // 🔥 MOTOR DE ÁUDIO INJETADO
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (msg: string, type: 'error' | 'warning' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    // Inicializa o apito do motorista
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audioRef.current.loop = true; // Toca em loop até interagir
    
    const requestPermission = async () => {
      try {
        const messaging = getMessaging();
        const token = await getToken(messaging, { vapidKey: 'SUA_CHAVE_VAPID_AQUI' });
        if (token) localStorage.setItem('fcm_token', token);
      } catch (e) { console.warn("Aviso: Permissão push bloqueada."); }
    };
    if (user) requestPermission();
  }, [user]);

  useEffect(() => {
    let watchId: number;
    if (user && driverData?.status === 'aprovado' && isOnline) {
      watchId = navigator.geolocation.watchPosition(async (pos) => {
        const now = Date.now();
        if (now - lastGpsUpdate.current < 5000) return;
        lastGpsUpdate.current = now;
        const { latitude, longitude } = pos.coords;
        
        await setDoc(doc(db, 'motoristas_online', user.uid), {
          nome: driverData.nome, whatsapp: driverData.whatsapp, lat: latitude, lng: longitude,
          categoria: driverData.categoria, score: driverData.score || 5, taxaAceite: driverData.taxaAceite || 1,
          totalCorridas: driverData.totalCorridas || 1, destinoPreferencial: backhaulDestino, 
          status: activeFrete ? 'ocupado' : 'disponivel', emRota: !!activeFrete,
          origemAtualLat: latitude, origemAtualLng: longitude, destinoAtualLat: activeFrete?.destinoLat || null,
          destinoAtualLng: activeFrete?.destinoLng || null, tokenFCM: localStorage.getItem('fcm_token') || null,
          lastSeen: serverTimestamp() 
        }, { merge: true });
      }, 
      (err) => console.error("Erro GPS:", err), 
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 });
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [user, driverData, isOnline, activeFrete, backhaulDestino]);

  useEffect(() => {
    if (!user || !isOnline || activeFrete) {
      setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null; stopAudio(); return;
    }
    const q = query(collection(db, 'fretes'), where('status', '==', 'disponivel'), where('filaMatching', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isOnline) return;
      if (snapshot.empty) {
        setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null; stopAudio(); return;
      }
      let foundOffer = false;
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as OrderData;
        const freteId = docSnap.id;
        if (!data.motoristaId && data.filaMatching && data.filaMatching[0] === user.uid) {
          if (currentOfferId.current !== freteId) {
            actionHandled.current = false; currentOfferId.current = freteId;
            setOfertaFrete({ id: freteId, ...data }); setExibindoOferta(true); setTempoRestante(15); 
            // 🚨 DISPARA O ALARME SONORO
            if (audioRef.current) audioRef.current.play().catch(e => console.log("Áudio bloqueado", e));
          }
          foundOffer = true; break; 
        }
      }
      if (!foundOffer) { setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null; stopAudio(); }
    });
    return () => unsubscribe();
  }, [user, isOnline, activeFrete]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (exibindoOferta && tempoRestante > 0) {
      timer = setTimeout(() => setTempoRestante(prev => prev - 1), 1000);
    } else if (exibindoOferta && tempoRestante === 0 && !actionHandled.current) {
      // 🔥 FEEDBACK DE PERDA RESOLVIDO (A7)
      showToast('Tempo esgotado. A carga foi para o próximo motorista.', 'warning');
      handleRecusar(); 
    }
    return () => clearTimeout(timer);
  }, [exibindoOferta, tempoRestante]);

  const handleAceitar = async () => {
    if (!ofertaFrete || !ofertaFrete.id || actionHandled.current) return;
    actionHandled.current = true; 
    stopAudio();
    try {
      const freteRef = doc(db, 'fretes', ofertaFrete.id);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(freteRef);
        if (!snap.exists()) throw new Error("CANCELADO");
        const data = snap.data() as OrderData;
        if (data.motoristaId) throw new Error("JA_ACEITO");
        if (data.filaMatching && data.filaMatching[0] !== user?.uid) throw new Error("FILA_ANDOU"); 
        transaction.update(freteRef, {
          status: 'aceito', motoristaId: user?.uid, motoristaNome: driverData?.nome || 'Motorista', motoristaZap: driverData?.whatsapp || ''
        });
      });
      await updateDoc(doc(db, 'motoristas_online', user!.uid), { status: 'ocupado', emRota: true });
      setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null;
    } catch (e: any) {
      if (e.message === "JA_ACEITO" || e.message === "FILA_ANDOU") {
        showToast("Ops! Esta corrida já foi atribuída a outro parceiro.", "warning");
      }
      setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null;
    }
  };

  const handleRecusar = async () => {
    if (!ofertaFrete || !ofertaFrete.id || actionHandled.current) return;
    actionHandled.current = true; 
    stopAudio();
    try {
      const freteRef = doc(db, 'fretes', ofertaFrete.id);
      await updateDoc(freteRef, { filaMatching: arrayRemove(user?.uid) });
      setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null;
    } catch (e) {
      setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null;
    }
  };

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email });
        onSnapshot(query(collection(db, 'motoristas_cadastros'), where('email', '==', u.email)), (s) => {
          if (!s.empty) { setDriverData(s.docs[0].data() as DriverData); setFormStep(false); } 
          else { setFormStep(true); }
        });
        onSnapshot(query(collection(db, 'fretes'), where('motoristaId', '==', u.uid)), (s) => {
          const ativo = s.docs.map(d => ({id: d.id, ...d.data()}) as OrderData).find(f => ['aceito', 'coleta', 'em_transporte'].includes(f.status));
          setActiveFrete(ativo || null); setLoading(false);
        });
      } else { setUser(null); setLoading(false); }
    });
  }, []);

  const toggleStatus = async () => {
    if (!user) return;
    if (isOnline) { 
      setIsOnline(false); 
      stopAudio();
      await deleteDoc(doc(db, 'motoristas_online', user.uid)); 
    } 
    else { 
      // 🔓 DESTRAVA O ÁUDIO NO NAVEGADOR
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
        }).catch(e => console.log("Destrava de áudio falhou"));
      }
      setIsOnline(true); 
    }
  };

  const updateStatusFrete = async (status: string) => {
    if (!activeFrete || !activeFrete.id || !user) return;
    if (status === 'entregue') {
      if (!comprovante) {
        showToast("⚠️ Foto da carga ou canhoto da NF é obrigatória para finalizar!", "warning");
        return;
      }
      setLoading(true);
      try {
        const fileRef = ref(storage, `comprovantes/${activeFrete.id}`);
        await uploadBytes(fileRef, comprovante);
        const url = await getDownloadURL(fileRef);
        await updateDoc(doc(db, 'fretes', activeFrete.id), { status, comprovanteUrl: url });
        await updateDoc(doc(db, 'motoristas_online', user.uid), { status: 'disponivel', emRota: false });
        setComprovante(null);
      } catch(e) { showToast("Erro ao enviar comprovante.", "error"); }
      setLoading(false);
    } else {
      await updateDoc(doc(db, 'fretes', activeFrete.id), { status });
    }
  };

  // 🗺️ LINK DO GPS CORRIGIDO
  const openMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (loading) return <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4"><div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center animate-pulse shadow-blue-500/50 shadow-2xl"><Truck className="text-white w-14 h-14" /></div><Loader2 className="animate-spin text-blue-500 w-8 h-8 mt-4" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 relative">
      
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 w-[90%] max-w-sm ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-amber-500 text-amber-950'}`}>
          <AlertTriangle size={24} className="shrink-0" />
          <span className="font-bold text-sm leading-tight flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="shrink-0 opacity-80 hover:opacity-100 transition-opacity">
