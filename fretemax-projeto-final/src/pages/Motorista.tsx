import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, provider, db, storage } from '../firebase'; 
import { signInWithPopup, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, runTransaction, arrayRemove } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging'; 
import { Loader2, Truck, CheckCircle, Navigation, MapPin, AlertCircle, ShieldCheck, UserPlus, Camera, Zap, Power, AlertTriangle, XCircle, Package, Download, Radar, DollarSign, Clock } from 'lucide-react';
import ChatFrete from '../components/ChatFrete';
import { UserProfile, DriverData, OrderData, VehicleType, Coords } from '../types';

const VEHICLE_CONFIG: Record<string, { nome: string; fator: number }> = {
  'moto': { nome: 'Moto', fator: 0.6 },
  'carro_pequeno': { nome: 'Carro Pequeno', fator: 1.0 },
  'utilitario': { nome: 'Utilitário', fator: 1.6 },
  'toco': { nome: 'Caminhão Toco', fator: 2.9 },
  'truck': { nome: 'Caminhão Truck', fator: 3.8 },
  'carreta_ls': { nome: 'Carreta LS', fator: 5.5 },
  'bi_trem_cegonha': { nome: 'Bi-trem / Cegonha', fator: 7.2 }
};

// Constantes de Proteção
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const GPS_MIN_DISTANCE_METERS = 50;
const GPS_HEARTBEAT_MS = 15000;

