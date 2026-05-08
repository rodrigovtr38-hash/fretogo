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

  // 🔥 ADICIONADO: cidadeEstado no state do formulário
  const [form, setForm] = useState({ nome: '', whatsapp: '', placa: '', categoria: 'carro_pequeno' as VehicleType, cnh: '', renavam: '', cpf: '', cidadeEstado: '' });
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [crlvFile, setCrlvFile] = useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [formStep, setFormStep] = useState(false);

  const [ofertaFrete, setOfertaFrete] = useState<OrderData | null>(null);
  const [tempoRestante, setTempoRestante] = useState(15);
  const [exibindoOferta, setExibindoOferta] = useState(false);

  const [toast, setToast] = useState<{msg: string, type: 'error' | 'warning'} | null>(null);

  const actionHandled = useRef(false);
  const lastGpsUpdate = useRef(0); 
  const currentOfferId = useRef<string | null>(null); 
  
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
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audioRef.current.loop = true; 
    
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

  const handleCadastro = async () => {
    // 🔥 ADICIONADO: Validação do campo cidadeEstado
    if (!form.nome || !form.cpf || !form.cnh || !form.placa || !form.renavam || !form.whatsapp || !form.cidadeEstado) {
      showToast("Preencha todos os campos de texto.", "warning");
      return;
    }
    if (!cnhFile || !crlvFile) {
      showToast("Envie as fotos da CNH e CRLV obrigatoriamente.", "warning");
      return;
    }
    setUploadingDocs(true);
    try {
      const cnhRef = ref(storage, `motoristas/${user!.uid}/cnh`);
      const crlvRef = ref(storage, `motoristas/${user!.uid}/crlv`);
      await uploadBytes(cnhRef, cnhFile);
      await uploadBytes(crlvRef, crlvFile);
      const cnhUrl = await getDownloadURL(cnhRef);
      const crlvUrl = await getDownloadURL(crlvRef);

      await setDoc(doc(db, 'motoristas_cadastros', user!.uid), {
        ...form,
        email: user!.email,
        cnhUrl,
        crlvUrl,
        status: 'pendente',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      showToast("Erro ao salvar cadastro. Tente novamente.", "error");
    }
    setUploadingDocs(false);
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
          <button onClick={() => setToast(null)} className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"><XCircle size={20} /></button>
        </div>
      )}

      {exibindoOferta && ofertaFrete && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-blue-500 rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_0_40px_rgba(59,130,246,0.3)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 h-2 bg-blue-600 transition-all duration-1000 ease-linear" style={{ width: `${(tempoRestante / 15) * 100}%` }}></div>
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-xl shadow-blue-500/50">
              <Zap className="text-white w-10 h-10 fill-white" />
            </div>
            <h2 className="text-2xl font-black uppercase italic text-white mb-1">Nova Oferta!</h2>
            <p className="text-blue-400 font-bold mb-6">{tempoRestante}s restantes</p>

            <div className="bg-slate-950 p-4 rounded-2xl mb-6 text-left border border-slate-800">
              <div className="flex flex-col items-center justify-center mb-4">
                 <div className="bg-green-500/20 border border-green-500 text-green-400 rounded-full px-4 py-2 text-[11px] font-bold inline-flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4" />
                   Pedágio já incluso no valor
                 </div>
              </div>

              <div className="flex items-start gap-3 mb-3">
                <MapPin className="text-blue-500 w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-500">Coleta</p>
                  <p className="font-bold text-sm text-slate-200 line-clamp-2">{ofertaFrete.enderecoColetaTexto}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 mb-4">
                <MapPin className="text-green-500 w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-500">Entrega</p>
                  <p className="font-bold text-sm text-slate-200 line-clamp-2">{ofertaFrete.enderecoEntregaTexto}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
                <div className="bg-blue-500/10 border border-blue-500 rounded-2xl p-4 text-center">
                  <p className="text-blue-400 text-xs font-black uppercase">Distância</p>
                  <h3 className="text-2xl font-black text-white">{ofertaFrete.distancia?.toFixed(1)} KM</h3>
                </div>
                <div className="bg-orange-500/10 border border-orange-500 rounded-2xl p-4 text-center">
                  <p className="text-orange-400 text-xs font-black uppercase">Peso</p>
                  <h3 className="text-2xl font-black text-white">{ofertaFrete.peso}</h3>
                </div>
              </div>
              
              <div className="bg-slate-900 p-3 rounded-xl mb-4 border border-slate-700/50 flex flex-wrap gap-2 text-xs justify-center">
                 <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded font-bold flex items-center gap-1"><Truck size={12} className="text-blue-400"/> {VEHICLE_CONFIG[ofertaFrete.veiculo]?.nome || 'Veículo'}</span>
                 {/* 🔥 ADICIONADO: Display do Qtd Volumes */}
                 <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded font-bold flex items-center gap-1"><Package size={12}/> {ofertaFrete.qtdVolumes || 'Não informado'}</span>
                 <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded font-bold">{ofertaFrete.tipoMaterial}</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-center items-center">
                  <div className="text-center">
                    <p className="text-xs uppercase font-black text-slate-500 mb-1">Ganhos Reais</p>
                    <p className="text-4xl font-black text-green-500 italic drop-shadow-md">R$ {ofertaFrete.valorMotorista?.toFixed(2).replace('.', ',')}</p>
                  </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRecusar} className="flex-1 bg-slate-800 text-slate-300 py-4 rounded-xl font-black uppercase hover:bg-slate-700 transition-all border border-slate-700">Recusar</button>
              <button onClick={handleAceitar} className="flex-1 bg-green-500 text-slate-950 py-4 rounded-xl font-black uppercase hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/30">Aceitar</button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800 font-black italic mb-6 rounded-b-3xl text-lg sticky top-0 z-50 shadow-xl">
        <div className="flex items-center gap-2 tracking-tight">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Zap className="text-yellow-400 fill-yellow-400 w-6 h-6" />
          </div> 
          FRETOGO <span className="text-blue-500 font-bold ml-1">RADAR</span>
        </div>
        {user && <button onClick={() => signOut(auth)} className="text-xs bg-slate-800 px-4 py-2 rounded-full uppercase hover:bg-slate-700 transition-all">Sair</button>}
      </nav>

      {!user ? (
        <div className="text-center py-24 bg-slate-900 rounded-[3rem] border border-slate-800 shadow-2xl animate-in zoom-in-95">
          <div className="w-28 h-28 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Zap className="w-14 h-14 text-yellow-400 fill-yellow-400" />
          </div>
          <h1 className="text-5xl font-black italic mb-10 uppercase tracking-tight drop-shadow-lg leading-none">
            Login<br/><span className="text-blue-500">Motorista</span>
          </h1>
          <button onClick={() => signInWithPopup(auth, provider)} className="w-4/5 mx-auto bg-blue-600 p-6 rounded-2xl font-black uppercase italic shadow-blue-600/50 shadow-2xl text-xl hover:scale-105 active:scale-95 transition-all duration-200 flex justify-center items-center gap-3">
            <Truck size={24} /> ENTRAR NO APP
          </button>
        </div>
      ) : formStep ? (
        <div className="bg-white text-slate-950 p-8 rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-slate-100">
            <UserPlus className="text-blue-600 w-10 h-10" />
            <h2 className="text-3xl font-black uppercase italic tracking-tight leading-none">Finalizar<br/>Cadastro</h2>
          </div>
          <div className="space-y-4">
            <input className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all" placeholder="Nome Completo" onChange={e => setForm({...form, nome: e.target.value})} />
            <input className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all" placeholder="CPF" onChange={e => setForm({...form, cpf: e.target.value})} />
            
            {/* 🔥 ADICIONADO: Campo Cidade / Estado */}
            <input className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all" placeholder="Cidade / Estado (Ex: Guarulhos - SP)" onChange={e => setForm({...form, cidadeEstado: e.target.value})} />
            
            <input className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all" placeholder="WhatsApp (DDD)" onChange={e => setForm({...form, whatsapp: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <input className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all uppercase" placeholder="Placa" onChange={e => setForm({...form, placa: e.target.value})} />
              <input className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all uppercase" placeholder="CNH" onChange={e => setForm({...form, cnh: e.target.value})} />
            </div>
            <input className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all uppercase" placeholder="RENAVAM" onChange={e => setForm({...form, renavam: e.target.value})} />
            
            <select className="w-full p-4 bg-slate-950 text-white rounded-xl font-black outline-none cursor-pointer" onChange={e => setForm({...form, categoria: e.target.value as VehicleType})}>
              <option value="moto">Moto</option>
              <option value="carro_pequeno">Carro Pequeno</option>
              <option value="utilitario">Utilitário</option>
              <option value="toco">Caminhão Toco</option>
              <option value="truck">Caminhão Truck</option>
              <option value="carreta_ls">Carreta LS</option>
              <option value="bi_trem_cegonha">Bi-trem / Cegonha</option>
            </select>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <label className={`border-2 rounded-2xl p-4 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${cnhFile ? 'bg-green-100 border-green-500 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <Camera />
                <span className="font-bold text-sm uppercase">{cnhFile ? 'CNH Anexada' : 'Foto da CNH'}</span>
                <input type="file" hidden accept="image/*" onChange={(e) => setCnhFile(e.target.files?.[0] || null)} />
              </label>
              <label className={`border-2 rounded-2xl p-4 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${crlvFile ? 'bg-green-100 border-green-500 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <Camera />
                <span className="font-bold text-sm uppercase">{crlvFile ? 'CRLV Anexado' : 'Documento do Carro'}</span>
                <input type="file" hidden accept="image/*" onChange={(e) => setCrlvFile(e.target.files?.[0] || null)} />
              </label>
            </div>

            <button onClick={handleCadastro} disabled={uploadingDocs} className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-xl uppercase italic shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 mt-6 flex justify-center items-center gap-2 disabled:bg-slate-400">
              {uploadingDocs ? <><Loader2 className="animate-spin" /> ENVIANDO...</> : <><ShieldCheck /> Enviar para Análise</>}
            </button>
          </div>
        </div>
      ) : driverData?.status !== 'aprovado' ? (
        <div className="text-center py-12 flex flex-col items-center justify-center min-h-[75vh]">
          <div className="bg-slate-900 rounded-[3rem] border border-yellow-600/50 shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95">
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-black italic uppercase mb-2 text-yellow-500 tracking-tight">Em Análise</h2>
            <p className="text-slate-300 font-bold text-sm leading-relaxed">Sua documentação está sendo validada pelo nosso time de segurança. Aguarde a liberação.</p>
            
            {/* 🔥 ADICIONADO: Botão do Grupo VIP */}
            <a href="https://chat.whatsapp.com/IGylgsZPYhsDfMZDKzVjHT" target="_blank" rel="noreferrer" className="mt-8 bg-green-500 hover:bg-green-600 hover:scale-105 transition-all text-white p-6 rounded-3xl font-black flex flex-col items-center gap-2 shadow-2xl shadow-green-500/20 text-center w-full">
              <span className="text-xl uppercase italic tracking-tight">🚀 Acelere sua Aprovação!</span>
              <span className="text-xs font-bold text-green-50">Entre no Grupo VIP e pegue as melhores cargas primeiro. Clique e Entre.</span>
            </a>
          </div>
        </div>
      ) : activeFrete ? (
        <div className="bg-slate-900 p-8 rounded-[3rem] border border-blue-500/30 shadow-2xl animate-in slide-in-from-bottom">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,1)]"></div>
            <h2 className="text-2xl font-black uppercase text-blue-400 italic tracking-tight">Nova Carga Atribuída!</h2>
          </div>
          
          <div className="bg-slate-950 p-6 rounded-3xl mb-8 border border-slate-800 shadow-inner">
            <p className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 mb-2"><MapPin size={12}/> Destino Imediato</p>
            <p className="text-xl font-black text-white leading-tight">{activeFrete.status === 'aceito' ? activeFrete.enderecoColetaTexto : activeFrete.enderecoEntregaTexto}</p>
          </div>
          
          <div className="flex flex-col gap-4">
             <button onClick={() => openMaps(activeFrete.status === 'aceito' ? activeFrete.origemLat : activeFrete.destinoLat, activeFrete.status === 'aceito' ? activeFrete.origemLng : activeFrete.destinoLng)} className="bg-white text-slate-950 py-5 rounded-2xl font-black text-lg uppercase flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg"><Navigation className="w-5 h-5"/> Abrir no GPS ({activeFrete.status === 'aceito' ? 'Coleta' : 'Entrega'})</button>
             
             {activeFrete.status === 'aceito' && <button onClick={() => updateStatusFrete('coleta')} className="bg-blue-600 py-6 rounded-2xl font-black text-xl uppercase italic shadow-blue-600/20 shadow-lg hover:scale-[1.02] transition-all">Cheguei na Coleta</button>}
             {activeFrete.status === 'coleta' && <button onClick={() => updateStatusFrete('em_transporte')} className="bg-amber-500 py-6 rounded-2xl font-black text-xl uppercase italic shadow-amber-500/20 shadow-lg hover:scale-[1.02] transition-all text-slate-950">Carga Embarcada</button>}
             {activeFrete.status === 'em_transporte' && (
               <div className="bg-slate-800 p-4 rounded-3xl border border-slate-700 mt-2">
                 <input type="file" id="foto" className="hidden" capture="environment" onChange={(e) => setComprovante(e.target.files?.[0] || null)} />
                 <label htmlFor="foto" className={`p-6 rounded-2xl font-black text-center flex items-center justify-center gap-3 cursor-pointer transition-all mb-4 ${comprovante ? 'bg-green-500/20 text-green-400 border-2 border-green-500' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
                   <Camera size={24}/> {comprovante ? "COMPROVANTE ANEXADO" : "FOTO DA NOTA / CARGA"}
                 </label>
                 <button onClick={() => updateStatusFrete('entregue')} className="w-full bg-green-500 py-6 rounded-2xl font-black text-2xl uppercase italic shadow-green-500/30 shadow-xl hover:scale-[1.02] transition-all text-slate-950 flex items-center justify-center gap-2">
                   <CheckCircle /> Finalizar Entrega
                 </button>
               </div>
             )}
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800">
            {activeFrete.id && <ChatFrete freteId={activeFrete.id} tipoUsuario="motorista" nome={driverData?.nome || "Motorista"} />}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 flex flex-col items-center justify-center h-[75vh]">
            <button onClick={toggleStatus} className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 mb-12 hover:scale-105 active:scale-95 border-4 ${isOnline ? 'bg-blue-600 border-blue-400 shadow-blue-600/50' : 'bg-slate-800 border-slate-700 shadow-black'}`}>
              <Power className={`w-12 h-12 mb-2 ${isOnline ? 'text-white' : 'text-slate-500'}`} />
              <span className={`font-black uppercase text-sm ${isOnline ? 'text-white' : 'text-slate-500'}`}> {isOnline ? 'Online' : 'Offline'} </span>
            </button>
            {isOnline ? (
              <div className="animate-in fade-in duration-500">
                <h2 className="text-3xl font-black italic uppercase tracking-tight drop-shadow-lg mb-2 text-white">Buscando Fretes...</h2>
                <p className="text-blue-400 font-bold text-sm uppercase tracking-widest bg-blue-950/50 px-4 py-2 rounded-full border border-blue-900/50 mt-4 inline-block">Radar Ativo: {VEHICLE_CONFIG[driverData?.categoria || 'carro_pequeno']?.nome || 'Veículo'}</p>
                <div className="mt-12 bg-slate-900 p-5 rounded-3xl border border-slate-800 text-left w-full max-w-sm mx-auto">
                  <p className="text-[10px] font-black uppercase text-blue-400 mb-3 flex items-center gap-1"><MapPin size={12}/> Destino Inteligente (Volta)</p>
                  <input className="w-full bg-transparent border-b-2 border-slate-700 p-2 font-black text-lg outline-none focus:border-blue-500 transition-all placeholder:text-slate-600" placeholder="Ex: São Paulo" value={backhaulDestino} onChange={e => setBackhaulDestino(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                 <h2 className="text-2xl font-black uppercase text-slate-600 mb-2">Você está offline</h2>
                 <p className="text-slate-500 font-bold text-sm">Toque no botão para entrar no radar.</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
