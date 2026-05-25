import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ArrowLeft, Zap, Truck, Loader2, CheckCircle, MapPin, AlertTriangle, XCircle, MessageCircle, Radar, Sparkles, User, Package, CalendarDays } from 'lucide-react';
import MapaCliente from '../components/MapaCliente';
import ChatFrete from '../components/ChatFrete';
import ClientToast from '../components/ClientToast';
import ClientCancelModal from '../components/ClientCancelModal';
import ClientStatusCard from '../components/ClientStatusCard';
import ClientDriverCard from '../components/ClientDriverCard';
import { AppTripState, isFinalState, isActiveState } from '../state/tripStateMachine';
import { executeDispatch } from '../services/orchestrator';

interface AddressData { cep: string; bairro: string; rua: string; num: string; }
interface Coords { lat: number; lng: number; }
interface OrderData { id?: string; status: string; motoristaNome?: string; motoristaZap?: string; rotaInteligente?: boolean; motoristaId?: string; distancia?: number; veiculo?: string; valorTotal?: number; valorMotorista?: number; enderecoColetaTexto?: string; enderecoEntregaTexto?: string; origemLat?: number; origemLng?: number; destinoLat?: number; destinoLng?: number; tipoFrete?: string; dataAgendada?: string; motoristaLastSeen?: any; }
type VehicleType = 'moto' | 'carro_pequeno' | 'utilitario' | 'toco' | 'truck' | 'carreta_ls' | 'bi_trem_cegonha';

const VEHICLE_CONFIG: Record<VehicleType, { nome: string; fator: number }> = {
  moto: { nome: 'Moto', fator: 0.6 },
  carro_pequeno: { nome: 'Carro Pequeno', fator: 1.0 },
  utilitario: { nome: 'Utilitário', fator: 1.6 },
  toco: { nome: 'Caminhão Toco', fator: 2.9 },
  truck: { nome: 'Caminhão Truck', fator: 3.8 },
  carreta_ls: { nome: 'Carreta LS', fator: 5.5 },
  bi_trem_cegonha: { nome: 'Bi-trem / Cegonha', fator: 7.2 },
};

const LIMITES_PESO: Record<VehicleType, number> = {
  moto: 30, carro_pequeno: 250, utilitario: 800, toco: 4000, truck: 12000, carreta_ls: 30000, bi_trem_cegonha: 45000
};

const getFallbackCoordsByCEP = (cep: string): Coords => {
  const prefix = parseInt(cep.replace(/\D/g, '').substring(0, 1) || '0', 10);
  const regions: Record<number, Coords> = {
    0: { lat: -23.5505, lng: -46.6333 }, 1: { lat: -22.9056, lng: -47.0608 }, 2: { lat: -22.9068, lng: -43.1729 },
    3: { lat: -19.9167, lng: -43.9345 }, 4: { lat: -12.9714, lng: -38.5014 }, 5: { lat: -8.0476, lng: -34.877 },
    6: { lat: -3.7319, lng: -38.5267 }, 7: { lat: -15.7975, lng: -47.8919 }, 8: { lat: -25.4284, lng: -49.2733 }, 9: { lat: -30.0346, lng: -51.2177 },
  };
  return regions[prefix] || regions[0];
};

async function callWithRetryAndTimeout<T>(callableName: string, payload: unknown, maxRetries = 2, timeoutMs = 8000): Promise<T> {
  const functions = getFunctions();
  const fn = httpsCallable(functions, callableName);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_API")), timeoutMs));
      const result = await Promise.race([fn(payload), timeoutPromise]) as any;
      if (!result || typeof result.data === 'undefined') throw new Error("INVALID_API_RESPONSE");
      return result.data as T;
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
  throw new Error("MAX_RETRIES_EXCEEDED");
}

