import { useState, useEffect } from 'react';
import { auth, provider, db, storage } from '../firebase'; 
import { signInWithPopup, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { collection, query, where, onSnapshot, doc, setDoc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging'; 
import { Loader2, Truck, CheckCircle, Navigation, MapPin, AlertCircle, ShieldCheck, UserPlus, Camera } from 'lucide-react';
import ChatFrete from '../components/ChatFrete';

export default function Motorista() {
  const [user, setUser] = useState<any>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [activeFrete, setActiveFrete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [minhaPosicao, setMinhaPosicao] = useState<any>(null);
  const [comprovante, setComprovante] = useState<any>(null);
  const [minhaOferta, setMinhaOferta] = useState<any>(null); 
  const [backhaulDestino, setBackhaulDestino] = useState(''); 
  const [form, setForm] = useState({ nome: '', whatsapp: '', placa: '', categoria: 'carro_pequeno' });
  const [formStep, setFormStep] = useState(false);

  // Solicita Permissão FCM e Guarda Token Local
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const messaging = getMessaging();
        const token = await getToken(messaging, { vapidKey: 'SUA_CHAVE_VAPID_AQUI' });
        if (token) localStorage.setItem('fcm_token', token);
      } catch (e) { console.warn("Aviso: Permissão push bloqueada ou falhou."); }
    };
    if (user) requestPermission();
  }, [user]);

  // GPS Contínuo + Atualização Online
  useEffect(() => {
    if (user && driverData?.status === 'aprovado') {
      const watchId = navigator.geolocation.watchPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMinhaPosicao({ lat: latitude, lng: longitude });
        await setDoc(doc(db, 'motoristas_online', user.uid), {
          lat: latitude, 
          lng: longitude,
          categoria: driverData.categoria,
          destinoPreferencial: backhaulDestino,
          tokenFCM: localStorage.getItem('fcm_token') || null,
          lastSeen: serverTimestamp() 
        }, { merge: true });
      }, null, { enableHighAccuracy: true });
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [user, driverData, backhaulDestino]);

  // Listener da Oferta
  useEffect(() => {
    if (user && driverData?.status === 'aprovado') {
      return onSnapshot(query(collection(db, 'ofertas'), 
        where('motoristaId', '==', user.uid), 
        where('status', '==', 'pendente')), (snap) => {
          if (!snap.empty) setMinhaOferta({ id: snap.docs[0].id, ...snap.docs[0].data() });
          else setMinhaOferta(null);
      });
    }
  }, [user, driverData]);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        onSnapshot(query(collection(db, 'motoristas_cadastros'), where('email', '==', u.email)), (s) => {
          if (!s.empty) { setDriverData(s.docs[0].data()); setFormStep(false); }
          else { setFormStep(true); }
        });
        onSnapshot(query(collection(db, 'fretes'), where('motoristaId', '==', u.uid)), (s) => {
          const ativo = s.docs.map(d => ({id: d.id, ...d.data()})).find((f: any) => ['aceito', 'coleta', 'em_transporte'].includes(f.status));
          setActiveFrete(ativo);
          setLoading(false);
        });
      } else { setUser(null); setLoading(false); }
    });
  }, []);

  // Aceitar Oferta com Limpeza de Fila
  const handleAccept = async () => {
    if (!minhaOferta) return;
    const freteRef = doc(db, 'fretes', minhaOferta.freteId);
    const ofertaRef = doc(db, 'ofertas', minhaOferta.id);
    try {
      await runTransaction(db, async (t) => {
        const frete = await t.get(freteRef);
        if (frete.data()?.status !== 'disponivel') throw "Carga indisponível ou assumida por outro motorista.";
        
        t.update(freteRef, { 
          status: 'aceito', 
          motoristaId: user.uid, 
          motoristaNome: driverData.nome, 
          motoristaZap: driverData.whatsapp,
          dispatchQueue: [], 
          currentDriverIndex: null 
        });
        t.update(ofertaRef, { status: 'aceito' });
      });
      setMinhaOferta(null);
    } catch (e) { alert(e); setMinhaOferta(null); }
  };

  const handleRecusar = async () => {
    if (minhaOferta) await updateDoc(doc(db, 'ofertas', minhaOferta.id), { status: 'recusado' });
  };

  const updateStatus = async (status: string) => {
    if (!activeFrete) return;
    if (status === 'entregue') {
      if (!comprovante) return alert("⚠️ Foto da carga ou NF é obrigatória para finalizar!");
      const fileRef = ref(storage, `comprovantes/${activeFrete.id}`);
      await uploadBytes(fileRef, comprovante);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, 'fretes', activeFrete.id), { status, comprovanteUrl: url });
    } else {
      await updateDoc(doc(db, 'fretes', activeFrete.id), { status });
    }
  };

  const openMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };

  if (loading) return <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4"><div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center animate-pulse"><Truck className="text-white w-12 h-12" /></div><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4">
      <nav className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800 font-black italic mb-4 rounded-b-3xl text-sm sticky top-0 z-50">
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg"><Truck className="text-white w-5 h-5" /></div> FRETOGO RADAR</div>
        {user && <button onClick={() => signOut(auth)} className="text-[10px] bg-slate-800 px-3 py-1 rounded-full uppercase">Sair</button>}
      </nav>

      {driverData?.status === 'aprovado' && !activeFrete && (
        <div className="bg-slate-900 p-4 rounded-2xl mb-4 border border-blue-500/30">
          <p className="text-[10px] font-black uppercase text-blue-400 mb-2">Modo Destino (Backhaul)</p>
          <input className="w-full bg-transparent border-b border-slate-700 p-2 font-bold outline-none" placeholder="Ex: Santos" value={backhaulDestino} onChange={e => setBackhaulDestino(e.target.value)} />
        </div>
      )}

      {minhaOferta && (
        <div className="fixed inset-0 bg-blue-600 z-[100] p-8 flex flex-col justify-center animate-in slide-in-from-bottom">
           <Truck className="w-20 h-20 mb-4 animate-bounce" />
           <h2 className="text-4xl font-black italic mb-2 uppercase">Nova Carga!</h2>
           <p className="text-2xl font-black mb-8">{minhaOferta.cidadeOrigem} ➔ {minhaOferta.cidadeDestino}</p>
           <p className="text-5xl font-black mb-10 italic">R$ {minhaOferta.valor}</p>
           <div className="flex gap-4">
             <button onClick={handleAccept} className="flex-1 bg-white text-blue-600 p-6 rounded-2xl font-black text-2xl uppercase">Aceitar</button>
             <button onClick={handleRecusar} className="bg-blue-800 p-6 rounded-2xl font-black uppercase text-xs">Recusar</button>
           </div>
        </div>
      )}

      {!user ? (
        <div className="text-center py-20 bg-slate-900 rounded-[3rem] border-2 border-slate-800 shadow-2xl">
          <Truck className="w-20 h-20 text-blue-500 mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl font-black italic mb-8 uppercase tracking-tighter leading-none">Login<br/>Motorista</h1>
          <button onClick={() => signInWithPopup(auth, provider)} className="w-4/5 mx-auto bg-blue-600 p-6 rounded-2xl font-black uppercase italic shadow-2xl text-xl">ENTRAR NO RADAR</button>
        </div>
      ) : formStep ? (
        <div className="bg-white text-slate-950 p-8 rounded-[3rem] shadow-2xl">
          <div className="flex items-center gap-3 mb-6"><UserPlus className="text-blue-600 w-8 h-8" /><h2 className="text-2xl font-black uppercase italic tracking-tighter">Finalizar Cadastro</h2></div>
          <div className="space-y-4">
            <input className="w-full p-4 bg-slate-100 rounded-xl font-bold" placeholder="Nome" onChange={e => setForm({...form, nome: e.target.value})} />
            <input className="w-full p-4 bg-slate-100 rounded-xl font-bold" placeholder="WhatsApp" onChange={e => setForm({...form, whatsapp: e.target.value})} />
            <input className="w-full p-4 bg-slate-100 rounded-xl font-bold uppercase" placeholder="Placa" onChange={e => setForm({...form, placa: e.target.value})} />
            <select className="w-full p-4 bg-slate-100 rounded-xl font-bold" onChange={e => setForm({...form, categoria: e.target.value})}>
              <option value="carro_pequeno">Carro Pequeno</option><option value="truck">Caminhão Truck</option><option value="bi_trem_cegonha">Bi-trem / Cegonha</option>
            </select>
            <button onClick={() => setDoc(doc(db, 'motoristas_cadastros', user.uid), {...form, email: user.email, status: 'pendente', createdAt: serverTimestamp()})} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase italic shadow-xl">Enviar para Análise</button>
          </div>
        </div>
      ) : driverData?.status !== 'aprovado' ? (
        <div className="text-center py-16 bg-slate-900 rounded-[3rem] border-2 border-yellow-600 px-6"><AlertCircle className="w-20 h-20 text-yellow-500 mx-auto mb-6" /><h2 className="text-3xl font-black italic uppercase mb-4 text-yellow-500">Análise de Segurança</h2><p className="text-slate-200 font-black text-lg">Aguarde o sinal verde da central.</p></div>
      ) : activeFrete ? (
        <div className="bg-slate-900 p-6 rounded-[2.5rem] border-2 border-blue-500/50">
          <h2 className="text-3xl font-black uppercase mb-4 text-blue-400 italic">Frete Ativo</h2>
          <div className="bg-slate-800 p-4 rounded-2xl mb-6">
            <p className="text-xs font-black text-slate-500 uppercase">📍 Endereço:</p>
            <p className="text-lg font-black text-white">{activeFrete.status === 'aceito' ? activeFrete.enderecoColetaTexto : activeFrete.enderecoEntregaTexto}</p>
          </div>
          <div className="flex flex-col gap-3">
             <button onClick={() => openMaps(activeFrete.status === 'aceito' ? activeFrete.origemLat : activeFrete.destinoLat, activeFrete.status === 'aceito' ? activeFrete.origemLng : activeFrete.destinoLng)} className="bg-white text-black p-5 rounded-2xl font-black uppercase flex items-center justify-center gap-2"><Navigation className="w-6 h-6"/> Abrir Rota</button>
             {activeFrete.status === 'aceito' && <button onClick={() => updateStatus('coleta')} className="bg-blue-600 p-6 rounded-2xl font-black text-xl uppercase italic">Cheguei na Coleta</button>}
             {activeFrete.status === 'coleta' && <button onClick={() => updateStatus('em_transporte')} className="bg-orange-500 p-6 rounded-2xl font-black text-xl uppercase italic">Carga Embarcada</button>}
             {activeFrete.status === 'em_transporte' && (
               <>
                 <input type="file" id="foto" className="hidden" capture="environment" onChange={(e) => setComprovante(e.target.files?.[0])} />
                 <label htmlFor="foto" className="bg-slate-700 p-5 rounded-2xl font-black text-center flex items-center justify-center gap-2 cursor-pointer"><Camera/> {comprovante ? "✅ FOTO OK" : "📸 TIRAR FOTO NF"}</label>
                 <button onClick={() => updateStatus('entregue')} className="bg-green-600 p-6 rounded-2xl font-black text-2xl uppercase italic">Finalizar Entrega</button>
               </>
             )}
          </div>
          <ChatFrete freteId={activeFrete.id} tipoUsuario="motorista" nome={driverData?.nome} />
        </div>
      ) : (
        <div className="text-center py-20 flex flex-col items-center">
            <div className="relative w-48 h-48 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 opacity-20 animate-ping"></div>
              <div className="absolute inset-8 rounded-3xl bg-blue-600 flex items-center justify-center shadow-lg"><Truck className="text-white w-20 h-20 animate-bounce" /></div>
            </div>
            <h2 className="text-3xl font-black italic uppercase">Buscando Carga...</h2>
            <p className="text-slate-400 font-bold text-lg mt-2">Radar ativo categoria {driverData?.categoria}</p>
        </div>
      )}
    </div>
  );
}
