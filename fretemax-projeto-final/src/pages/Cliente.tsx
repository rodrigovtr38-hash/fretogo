import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  ArrowLeft,
  Zap,
  Truck,
  Loader2,
  CheckCircle,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  XCircle,
  MessageCircle,
  Radar,
  Clock3,
  Sparkles,
  User,
  Phone,
  Package,
  Weight,
  CalendarDays
} from 'lucide-react';
import MapaCliente from '../components/MapaCliente';
import ChatFrete from '../components/ChatFrete';

/* =========================================================
   TYPES
========================================================= */

interface AddressData {
  cep: string;
  bairro: string;
  rua: string;
  num: string;
}

interface Coords {
  lat: number;
  lng: number;
}

interface OrderData {
  status: string;
  motoristaNome?: string;
  motoristaZap?: string;
  rotaInteligente?: boolean;
  motoristaId?: string;
}

type VehicleType =
  | 'moto'
  | 'carro_pequeno'
  | 'utilitario'
  | 'toco'
  | 'truck'
  | 'carreta_ls'
  | 'bi_trem_cegonha';

interface VehicleConfig {
  nome: string;
  fator: number;
}

/* =========================================================
   VEHICLES CONFIG
========================================================= */

const VEHICLE_CONFIG: Record<VehicleType, VehicleConfig> = {
  moto: { nome: 'Moto', fator: 0.6 },
  carro_pequeno: { nome: 'Carro Pequeno', fator: 1.0 },
  utilitario: { nome: 'Utilitário', fator: 1.6 },
  toco: { nome: 'Caminhão Toco', fator: 2.9 },
  truck: { nome: 'Caminhão Truck', fator: 3.8 },
  carreta_ls: { nome: 'Carreta LS', fator: 5.5 },
  bi_trem_cegonha: { nome: 'Bi-trem / Cegonha', fator: 7.2 },
};

const LIMITES_PESO: Record<VehicleType, number> = {
  moto: 30,
  carro_pequeno: 250,
  utilitario: 800,
  toco: 4000,
  truck: 12000,
  carreta_ls: 30000,
  bi_trem_cegonha: 45000,
};

/* =========================================================
   FALLBACK GEO
========================================================= */

const getFallbackCoordsByCEP = (cep: string): Coords => {
  const prefix = parseInt(cep.replace(/\D/g, '').substring(0, 1) || '0', 10);
  const regions: Record<number, Coords> = {
    0: { lat: -23.5505, lng: -46.6333 },
    1: { lat: -22.9056, lng: -47.0608 },
    2: { lat: -22.9068, lng: -43.1729 },
    3: { lat: -19.9167, lng: -43.9345 },
    4: { lat: -12.9714, lng: -38.5014 },
    5: { lat: -8.0476, lng: -34.877 },
    6: { lat: -3.7319, lng: -38.5267 },
    7: { lat: -15.7975, lng: -47.8919 },
    8: { lat: -25.4284, lng: -49.2733 },
    9: { lat: -30.0346, lng: -51.2177 },
  };
  return regions[prefix] || regions[0];
};

/* =========================================================
   FIREBASE SAFE CALL
========================================================= */