export default function Cliente() {
  const [step, setStep] = useState<'form' | 'preview' | 'busca'>('form');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'warning' } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [coleta, setColeta] = useState<AddressData>({ cep: '', bairro: '', rua: '', num: '' });
  const [entrega, setEntrega] = useState<AddressData>({ cep: '', bairro: '', rua: '', num: '' });
  const [peso, setPeso] = useState('');
  const [qtdVolumes, setQtdVolumes] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('carro_pequeno');
  const [tipoFrete, setTipoFrete] = useState<'imediato' | 'agendado'>('imediato');
  const [dataAgendada, setDataAgendada] = useState<string>('');

  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [distanciaReal, setDistanciaReal] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Analisando parceiros na região...');

  const coordsCache = useRef<Record<string, Coords>>({});
  const isProcessingPayment = useRef(false);
  const actionLock = useRef(false);

  const validDistancia = useMemo(() => (Number.isNaN(distanciaReal) || distanciaReal <= 0 ? 5 : distanciaReal), [distanciaReal]);
  const fatorVeiculo = VEHICLE_CONFIG[vehicle]?.fator || 1;
  const valorTotalBruto = useMemo(() => Number((32 + validDistancia * 3.8 * fatorVeiculo).toFixed(2)), [validDistancia, fatorVeiculo]);
  const valorAncora = Number((valorTotalBruto * 1.42).toFixed(2));

  const isFormValid = nome.trim() && whatsapp.length >= 10 && coleta.rua.trim() && entrega.rua.trim() && peso.trim() && qtdVolumes.trim();

  const showToast = useCallback((msg: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const clearClientSession = useCallback(() => {
    localStorage.removeItem('fretogo_currentorder');
    localStorage.removeItem('fretogo_formbackup');
    coordsCache.current = {};
    setCurrentOrderId(null);
    setOrderData(null);
    setStep('form');
    setLoadingRoute(false);
    setLoadingPayment(false);
    isProcessingPayment.current = false;
    actionLock.current = false;
  }, []);

  useEffect(() => {
    return () => {
      setToast(null);
      isProcessingPayment.current = false;
      actionLock.current = false;
    };
  }, []);

  useEffect(() => {
    if (!currentOrderId || !orderData) return;
    if (isFinalState(orderData.status)) return;
    const heartbeatInterval = setInterval(() => {
      updateDoc(doc(db, 'fretes', currentOrderId), { lastSeenCliente: serverTimestamp() }).catch(() => {});
    }, 15000);
    return () => clearInterval(heartbeatInterval);
  }, [currentOrderId, orderData?.status]);

  useEffect(() => {
    if (!currentOrderId || !orderData) return;
    if (!isActiveState(orderData.status) || !orderData.motoristaId) return;

    const checkDriverHealth = async () => {
      if (!orderData.motoristaLastSeen) return;
      const lastSeenMs = orderData.motoristaLastSeen.toDate ? orderData.motoristaLastSeen.toDate().getTime() : orderData.motoristaLastSeen;
      const now = Date.now();

      if (now - lastSeenMs > 45000) {
        try {
          const callRedispatch = httpsCallable(getFunctions(), 'triggerRedispatch');
          await callRedispatch({ freteId: currentOrderId, motoristaId: orderData.motoristaId, reason: 'timeout_watchdog' });
        } catch (e) {
          console.warn("Watchdog operacional falhou", e);
        }
      }
    };

    const watchdogInterval = setInterval(checkDriverHealth, 10000);
    return () => clearInterval(watchdogInterval);
  }, [currentOrderId, orderData]);

  useEffect(() => {
    if (step === 'busca' || orderData?.status === AppTripState.DISPONIVEL) {
      const messages = ['Analisando parceiros na região...', 'Otimizando melhor rota...', 'Sincronizando motoristas próximos...', 'Buscando parceiro ideal...'];
      let i = 0;
      setLoadingMessage(messages[i]);
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [step, orderData?.status]);

  useEffect(() => {
    const savedOrder = localStorage.getItem('fretogo_currentorder');
    const savedForm = localStorage.getItem('fretogo_formbackup');
    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        setNome(data.nome || ''); setColeta(data.coleta || { cep: '', bairro: '', rua: '', num: '' });
        setEntrega(data.entrega || { cep: '', bairro: '', rua: '', num: '' }); setPeso(data.peso || '');
        setQtdVolumes(data.qtdVolumes || ''); setTipoMaterial(data.tipoMaterial || '');
        setVehicle(data.vehicle || 'carro_pequeno'); setTipoFrete(data.tipoFrete || 'imediato');
        setDataAgendada(data.dataAgendada || ''); setWhatsapp(data.whatsapp || '');
      } catch { localStorage.removeItem('fretogo_formbackup'); }
    }
    if (savedOrder && savedOrder !== 'null') {
      setCurrentOrderId(savedOrder);
      setStep('busca');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('fretogo_formbackup', JSON.stringify({ nome, coleta, entrega, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp }));
  }, [nome, coleta, entrega, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp]);

  useEffect(() => {
    if (!currentOrderId) return;
    const unsub = onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as OrderData;
      setOrderData(data);
      if (isFinalState(data.status)) {
        setTimeout(() => showToast(data.status === AppTripState.CANCELADO ? 'Frete cancelado.' : 'Operação finalizada', 'warning'), 300);
        clearClientSession();
      }
    });
    return () => unsub();
  }, [currentOrderId, clearClientSession, showToast]);

  const calcularDistanciaReal = async () => {
    if (loadingRoute || loadingPayment || !isFormValid || actionLock.current) return;
    actionLock.current = true;
    const pesoNum = parseInt(peso.replace(/\D/g, ''), 10);
    if (!Number.isNaN(pesoNum) && pesoNum > LIMITES_PESO[vehicle]) {
      showToast('Peso excede o limite da categoria.', 'error');
      actionLock.current = false;
      return;
    }

    setLoadingRoute(true);
    try {
      const distanceResult = await callWithRetryAndTimeout<number>('getDistance', { origin: `${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`, destination: `${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil` }, 2, 8000);
      const km = Number(distanceResult);
      if (Number.isNaN(km) || km <= 0) throw new Error('INVALID_DISTANCE');
      setDistanciaReal(km);
      setStep('preview');
    } catch {
      showToast('Calculando rota por estimativa.', 'warning');
      setDistanciaReal(15);
      setStep('preview');
    } finally {
      setLoadingRoute(false);
      actionLock.current = false;
    }
  };

  const getValidCoords = async (addressStr: string, cepFallback: string): Promise<Coords> => {
    if (coordsCache.current[addressStr]) return coordsCache.current[addressStr];
    try {
      const coords = await callWithRetryAndTimeout<Coords>('getCoords', { address: addressStr });
      if (coords && typeof coords.lat === 'number') { coordsCache.current[addressStr] = coords; return coords; }
      throw new Error('INVALID_COORDS');
    } catch {
      return getFallbackCoordsByCEP(cepFallback);
    }
  };

  const handleContratar = async () => {
    if (loadingRoute || loadingPayment || isProcessingPayment.current || actionLock.current) return;
    actionLock.current = true;
    isProcessingPayment.current = true;
    setLoadingPayment(true);
    try {
      const c1 = await getValidCoords(`${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`, coleta.cep);
      const c2 = await getValidCoords(`${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`, entrega.cep);

      const docRef = await addDoc(collection(db, 'fretes'), {
        distancia: validDistancia, veiculo: vehicle, valorTotal: Number(valorTotalBruto.toFixed(2)),
        valorMotorista: Number((valorTotalBruto * 0.8).toFixed(2)), lucroPlataforma: Number((valorTotalBruto * 0.2).toFixed(2)),
        cidadeOrigem: coleta.bairro, cidadeDestino: entrega.bairro,
        enderecoColetaTexto: `${coleta.rua}, ${coleta.num} - ${coleta.bairro}`,
        enderecoEntregaTexto: `${entrega.rua}, ${entrega.num} - ${entrega.bairro}`,
        peso: peso || 'Não informado', qtdVolumes: qtdVolumes || 'Não informado', tipoMaterial: tipoMaterial || 'Carga geral',
        clienteNome: nome || 'Anônimo', clienteZap: whatsapp, coleta, entrega,
        origemLat: c1.lat, origemLng: c1.lng, destinoLat: c2.lat, destinoLng: c2.lng, tipoFrete,
        dataAgendada: tipoFrete === 'agendado' ? new Date(dataAgendada).toISOString() : null,
        status: tipoFrete === 'agendado' ? AppTripState.AGENDADO : AppTripState.AGUARDANDO_PAGAMENTO,
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
        lastSeenCliente: serverTimestamp()
      });

      localStorage.setItem('fretogo_currentorder', docRef.id);
      setCurrentOrderId(docRef.id);
      setStep('busca');

      if (tipoFrete === 'imediato') {
        try {
          const res = await fetch('/api/pagamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: `FRETOGO - ${VEHICLE_CONFIG[vehicle].nome}`, idPedido: docRef.id }) });
          if (!res.ok) throw new Error('API indisponível');
          const data = await res.json();
          if (data?.url && data.url.startsWith('https')) {
            window.location.href = data.url;
            return;
          }
          throw new Error('Link inválido');
        } catch {
          showToast('Aguardando sincronização de pagamento. Retorne ao app em breve.', 'warning');
        }
      }
    } catch (e: any) {
      showToast(`Falha estrutural: ${e?.message || 'erro interno'}`, 'error');
      clearClientSession();
    } finally {
      setLoadingPayment(false);
      isProcessingPayment.current = false;
      actionLock.current = false;
    }
  };

  const cancelFreteTransaction = async () => {
    if (!currentOrderId || isCancelling || actionLock.current) return;
    actionLock.current = true;
    setIsCancelling(true);
    try {
      const freteRef = doc(db, 'fretes', currentOrderId);
      await runTransaction(db, async (t) => {
        const snap = await t.get(freteRef);
        if (!snap.exists()) throw new Error("NOT_FOUND");
        const data = snap.data() as OrderData;
        if (isFinalState(data.status)) throw new Error("ALREADY_FINAL");

        t.update(freteRef, {
          status: AppTripState.CANCELADO,
          canceladoEm: serverTimestamp(),
          canceladoPor: 'cliente',
          filaMatching: [],
          motoristaId: null,
          motoristaNome: null,
          motoristaZap: null,
          emRota: false,
          activeOffers: [],
          redispatchQueue: []
        });
      });
      setShowCancelModal(false);
      clearClientSession();
      showToast('Pedido cancelado com sucesso.', 'success');
    } catch {
      showToast('Falha ao cancelar operação.', 'error');
    } finally {
      setIsCancelling(false);
      actionLock.current = false;
    }
  };

  const handleWhatsAppClick = () => {
    if (!orderData?.motoristaZap) return;
    window.open(`https://wa.me/55${orderData.motoristaZap.replace(/\D/g, '')}`, '_blank');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#020617] text-slate-200 font-sans overflow-x-hidden selection:bg-cyan-500/30">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-[#020617]" />
        <div className="absolute left-[-10%] top-[-5%] h-[40rem] w-[40rem] rounded-full bg-cyan-600/15 blur-[150px] mix-blend-screen" />
        <div className="absolute right-[-10%] top-[10%] h-[35rem] w-[35rem] rounded-full bg-blue-600/15 blur-[150px] mix-blend-screen" />
      </div>

      <header className="relative z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => { if (step === 'form') window.location.href = '/'; else clearClientSession(); }} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.05] active:scale-95">
              <ArrowLeft size={20} className="text-slate-300" />
            </button>
            <div className="flex items-center gap-3">
              <Zap className="h-7 w-7 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
              <span className="text-2xl font-black italic tracking-tighter text-white">FRETOGO</span>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2 md:flex shadow-inner">
            <Radar className="h-4 w-4 text-cyan-400 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Radar Operacional</span>
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex-1 mx-auto flex w-full max-w-[1400px] flex-col px-4 py-8 pb-20 sm:px-6 lg:px-8">

        <ClientToast toast={toast} />

        <ClientCancelModal
          show={showCancelModal}
          isCancelling={isCancelling}
          onConfirm={cancelFreteTransaction}
          onClose={() => setShowCancelModal(false)}
        />

        {step === 'form' && (
          <div className="w-full rounded-[2.5rem] border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-10 text-center md:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Orçamento Inteligente</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl leading-tight">Para onde vai a <span className="italic text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">carga?</span></h1>
            </div>
            <div className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400"><User className="h-4 w-4 text-cyan-400" /> Contato Responsável</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <input placeholder="Seu Nome Completo" value={nome} onChange={e => setNome(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-base md:text-lg font-bold text-white outline-none focus:border-cyan-500/50" />
                <input placeholder="WhatsApp (DDD)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-base md:text-lg font-bold text-white outline-none focus:border-cyan-500/50" />
              </div>
            </div>
            <div className="relative mb-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
              <div className="space-y-5">
                <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400"><MapPin className="h-4 w-4 text-blue-400" /> Endereço de Coleta</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input className="md:col-span-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-base font-bold text-white outline-none focus:border-blue-500/50" placeholder="Rua da Retirada" value={coleta.rua} onChange={e => setColeta({ ...coleta, rua: e.target.value })} />
                  <input className="md:col-span-1 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-base font-bold text-white outline-none focus:border-blue-500/50" placeholder="Nº" value={coleta.num} onChange={e => setColeta({ ...coleta, num: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-base font-bold text-white outline-none focus:border-blue-500/50" placeholder="Bairro" value={coleta.bairro} onChange={e => setColeta({ ...coleta, bairro: e.target.value })} />
                  <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-base font-bold text-white outline-none focus:border-blue-500/50" placeholder="CEP" value={coleta.cep} onChange={e => setColeta({ ...coleta, cep: e.target.value })} />
                </div>
              </div>
              <div className="space-y-5">
                <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400"><Truck className="h-4 w-4 text-green-400" /> Endereço de Destino</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input className="md:col-span-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-base font-bold text-white outline-none focus:border-green-500/50" placeholder="Rua da Entrega" value={entrega.rua} onChange={e => setEntrega({ ...entrega, rua: e.target.value })} />
                  <input className="md:col-span-1 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-base font-bold text-white outline-none focus:border-green-500/50" placeholder="Nº" value={entrega.num} onChange={e => setEntrega({ ...entrega, num: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-base font-bold text-white outline-none focus:border-green-500/50" placeholder="Bairro" value={entrega.bairro} onChange={e => setEntrega({ ...entrega, bairro: e.target.value })} />
                  <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-base font-bold text-white outline-none focus:border-green-500/50" placeholder="CEP" value={entrega.cep} onChange={e => setEntrega({ ...entrega, cep: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="mb-10 rounded-[2rem] border border-white/5 bg-slate-950/40 p-6 md:p-8 shadow-inner">
              <h2 className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400"><Package className="h-4 w-4 text-yellow-400" /> Especificações da Carga</h2>
              <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                <select value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)} className="w-full rounded-2xl border border-white/10 bg-slate-950 p-5 text-base font-bold text-white outline-none focus:border-cyan-500/50 md:col-span-3">
                  {Object.entries(VEHICLE_CONFIG).map(([key, conf]) => (<option key={key} value={key}>{conf.nome}</option>))}
                </select>
                <input placeholder="Peso (ex: 200kg)" value={peso} onChange={e => setPeso(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 p-5 text-base font-bold text-white outline-none focus:border-cyan-500/50" />
                <input placeholder="Qtd Volumes (ex: 4 Cx)" value={qtdVolumes} onChange={e => setQtdVolumes(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 p-5 text-base font-bold text-white outline-none focus:border-cyan-500/50" />
                <input placeholder="O que? (ex: Móveis)" value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 p-5 text-base font-bold text-white outline-none focus:border-cyan-500/50 md:col-span-3" />
              </div>
              <div className="border-t border-white/5 pt-8">
                <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-purple-400" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horário da Coleta</p></div>
                <div className="flex w-full rounded-2xl border border-white/10 bg-slate-950 p-1.5 shadow-inner">
                  <button onClick={() => setTipoFrete('imediato')} className={`flex-1 rounded-xl py-3 text-sm font-black uppercase tracking-wider ${tipoFrete === 'imediato' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>Imediato</button>
                  <button onClick={() => setTipoFrete('agendado')} className={`flex-1 rounded-xl py-3 text-sm font-black uppercase tracking-wider ${tipoFrete === 'agendado' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>Agendar</button>
                </div>
                {tipoFrete === 'agendado' && <input type="datetime-local" value={dataAgendada} onChange={e => setDataAgendada(e.target.value)} className="mt-5 w-full rounded-2xl border border-white/10 bg-slate-950 p-5 text-base font-bold text-white outline-none focus:border-purple-500/50" />}
              </div>
            </div>
            {!isFormValid && (
              <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-center">
                <p className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400"><AlertTriangle size={18} /> Preencha todos os campos para prosseguir</p>
              </div>
            )}
            <button onClick={calcularDistanciaReal} disabled={loadingRoute || loadingPayment || !isFormValid || actionLock.current} className={`flex w-full min-h-[64px] items-center justify-center gap-3 rounded-[1.5rem] px-8 py-4 text-base font-black uppercase italic tracking-[0.2em] transition-all duration-300 ${!isFormValid ? 'cursor-not-allowed bg-slate-800 text-slate-600' : 'bg-cyan-500 text-slate-950 shadow-[0_15px_40px_rgba(6,182,212,0.35)] hover:scale-[1.02] hover:bg-cyan-400'}`}>
              {loadingRoute ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Zap size={22} /> Calcular Frete</>}
            </button>
          </div>
        )}

        {step === 'preview' && (
          <div className="w-full grid grid-cols-1 gap-8 animate-in fade-in zoom-in duration-500 lg:grid-cols-[1fr_420px]">
            <div className="rounded-[3rem] border border-white/10 bg-slate-900/80 p-6 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="mb-10 flex items-center justify-between border-b border-white/5 pb-6">
                <div><p className="text-xs uppercase tracking-[0.25em] text-cyan-400 font-bold">Prévia Operacional</p><h2 className="mt-2 text-3xl md:text-4xl font-black italic tracking-tight text-white">Trajeto Mapeado</h2></div>
                <CheckCircle className="h-12 w-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
              </div>
              <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-6 shadow-inner"><MapPin className="mb-4 h-6 w-6 text-blue-400" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Local de Coleta</p><p className="mt-2 text-sm font-bold text-white leading-relaxed">{coleta.rua}, {coleta.num}</p><p className="mt-1 text-sm text-slate-400">{coleta.bairro}</p></div>
                <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-6 shadow-inner"><Truck className="mb-4 h-6 w-6 text-green-400" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Veículo e Carga</p><p className="mt-2 text-base font-bold uppercase italic text-white">{VEHICLE_CONFIG[vehicle].nome}</p><p className="mt-1 text-sm text-slate-400">{peso} · {qtdVolumes} volumes</p></div>
              </div>
              <div className="h-[350px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950 shadow-inner">
                <MapaCliente origem={`${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`} destino={`${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`} />
              </div>
            </div>
            <div className="relative flex flex-col rounded-[3rem] border border-cyan-500/20 bg-slate-900/90 p-8 lg:p-10 shadow-[0_20px_50px_rgba(6,182,212,0.08)] backdrop-blur-xl">
              <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70" />
              <div className="mb-8"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor Blindado</p><h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-md">R$ {valorTotalBruto.toFixed(2).replace('.', ',')}</h2></div>
              <div className="mb-6 space-y-4 rounded-[2rem] border border-white/5 bg-slate-950/60 p-6 text-sm text-slate-300 shadow-inner">
                <div className="flex items-center justify-between"><span className="font-bold">Distância</span><strong>{validDistancia.toFixed(1)} km</strong></div>
                <div className="flex items-center justify-between"><span className="font-bold">Material</span><strong>{tipoMaterial || 'N/A'}</strong></div>
              </div>
              <div className="mt-auto space-y-4">
                <button onClick={handleContratar} disabled={loadingPayment || actionLock.current} className="flex min-h-[76px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-cyan-500 px-8 py-5 text-[14px] font-black uppercase tracking-[0.2em] text-slate-950 hover:bg-cyan-400">
                  {loadingPayment ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Zap size={20} /> Liberar Motorista</>}
                </button>
                <button onClick={() => setStep('form')} className="flex min-h-[64px] w-full items-center justify-center rounded-[1.5rem] border border-white/10 bg-transparent px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-white/5">Voltar</button>
              </div>
            </div>
          </div>
        )}

        {step === 'busca' && (
          <div className="w-full grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px]">
            <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-8"><p className="flex items-center gap-2 text-[10px] font-black uppercase text-cyan-400"><Radar className="animate-spin" /> Radar Operacional Ativo</p><h2 className="mt-2 text-3xl font-black text-white">Central de Rastreio</h2></div>
              <div className="h-[350px] overflow-hidden rounded-[2.5rem] border border-white/10 shadow-inner">
                <MapaCliente motoristaId={orderData?.motoristaId} freteId={currentOrderId || undefined} />
                {orderData?.status === AppTripState.DISPONIVEL && <div className="absolute inset-0 z-10 animate-pulse bg-cyan-500/10 mix-blend-overlay" />}
              </div>
              <div className="mt-6"><ChatFrete freteId={currentOrderId || ''} tipoUsuario="cliente" nome={nome} /></div>
            </div>
            <div className="space-y-6">
              <ClientStatusCard
                status={orderData?.status}
                loadingMessage={loadingMessage}
                motoristaNome={orderData?.motoristaNome}
                veiculo={orderData?.veiculo}
                distancia={orderData?.distancia}
                valorTotal={orderData?.valorTotal}
              />
              <ClientDriverCard
                motoristaZap={orderData?.motoristaZap}
                motoristaNome={orderData?.motoristaNome}
                isFinal={orderData ? isFinalState(orderData.status) : false}
                isCancelling={isCancelling}
                onWhatsAppClick={handleWhatsAppClick}
                onCancelClick={() => setShowCancelModal(true)}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
