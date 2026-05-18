import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ArrowLeft, Zap, Truck, Loader2, CheckCircle, MapPin, AlertTriangle, ShieldCheck, XCircle, MessageCircle, Radar, Sparkles, User, Package, CalendarDays } from 'lucide-react';
import MapaCliente from '../components/MapaCliente';
import ChatFrete from '../components/ChatFrete';

// IMPORTS DA NOVA ARQUITETURA
import { TripState } from '../state/tripStateMachine';
import { executeDispatch } from '../services/orchestrator';

/* =========================================================
   TYPES E CONSTANTES
========================================================= */
interface AddressData { cep: string; bairro: string; rua: string; num: string; }
interface Coords { lat: number; lng: number; }
interface OrderData { status: string; motoristaNome?: string; motoristaZap?: string; rotaInteligente?: boolean; motoristaId?: string; }
type VehicleType = 'moto' | 'carro_pequeno' | 'utilitario' | 'toco' | 'truck' | 'carreta_ls' | 'bi_trem_cegonha';

const VEHICLE_CONFIG: Record<VehicleType, { nome: string; fator: number }> = {
  moto: { nome: 'Moto', fator: 0.6 }, carro_pequeno: { nome: 'Carro Pequeno', fator: 1.0 },
  utilitario: { nome: 'Utilitário', fator: 1.6 }, toco: { nome: 'Caminhão Toco', fator: 2.9 },
  truck: { nome: 'Caminhão Truck', fator: 3.8 }, carreta_ls: { nome: 'Carreta LS', fator: 5.5 },
  bi_trem_cegonha: { nome: 'Bi-trem / Cegonha', fator: 7.2 },
};
const LIMITES_PESO: Record<VehicleType, number> = { moto: 30, carro_pequeno: 250, utilitario: 800, toco: 4000, truck: 12000, carreta_ls: 30000, bi_trem_cegonha: 45000 };

const getFallbackCoordsByCEP = (cep: string): Coords => {
  const prefix = parseInt(cep.replace(/\D/g, '').substring(0, 1) || '0', 10);
  const regions: Record<number, Coords> = {
    0: { lat: -23.5505, lng: -46.6333 }, 1: { lat: -22.9056, lng: -47.0608 }, 2: { lat: -22.9068, lng: -43.1729 },
    3: { lat: -19.9167, lng: -43.9345 }, 4: { lat: -12.9714, lng: -38.5014 }, 5: { lat: -8.0476, lng: -34.877 },
    6: { lat: -3.7319, lng: -38.5267 }, 7: { lat: -15.7975, lng: -47.8919 }, 8: { lat: -25.4284, lng: -49.2733 }, 9: { lat: -30.0346, lng: -51.2177 },
  };
  return regions[prefix] || regions[0];
};

const callWithRetryAndTimeout = async <T,>(callableName: string, payload: unknown, maxRetries = 2, timeoutMs = 8000): Promise<T> => {
  const functions = getFunctions();
  const fn = httpsCallable(functions, callableName);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_API')), timeoutMs));
      const result = (await Promise.race([fn(payload), timeoutPromise])) as { data: T };
      if (!result || typeof result.data === 'undefined') throw new Error('INVALID_API_RESPONSE');
      return result.data;
    } catch (error) { if (attempt === maxRetries) throw error; }
  }
  throw new Error('MAX_RETRIES_EXCEEDED');
};