const callWithRetryAndTimeout = async <T,>(
  callableName: string,
  payload: unknown,
  maxRetries = 2,
  timeoutMs = 8000,
): Promise<T> => {
  const functions = getFunctions();
  const fn = httpsCallable(functions, callableName);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_API')), timeoutMs),
      );

      const result = (await Promise.race([
        fn(payload),
        timeoutPromise,
      ])) as { data: T };

      if (!result || typeof result.data === 'undefined') {
        throw new Error('INVALID_API_RESPONSE');
      }

      return result.data;
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }

  throw new Error('MAX_RETRIES_EXCEEDED');
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Cliente() {
  const [step, setStep] = useState<'form' | 'preview' | 'busca'>('form');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [toast, setToast] = useState<{
    msg: string;
    type: 'error' | 'success' | 'warning';
  } | null>(null);

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

  /* =========================================================
      MEMO VALUES
  ========================================================= */

  const validDistancia = useMemo(() => {
    return Number.isNaN(distanciaReal) || distanciaReal <= 0 ? 5 : distanciaReal;
  }, [distanciaReal]);

  const fatorVeiculo = VEHICLE_CONFIG[vehicle]?.fator || 1;

  const valorTotalBruto = useMemo(() => {
    return (32 + validDistancia * 3.8) * fatorVeiculo;
  }, [validDistancia, fatorVeiculo]);

  const valorAncora = valorTotalBruto * 1.42;

  const isFormValid =
    nome.trim() !== '' &&
    whatsapp.length >= 10 &&
    coleta.rua.trim() !== '' &&
    entrega.rua.trim() !== '' &&
    peso.trim() !== '' &&
    qtdVolumes.trim() !== '';

  /* =========================================================
      TOAST
  ========================================================= */

  const showToast = (msg: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  /* =========================================================
      UX LOADING MESSAGES
  ========================================================= */

  useEffect(() => {
    if (step === 'busca' && orderData?.status === 'disponivel') {
      const messages = [
        'Analisando parceiros na região...',
        'Otimizando melhor rota...',
        'Sincronizando motoristas próximos...',
        'Buscando parceiro ideal...',
      ];

      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [step, orderData?.status]);

  /* =========================================================
      LOAD LOCAL STORAGE
  ========================================================= */

  useEffect(() => {
    const savedOrder = localStorage.getItem('fretogo_current_order');
    const savedForm = localStorage.getItem('fretogo_form_backup');

    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        setNome(data.nome || '');
        setColeta(data.coleta || coleta);
        setEntrega(data.entrega || entrega);
        setPeso(data.peso || '');
        setQtdVolumes(data.qtdVolumes || '');
        setTipoMaterial(data.tipoMaterial || '');
        setVehicle(data.vehicle || 'carro_pequeno');
        setTipoFrete(data.tipoFrete || 'imediato');
        setDataAgendada(data.dataAgendada || '');
        setWhatsapp(data.whatsapp || '');
      } catch {
        localStorage.removeItem('fretogo_form_backup');
      }
    }

    if (savedOrder && savedOrder !== 'null') {
      setCurrentOrderId(savedOrder);
      setStep('busca');
    }
  }, []);

  /* =========================================================
      SAVE FORM
  ========================================================= */

  useEffect(() => {
    localStorage.setItem(
      'fretogo_form_backup',
      JSON.stringify({
        nome,
        coleta,
        entrega,
        peso,
        qtdVolumes,
        tipoMaterial,
        vehicle,
        tipoFrete,
        dataAgendada,
        whatsapp,
      }),
    );
  }, [nome, coleta, entrega, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp]);

  /* =========================================================
      REALTIME LISTENER
  ========================================================= */

  useEffect(() => {
    if (!currentOrderId) return;

    const unsubscribe = onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => {
      if (!snap.exists()) return;

      const data = snap.data() as OrderData;
      setOrderData(data);

      const falhasCriticas = ['erro_pagamento', 'sem_motorista', 'expirado', 'timeout_motorista'];

      if (falhasCriticas.includes(data.status)) {
        showToast('Parceiros indisponíveis no momento.', 'error');
        localStorage.removeItem('fretogo_current_order');
        setCurrentOrderId(null);
        setStep('form');
      }

      if (data.status === 'cancelado') {
        showToast('Frete cancelado com sucesso.', 'success');
        localStorage.removeItem('fretogo_current_order');
        setCurrentOrderId(null);
        setStep('form');
      }
    });

    return () => unsubscribe();
  }, [currentOrderId]);

  /* =========================================================
      DISTANCE
  ========================================================= */

  const calcularDistanciaReal = async () => {
    if (loadingRoute || loadingPayment) return;

    if (!isFormValid) {
      showToast('Preencha os campos obrigatórios.');
      return;
    }

    const pesoNumero = parseInt(peso.replace(/\D/g, ''), 10);

    if (!Number.isNaN(pesoNumero)) {
      const limite = LIMITES_PESO[vehicle];
      if (pesoNumero > limite) {
        showToast(`Peso excede o limite da categoria (${limite}kg).`, 'error');
        return;
      }
    }

    setLoadingRoute(true);

    try {
      const originStr = `${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`;
      const destStr = `${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`;

      const distanceResult = await callWithRetryAndTimeout<number | string>(
        'getDistance',
        { origin: originStr, destination: destStr }
      );

      const km = Number(distanceResult);

      if (Number.isNaN(km) || km <= 0) {
        throw new Error('INVALID_DISTANCE');
      }

      setDistanciaReal(km);
      setStep('preview');
    } catch {
      showToast('Calculando rota por estimativa.', 'warning');
      setDistanciaReal(15);
      setStep('preview');
    } finally {
      setLoadingRoute(false);
    }
  };

  /* =========================================================
      GEO
  ========================================================= */

  const getValidCoords = async (addressStr: string, cepFallback: string): Promise<Coords> => {
    if (coordsCache.current[addressStr]) {
      return coordsCache.current[addressStr];
    }

    try {
      const coords = await callWithRetryAndTimeout<Coords>('getCoords', { address: addressStr });
      if (coords && typeof coords.lat === 'number') {
        coordsCache.current[addressStr] = coords;
        return coords;
      }
      throw new Error('INVALID_COORDS');
    } catch {
      return getFallbackCoordsByCEP(cepFallback);
    }
  };

  /* =========================================================
      CONTRATAR
  ========================================================= */

  const handleContratar = async () => {
    if (loadingRoute || loadingPayment || isProcessingPayment.current) return;

    isProcessingPayment.current = true;
    setLoadingPayment(true);

    try {
      const c1 = await getValidCoords(`${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`, coleta.cep);
      const c2 = await getValidCoords(`${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`, entrega.cep);

      const finalValTotal = Number(valorTotalBruto.toFixed(2));
      const docRef = await addDoc(collection(db, 'fretes'), {
        distancia: validDistancia,
        veiculo: vehicle,
        valorTotal: finalValTotal,
        valorMotorista: Number((valorTotalBruto * 0.8).toFixed(2)),
        lucroPlataforma: Number((valorTotalBruto * 0.2).toFixed(2)),
        cidadeOrigem: coleta.bairro,
        cidadeDestino: entrega.bairro,
        enderecoColetaTexto: `${coleta.rua}, ${coleta.num} - ${coleta.bairro}`,
        enderecoEntregaTexto: `${entrega.rua}, ${entrega.num} - ${entrega.bairro}`,
        peso: peso || 'Não informado',
        qtdVolumes: qtdVolumes || 'Não informado',
        tipoMaterial: tipoMaterial || 'Carga geral',
        clienteNome: nome || 'Anônimo',
        clienteZap: whatsapp,
        coleta,
        entrega,
        origemLat: c1.lat,
        origemLng: c1.lng,
        destinoLat: c2.lat,
        destinoLng: c2.lng,
        tipoFrete,
        dataAgendada: tipoFrete === 'agendado' ? new Date(dataAgendada) : null,
        status: tipoFrete === 'agendado' ? 'agendado' : 'aguardando_pagamento',
        createdAt: serverTimestamp(),
      });

      localStorage.setItem('fretogo_current_order', docRef.id);
      setCurrentOrderId(docRef.id);

      if (tipoFrete === 'imediato') {
        const res = await fetch('/api/pagamento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: `FRETOGO - ${VEHICLE_CONFIG[vehicle].nome}`,
            idPedido: docRef.id,
          }),
        });

        if (!res.ok) throw new Error('Pagamento indisponível.');
        const data = await res.json();

        if (data?.url && data.url.startsWith('https://')) {
          window.location.href = data.url;
        } else {
          throw new Error('Link inválido.');
        }
      } else {
        setStep('busca');
      }
    } catch (e: any) {
      showToast(`Falha: ${e.message}`, 'error');
      localStorage.removeItem('fretogo_current_order');
      setCurrentOrderId(null);
    } finally {
      setLoadingPayment(false);
      isProcessingPayment.current = false;
    }
  };

  /* =========================================================
     CANCELAR
  ========================================================= */

  const handleCancelarPedido = async () => {
    if (!currentOrderId || isCancelling) return;
    setIsCancelling(true);

    try {
      await updateDoc(doc(db, 'fretes', currentOrderId), {
        status: 'cancelado',
        canceladoEm: serverTimestamp(),
        canceladoPor: 'cliente',
      });
      setShowCancelModal(false);
    } catch {
      showToast('Falha ao cancelar.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  /* =========================================================
     WHATSAPP
  ========================================================= */

  const handleWhatsAppClick = () => {
    if (!orderData?.motoristaZap) return;
    const cleanPhone = orderData.motoristaZap.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  /* =========================================================
     RESET
  ========================================================= */

  const resetFlow = () => {
    localStorage.removeItem('fretogo_current_order');
    setCurrentOrderId(null);
    setOrderData(null);
    setStep('form');
  };

  /* =========================================================
     UI RENDER
  ========================================================= */

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-200">
      {/* BACKGROUND PREMIUM */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.96),rgba(2,6,23,1))]" />
        <div className="absolute top-[-10%] left-[-5%] w-[35rem] h-[35rem] bg-cyan-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (step === 'form') window.location.href = '/';
                else resetFlow();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={18} className="text-slate-300" />
            </button>
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 fill-cyan-400 text-cyan-400" />
              <span className="text-xl font-black italic tracking-tight text-white">FRETOGO</span>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 md:flex">
            <Radar className="h-4 w-4 text-cyan-400 animate-[spin_4s_linear_infinite]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Radar Operacional</span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-10 pb-32">
        
        {/* =====================================================
            STEP: FORMULÁRIO COMPLETO E RECONSTRUÍDO
        ===================================================== */}
        {step === 'form' && (
          <div className="glass-card bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-6 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-bottom-4">
            
            {/* Cabeçalho Form */}
            <div className="mb-10 text-center md:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Orçamento Inteligente</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Para onde vai a <span className="text-cyan-400 italic">carga?</span>
              </h1>
            </div>

            {/* SEÇÃO 1: Dados do Cliente */}
            <div className="mb-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-cyan-400" /> Contato Responsável
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="w-full p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all"
                  placeholder="Seu Nome Completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                <input
                  className="w-full p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all"
                  placeholder="WhatsApp (DDD)"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
            </div>

            {/* SEÇÃO 2: Endereços (Coleta e Entrega) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 relative">
              <div className="hidden lg:block absolute left-1/2 top-10 bottom-4 w-px bg-white/5 -translate-x-1/2"></div>
              
              {/* Coleta */}
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-400" /> Endereço de Coleta
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <input className="col-span-2 p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="Rua da Retirada" value={coleta.rua} onChange={e => setColeta({...coleta, rua: e.target.value})} />
                  <input className="col-span-1 p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="Nº" value={coleta.num} onChange={e => setColeta({...coleta, num: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="Bairro" value={coleta.bairro} onChange={e => setColeta({...coleta, bairro: e.target.value})} />
                  <input className="p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="CEP" value={coleta.cep} onChange={e => setColeta({...coleta, cep: e.target.value})} />
                </div>
              </div>

              {/* Entrega */}
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-green-400" /> Endereço de Destino
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <input className="col-span-2 p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="Rua da Entrega" value={entrega.rua} onChange={e => setEntrega({...entrega, rua: e.target.value})} />
                  <input className="col-span-1 p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="Nº" value={entrega.num} onChange={e => setEntrega({...entrega, num: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="Bairro" value={entrega.bairro} onChange={e => setEntrega({...entrega, bairro: e.target.value})} />
                  <input className="p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="CEP" value={entrega.cep} onChange={e => setEntrega({...entrega, cep: e.target.value})} />
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: Detalhes da Carga e Veículo */}
            <div className="bg-slate-950/30 border border-white/5 rounded-[2rem] p-6 mb-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-yellow-400" /> Especificações da Carga
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <select 
                  className="col-span-1 md:col-span-3 bg-slate-950 border border-white/10 rounded-xl px-4 py-4 text-sm font-bold text-white focus:border-cyan-500/50 outline-none appearance-none cursor-pointer"
                  value={vehicle} 
                  onChange={e => setVehicle(e.target.value as VehicleType)}
                >
                  {Object.entries(VEHICLE_CONFIG).map(([key, conf]) => (
                    <option key={key} value={key}>{conf.nome}</option>
                  ))}
                </select>

                <input className="p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="Peso (Ex: 200kg)" value={peso} onChange={e => setPeso(e.target.value)} />
                <input className="p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="Qtd Volumes (Ex: 4 Caixas)" value={qtdVolumes} onChange={e => setQtdVolumes(e.target.value)} />
                <input className="p-4 bg-white/5 rounded-xl border border-white/10 text-white font-medium placeholder:text-slate-600 text-sm focus:border-cyan-500/50 outline-none transition-all" placeholder="O que é? (Móveis, Caixas)" value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)} />
              </div>

              {/* Toggle de Agendamento */}
              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 mb-3">
                   <CalendarDays className="h-4 w-4 text-purple-400" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Horário da Coleta</p>
                </div>
                <div className="flex bg-slate-950 border border-white/10 rounded-xl p-1 w-full max-w-sm">
                  <button onClick={() => setTipoFrete('imediato')} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${tipoFrete === 'imediato' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-white'}`}>Imediato</button>
                  <button onClick={() => setTipoFrete('agendado')} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${tipoFrete === 'agendado' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 hover:text-white'}`}>Agendar</button>
                </div>
                {tipoFrete === 'agendado' && (
                  <input type="datetime-local" className="mt-4 w-full max-w-sm bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500/50 outline-none" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />
                )}
              </div>
            </div>

            {/* Aviso e Ação Principal */}
            {!isFormValid && (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center justify-center gap-2">
                  <AlertTriangle size={14}/> Preencha todos os campos para prosseguir
                </p>
              </div>
            )}

            <button 
              onClick={calcularDistanciaReal} 
              disabled={loadingRoute || loadingPayment || !isFormValid} 
              className={`w-full py-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-3 ${!isFormValid ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.3)]'}`}
            >
              {loadingRoute ? <><Loader2 className="animate-spin w-5 h-5"/> Mapeando Rota Segura...</> : <><Zap size={18}/> Calcular Frete</>}
            </button>
          </div>
        )}

        {/* =====================================================
            STEP: PREVIEW / RESUMO
        ===================================================== */}
        {step === 'preview' && (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_420px] animate-in fade-in zoom-in duration-300">
            
            <div className="glass-card bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-400">Prévia Operacional</p>
                  <h2 className="mt-1 text-3xl font-black italic tracking-tighter">Trajeto Mapeado</h2>
                </div>
                <CheckCircle className="h-10 w-10 text-cyan-400/50" />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 mb-8">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <MapPin className="mb-3 h-5 w-5 text-blue-400" />
                  <p className="text-[9px] uppercase tracking-widest text-slate-500">Local de Coleta</p>
                  <p className="mt-1 text-sm font-bold text-white leading-tight">{coleta.rua}, {coleta.num}</p>
                  <p className="text-xs text-slate-400 mt-1">{coleta.bairro}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <Truck className="mb-3 h-5 w-5 text-green-400" />
                  <p className="text-[9px] uppercase tracking-widest text-slate-500">Veículo e Carga</p>
                  <p className="mt-1 text-sm font-bold text-white uppercase italic">{VEHICLE_CONFIG[vehicle].nome}</p>
                  <p className="text-xs text-slate-400 mt-1">{peso} • {qtdVolumes} volumes</p>
                </div>
              </div>

              <div className="h-[350px] md:h-[450px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-inner">
                <MapaCliente />
              </div>
            </div>

            {/* SIDEBAR PREVIEW */}
            <div className="glass-card bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
              
              <div className="mb-6 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-cyan-300">Valor Blindado</span>
              </div>

              <div className="mb-6">
                 <p className="text-sm font-bold text-slate-500 line-through">Médio: R$ {valorAncora.toFixed(2).replace('.', ',')}</p>
                 <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tighter">R$ {valorTotalBruto.toFixed(2).replace('.', ',')}</h2>
              </div>

              <div className="space-y-4 text-sm text-slate-300 bg-slate-950/50 p-5 rounded-2xl border border-white/5 mb-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="font-bold">Distância da Rota</span>
                  <strong className="text-white bg-slate-800 px-2 py-1 rounded text-xs">{validDistancia.toFixed(1)} km</strong>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="font-bold">Modalidade</span>
                  <strong className="text-cyan-400 uppercase text-[10px] tracking-widest">{tipoFrete}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold">Material</span>
                  <strong className="text-white line-clamp-1 text-right max-w-[120px]">{tipoMaterial || 'N/A'}</strong>
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <button
                  onClick={handleContratar}
                  disabled={loadingPayment || isProcessingPayment.current}
                  className={`flex min-h-[72px] w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-[0.15em] transition-all shadow-xl ${loadingPayment ? 'bg-slate-800 text-slate-500' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:scale-[1.02] active:scale-95 shadow-cyan-500/20'}`}
                >
                  {loadingPayment ? <><Loader2 className="h-5 w-5 animate-spin" /> Gerando Pagamento...</> : <><Zap size={5} /> Liberar Motorista</>}
                </button>
                <button
                  onClick={() => setStep('form')}
                  className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-transparent px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Voltar e Editar
                </button>
              </div>
            </div>

          </div>
        )}

        {/* =====================================================
            STEP: BUSCA REALTIME (RADAR)
        ===================================================== */}
        {step === 'busca' && (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_420px] animate-in slide-in-from-bottom-6">
            
            <div className="glass-card bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl relative overflow-hidden">
              
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase font-black tracking-[0.2em] text-cyan-400 flex items-center gap-2">
                    <Radar size={14} className="animate-spin" style={{ animationDuration: '3s' }}/> Radar Operacional Ativo
                  </p>
                  <h2 className="mt-1 text-2xl lg:text-3xl font-black italic tracking-tight text-white">Central de Rastreio</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 self-start sm:self-auto">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Conectado</span>
                </div>
              </div>

              <div className="h-[350px] lg:h-[450px] overflow-hidden rounded-[2rem] border border-white/10 relative shadow-inner mb-6">
                 {orderData?.status === 'disponivel' && (
                   <div className="absolute inset-0 bg-cyan-500/10 z-10 pointer-events-none mix-blend-overlay animate-pulse"></div>
                 )}
                 <MapaCliente motoristaId={orderData?.motoristaId} />
              </div>

              {currentOrderId && orderData?.motoristaNome && (
                <div className="mt-2 border-t border-white/5 pt-6">
                  <ChatFrete freteId={currentOrderId} tipoUsuario="cliente" nome={nome || "Cliente"} />
                </div>
              )}
            </div>

            {/* SIDEBAR OPERACIONAL */}
            <div className="space-y-6">
              <div className="glass-card bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
                {['aguardando_pagamento', 'disponivel', 'agendado'].includes(orderData?.status || '') ? (
                  <div className="text-center py-6">
                    <div className="relative mx-auto w-24 h-24 mb-8">
                       <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping"></div>
                       <div className="w-full h-full bg-slate-950 border border-cyan-500/30 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                         <Radar className="w-10 h-10 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
                       </div>
                    </div>
                    <h3 className="text-xl font-black italic uppercase text-white mb-4">
                      {orderData?.status === 'agendado' ? 'Agendamento Salvo' : orderData?.status === 'disponivel' ? 'Buscando Parceiros' : 'Aguardando Banco'}
                    </h3>
                    <div className="bg-slate-950 border border-white/5 rounded-xl p-4">
                      <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest min-h-[36px] flex items-center justify-center">
                        {orderData?.status === 'disponivel' ? loadingMessage : orderData?.status === 'agendado' ? 'Aguarde a data programada' : 'Confirme no app do banco'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                     <div className="text-center mb-8 border-b border-white/5 pb-8">
                       <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                         <Truck className="w-8 h-8 text-blue-400" />
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Motorista Confirmado</p>
                       <h3 className="text-2xl font-black text-white uppercase italic">{orderData?.motoristaNome || 'Parceiro'}</h3>
                     </div>

                     <div className="space-y-8 pl-2">
                        <div className="relative pl-6">
                           <div className={`absolute -left-[5px] top-1 w-3 h-3 rounded-full border-2 border-slate-900 transition-all ${['aceito', 'coleta', 'em_transporte', 'entregue'].includes(orderData!.status) ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-slate-700'}`}></div>
                           <p className={`text-xs font-black uppercase tracking-widest ${['aceito', 'coleta', 'em_transporte', 'entregue'].includes(orderData!.status) ? 'text-cyan-400' : 'text-slate-500'}`}>Indo para o local</p>
                        </div>
                        <div className="relative pl-6">
                           <div className={`absolute -left-[0px] -top-6 w-0.5 h-6 ${['coleta', 'em_transporte', 'entregue'].includes(orderData!.status) ? 'bg-cyan-400/50' : 'bg-slate-800'}`}></div>
                           <div className={`absolute -left-[5px] top-1 w-3 h-3 rounded-full border-2 border-slate-900 transition-all ${['coleta', 'em_transporte', 'entregue'].includes(orderData!.status) ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]' : 'bg-slate-700'}`}></div>
                           <p className={`text-xs font-black uppercase tracking-widest ${['coleta', 'em_transporte', 'entregue'].includes(orderData!.status) ? 'text-blue-400' : 'text-slate-500'}`}>Embarcando Carga</p>
                        </div>
                        <div className="relative pl-6">
                           <div className={`absolute -left-[0px] -top-6 w-0.5 h-6 ${['em_transporte', 'entregue'].includes(orderData!.status) ? 'bg-blue-400/50' : 'bg-slate-800'}`}></div>
                           <div className={`absolute -left-[5px] top-1 w-3 h-3 rounded-full border-2 border-slate-900 transition-all ${['em_transporte', 'entregue'].includes(orderData!.status) ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'bg-slate-700'}`}></div>
                           <p className={`text-xs font-black uppercase tracking-widest ${['em_transporte', 'entregue'].includes(orderData!.status) ? 'text-amber-400' : 'text-slate-500'}`}>Em Transporte</p>
                        </div>
                        <div className="relative pl-6">
                           <div className={`absolute -left-[0px] -top-6 w-0.5 h-6 ${['entregue'].includes(orderData!.status) ? 'bg-amber-400/50' : 'bg-slate-800'}`}></div>
                           <div className={`absolute -left-[5px] top-1 w-3 h-3 rounded-full border-2 border-slate-900 transition-all ${['entregue'].includes(orderData!.status) ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'bg-slate-700'}`}></div>
                           <p className={`text-xs font-black uppercase tracking-widest ${['entregue'].includes(orderData!.status) ? 'text-green-400' : 'text-slate-500'}`}>Entregue</p>
                        </div>
                     </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {orderData?.motoristaZap && (
                  <button onClick={handleWhatsAppClick} className="w-full bg-green-500 hover:bg-green-400 text-slate-950 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_5px_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2">
                    <MessageCircle size={18} /> Chamar no WhatsApp
                  </button>
                )}
                
                {['aguardando_pagamento', 'disponivel', 'agendado'].includes(orderData?.status || '') && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={isCancelling}
                    className="w-full bg-slate-900/80 border border-white/5 text-slate-400 hover:text-red-400 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                  >
                    <XCircle size={14} /> Cancelar Operação
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* TOAST RENDER */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2">
          <div className={`rounded-2xl border px-6 py-4 text-sm font-bold shadow-2xl backdrop-blur-xl ${toast.type === 'success' ? 'border-green-500/20 bg-green-500/10 text-green-200' : toast.type === 'warning' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200' : 'border-red-500/20 bg-red-500/10 text-red-200'}`}>
            {toast.msg}
          </div>
        </div>
      )}

      {/* MODAL DE CANCELAMENTO */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md border border-white/10 p-8 text-center bg-slate-900 rounded-3xl">
            <AlertTriangle className="mx-auto mb-5 h-14 w-14 text-red-400" />
            <h3 className="text-2xl font-black">Cancelar operação?</h3>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">O radar operacional será encerrado imediatamente.</p>
            <div className="mt-8 flex gap-4">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-bold">Voltar</button>
              <button onClick={handleCancelarPedido} disabled={isCancelling} className="flex-1 rounded-2xl bg-red-500 px-5 py-4 font-black text-white">{isCancelling ? 'Cancelando...' : 'Cancelar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