export default function Motorista() {
  const [user, setUser] = useState<UserProfile | null>(null);
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
  const [loadingMessage, setLoadingMessage] = useState('Analisando cargas próximas...');

  const [toast, setToast] = useState<{msg: string, type: 'error' | 'warning'} | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // 🛡️ REFS DE BLINDAGEM OPERACIONAL
  const actionHandled = useRef(false);
  const lastGpsUpdate = useRef(0); 
  const lastGpsCoords = useRef<Coords | null>(null);
  const currentOfferId = useRef<string | null>(null); 
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string, type: 'error' | 'warning' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // 🛡️ BLINDAGEM DE ÁUDIO (iOS / Safari Safe)
  const initAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audioRef.current.loop = true;
    }
    // Força o desbloqueio do áudio num contexto de interação do usuário
    audioRef.current.play().then(() => {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }).catch(e => console.warn("Áudio requer interação explícita do usuário no iOS", e));
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.warn("Falha ao tocar áudio da oferta", e));
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Efeito Mensagens Rotativas do Radar
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOnline && !exibindoOferta && !activeFrete) {
      const messages = [
        'Analisando cargas próximas...',
        'Otimizando melhor rota...',
        'Buscando frete ideal...',
        'Mapeando oportunidades...'
      ];
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isOnline, exibindoOferta, activeFrete]);

  // PWA Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Push Notifications Setup
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const messaging = getMessaging();
        const token = await getToken(messaging, { vapidKey: 'SUA_CHAVE_VAPID_AQUI' });
        if (token) localStorage.setItem('fcm_token', token);
      } catch (e) { console.warn("Aviso: Permissão push bloqueada."); }
    };
    if (user) requestPermission();
  }, [user]);

  // 🛡️ ANTI MOTORISTA-FANTASMA (Limpeza ao fechar o app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && user && isOnline && !activeFrete) {
        // Se colocar em background sem estar em corrida, fica offline por segurança
        deleteDoc(doc(db, 'motoristas_online', user.uid)).catch(console.error);
        setIsOnline(false);
      }
    };

    const handleBeforeUnload = () => {
      if (user && isOnline) {
        deleteDoc(doc(db, 'motoristas_online', user.uid)).catch(console.error);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, isOnline, activeFrete]);

  // 🛡️ HELPER: Cálculo de Distância Haversine
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Metros
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  // 🛡️ BLINDAGEM GPS REALTIME (Throttling & Distance Check)
  useEffect(() => {
    if (user && driverData?.status === 'aprovado' && isOnline) {
      
      const updatePosition = async (pos: GeolocationPosition) => {
        const now = Date.now();
        const { latitude, longitude } = pos.coords;
        const currentCoords = { lat: latitude, lng: longitude };

        let shouldUpdate = false;

        // Atualiza se passou do Heartbeat Máximo (15s) ou se andou mais que a distância mínima (50m)
        if (now - lastGpsUpdate.current >= GPS_HEARTBEAT_MS) {
          shouldUpdate = true;
        } else if (lastGpsCoords.current) {
          const distanceMoved = calculateDistance(
            lastGpsCoords.current.lat, lastGpsCoords.current.lng,
            currentCoords.lat, currentCoords.lng
          );
          if (distanceMoved >= GPS_MIN_DISTANCE_METERS) {
            shouldUpdate = true;
          }
        } else {
           shouldUpdate = true; // Primeira atualização
        }

        if (shouldUpdate) {
          lastGpsUpdate.current = now;
          lastGpsCoords.current = currentCoords;

          try {
            await setDoc(doc(db, 'motoristas_online', user.uid), {
              nome: driverData.nome, whatsapp: driverData.whatsapp, lat: latitude, lng: longitude,
              categoria: driverData.categoria, score: driverData.score || 5, taxaAceite: driverData.taxaAceite || 1,
              totalCorridas: driverData.totalCorridas || 1, destinoPreferencial: backhaulDestino, 
              status: activeFrete ? 'ocupado' : 'disponivel', emRota: !!activeFrete,
              origemAtualLat: latitude, origemAtualLng: longitude, destinoAtualLat: activeFrete?.destinoLat || null,
              destinoAtualLng: activeFrete?.destinoLng || null, tokenFCM: localStorage.getItem('fcm_token') || null,
              lastSeen: serverTimestamp() 
            }, { merge: true });
          } catch (err) {
            console.error("Erro GPS Write:", err);
          }
        }
      };

      watchIdRef.current = navigator.geolocation.watchPosition(
        updatePosition, 
        (err) => console.error("Erro GPS Stream:", err), 
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 } // Ajustado para evitar timeout frequente
      );
    }

    return () => { 
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [user, driverData, isOnline, activeFrete, backhaulDestino]);

  // 🛡️ BLINDAGEM DE RADAR E OFERTAS
  useEffect(() => {
    if (!user || !isOnline || activeFrete) {
      if (exibindoOferta) {
        setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null; stopAudio();
      }
      return;
    }

    const q = query(collection(db, 'fretes'), where('status', '==', 'disponivel'), where('filaMatching', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isOnline) return;
      
      if (snapshot.empty) {
        setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null; stopAudio(); 
        return;
      }

      let foundOffer = false;
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as OrderData;
        const freteId = docSnap.id;
        
        // Verifica se eu sou o primeiro da fila para garantir o matching perfeito
        if (!data.motoristaId && data.filaMatching && data.filaMatching[0] === user.uid) {
          if (currentOfferId.current !== freteId) {
            actionHandled.current = false; 
            currentOfferId.current = freteId;
            setOfertaFrete({ id: freteId, ...data }); 
            setExibindoOferta(true); 
            setTempoRestante(15); 
            playAudio();
          }
          foundOffer = true; break; 
        }
      }
      
      if (!foundOffer) { 
        setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null; stopAudio(); 
      }
    });

    return () => unsubscribe();
  }, [user, isOnline, activeFrete]);

  // Timer da Oferta
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (exibindoOferta && tempoRestante > 0) {
      timer = setTimeout(() => setTempoRestante(prev => prev - 1), 1000);
    } else if (exibindoOferta && tempoRestante === 0 && !actionHandled.current) {
      showToast('Tempo esgotado. A carga foi direcionada para o próximo veículo.', 'warning');
      handleRecusar(); 
    }
    return () => clearTimeout(timer);
  }, [exibindoOferta, tempoRestante]);

  // 🛡️ TRANSAÇÃO SEGURA PARA ACEITE
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
        
        if (data.status !== 'disponivel') throw new Error("JA_ACEITO");
        if (data.motoristaId) throw new Error("JA_ACEITO");
        if (data.filaMatching && data.filaMatching[0] !== user?.uid) throw new Error("FILA_ANDOU"); 
        
        transaction.update(freteRef, {
          status: 'aceito', 
          motoristaId: user?.uid, 
          motoristaNome: driverData?.nome || 'Motorista', 
          motoristaZap: driverData?.whatsapp || '',
          aceitoEm: serverTimestamp() // Prepara infraestrutura de analytics
        });
      });

      await updateDoc(doc(db, 'motoristas_online', user!.uid), { status: 'ocupado', emRota: true });
      setExibindoOferta(false); setOfertaFrete(null); currentOfferId.current = null;
      
    } catch (e: any) {
      if (e.message === "JA_ACEITO" || e.message === "FILA_ANDOU") {
        showToast("Ops! Esta corrida foi atribuída a outro parceiro mais rápido.", "warning");
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

  // 🛡️ BLINDAGEM DE UPLOADS (Tamanho e Tipo)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showToast("A imagem é muito pesada. Limite máximo: 10MB.", "warning");
      e.target.value = ''; // Reseta o input
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      showToast("Formato inválido. Use JPG ou PNG.", "error");
      e.target.value = '';
      return;
    }

    setter(file);
  };

  // 🔥 CADASTRO BLINDADO: FORÇA BRUTA COM TIMEOUT
  const handleCadastro = async () => {
    if (!form.nome || !form.cpf || !form.cnh || !form.placa || !form.renavam || !form.whatsapp || !form.cidadeEstado) {
      showToast("Preencha todos os campos de texto obrigatórios.", "warning");
      return;
    }
    if (!docFile) {
      showToast("Obrigatório: Envie a selfie segurando sua CNH.", "warning");
      return;
    }
    
    setUploadingDocs(true); 
    
    try {
      await Promise.race([
        (async () => {
          const docRef = ref(storage, `motoristas/${user!.uid}/documento_selfie`);
          await uploadBytes(docRef, docFile);
          const documentoUrl = await getDownloadURL(docRef);

          await setDoc(doc(db, 'motoristas_cadastros', user!.uid), {
            ...form,
            email: user!.email,
            documentoUrl,
            status: 'pendente',
            createdAt: serverTimestamp(),
            riscoFraude: 'pendente_analise' // Preparo para antifraude futuro
          });
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_FIREBASE')), 15000))
      ]);

      setDriverData({ id: user!.uid, ...form, status: 'pendente' } as any);
      setFormStep(false);
      
    } catch (error: any) {
      console.error(error);
      if (error.message === 'TIMEOUT_FIREBASE') {
        showToast("O envio demorou muito. Verifique sua conexão e tente novamente.", "error");
      } else {
        showToast("Erro ao processar os dados.", "error");
      }
    } finally {
      setUploadingDocs(false); 
    }
  };

  // Auth e Inicialização de Dados
  useEffect(() => {
    let unsubCad: any;
    let unsubFretes: any;

    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email });
        
        unsubCad = onSnapshot(doc(db, 'motoristas_cadastros', u.uid), (docSnap) => {
          if (docSnap.exists()) { 
            setDriverData({ id: docSnap.id, ...docSnap.data() } as DriverData); 
            setFormStep(false); 
          } else { 
            setFormStep(true); 
          }
          setCheckingDriver(false);
        }, (err) => {
          console.error("Erro Snapshot Cadastro", err);
          setCheckingDriver(false);
        });

        unsubFretes = onSnapshot(query(collection(db, 'fretes'), where('motoristaId', '==', u.uid)), (s) => {
          const ativo = s.docs.map(d => ({id: d.id, ...d.data()}) as OrderData).find(f => ['aceito', 'coleta', 'em_transporte'].includes(f.status));
          setActiveFrete(ativo || null); 
          setLoading(false);
        }, (err) => {
          console.error("Erro Snapshot Fretes", err);
          setLoading(false);
        });

      } else { 
        setUser(null); 
        setLoading(false); 
        setCheckingDriver(false);
        if (unsubCad) unsubCad();
        if (unsubFretes) unsubFretes();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubCad) unsubCad();
      if (unsubFretes) unsubFretes();
    };
  }, []);

  const toggleStatus = async () => {
    if (!user) return;
    initAudio(); // 🛡️ Ativa áudio no primeiro clique do usuário
    
    if (isOnline) { 
      setIsOnline(false); 
      stopAudio();
      try {
        await deleteDoc(doc(db, 'motoristas_online', user.uid)); 
      } catch(e) { console.error("Falha ao ficar offline", e); }
    } 
    else { 
      setIsOnline(true); 
      // O useEffect do GPS cuidará de setar o doc online assim que a coordenada chegar
    }
  };

  const updateStatusFrete = async (status: string) => {
    if (!activeFrete || !activeFrete.id || !user) return;
    
    if (status === 'entregue') {
      if (!comprovante) {
        showToast("⚠️ Foto da carga ou canhoto da NF é obrigatória para finalizar a entrega!", "warning");
        return;
      }
      
      setLoading(true);
      try {
        await Promise.race([
          (async () => {
            const fileRef = ref(storage, `comprovantes/${activeFrete.id}`);
            await uploadBytes(fileRef, comprovante);
            const url = await getDownloadURL(fileRef);
            await updateDoc(doc(db, 'fretes', activeFrete.id), { 
              status, 
              comprovanteUrl: url,
              entregueEm: serverTimestamp() 
            });
            await updateDoc(doc(db, 'motoristas_online', user.uid), { status: 'disponivel', emRota: false });
          })(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_UPLOAD')), 20000))
        ]);
        
        setComprovante(null);
      } catch(e: any) { 
        if (e.message === 'TIMEOUT_UPLOAD') showToast("O envio demorou muito. Tente uma foto de menor resolução.", "error");
        else showToast("Erro crítico ao finalizar corrida. Acione o suporte.", "error");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const updateData: any = { status };
        if (status === 'coleta') updateData.coletaEm = serverTimestamp();
        if (status === 'em_transporte') updateData.transporteEm = serverTimestamp();
        
        await updateDoc(doc(db, 'fretes', activeFrete.id), updateData);
      } catch (e) {
        showToast("Falha de conexão. Status não atualizado.", "error");
      }
    }
  };

  const openMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (loading || checkingDriver) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center animate-pulse shadow-[0_0_40px_rgba(37,99,235,0.4)]">
        <Truck className="text-white w-14 h-14" />
      </div>
      <Loader2 className="animate-spin text-blue-500 w-8 h-8 mt-4" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 relative pb-20">
      
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 w-[90%] max-w-sm border ${toast.type === 'error' ? 'bg-red-950 border-red-500 text-red-200' : 'bg-amber-950 border-amber-500 text-amber-200'}`}>
          <AlertTriangle size={24} className={`shrink-0 ${toast.type === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
          <span className="font-bold text-sm leading-tight flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"><XCircle size={20} /></button>
        </div>
      )}

      {/* 🔥 MODAL DE OFERTA DE FRETE - UX PREMIUM */}
      {exibindoOferta && ofertaFrete && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-green-500 rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_0_60px_rgba(34,197,94,0.3)] text-center relative overflow-hidden">
            
            {/* Barra de Tempo */}
            <div className="absolute top-0 left-0 h-2 bg-slate-800 w-full">
               <div className={`h-full transition-all duration-1000 ease-linear ${tempoRestante > 5 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${(tempoRestante / 15) * 100}%` }}></div>
            </div>
            
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-xl shadow-green-500/20 border border-green-500/50">
              <Zap className="text-green-400 w-10 h-10 fill-green-400" />
            </div>
            
            <h2 className="text-2xl font-black uppercase italic text-white mb-1">Carga Encontrada!</h2>
            <p className={`font-black text-lg mb-6 flex items-center justify-center gap-2 ${tempoRestante > 5 ? 'text-green-400' : 'text-red-400 animate-bounce'}`}>
              <Clock size={16} /> 00:{tempoRestante.toString().padStart(2, '0')}
            </p>

            <div className="bg-slate-950 p-5 rounded-2xl mb-6 text-left border border-slate-800 shadow-inner">
              <div className="flex items-start gap-3 mb-4">
                <MapPin className="text-blue-500 w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-500">Local de Coleta</p>
                  <p className="font-bold text-sm text-slate-200 line-clamp-2">{ofertaFrete.enderecoColetaTexto}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 mb-4">
                <MapPin className="text-green-500 w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-500">Local de Entrega</p>
                  <p className="font-bold text-sm text-slate-200 line-clamp-2">{ofertaFrete.enderecoEntregaTexto}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
                <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 text-center">
                  <p className="text-blue-400 text-[10px] font-black uppercase">Distância</p>
                  <h3 className="text-xl font-black text-white">{ofertaFrete.distancia?.toFixed(1)} km</h3>
                </div>
                <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 text-center">
                  <p className="text-orange-400 text-[10px] font-black uppercase">Peso / Volume</p>
                  <h3 className="text-xl font-black text-white line-clamp-1">{ofertaFrete.peso}</h3>
                </div>
              </div>
              
              <div className="bg-slate-800/50 p-3 rounded-xl mb-4 flex flex-wrap gap-2 text-[11px] justify-center border border-slate-700">
                 <span className="bg-slate-900 text-slate-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 border border-slate-700"><Truck size={12} className="text-blue-400"/> {VEHICLE_CONFIG[ofertaFrete.veiculo]?.nome || 'Veículo'}</span>
                 <span className="bg-slate-900 text-slate-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 border border-slate-700"><Package size={12}/> {ofertaFrete.qtdVolumes || 'N/A'}</span>
                 <span className="bg-slate-900 text-slate-300 px-3 py-1.5 rounded-lg font-bold border border-slate-700">{ofertaFrete.tipoMaterial}</span>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col justify-center items-center">
                  <p className="text-[10px] uppercase font-black text-slate-500 mb-1 tracking-widest">Oportunidade de Ganho</p>
                  <div className="flex items-center gap-1">
                    <DollarSign className="text-green-500 w-8 h-8" />
                    <p className="text-5xl font-black text-white italic drop-shadow-[0_0_15px_rgba(34,197,94,0.4)] tracking-tighter">
                      {ofertaFrete.valorMotorista?.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={handleRecusar} className="flex-1 bg-slate-800 text-slate-400 py-4 rounded-xl font-black uppercase hover:bg-slate-700 hover:text-white transition-all border border-slate-700 text-sm">Recusar</button>
              <button onClick={handleAceitar} className="flex-[2] bg-green-500 text-slate-950 py-4 rounded-xl font-black uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-green-500/30 text-lg italic">Aceitar Corrida</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER PREMIUM */}
      <nav className="bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/5 font-black italic mb-6 rounded-b-3xl text-lg sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3 tracking-tight">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/30">
            <Zap className="text-cyan-400 fill-cyan-400 w-5 h-5" />
          </div> 
          <span className="text-white">FRETOGO</span> <span className="text-cyan-400 font-bold ml-1 opacity-80">RADAR</span>
        </div>
        {user && <button onClick={() => signOut(auth)} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2 rounded-full uppercase hover:text-white transition-all font-bold tracking-wider">Sair da Conta</button>}
      </nav>

      {/* FLUXOS PRINCIPAIS */}
      {!user ? (
        <div className="text-center py-12 flex flex-col items-center justify-center min-h-[70vh]">
          <div className="bg-slate-900/50 rounded-[3rem] border border-white/5 shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-cyan-500/5 blur-3xl rounded-full"></div>
            <div className="w-24 h-24 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5 relative z-10">
              <Zap className="w-10 h-10 text-cyan-400 fill-cyan-400" />
            </div>
            <h1 className="text-4xl font-black italic mb-2 uppercase tracking-tight text-white relative z-10">
              Portal do<br/><span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">Motorista</span>
            </h1>
            <p className="text-sm text-slate-400 mb-8 font-medium relative z-10">Entre para acessar as cargas disponíveis na sua região.</p>
            
            <button onClick={() => signInWithPopup(auth, provider)} className="w-full bg-cyan-500 text-slate-950 p-5 rounded-2xl font-black uppercase italic shadow-[0_0_20px_rgba(6,182,212,0.3)] text-lg hover:scale-105 active:scale-95 transition-all duration-200 flex justify-center items-center gap-3 relative z-10">
              <Truck size={20} /> Acessar Conta
            </button>
          </div>
        </div>
      ) : formStep ? (
        <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-800">
            <div className="bg-cyan-500/20 p-3 rounded-2xl border border-cyan-500/30">
               <UserPlus className="text-cyan-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight leading-none text-white">Seu Veículo,<br/><span className="text-cyan-400">Seu Dinheiro.</span></h2>
          </div>
          <div className="space-y-4">
            <input className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 text-white font-bold placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-all text-sm" placeholder="Nome Completo" onChange={e => setForm({...form, nome: e.target.value})} />
            <input className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 text-white font-bold placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-all text-sm" placeholder="CPF" onChange={e => setForm({...form, cpf: e.target.value})} />
            
            <input className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 text-white font-bold placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-all text-sm" placeholder="Cidade / Estado (Ex: Guarulhos - SP)" onChange={e => setForm({...form, cidadeEstado: e.target.value})} />
            
            <input className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 text-white font-bold placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-all text-sm" placeholder="WhatsApp (DDD)" onChange={e => setForm({...form, whatsapp: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <input className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 text-white font-bold placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-all text-sm uppercase" placeholder="Placa" onChange={e => setForm({...form, placa: e.target.value})} />
              <input className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 text-white font-bold placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-all text-sm uppercase" placeholder="CNH" onChange={e => setForm({...form, cnh: e.target.value})} />
            </div>
            <input className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 text-white font-bold placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-all text-sm uppercase" placeholder="RENAVAM" onChange={e => setForm({...form, renavam: e.target.value})} />
            
            <select className="w-full p-4 bg-slate-950 text-white rounded-xl font-bold outline-none cursor-pointer border border-slate-800 focus:border-cyan-500 text-sm" onChange={e => setForm({...form, categoria: e.target.value as VehicleType})}>
              <option value="moto">Moto</option>
              <option value="carro_pequeno">Carro Pequeno</option>
              <option value="utilitario">Utilitário</option>
              <option value="toco">Caminhão Toco</option>
              <option value="truck">Caminhão Truck</option>
              <option value="carreta_ls">Carreta LS</option>
              <option value="bi_trem_cegonha">Bi-trem / Cegonha</option>
            </select>

            <div className="mt-6">
              <label className={`border-2 border-dashed rounded-2xl p-6 cursor-pointer flex flex-col items-center justify-center gap-3 transition-all ${docFile ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                <Camera size={32} className={docFile ? "text-cyan-400" : "text-slate-500"} />
                <div className="text-center">
                    <span className="font-black text-xs uppercase block mb-1 tracking-wider">{docFile ? 'FOTO ANEXADA COM SUCESSO' : 'Selfie com a CNH'}</span>
                    <span className="text-[10px] font-medium opacity-70 block max-w-[200px] mx-auto">O documento deve estar perfeitamente legível. (Máx: 10MB)</span>
                </div>
                <input type="file" hidden accept="image/jpeg,image/png,image/webp" capture="user" onChange={(e) => handleFileChange(e, setDocFile)} />
              </label>
            </div>

            <button onClick={handleCadastro} disabled={uploadingDocs} className="w-full bg-cyan-500 text-slate-950 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-95 transition-all mt-6 flex justify-center items-center gap-2 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none">
              {uploadingDocs ? <><Loader2 className="animate-spin w-4 h-4" /> ENVIANDO SEUS DADOS...</> : <><ShieldCheck className="w-4 h-4" /> Enviar para Análise</>}
            </button>
          </div>
        </div>
      ) : driverData?.status !== 'aprovado' ? (
        <div className="text-center py-12 flex flex-col items-center justify-center min-h-[70vh]">
          <div className="bg-slate-900/80 rounded-[3rem] border border-cyan-500/30 shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 backdrop-blur-md">
            <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/20">
              <ShieldCheck className="w-10 h-10 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-black italic uppercase mb-2 text-white tracking-tight">Status: <span className="text-cyan-400">Em Análise</span></h2>
            <p className="text-slate-400 font-medium text-sm leading-relaxed mb-8">Nossa equipe de segurança está validando sua CNH e veículo. Esse processo garante cargas seguras para todos.</p>
            
            <button 
              onClick={() => window.location.href = 'https://chat.whatsapp.com/IGylgsZPYhsDfMZDKzVjHT'} 
              className="w-full bg-green-500 hover:bg-green-400 transition-all text-slate-950 p-5 rounded-2xl font-black flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(34,197,94,0.3)] text-center group"
            >
              <span className="text-sm uppercase tracking-widest flex items-center gap-2"><Zap className="w-4 h-4 fill-slate-950" /> Acelerar Aprovação</span>
              <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Entrar no Grupo Oficial</span>
            </button>

            {deferredPrompt && (
              <button onClick={handleInstallClick} className="w-full mt-4 bg-slate-950 border border-white/5 text-slate-300 font-bold text-xs py-4 rounded-2xl flex items-center justify-center gap-2 uppercase transition-all hover:bg-slate-800">
                <Download size={16} /> Instalar Fretogo no Celular
              </button>
            )}
          </div>
        </div>
      ) : activeFrete ? (
        /* 🔥 UX PREMIUM DA ROTA (ACTIVE FRETE) */
        <div className="bg-slate-900 border border-cyan-500/30 p-6 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom max-w-md mx-auto relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
          
          <div className="flex items-center gap-3 mb-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <h2 className="text-xl font-black uppercase text-white italic tracking-tight">Rota Ativa</h2>
            <span className="ml-auto bg-slate-950 text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/5 uppercase tracking-widest">{activeFrete.distancia?.toFixed(1)} km</span>
          </div>
          
          <div className="bg-slate-950 p-5 rounded-3xl mb-8 border border-white/5 shadow-inner">
            <div className="flex items-start gap-4">
               <div className="flex flex-col items-center gap-1 mt-1">
                 <MapPin className="text-blue-500 w-5 h-5" />
                 <div className="w-0.5 h-8 bg-slate-800 rounded-full"></div>
                 <MapPin className="text-green-500 w-5 h-5" />
               </div>
               <div className="flex-1 space-y-4">
                 <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Retirada</p>
                   <p className="text-sm font-bold text-slate-200 line-clamp-1">{activeFrete.enderecoColetaTexto}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entrega</p>
                   <p className="text-sm font-bold text-slate-200 line-clamp-1">{activeFrete.enderecoEntregaTexto}</p>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
             <button onClick={() => openMaps(activeFrete.status === 'aceito' ? activeFrete.origemLat : activeFrete.destinoLat, activeFrete.status === 'aceito' ? activeFrete.origemLng : activeFrete.destinoLng)} className="bg-slate-800 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all border border-white/10"><Navigation className="w-4 h-4"/> Rota no GPS ({activeFrete.status === 'aceito' ? 'Coleta' : 'Destino'})</button>
             
             {activeFrete.status === 'aceito' && <button onClick={() => updateStatusFrete('coleta')} className="bg-cyan-500 text-slate-950 py-5 rounded-2xl font-black text-lg uppercase italic shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] transition-all flex justify-center items-center gap-2"><MapPin className="w-5 h-5"/> Cheguei na Coleta</button>}
             
             {activeFrete.status === 'coleta' && <button onClick={() => updateStatusFrete('em_transporte')} className="bg-yellow-400 text-slate-950 py-5 rounded-2xl font-black text-lg uppercase italic shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:scale-[1.02] transition-all flex justify-center items-center gap-2"><Truck className="w-5 h-5"/> Carga Embarcada</button>}
             
             {activeFrete.status === 'em_transporte' && (
               <div className="bg-slate-950 p-5 rounded-3xl border border-white/5 mt-2">
                 <p className="text-center text-xs text-slate-400 font-bold mb-4 uppercase tracking-widest">Comprovante de Entrega</p>
                 <input type="file" id="foto" className="hidden" capture="environment" onChange={(e) => handleFileChange(e, setComprovante)} />
                 <label htmlFor="foto" className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center flex items-center justify-center gap-2 cursor-pointer transition-all mb-4 border-2 border-dashed ${comprovante ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                   <Camera size={18}/> {comprovante ? "FOTO ANEXADA" : "TIRAR FOTO DA NF/CARGA"}
                 </label>
                 <button onClick={() => updateStatusFrete('entregue')} className="w-full bg-green-500 py-5 rounded-2xl font-black text-lg uppercase italic shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:scale-[1.02] transition-all text-slate-950 flex items-center justify-center gap-2">
                   <CheckCircle className="w-5 h-5"/> Finalizar Corrida
                 </button>
               </div>
             )}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-800">
            {activeFrete.id && <ChatFrete freteId={activeFrete.id} tipoUsuario="motorista" nome={driverData?.nome || "Motorista"} />}
          </div>
        </div>
      ) : (
        /* 🔥 UX PREMIUM DO RADAR (ONLINE / OFFLINE) */
        <div className="text-center flex flex-col items-center justify-center min-h-[70vh]">
            
            <div className="relative mb-12">
               {isOnline && (
                 <>
                   <div className="absolute inset-0 bg-cyan-500 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20 w-48 h-48 -left-8 -top-8"></div>
                   <div className="absolute inset-0 bg-cyan-400 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-10 w-64 h-64 -left-16 -top-16" style={{ animationDelay: '0.5s'}}></div>
                 </>
               )}
               <button onClick={toggleStatus} className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 relative z-10 hover:scale-105 active:scale-95 border-4 ${isOnline ? 'bg-slate-950 border-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.4)]' : 'bg-slate-900 border-slate-800 shadow-xl'}`}>
                 <Power className={`w-10 h-10 mb-1 transition-colors ${isOnline ? 'text-cyan-400' : 'text-slate-600'}`} />
                 <span className={`font-black uppercase tracking-widest text-[10px] ${isOnline ? 'text-cyan-400' : 'text-slate-600'}`}> {isOnline ? 'Online' : 'Offline'} </span>
               </button>
            </div>

            {isOnline ? (
              <div className="animate-in fade-in duration-500 w-full max-w-sm">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2 flex items-center justify-center gap-2">
                  <Radar className="w-8 h-8 text-cyan-400 animate-[spin_3s_linear_infinite]" /> Radar Ativo
                </h2>
                <div className="h-6 mb-8">
                  <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest animate-pulse" key={loadingMessage}>
                    {loadingMessage}
                  </p>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-3xl border border-white/5 text-left shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><MapPin size={14} className="text-blue-500"/> Busca Inteligente</p>
                    <span className="bg-slate-950 text-slate-400 text-[9px] font-bold px-2 py-1 rounded border border-white/5 uppercase">{VEHICLE_CONFIG[driverData?.categoria || 'carro_pequeno']?.nome}</span>
                  </div>
                  <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-bold text-sm outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600 text-white" placeholder="Destino preferencial (Ex: Campinas)" value={backhaulDestino} onChange={e => setBackhaulDestino(e.target.value)} />
                  <p className="text-[9px] font-medium text-slate-500 mt-3 text-center">Filtraremos cargas que retornam para este destino.</p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500 w-full max-w-sm mx-auto">
                 <h2 className="text-3xl font-black italic uppercase text-slate-700 mb-2 tracking-tighter">Radar Desligado</h2>
                 <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8 px-4">Você está invisível para os clientes. Toque no botão acima para começar a receber fretes na sua região.</p>

                 {deferredPrompt && (
                   <button onClick={handleInstallClick} className="w-full bg-slate-900 border border-white/5 text-slate-300 font-bold text-xs py-4 rounded-2xl flex items-center justify-center gap-2 uppercase tracking-widest transition-all hover:bg-slate-800">
                     <Download size={16} /> Instalar Painel no Celular
                   </button>
                 )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
