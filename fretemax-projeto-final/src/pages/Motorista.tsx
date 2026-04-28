import { useState, useEffect } from 'react';
import { auth, provider, db } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, serverTimestamp, setDoc, runTransaction } from 'firebase/firestore';
import { Loader2, Truck, CheckCircle, Download, MapPin, Navigation, Clock } from 'lucide-react';

export default function Motorista() {
  const [user, setUser] = useState<any>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [availableFretes, setAvailableFretes] = useState<any[]>([]);
  const [activeFrete, setActiveFrete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // NOVO ESTADO: Controla exclusivamente a verificação inicial de login
  const [loadingAuth, setLoadingAuth] = useState(true); 
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Alerta Sonoro Mantido
  useEffect(() => {
    if (availableFretes.length > 0 && !activeFrete) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.play().catch(() => console.log("Áudio aguardando interação"));
    }
  }, [availableFretes.length, activeFrete]);

  // PWA Mantido
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const unsubProfile = onSnapshot(query(collection(db, 'motoristas_cadastros'), where('email', '==', currentUser.email)), (snap) => {
          if (!snap.empty) setDriverData({ id: snap.docs[0].id, ...snap.docs[0].data() });
        });
        
        const qActive = query(collection(db, 'fretes'), where('motoristaId', '==', currentUser.uid));
        const unsubActive = onSnapshot(qActive, (snap) => {
          const fretesDoMotorista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const freteAtivo = fretesDoMotorista.find((f: any) => ['aceito', 'coleta', 'em_transporte'].includes(f.status));
          setActiveFrete(freteAtivo || null);
          setLoading(false);
          setLoadingAuth(false); // Finaliza o loading de autenticação com sucesso
        });

        return () => { unsubProfile(); unsubActive(); };
      } else { 
        setUser(null); 
        setLoading(false);
        setLoadingAuth(false); // Finaliza o loading informando que não há usuário
      }
    });
    return () => unsubAuth();
  }, []);

  // Geolocation Mantido
  useEffect(() => {
    if (user && driverData?.status === 'aprovado' && "geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition((pos) => {
        setDoc(doc(db, 'motoristas_online', user.uid), {
          nome: driverData.nome || '', 
          categoria: driverData.categoria || '',
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude,
          status: activeFrete ? 'ocupado' : 'disponivel',
          lastSeen: serverTimestamp()
        }, { merge: true });
      }, null, { enableHighAccuracy: true });
      
      return () => {
         navigator.geolocation.clearWatch(watchId);
         if (user) setDoc(doc(db, 'motoristas_online', user.uid), { status: 'offline' }, { merge: true });
      };
    }
  }, [driverData, user, activeFrete]);

  // RADAR SINCRONIZADO E FILTRADO
  useEffect(() => {
    // Mantemos a trava de aprovação para segurança, mas apenas busca fretes na fase correta
    if (driverData?.status === 'aprovado' && !activeFrete) {
      const q = query(collection(db, 'fretes'), where('status', '==', 'aguardando_motorista'));
      const unsubRadar = onSnapshot(q, (snap) => {
        const categoriaMotorista = String(driverData.categoria || '').toLowerCase().trim();
        const fretesValidos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter((f: any) => {
             const veiculoFrete = String(f.veiculo || '').toLowerCase().trim();
             return veiculoFrete === categoriaMotorista;
          });
        setAvailableFretes(fretesValidos);
      });
      return () => unsubRadar();
    }
  }, [driverData, activeFrete]);

  const handleAccept = async (frete: any) => {
    if (!user || driverData?.status !== 'aprovado') return;
    try {
      const freteRef = doc(db, 'fretes', frete.id);
      await runTransaction(db, async (t) => {
        const d = await t.get(freteRef);
        const data = d.data();
        if (!d.exists() || data?.status !== 'aguardando_motorista' || data?.motoristaId) throw new Error("Carga indisponível.");
        t.update(freteRef, {
          status: 'aceito',
          motoristaId: user.uid, 
          motoristaNome: driverData.nome || 'Motorista', 
          motoristaZap: driverData.whatsapp || '',
          logs: [...(data?.logs || []), { tipo: "aceito", data: new Date().toISOString() }]
        });
      });
      await setDoc(doc(db, 'motoristas_online', user.uid), { status: 'ocupado' }, { merge: true });
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdateStatus = async (novoStatus: string) => {
    if (!activeFrete) return;
    const ref = doc(db, 'fretes', activeFrete.id);
    try {
      await runTransaction(db, async (t) => {
        const d = await t.get(ref);
        t.update(ref, { 
          status: novoStatus, 
          logs: [...(d.data()?.logs || []), { tipo: novoStatus, data: new Date().toISOString() }] 
        });
      });
      if (novoStatus === 'entregue') {
          await setDoc(doc(db, 'motoristas_online', user.uid), { status: 'disponivel' }, { merge: true });
      }
    } catch (e: any) { alert("Erro ao atualizar status."); }
  };

  if (loading || loadingAuth) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-12 h-12" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <nav className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800 font-black italic">
        FRETOGO 
        <div className="flex gap-2 items-center">
          {deferredPrompt && (
            <button onClick={handleInstall} className="bg-blue-600 p-2 rounded-lg text-white animate-pulse">
              <Download className="w-4 h-4" />
            </button>
          )}
          {user && <button onClick={() => signOut(auth)} className="text-xs text-slate-500 font-bold bg-slate-800 px-3 py-1 rounded-full">SAIR</button>}
        </div>
      </nav>

      <div className="p-4 max-w-md mx-auto">
        {!user ? (
          /* O usuário SÓ vê isso se realmente não estiver logado. Fim do botão inútil. */
          <div className="text-center py-10">
            <Truck className="w-16 h-16 text-blue-500 mx-auto mb-6 animate-bounce" />
            <h1 className="text-2xl font-black italic mb-6">OPERAÇÃO MOTORISTA</h1>
            <button onClick={() => signInWithPopup(auth, provider)} className="w-full bg-blue-600 p-5 rounded-2xl font-black uppercase italic shadow-xl">ENTRAR NO RADAR</button>
          </div>
        ) : activeFrete ? (
          <div className="bg-slate-900 p-6 rounded-[2rem] border border-blue-500/30 animate-in zoom-in shadow-2xl">
            <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500"/> Carga Ativa</h2>
            <p className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">{activeFrete.coleta?.bairro || activeFrete.cidadeOrigem} → {activeFrete.entrega?.bairro || 'Destino'}</p>
            <div className="grid gap-3">
              {activeFrete.status === 'aceito' && <button onClick={() => handleUpdateStatus('coleta')} className="bg-blue-600 p-5 rounded-xl font-black uppercase text-sm shadow-lg">COLETEI A CARGA</button>}
              {activeFrete.status === 'coleta' && <button onClick={() => handleUpdateStatus('em_transporte')} className="bg-orange-500 p-5 rounded-xl font-black uppercase text-sm shadow-lg">INICIAR TRANSPORTE</button>}
              {activeFrete.status === 'em_transporte' && <button onClick={() => handleUpdateStatus('entregue')} className="bg-green-600 p-5 rounded-xl font-black uppercase text-sm flex gap-2 justify-center shadow-lg"><CheckCircle className="w-4 h-4"/> FINALIZAR ENTREGA</button>}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
             {availableFretes.length === 0 ? (
               <div className="text-center py-20">
                 <Loader2 className="animate-spin text-slate-700 w-10 h-10 mx-auto mb-4" />
                 <p className="text-slate-500 italic font-bold">Buscando fretes próximos...</p>
                 <p className="text-xs text-slate-600 mt-2 uppercase">Aguardando clientes pagarem</p>
               </div>
             ) : (
               availableFretes.map(f => (
                 <div key={f.id} className="bg-white text-slate-900 p-6 rounded-[2.5rem] shadow-2xl border-b-[10px] border-blue-600 animate-in slide-in-from-bottom-5">
                    <div className="flex justify-between items-start mb-4">
                      {/* Tag de Segurança para o Motorista */}
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> FRETE PAGO
                      </span>
                      <span className="text-slate-400 text-[10px] font-bold italic flex items-center gap-1"><Navigation className="w-3 h-3"/> {f.distancia}km</span>
                    </div>

                    <div className="mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Rota da Carga</p>
                      <p className="text-lg font-black leading-tight uppercase text-slate-900">
                        {f.coleta?.bairro || 'Origem'} <br/>
                        <span className="text-blue-600">→</span> {f.entrega?.bairro || 'Destino'}
                      </p>
                    </div>

                    {/* Dados Ricos Adicionados no Passo 2 e agora lidos no Passo 3 */}
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                      <div className="flex gap-3 text-slate-600 text-xs font-bold uppercase">
                        <span>⚖️ {f.peso || 'N/A'}</span>
                        <span>📦 {f.tipoMaterial || 'N/A'}</span>
                      </div>
                      {/* ETA Simulado: 2 minutos por KM */}
                      <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                        <Clock className="w-3 h-3"/> ~{Math.round(f.distancia * 2)} min
                      </span>
                    </div>

                    <p className="text-4xl font-black text-slate-900 italic mb-4">R$ {f.valorMotorista ? Number(f.valorMotorista).toFixed(2).replace('.', ',') : '0,00'}</p>
                    <button onClick={() => handleAccept(f)} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase italic shadow-xl active:scale-95 transition-all">ACEITAR E COLETAR</button>
                 </div>
               ))
             )}
          </div>
        )}
      </div>
    </div>
  );
}
