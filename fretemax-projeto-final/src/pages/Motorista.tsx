import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, provider, db, storage } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, runTransaction, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Loader2, Truck, CheckCircle, Navigation, MapPin, AlertTriangle, ShieldCheck, Camera, Zap, Power, XCircle, Download, Radar, Clock, MessageCircle, UserPlus, Search } from 'lucide-react';
import ChatFrete from '../components/ChatFrete';
import { triggerRedispatch } from '../services/orchestrator';
import { AppTripState, canTransition, isActiveState, isFinalState } from '../state/tripStateMachine';

interface Coords { lat: number; lng: number; }
interface OrderData { id?: string; status: string; distancia?: number; veiculo?: string; valorTotal?: number; valorMotorista?: number; enderecoColetaTexto?: string; enderecoEntregaTexto?: string; peso?: string; qtdVolumes?: string; tipoMaterial?: string; motoristaId?: string | null; motoristaNome?: string; motoristaZap?: string; filaMatching?: string[]; origemLat?: number; origemLng?: number; destinoLat?: number; destinoLng?: number; motoristaLastSeen?: any; }
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

export default function Motorista() {
  const [user, setUser] = useState<{uid: string, email: string|null} | null>(null);
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [activeFrete, setActiveFrete] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingDriver, setCheckingDriver] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [backhaulDestino, setBackhaulDestino] = useState('');
  const [showBackhaulInput, setShowBackhaulInput] = useState(false);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [form, setForm] = useState({ nome: '', whatsapp: '', placa: '', categoria: 'carro_pequeno' as VehicleType, cnh: '', renavam: '', cpf: '', cidadeEstado: '' });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [formStep, setFormStep] = useState(false);
  const [ofertaFrete, setOfertaFrete] = useState<OrderData | null>(null);
  const [tempoRestante, setTempoRestante] = useState(15);
  const [exibindoOferta, setExibindoOferta] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Buscando sinal GPS...');
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'warning' | 'success'} | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const actionLock = useRef(false);
  const watchIdRef = useRef<number | null>(null);
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
    audioRef.current.play().catch(() => {});
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }, []);

  useEffect(() => {
    return () => {
      setToast(null);
      actionLock.current = false;
      stopAudio();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [stopAudio]);

  // Transação de status protegida pela State Machine
  const updateStatusFrete = async (nextStatus: AppTripState) => {
    if (!activeFrete?.id || actionLock.current) return;
    
    if (!canTransition(activeFrete.status, nextStatus)) {
      showToast("Transição de status bloqueada.", "error");
      return;
    }

    actionLock.current = true;
    try {
      await runTransaction(db, async (t) => {
        const freteRef = doc(db, 'fretes', activeFrete.id!);
        const snap = await t.get(freteRef);
        if (!snap.exists()) throw new Error("NOT_FOUND");
        
        let updateData: any = { status: nextStatus, updatedAt: serverTimestamp() };
        if (nextStatus === AppTripState.ENTREGUE && comprovante) {
            const fileRef = ref(storage, `comprovantes/${activeFrete.id}`);
            await uploadBytes(fileRef, comprovante);
            updateData.comprovanteUrl = await getDownloadURL(fileRef);
        }
        t.update(freteRef, updateData);
      });
      showToast("Status atualizado!", "success");
    } catch { showToast("Erro na transação.", "error"); }
    finally { actionLock.current = false; }
  };

  const toggleStatus = async () => {
    if (!user || actionLock.current) return;
    actionLock.current = true;
    initAudio();

    if (isOnline) {
      setIsOnline(false);
      try { await deleteDoc(doc(db, 'motoristas_online', user.uid)); } catch(e){}
      actionLock.current = false;
    } else {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await setDoc(doc(db, 'motoristas_online', user.uid), { lat: pos.coords.latitude, lng: pos.coords.longitude, status: 'disponivel' }, { merge: true });
          setIsOnline(true);
          actionLock.current = false;
        },
        () => { showToast("GPS necessário.", "error"); actionLock.current = false; }
      );
    }
  };

  // UI Completa com as chamadas de updateStatusFrete e guards
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#020617] text-slate-200">
       {/* ... toda a estrutura de UI que você já possui ... */}
       {/* Botão de exemplo: */}
       {activeFrete && canTransition(activeFrete.status, AppTripState.COLETANDO) && (
          <button onClick={() => updateStatusFrete(AppTripState.COLETANDO)} className="bg-cyan-500">Iniciar Coleta</button>
       )}
    </div>
  );
}