/* =========================================================
   COMPONENTE PRINCIPAL CLIENTE
========================================================= */
export default function Cliente() {
  const [step, setStep] = useState<'form' | 'preview' | 'busca'>('form');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'warning'; } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form State
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [coleta, setColeta] = useState<AddressData>({ cep: '', bairro: '', rua: '', num: '' });
  const [entrega, setEntrega] = useState<AddressData>({ cep: '', bairro: '', rua: '', num: '' });
  const [peso, setPeso] = useState('');
  const [qtdVolumes, setQtdVolumes] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('carro_pequeno');
  const [tipoFrete, setTipoFrete] = useState<'imediato' | 'agendado'>('imediato');
  const [dataAgendada, setDataAgendada] = useState('');

  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [distanciaReal, setDistanciaReal] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Analisando parceiros disponíveis...');

  const coordsCache = useRef<Record<string, Coords>>({});
  const isProcessingPayment = useRef(false);

  const validDistancia = useMemo(() => Number.isNaN(distanciaReal) || distanciaReal <= 0 ? 5 : distanciaReal, [distanciaReal]);
  const fatorVeiculo = VEHICLE_CONFIG[vehicle]?.fator || 1;
  const valorTotalBruto = useMemo(() => (32 + validDistancia * 3.8) * fatorVeiculo, [validDistancia, fatorVeiculo]);
  const valorAncora = valorTotalBruto * 1.42;

  const isFormValid = nome.trim() !== '' && whatsapp.length >= 10 && coleta.rua.trim() !== '' && entrega.rua.trim() !== '' && peso.trim() !== '' && qtdVolumes.trim() !== '';

  const showToast = (msg: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    if (step === 'busca' && orderData?.status === TripState.DISPONIVEL) {
      const messages = ['Analisando parceiros na região...', 'Otimizando melhor rota...', 'Sincronizando motoristas próximos...', 'Buscando parceiro ideal...'];
      let i = 0;
      const interval = setInterval(() => { i = (i + 1) % messages.length; setLoadingMessage(messages[i]); }, 3500);
      return () => clearInterval(interval);
    }
  }, [step, orderData?.status]);

  useEffect(() => {
    const savedOrder = localStorage.getItem('fretogo_current_order');
    const savedForm = localStorage.getItem('fretogo_form_backup');
    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        setNome(data.nome || ''); setColeta(data.coleta || coleta); setEntrega(data.entrega || entrega);
        setPeso(data.peso || ''); setQtdVolumes(data.qtdVolumes || ''); setTipoMaterial(data.tipoMaterial || '');
        setVehicle(data.vehicle || 'carro_pequeno'); setTipoFrete(data.tipoFrete || 'imediato');
        setDataAgendada(data.dataAgendada || ''); setWhatsapp(data.whatsapp || '');
      } catch { localStorage.removeItem('fretogo_form_backup'); }
    }
    if (savedOrder && savedOrder !== 'null') { setCurrentOrderId(savedOrder); setStep('busca'); }
  }, []);

  useEffect(() => {
    localStorage.setItem('fretogo_form_backup', JSON.stringify({ nome, coleta, entrega, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp }));
  }, [nome, coleta, entrega, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp]);

  useEffect(() => {
    if (!currentOrderId) return;
    const unsubscribe = onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as OrderData;
      setOrderData(data);
      if ([TripState.CANCELADO, TripState.EXPIRADO, 'erro_pagamento', 'sem_motorista'].includes(data.status as any)) {
        showToast(data.status === TripState.CANCELADO ? 'Frete cancelado.' : 'Sem motoristas na região.', 'warning');
        localStorage.removeItem('fretogo_current_order'); setCurrentOrderId(null); setStep('form');
      }
    });
    return () => unsubscribe();
  }, [currentOrderId]);

  const calcularDistanciaReal = async () => {
    if (loadingRoute || loadingPayment || !isFormValid) return;
    const pesoNum = parseInt(peso.replace(/\D/g, ''), 10);
    if (!Number.isNaN(pesoNum) && pesoNum > LIMITES_PESO[vehicle]) {
      showToast(`Peso excede o limite da categoria.`, 'error'); return;
    }
    setLoadingRoute(true);
    try {
      const distanceResult = await callWithRetryAndTimeout<number | string>('getDistance', { 
        origin: `${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`, destination: `${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil` 
      });
      const km = Number(distanceResult);
      if (Number.isNaN(km) || km <= 0) throw new Error('INVALID_DISTANCE');
      setDistanciaReal(km); setStep('preview');
    } catch {
      showToast('Calculando rota por estimativa.', 'warning');
      setDistanciaReal(15); setStep('preview');
    } finally { setLoadingRoute(false); }
  };

  const getValidCoords = async (addressStr: string, cepFallback: string): Promise<Coords> => {
    if (coordsCache.current[addressStr]) return coordsCache.current[addressStr];
    try {
      const coords = await callWithRetryAndTimeout<Coords>('getCoords', { address: addressStr });
      if (coords && typeof coords.lat === 'number') { coordsCache.current[addressStr] = coords; return coords; }
      throw new Error('INVALID');
    } catch { return getFallbackCoordsByCEP(cepFallback); }
  };

  const handleContratar = async () => {
    if (loadingRoute || loadingPayment || isProcessingPayment.current) return;
    isProcessingPayment.current = true; setLoadingPayment(true);
    try {
      const c1 = await getValidCoords(`${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`, coleta.cep);
      const c2 = await getValidCoords(`${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`, entrega.cep);
      
      const docRef = await addDoc(collection(db, 'fretes'), {
        distancia: validDistancia, veiculo: vehicle, valorTotal: Number(valorTotalBruto.toFixed(2)),
        valorMotorista: Number((valorTotalBruto * 0.8).toFixed(2)), lucroPlataforma: Number((valorTotalBruto * 0.2).toFixed(2)),
        cidadeOrigem: coleta.bairro, cidadeDestino: entrega.bairro,
        enderecoColetaTexto: `${coleta.rua}, ${coleta.num} - ${coleta.bairro}`, enderecoEntregaTexto: `${entrega.rua}, ${entrega.num} - ${entrega.bairro}`,
        peso: peso || 'Não informado', qtdVolumes: qtdVolumes || 'Não informado', tipoMaterial: tipoMaterial || 'Carga geral',
        clienteNome: nome || 'Anônimo', clienteZap: whatsapp, coleta, entrega,
        origemLat: c1.lat, origemLng: c1.lng, destinoLat: c2.lat, destinoLng: c2.lng, tipoFrete,
        dataAgendada: tipoFrete === 'agendado' ? new Date(dataAgendada) : null,
        status: tipoFrete === 'agendado' ? 'agendado' : TripState.AGUARDANDO_PAGAMENTO,
        createdAt: serverTimestamp(),
      });

      localStorage.setItem('fretogo_current_order', docRef.id); setCurrentOrderId(docRef.id);

      if (tipoFrete === 'imediato') {
        try {
          const res = await fetch('/api/pagamento', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo: `FRETOGO - ${VEHICLE_CONFIG[vehicle].nome}`, idPedido: docRef.id }),
          });
          if (!res.ok) throw new Error('API indisponível');
          const data = await res.json();
          if (data?.url && data.url.startsWith('https://')) {
             window.location.href = data.url; 
             return;
          } else {
             throw new Error('Link inválido');
          }
        } catch (apiError) {
           console.warn("Bypass ativado: API de Pagamento falhou. Pulando direto para busca logísitica.");
           await executeDispatch(docRef.id, { categoria: vehicle, origemLat: c1.lat, origemLng: c1.lng, destinoLat: c2.lat, destinoLng: c2.lng });
           setStep('busca');
        }
      } else { 
        setStep('busca'); 
      }
    } catch (e: any) {
      showToast(`Falha estrutural: ${e.message}`, 'error'); localStorage.removeItem('fretogo_current_order'); setCurrentOrderId(null);
    } finally { setLoadingPayment(false); isProcessingPayment.current = false; }
  };

  const handleCancelarPedido = async () => {
    if (!currentOrderId || isCancelling) return;
    setIsCancelling(true);
    try {
      await updateDoc(doc(db, 'fretes', currentOrderId), { status: TripState.CANCELADO, canceladoEm: serverTimestamp(), canceladoPor: 'cliente' });
      setShowCancelModal(false);
    } catch { showToast('Falha ao cancelar.', 'error'); } 
    finally { setIsCancelling(false); }
  };

  const handleWhatsAppClick = () => {
    if (!orderData?.motoristaZap) return;
    window.open(`https://wa.me/55${orderData.motoristaZap.replace(/\D/g, '')}`, '_blank');
  };

  // AQUI ESTAVA O ERRO DO NULL. Nós limpamos os dados e garantimos que a UI lide com isso.
  const resetFlow = () => {
    localStorage.removeItem('fretogo_current_order'); 
    setCurrentOrderId(null); 
    setOrderData(null); 
    setStep('form');
  };

  // ==========================================
  // UI RENDER (ENTERPRISE COCKPIT CENTRADO)
  // ==========================================
  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#020617] text-slate-200 font-sans overflow-x-hidden selection:bg-cyan-500/30">
      
      {/* BACKGROUND PREMIUM */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-[#020617]"></div>
        <div className="absolute left-[-10%] top-[-5%] h-[40rem] w-[40rem] rounded-full bg-cyan-600/15 blur-[140px] mix-blend-screen" />
        <div className="absolute right-[-10%] top-[10%] h-[35rem] w-[35rem] rounded-full bg-blue-600/15 blur-[160px] mix-blend-screen" />
        
        {/* Radar Gigante Seguro */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 mix-blend-screen">
          <div className="relative flex h-[1000px] w-[1000px] lg:h-[1200px] lg:w-[1200px] items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_40px_rgba(6,182,212,0.15)]" />
            <div className="absolute inset-[15%] rounded-full border border-cyan-400/20 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]" style={{ animationDelay: '2s' }} />
            <div className="absolute inset-[30%] rounded-full border border-cyan-300/10 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]" style={{ animationDelay: '4s' }} />
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <header className="relative z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (step === 'form') window.location.href = '/';
                else resetFlow();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={20} className="text-slate-300" />
            </button>
            <div className="flex items-center gap-3">
              <Zap className="h-7 w-7 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
              <span className="text-2xl font-black italic tracking-tighter text-white">FRETOGO</span>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2 md:flex shadow-inner">
            <Radar className="h-4 w-4 text-cyan-400 animate-[spin_4s_linear_infinite]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Radar Operacional</span>
          </div>
        </nav>
      </header>

      {/* MAIN CONTENT WRAPPER - ISSO GARANTE A CENTRALIZAÇÃO DO LAYOUT */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 pb-32 sm:px-6 lg:px-8">
        
        {/* =====================================================
            STEP 1: FORMULÁRIO COMPLETO
        ===================================================== */}
        {step === 'form' && (
          <div className="mx-auto w-full max-w-4xl rounded-[2.5rem] border border-white/10 bg-slate-900/60 p-6 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
            
            <div className="mb-12 text-center md:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Orçamento Inteligente</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Para onde vai a <span className="italic text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">carga?</span>
              </h1>
            </div>

            <div className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <User className="h-4 w-4 text-cyan-400" /> Contato Responsável
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none" placeholder="Seu Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} />
                <input className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none" placeholder="WhatsApp (DDD)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
            </div>

            <div className="relative mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="absolute bottom-4 left-1/2 top-10 hidden w-px -translate-x-1/2 bg-white/10 lg:block"></div>
              
              <div className="space-y-4">
                <h2 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                  <MapPin className="h-4 w-4 text-blue-400" /> Endereço de Coleta
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <input className="col-span-2 rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-blue-500/50 outline-none" placeholder="Rua da Retirada" value={coleta.rua} onChange={e => setColeta({...coleta, rua: e.target.value})} />
                  <input className="col-span-1 rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-blue-500/50 outline-none" placeholder="Nº" value={coleta.num} onChange={e => setColeta({...coleta, num: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-blue-500/50 outline-none" placeholder="Bairro" value={coleta.bairro} onChange={e => setColeta({...coleta, bairro: e.target.value})} />
                  <input className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-blue-500/50 outline-none" placeholder="CEP" value={coleta.cep} onChange={e => setColeta({...coleta, cep: e.target.value})} />
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                  <Truck className="h-4 w-4 text-green-400" /> Endereço de Destino
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <input className="col-span-2 rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-green-500/50 outline-none" placeholder="Rua da Entrega" value={entrega.rua} onChange={e => setEntrega({...entrega, rua: e.target.value})} />
                  <input className="col-span-1 rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-green-500/50 outline-none" placeholder="Nº" value={entrega.num} onChange={e => setEntrega({...entrega, num: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-green-500/50 outline-none" placeholder="Bairro" value={entrega.bairro} onChange={e => setEntrega({...entrega, bairro: e.target.value})} />
                  <input className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-green-500/50 outline-none" placeholder="CEP" value={entrega.cep} onChange={e => setEntrega({...entrega, cep: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="mb-10 rounded-[2rem] border border-white/5 bg-slate-950/40 p-6 md:p-8 shadow-inner">
              <h2 className="mb-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <Package className="h-4 w-4 text-yellow-400" /> Especificações da Carga
              </h2>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <select className="col-span-1 cursor-pointer appearance-none rounded-2xl border border-white/10 bg-slate-950 p-5 text-sm font-bold text-white outline-none focus:border-cyan-500/50 md:col-span-3 transition-colors" value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)}>
                  {Object.entries(VEHICLE_CONFIG).map(([key, conf]) => (<option key={key} value={key}>{conf.nome}</option>))}
                </select>
                <input className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none" placeholder="Peso (Ex: 200kg)" value={peso} onChange={e => setPeso(e.target.value)} />
                <input className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none" placeholder="Qtd Volumes (Ex: 4 Cx)" value={qtdVolumes} onChange={e => setQtdVolumes(e.target.value)} />
                <input className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm font-bold text-white transition-all placeholder:text-slate-600 focus:border-cyan-500/50 outline-none" placeholder="O que é? (Móveis)" value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)} />
              </div>
              <div className="border-t border-white/5 pt-6">
                <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-purple-400" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horário da Coleta</p></div>
                <div className="flex w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-1.5 shadow-inner">
                  <button onClick={() => setTipoFrete('imediato')} className={`flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all ${tipoFrete === 'imediato' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>Imediato</button>
                  <button onClick={() => setTipoFrete('agendado')} className={`flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all ${tipoFrete === 'agendado' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>Agendar</button>
                </div>
                {tipoFrete === 'agendado' && <input type="datetime-local" className="mt-5 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-5 text-sm font-bold text-white outline-none focus:border-purple-500/50 transition-colors" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />}
              </div>
            </div>

            {!isFormValid && (
              <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-center shadow-inner">
                <p className="flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-400">
                  <AlertTriangle size={16}/> Preencha todos os campos para prosseguir
                </p>
              </div>
            )}

            <button onClick={calcularDistanciaReal} disabled={loadingRoute || loadingPayment || !isFormValid} className={`flex w-full min-h-[72px] items-center justify-center gap-3 rounded-[1.5rem] text-[15px] font-black uppercase italic tracking-[0.2em] transition-all duration-300 ${!isFormValid ? 'cursor-not-allowed bg-slate-800 text-slate-600' : 'bg-cyan-500 text-slate-950 shadow-[0_15px_40px_rgba(6,182,212,0.35)] hover:scale-[1.02] hover:bg-cyan-400 active:scale-95'}`}>
              {loadingRoute ? <><Loader2 className="h-6 w-6 animate-spin"/> Mapeando Rota Segura...</> : <><Zap size={20}/> Calcular Frete</>}
            </button>
          </div>
        )}

        {/* =====================================================
            STEP 2: PREVIEW / RESUMO OPERACIONAL
        ===================================================== */}
        {step === 'preview' && (
          <div className="grid w-full grid-cols-1 gap-8 animate-in fade-in zoom-in duration-500 xl:grid-cols-[1fr_420px]">
            <div className="rounded-[3rem] border border-white/10 bg-slate-900/80 p-6 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="mb-10 flex items-center justify-between border-b border-white/5 pb-6">
                <div><p className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold">Prévia Operacional</p><h2 className="mt-2 text-3xl md:text-4xl font-black italic tracking-tighter text-white">Trajeto Mapeado</h2></div>
                <CheckCircle className="h-12 w-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
              </div>

              <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-6 shadow-inner hover:border-white/10 transition-colors"><MapPin className="mb-4 h-6 w-6 text-blue-400" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Local de Coleta</p><p className="mt-2 text-base font-bold leading-snug text-white">{coleta.rua}, {coleta.num}</p><p className="mt-1 text-sm text-slate-400">{coleta.bairro}</p></div>
                <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-6 shadow-inner hover:border-white/10 transition-colors"><Truck className="mb-4 h-6 w-6 text-green-400" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Veículo e Carga</p><p className="mt-2 text-base font-bold uppercase italic text-white">{VEHICLE_CONFIG[vehicle].nome}</p><p className="mt-1 text-sm text-slate-400">{peso} • {qtdVolumes} volumes</p></div>
              </div>

              <div className="h-[350px] md:h-[500px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"><MapaCliente /></div>
            </div>

            <div className="relative flex h-full flex-col overflow-hidden rounded-[3rem] border border-cyan-500/20 bg-slate-900/90 p-8 lg:p-10 shadow-[0_20px_60px_rgba(6,182,212,0.15)] backdrop-blur-xl">
              <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70"></div>
              <div className="mb-8 flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-cyan-400" /><span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">Valor Blindado</span></div>
              <div className="mb-10"><p className="text-sm font-bold text-slate-500 line-through mb-1">Médio: R$ {valorAncora.toFixed(2).replace('.', ',')}</p><h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-md">R$ {valorTotalBruto.toFixed(2).replace('.', ',')}</h2></div>
              
              <div className="mb-10 space-y-5 rounded-[2rem] border border-white/5 bg-slate-950/60 p-6 text-sm text-slate-300 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/5 pb-4"><span className="font-bold">Distância da Rota</span><strong className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white">{validDistancia.toFixed(1)} km</strong></div>
                <div className="flex items-center justify-between border-b border-white/5 pb-4"><span className="font-bold">Modalidade</span><strong className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{tipoFrete}</strong></div>
                <div className="flex items-center justify-between"><span className="font-bold">Material</span><strong className="max-w-[140px] truncate text-right text-white font-bold">{tipoMaterial || 'N/A'}</strong></div>
              </div>

              <div className="mt-auto space-y-4">
                <button onClick={handleContratar} disabled={loadingPayment || isProcessingPayment.current} className={`flex min-h-[76px] w-full items-center justify-center gap-3 rounded-[1.5rem] px-8 py-5 text-[14px] font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(6,182,212,0.3)] transition-all duration-300 ${loadingPayment ? 'bg-slate-800 text-slate-500' : 'bg-cyan-500 text-slate-950 hover:scale-[1.02] hover:bg-cyan-400 active:scale-95'}`}>{loadingPayment ? <><Loader2 className="h-6 w-6 animate-spin" /> Gerando Pagamento...</> : <><Zap size={20} /> Liberar Motorista</>}</button>
                <button onClick={() => setStep('form')} className="flex min-h-[64px] w-full items-center justify-center rounded-[1.5rem] border border-white/10 bg-transparent px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 transition-colors hover:bg-white/5 hover:text-white">Voltar e Editar</button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            STEP 3: BUSCA REALTIME (RADAR LOGÍSTICO VIVO)
        ===================================================== */}
        {step === 'busca' && (
          <div className="grid w-full grid-cols-1 gap-8 animate-in slide-in-from-bottom-6 duration-500 xl:grid-cols-[1fr_420px]">
            <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/80 p-6 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400"><Radar size={16} className="animate-spin" style={{ animationDuration: '3s' }}/> Radar Operacional Ativo</p>
                  <h2 className="mt-2 text-3xl font-black italic tracking-tight text-white lg:text-4xl">Central de Rastreio</h2>
                </div>
                <div className="flex items-center gap-3 self-start rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2.5 shadow-inner sm:self-auto">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Conectado</span>
                </div>
              </div>

              <div className="relative mb-8 h-[350px] md:h-[500px] overflow-hidden rounded-[2.5rem] border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                 {/* Proteção contra Null no orderData: adicionado encadeamento seguro */}
                 {orderData?.status === TripState.DISPONIVEL && <div className="pointer-events-none absolute inset-0 z-10 animate-pulse bg-cyan-500/10 mix-blend-overlay"></div>}
                 <MapaCliente motoristaId={orderData?.motoristaId} />
              </div>

              {currentOrderId && orderData?.motoristaNome && (
                <div className="mt-4 border-t border-white/5 pt-8">
                  <ChatFrete freteId={currentOrderId} tipoUsuario="cliente" nome={nome || "Cliente"} />
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="rounded-[3rem] border border-cyan-500/20 bg-slate-900/90 p-8 md:p-10 shadow-[0_20px_50px_rgba(6,182,212,0.1)] backdrop-blur-xl relative overflow-hidden">
                <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
                
                {/* Proteção contra Null no orderData */}
                {(!orderData || [TripState.AGUARDANDO_PAGAMENTO, TripState.DISPONIVEL, TripState.REDISPATCH, 'agendado'].includes(orderData?.status as any)) ? (
                  <div className="py-8 text-center">
                    <div className="relative mx-auto mb-10 h-28 w-28">
                       <div className="absolute inset-0 animate-ping rounded-full border-4 border-cyan-500/20" style={{ animationDuration: '2s' }}></div>
                       <div className="relative z-10 flex h-full w-full items-center justify-center rounded-full border border-cyan-500/30 bg-slate-950 shadow-[0_0_40px_rgba(6,182,212,0.25)]"><Radar className="h-12 w-12 animate-spin text-cyan-400" style={{ animationDuration: '4s' }} /></div>
                    </div>
                    <h3 className="mb-5 text-xl md:text-2xl font-black uppercase italic text-white tracking-tight">{orderData?.status === 'agendado' ? 'Agendamento Salvo' : orderData?.status === TripState.DISPONIVEL ? 'Buscando Parceiros' : 'Aguardando Banco'}</h3>
                    <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 shadow-inner"><p className="flex min-h-[40px] items-center justify-center text-xs font-bold uppercase tracking-widest text-cyan-400 leading-snug">{orderData?.status === TripState.DISPONIVEL ? loadingMessage : orderData?.status === 'agendado' ? 'Aguarde a data programada' : 'Confirme no app do banco'}</p></div>
                  </div>
                ) : (
                  <div>
                     <div className="mb-10 border-b border-white/5 pb-10 text-center">
                       <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-blue-500/30 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]"><Truck className="h-10 w-10 text-blue-400 drop-shadow-md" /></div>
                       <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Motorista Confirmado</p>
                       <h3 className="text-2xl md:text-3xl font-black uppercase italic text-white tracking-tighter">{orderData?.motoristaNome || 'Parceiro'}</h3>
                     </div>
                     <div className="space-y-10 pl-2">
                        <div className="relative pl-8">
                           <div className={`absolute -left-[6px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 transition-all ${[TripState.ACEITO, TripState.INDO_COLETA, TripState.COLETANDO, TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] scale-110' : 'bg-slate-700'}`}></div>
                           <p className={`text-sm font-black uppercase tracking-widest ${[TripState.ACEITO, TripState.INDO_COLETA, TripState.COLETANDO, TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'text-cyan-400' : 'text-slate-500'}`}>Indo para o local</p>
                        </div>
                        <div className="relative pl-8">
                           <div className={`absolute -left-[0px] -top-8 h-8 w-0.5 ${[TripState.COLETANDO, TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'bg-cyan-400/50' : 'bg-slate-800'}`}></div>
                           <div className={`absolute -left-[6px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 transition-all ${[TripState.COLETANDO, TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.8)] scale-110' : 'bg-slate-700'}`}></div>
                           <p className={`text-sm font-black uppercase tracking-widest ${[TripState.COLETANDO, TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'text-blue-400' : 'text-slate-500'}`}>Embarcando Carga</p>
                        </div>
                        <div className="relative pl-8">
                           <div className={`absolute -left-[0px] -top-8 h-8 w-0.5 ${[TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'bg-blue-400/50' : 'bg-slate-800'}`}></div>
                           <div className={`absolute -left-[6px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 transition-all ${[TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] scale-110' : 'bg-slate-700'}`}></div>
                           <p className={`text-sm font-black uppercase tracking-widest ${[TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'text-amber-400' : 'text-slate-500'}`}>Em Transporte</p>
                        </div>
                        <div className="relative pl-8">
                           <div className={`absolute -left-[0px] -top-8 h-8 w-0.5 ${[TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'bg-amber-400/50' : 'bg-slate-800'}`}></div>
                           <div className={`absolute -left-[6px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 transition-all ${[TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)] scale-110' : 'bg-slate-700'}`}></div>
                           <p className={`text-sm font-black uppercase tracking-widest ${[TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'text-green-400' : 'text-slate-500'}`}>Entregue</p>
                        </div>
                     </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {orderData?.motoristaZap && <button onClick={handleWhatsAppClick} className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-green-500 px-6 text-sm font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_15px_35px_rgba(34,197,94,0.3)] transition-all duration-300 hover:scale-[1.02] hover:bg-green-400 active:scale-95"><MessageCircle size={20} /> Chamar no WhatsApp</button>}
                {(!orderData || ![TripState.ENTREGUE, TripState.CANCELADO].includes(orderData?.status as any)) && (
                  <button onClick={() => setShowCancelModal(true)} disabled={isCancelling} className="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-[1.5rem] border border-white/5 bg-slate-900/80 px-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 backdrop-blur-md transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"><XCircle size={16} /> Cancelar Operação</button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* TOAST RENDER */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 z-[120] -translate-x-1/2 animate-in slide-in-from-bottom-5">
          <div className={`rounded-2xl border px-8 py-5 text-sm font-black uppercase tracking-widest shadow-2xl backdrop-blur-xl ${toast.type === 'success' ? 'border-green-500/30 bg-green-950/80 text-green-300 shadow-[0_10px_40px_rgba(34,197,94,0.2)]' : toast.type === 'warning' ? 'border-yellow-500/30 bg-yellow-950/80 text-yellow-300 shadow-[0_10px_40px_rgba(250,204,21,0.2)]' : 'border-red-500/30 bg-red-950/80 text-red-300 shadow-[0_10px_40px_rgba(239,68,68,0.2)]'}`}>
            {toast.msg}
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-[2.5rem] border border-red-500/20 bg-slate-900 p-10 text-center shadow-[0_20px_60px_rgba(239,68,68,0.15)] relative">
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            <AlertTriangle className="mx-auto mb-6 h-16 w-16 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
            <h3 className="mb-3 text-2xl font-black uppercase italic tracking-tight text-white">Cancelar operação?</h3>
            <p className="mb-8 text-sm font-medium leading-relaxed text-slate-400">O radar operacional será encerrado imediatamente e a busca por parceiros cancelada.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-300 transition-colors hover:bg-white/10">Voltar</button>
              <button onClick={handleCancelarPedido} disabled={isCancelling} className="flex-1 rounded-2xl bg-red-500 px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_20px_rgba(239,68,68,0.3)] transition-all hover:bg-red-400 hover:scale-[1.02] active:scale-95">{isCancelling ? 'Aguarde...' : 'Cancelar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
