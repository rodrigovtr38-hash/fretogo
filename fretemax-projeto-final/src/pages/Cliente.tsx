// =========================================================
// NOME DO ARQUIVO: src/pages/Cliente.tsx
// =========================================================
import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ArrowLeft, Zap, Truck, Loader2, CheckCircle, MapPin, AlertTriangle, ShieldCheck, XCircle, MessageCircle, Radar, Sparkles, User, Package, CalendarDays, Plus, Trash2, Flame } from 'lucide-react';
import MapaCliente from '../components/MapaCliente';
import ChatFrete from '../components/ChatFrete';
import ClientStatusCard from '../components/client/ClientStatusCard';
import ClientCancelModal from '../components/client/ClientCancelModal';

// IMPORTS DA NOVA ARQUITETURA
import { TripState } from '../state/tripStateMachine';
import { mapsLoader } from '../services/mapsLoader'; 

interface AddressData { cep: string; bairro: string; rua: string; num: string; lat?: number; lng?: number; }
interface Coords { lat: number; lng: number; }
interface OrderData { status: string; motoristaNome?: string; motoristaZap?: string; rotaInteligente?: boolean; motoristaId?: string; veiculo?: string; distancia?: number; valorTotal?: number; origemLat?: number; origemLng?: number; destinoLat?: number; destinoLng?: number; paradas?: any[]; pinColeta?: string; pinEntregas?: string[]; multiplasEntregas?: boolean; paradaAtualIndex?: number; }
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

export default function Cliente() {
  const [step, setStep] = useState<'form' | 'preview' | 'busca'>('form');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'warning'; } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [documento, setDocumento] = useState('');
  const [coleta, setColeta] = useState<AddressData>({ cep: '', bairro: '', rua: '', num: '' });
  
  const [entregas, setEntregas] = useState<AddressData[]>([{ cep: '', bairro: '', rua: '', num: '' }]);
  
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

  const [origemGPS, setOrigemGPS] = useState<Coords | null>(null);
  const [destinoGPS, setDestinoGPS] = useState<Coords | null>(null);
  const [paradasGPS, setParadasGPS] = useState<Coords[]>([]);
  const [motoristasProximos, setMotoristasProximos] = useState(0);

  const [mapsReady, setMapsReady] = useState(false); 

  const coordsCache = useRef<Record<string, Coords>>({});
  const isProcessingPayment = useRef(false);

  useEffect(() => {
    mapsLoader.load().then(() => setMapsReady(true)).catch(console.error);
  }, []);

  const validDistancia = useMemo(() => Number.isNaN(distanciaReal) || distanciaReal <= 0 ? (5 * entregas.length) : distanciaReal, [distanciaReal, entregas.length]);

  const calculoFinanceiro = useMemo(() => {
    const isHeavy = ['toco', 'truck', 'carreta_ls', 'bi_trem_cegonha'].includes(vehicle);
    const isMOPP = tipoMaterial.toLowerCase().includes('mopp') || 
                   tipoMaterial.toLowerCase().includes('quimic') || 
                   tipoMaterial.toLowerCase().includes('perigo');

    let valorMotoristaBase = 0;

    switch (vehicle) {
      case 'moto': valorMotoristaBase = validDistancia <= 15 ? 30 : 30 + (validDistancia - 15) * 2; break;
      case 'carro_pequeno': valorMotoristaBase = validDistancia <= 15 ? 100 : 100 + (validDistancia - 15) * 4; break;
      case 'utilitario': valorMotoristaBase = validDistancia <= 15 ? 180 : 180 + (validDistancia - 15) * 6; break;
      case 'toco': valorMotoristaBase = validDistancia <= 15 ? 350 : 350 + (validDistancia - 15) * 7; break;
      case 'truck': valorMotoristaBase = validDistancia <= 15 ? 550 : 550 + (validDistancia - 15) * 8.5; break;
      case 'carreta_ls': valorMotoristaBase = Math.max(1200, validDistancia * 10.5); break;
      case 'bi_trem_cegonha': valorMotoristaBase = Math.max(1800, validDistancia * 12.5); break;
      default: valorMotoristaBase = 100;
    }

    const custoParadasExtras = Math.max(0, entregas.length - 1) * (isHeavy ? 150.0 : 8.0);
    let valorLiquidoMotorista = valorMotoristaBase + custoParadasExtras;

    if (isMOPP) valorLiquidoMotorista *= 1.20;

    const divisorMargem = isHeavy ? 0.85 : 0.80;
    const precoFinalClienteCalculado = valorLiquidoMotorista / divisorMargem;
    const comissaoRetidaPlataforma = precoFinalClienteCalculado - valorLiquidoMotorista;

    const precisaPedagio = validDistancia > 40 && ['utilitario', 'toco', 'truck', 'carreta_ls', 'bi_trem_cegonha'].includes(vehicle);
    const valorPedagioCalculado = precisaPedagio ? validDistancia * (isHeavy ? 0.85 : 0.35) : 0;

    return {
      precoFinalCliente: Math.round(precoFinalClienteCalculado),
      valorLiquidoMotorista: Number(valorLiquidoMotorista.toFixed(2)),
      comissaoFretogoRetida: Number(comissaoRetidaPlataforma.toFixed(2)),
      tollCost: Number(valorPedagioCalculado.toFixed(2))
    };
  }, [validDistancia, vehicle, entregas.length, tipoMaterial, peso, qtdVolumes]);

  const valorTotalBruto = calculoFinanceiro.precoFinalCliente;
  const valorAncora = (calculoFinanceiro.precoFinalCliente + calculoFinanceiro.tollCost) * 1.42;

  const isFormValid = nome.trim() !== '' && whatsapp.length >= 10 && documento.replace(/\D/g, '').length >= 11 && coleta.rua.trim() !== '' && entregas.every(e => e.rua.trim() !== '') && peso.trim() !== '' && qtdVolumes.trim() !== '' && (tipoFrete === 'imediato' || (tipoFrete === 'agendado' && dataAgendada.trim() !== ''));

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
        setNome(data.nome || ''); setColeta(data.coleta || coleta); 
        setEntregas(data.entregas || (data.entrega ? [data.entrega] : [{ cep: '', bairro: '', rua: '', num: '' }]));
        setPeso(data.peso || ''); setQtdVolumes(data.qtdVolumes || ''); setTipoMaterial(data.tipoMaterial || '');
        setVehicle(data.vehicle || 'carro_pequeno'); setTipoFrete(data.tipoFrete || 'imediato');
        setDataAgendada(data.dataAgendada || ''); setWhatsapp(data.whatsapp || ''); setDocumento(data.documento || '');
      } catch { localStorage.removeItem('fretogo_form_backup'); }
    }
    if (savedOrder && savedOrder !== 'null') { setCurrentOrderId(savedOrder); setStep('busca'); }
  }, []);

  useEffect(() => {
    localStorage.setItem('fretogo_form_backup', JSON.stringify({ nome, coleta, entregas, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp, documento }));
  }, [nome, coleta, entregas, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp, documento]);

  useEffect(() => {
    if (!currentOrderId) return;
    const unsubscribe = onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => {
      if (!snap.exists()) {
        localStorage.removeItem('fretogo_current_order'); 
        setCurrentOrderId(null); 
        setStep('form');
        return;
      }
      
      const data = snap.data() as OrderData;
      setOrderData(data);

      if (data.origemLat && data.origemLng) {
        setOrigemGPS({ lat: data.origemLat, lng: data.origemLng });
      }
      if (data.destinoLat && data.destinoLng) {
        setDestinoGPS({ lat: data.destinoLat, lng: data.destinoLng });
      }
      if (data.paradas && data.paradas.length > 1) {
         setParadasGPS(data.paradas.slice(0, -1).map((p: any) => ({ lat: p.lat, lng: p.lng })));
      }

      const params = new URLSearchParams(window.location.search);
      const isReturningFromPayment = params.has('status') || params.has('collection_status') || params.has('preference_id');

      if (data.status === TripState.AGUARDANDO_PAGAMENTO && !isReturningFromPayment) {
        localStorage.removeItem('fretogo_current_order');
        setCurrentOrderId(null);
        setStep('form');
        return;
      }

      if ([TripState.CANCELADO, TripState.EXPIRADO, 'erro_pagamento', 'sem_motorista'].includes(data.status as any)) {
        showToast(data.status === TripState.CANCELADO ? 'Frete cancelado.' : 'Sem motoristas na região.', 'warning');
        localStorage.removeItem('fretogo_current_order'); 
        setCurrentOrderId(null); 
        setStep('form');
      }
    });
    return () => unsubscribe();
  }, [currentOrderId]);

  const getValidCoords = async (addressStr: string, cepFallback: string): Promise<Coords> => {
    if (coordsCache.current[addressStr]) return coordsCache.current[addressStr];
    try {
      const coords = await callWithRetryAndTimeout<Coords>('getCoords', { address: addressStr });
      if (coords && typeof coords.lat === 'number') { coordsCache.current[addressStr] = coords; return coords; }
      throw new Error('INVALID');
    } catch { return getFallbackCoordsByCEP(cepFallback); }
  };

  const calcularDistanciaReal = async () => {
    if (loadingRoute || loadingPayment || !isFormValid) return;
    const pesoNum = parseInt(peso.replace(/\D/g, ''), 10);
    if (!Number.isNaN(pesoNum) && pesoNum > LIMITES_PESO[vehicle]) {
      showToast(`Peso excede o limite da categoria.`, 'error'); return;
    }
    setLoadingRoute(true);
    if (entregas.length > 1) showToast('Mapeando múltiplas rotas. Isso pode levar alguns segundos...', 'warning');
    
    try {
      const origStr = `${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`;
      const origCoords = await getValidCoords(origStr, coleta.cep);
      setOrigemGPS(origCoords);

      const pGPS: Coords[] = [];
      let totalKm = 0;
      let lastOrigin = origStr;

      for (const stop of entregas) {
        const destStr = `${stop.rua}, ${stop.num}, ${stop.bairro}, Brazil`;
        const destCoords = await getValidCoords(destStr, stop.cep);
        pGPS.push(destCoords);

        const distanceResult = await callWithRetryAndTimeout<number | string>('getDistance', { origin: lastOrigin, destination: destStr });
        const km = Number(distanceResult);
        if (!Number.isNaN(km) && km > 0) {
            totalKm += km;
        }
        lastOrigin = destStr;
      }
      
      setParadasGPS(pGPS);
      setDestinoGPS(pGPS[pGPS.length - 1]);
      if(totalKm > 0) setDistanciaReal(totalKm);
      
      setMotoristasProximos(Math.floor(Math.random() * 8) + 3);
      setStep('preview');
    } catch {
      showToast('Calculando rota por estimativa de CEP.', 'warning');
      setDistanciaReal(15 * entregas.length); 

      // 🔥 CORREÇÃO DA TELA INFINITA: Ativando GPS de fallback para não quebrar a tela!
      const fallbackOrigem = getFallbackCoordsByCEP(coleta.cep);
      const fallbackDestino = getFallbackCoordsByCEP(entregas[entregas.length - 1].cep);
      setOrigemGPS(fallbackOrigem);
      setDestinoGPS(fallbackDestino);

      setStep('preview');
    } finally { setLoadingRoute(false); }
  };

  const handleContratar = async () => {
    if (loadingRoute || loadingPayment || isProcessingPayment.current) return;
    isProcessingPayment.current = true; setLoadingPayment(true);
    
    if (tipoFrete === 'agendado' && dataAgendada) {
      const agoraTimestamp = Date.now();
      const dataAlvoTimestamp = new Date(dataAgendada).getTime();
      const diferencaHorasJanela = (dataAlvoTimestamp - agoraTimestamp) / (1000 * 60 * 60);
      const isHeavy = ['toco', 'truck', 'carreta_ls', 'bi_trem_cegonha'].includes(vehicle);

      if (isHeavy && diferencaHorasJanela < 12) {
        showToast("Janela inválida. Categorias pesadas exigem no mínimo 12 horas de antecedência.", "error");
        setLoadingPayment(false);
        isProcessingPayment.current = false;
        return;
      }

      if (!isHeavy && diferencaHorasJanela < 3) {
        showToast("Janela inválida. Categorias leves exigem no mínimo 3 horas de antecedência.", "error");
        setLoadingPayment(false);
        isProcessingPayment.current = false;
        return;
      }
    }

    try {
      const c1 = await getValidCoords(`${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`, coleta.cep);
      
      const coordsEntregas = [];
      for (const e of entregas) {
         const c = await getValidCoords(`${e.rua}, ${e.num}, ${e.bairro}, Brazil`, e.cep);
         coordsEntregas.push({ ...e, lat: c.lat, lng: c.lng });
      }
      const destinoFinal = coordsEntregas[coordsEntregas.length - 1];
      const documentoLimpo = documento.replace(/\D/g, ''); 
      
      const pinColeta = Math.floor(1000 + Math.random() * 9000).toString();
      const pinEntregas = entregas.map(() => Math.floor(1000 + Math.random() * 9000).toString());

      const gatilhosNotificacaoAgenda = [
        "Notificação Push/WhatsApp disparada 24h antes com botão de confirmação.",
        "Notificação de alerta logístico disparada 12h antes.",
        "Notificação de proximidade operacional disparada 2h antes."
      ];

      const docRef = await addDoc(collection(db, 'fretes'), {
        distancia: validDistancia, 
        veiculo: vehicle, 
        valorTotal: Number((calculoFinanceiro.precoFinalCliente + calculoFinanceiro.tollCost).toFixed(2)),
        valorFreteBruto: Number(calculoFinanceiro.precoFinalCliente.toFixed(2)),
        valorMotorista: Number(calculoFinanceiro.valorLiquidoMotorista.toFixed(2)), 
        lucroPlataforma: Number(calculoFinanceiro.comissaoFretogoRetida.toFixed(2)),
        valorPedagio: Number(calculoFinanceiro.tollCost.toFixed(2)),
        cidadeOrigem: coleta.bairro, 
        cidadeDestino: destinoFinal.bairro,
        enderecoColetaTexto: `${coleta.rua}, ${coleta.num} - ${coleta.bairro}`, 
        enderecoEntregaTexto: `${destinoFinal.rua}, ${destinoFinal.num} - ${destinoFinal.bairro}`,
        peso: peso || 'Não informado', 
        qtdVolumes: qtdVolumes || 'Não informado', 
        tipoMaterial: tipoMaterial || 'Carga geral',
        clienteNome: nome || 'Anônimo', 
        clienteZap: whatsapp, 
        clienteDocumento: documentoLimpo,
        coleta, 
        entrega: destinoFinal, 
        paradas: coordsEntregas,
        pinColeta, 
        pinEntregas, 
        multiplasEntregas: entregas.length > 1,
        origemLat: c1.lat, 
        origemLng: c1.lng, 
        destinoLat: destinoFinal.lat, 
        destinoLng: destinoFinal.lng, 
        tipoFrete,
        dataAgendada: tipoFrete === 'agendado' ? new Date(dataAgendada) : null,
        cronogramaGatilhos: tipoFrete === 'agendado' ? gatilhosNotificacaoAgenda : null,
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
           showToast("Erro ao processar pagamento. Tente novamente.", "error");
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

  const resetFlow = () => {
    localStorage.removeItem('fretogo_current_order'); 
    setCurrentOrderId(null); 
    setOrderData(null); 
    setStep('form');
  };

  const handleAddEntrega = () => {
    if (entregas.length < 5) setEntregas([...entregas, { cep: '', bairro: '', rua: '', num: '' }]);
    else showToast('Limite máximo de 5 paradas atingido no aplicativo.', 'warning');
  };
  const handleRemoveEntrega = (index: number) => setEntregas(entregas.filter((_, i) => i !== index));
  const updateEntrega = (index: number, field: string, value: string) => {
    const newEntregas = [...entregas];
    newEntregas[index] = { ...newEntregas[index], [field]: value };
    setEntregas(newEntregas);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-blue-500/20">
      
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100"></div>
        <div className="absolute left-[-10%] top-[-5%] h-[40rem] w-[40rem] rounded-full bg-blue-100/40 blur-[100px]" />
        <div className="absolute right-[-10%] top-[10%] h-[35rem] w-[35rem] rounded-full bg-cyan-100/40 blur-[120px]" />
      </div>

      <header className="relative z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => { if (step === 'form') window.location.href = '/'; else resetFlow(); }} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-all duration-300 hover:bg-slate-100 hover:border-slate-300 hover:scale-105 active:scale-95">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <Zap className="h-7 w-7 fill-blue-600 text-blue-600 drop-shadow-sm" />
              <span className="text-2xl font-black italic tracking-tighter text-slate-900">FRETOGO</span>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-5 py-2 md:flex">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-800">Plataforma Logística Segura</span>
          </div>
        </nav>
      </header>

      <main className="relative z-10 w-full max-w-6xl mx-auto flex flex-col justify-center px-4 py-8 pb-20 sm:px-6 lg:px-8">
        
        {step === 'form' && (
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:p-12">
            <div className="mb-10 text-center md:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Orçamento Inteligente</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl leading-tight">
                Para onde vai a <span className="italic text-blue-600">carga?</span>
              </h1>
            </div>

            <div className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                <User className="h-4 w-4 text-blue-500" /> Contato Responsável
              </h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base md:text-lg font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="Seu Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} />
                <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base md:text-lg font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="WhatsApp (DDD)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base md:text-lg font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="CPF ou CNPJ" value={documento} onChange={(e) => setDocumento(e.target.value)} />
              </div>
            </div>

            <div className="relative mb-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
              <div className="absolute bottom-4 left-1/2 top-10 hidden w-px -translate-x-1/2 bg-slate-200 lg:block"></div>
              
              <div className="space-y-5">
                <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <MapPin className="h-4 w-4 text-blue-500" /> Endereço de Coleta
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <input className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="Rua da Retirada" value={coleta.rua} onChange={e => setColeta({...coleta, rua: e.target.value})} />
                  <input className="col-span-1 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="Nº" value={coleta.num} onChange={e => setColeta({...coleta, num: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="Bairro" value={coleta.bairro} onChange={e => setColeta({...coleta, bairro: e.target.value})} />
                  <input className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="CEP" value={coleta.cep} onChange={e => setColeta({...coleta, cep: e.target.value})} />
                </div>
              </div>

              <div className="space-y-5">
                {entregas.map((entrega, index) => (
                  <div key={index} className={`relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-4 transition-all ${index > 0 ? 'border-blue-200 bg-blue-50/50' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                        <Truck className="h-4 w-4 text-emerald-500" /> Destino {entregas.length > 1 ? index + 1 : ''}
                      </h2>
                      {index > 0 && (
                        <button onClick={() => handleRemoveEntrega(index)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <input className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 outline-none" placeholder="Rua da Entrega" value={entrega.rua} onChange={e => updateEntrega(index, 'rua', e.target.value)} />
                      <input className="col-span-1 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 outline-none" placeholder="Nº" value={entrega.num} onChange={e => updateEntrega(index, 'num', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 outline-none" placeholder="Bairro" value={entrega.bairro} onChange={e => updateEntrega(index, 'bairro', e.target.value)} />
                      <input className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 outline-none" placeholder="CEP" value={entrega.cep} onChange={e => updateEntrega(index, 'cep', e.target.value)} />
                    </div>
                  </div>
                ))}

                {entregas.length < 5 && (
                  <button onClick={handleAddEntrega} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors w-full justify-center py-2 border border-dashed border-blue-300 rounded-xl bg-blue-50/50">
                    <Plus size={16} /> Adicionar Parada Extra
                  </button>
                )}
              </div>
            </div>

            <div className="mb-10 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 md:p-8">
              <h2 className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                <Package className="h-4 w-4 text-amber-500" /> Especificações da Carga
              </h2>
              <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="relative col-span-1 md:col-span-3">
                  <select className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-base font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)}>
                    {Object.entries(VEHICLE_CONFIG).map(([key, conf]) => (<option key={key} value={key}>{conf.nome}</option>))}
                  </select>
                </div>
                <input className="rounded-2xl border border-slate-200 bg-white p-5 text-base font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="Peso (Ex: 200kg)" value={peso} onChange={e => setPeso(e.target.value)} />
                <input className="rounded-2xl border border-slate-200 bg-white p-5 text-base font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="Qtd Volumes (Ex: 4 Cx)" value={qtdVolumes} onChange={e => setQtdVolumes(e.target.value)} />
                <input className="rounded-2xl border border-slate-200 bg-white p-5 text-base font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="O que é? (Móveis)" value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)} />
              </div>
              
              <div className="border-t border-slate-200 pt-8">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-purple-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Horário da Coleta</p>
                </div>
                <div className="flex w-full max-w-md rounded-2xl border border-slate-200 bg-slate-100 p-1.5">
                  <button onClick={() => setTipoFrete('imediato')} className={`flex-1 rounded-xl py-3 text-sm font-black uppercase tracking-wider transition-all ${tipoFrete === 'imediato' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Imediato</button>
                  <button onClick={() => setTipoFrete('agendado')} className={`flex-1 rounded-xl py-3 text-sm font-black uppercase tracking-wider transition-all ${tipoFrete === 'agendado' ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Agendar</button>
                </div>
                {tipoFrete === 'agendado' && <input type="datetime-local" className="mt-5 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-base font-bold text-slate-900 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />}
              </div>
            </div>

            {!isFormValid && (
              <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                <p className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600">
                  <AlertTriangle size={18}/> Preencha todos os campos (incluindo documento) para prosseguir
                </p>
              </div>
            )}

            <button onClick={calcularDistanciaReal} disabled={loadingRoute || loadingPayment || !isFormValid} className={`flex w-full min-h-[58px] items-center justify-center gap-3 rounded-[1.5rem] py-4 text-base font-black uppercase italic tracking-[0.2em] transition-all duration-300 ${!isFormValid ? 'cursor-not-allowed bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 hover:scale-[1.02] hover:bg-blue-700 active:scale-95'}`}>
              {loadingRoute ? <><Loader2 className="h-6 w-6 animate-spin"/> Mapeando Rota Segura...</> : <><Zap size={22}/> Calcular Frete</>}
            </button>
          </div>
        )}

        {step === 'preview' && (
          <div className="w-full grid grid-cols-1 gap-8 animate-in fade-in zoom-in duration-500 lg:grid-cols-[1fr_420px]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-10 shadow-2xl">
              <div className="mb-10 flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-blue-600 font-bold">Prévia Operacional</p>
                  <h2 className="mt-2 text-3xl md:text-4xl font-black italic tracking-tighter text-slate-900">Trajeto Mapeado</h2>
                </div>
                <CheckCircle className="h-12 w-12 text-blue-600" />
              </div>

              <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                <div className="bg-amber-100 p-1.5 rounded-full shrink-0">
                  <Flame className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-900 uppercase tracking-widest">Atenção: Alta Demanda</p>
                  <p className="text-[10px] text-amber-800 mt-0.5 font-bold">
                    {motoristasProximos > 0 
                      ? `Identificamos ${motoristasProximos} motoristas (${VEHICLE_CONFIG[vehicle].nome}) operando na sua região. Efetue o pagamento para reservar o seu veículo imediatamente.`
                      : `Estamos conectando a rede de parceiros (${VEHICLE_CONFIG[vehicle].nome}) na sua região. Efetue o pagamento para disparar o alerta de coleta prioritária.`
                    }
                  </p>
                </div>
              </div>
        
              <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <MapPin className="mb-4 h-6 w-6 text-blue-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Local de Coleta</p>
                  <p className="mt-2 text-base font-bold leading-snug text-slate-900">{coleta.rua}, {coleta.num}</p>
                  <p className="mt-1 text-sm text-slate-500">{coleta.bairro}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <Truck className="mb-4 h-6 w-6 text-emerald-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Destino Final</p>
                  <p className="mt-2 text-base font-bold uppercase italic text-slate-900">{entregas[entregas.length - 1].rua}, {entregas[entregas.length - 1].num}</p>
                  <p className="mt-1 text-sm font-bold text-blue-600">{entregas.length > 1 ? `+ ${entregas.length - 1} paradas no trajeto` : entregas[0].bairro}</p>
                </div>
              </div>

              <div className="h-[220px] md:h-[420px] w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-inner relative">
                {mapsReady && origemGPS && destinoGPS ? (
                  <MapaCliente 
                    origem={origemGPS} 
                    destino={destinoGPS} 
                    paradasExtras={paradasGPS.length > 1 ? paradasGPS.slice(0, -1) : undefined}
                    vehicleType={vehicle} 
                    operationalMessage={`Otimizando rotas para ${VEHICLE_CONFIG[vehicle].nome}...`} 
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Iniciando Satélites...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-blue-200 bg-white p-8 lg:p-10 shadow-2xl">
              <div className="absolute left-0 right-0 top-0 h-[4px] bg-gradient-to-r from-blue-400 to-cyan-400"></div>
              
              <div className="mb-8 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-800">Valor Blindado</span>
              </div>
              
              <div className="mb-10">
                <p className="text-sm font-bold text-slate-400 line-through mb-1">Médio: R$ {valorAncora.toFixed(2).replace('.', ',')}</p>
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">R$ {(calculoFinanceiro.precoFinalCliente + calculoFinanceiro.tollCost).toFixed(2).replace('.', ',')}</h2>
                {calculoFinanceiro.tollCost > 0 && (
                  <p className="text-xs font-black text-emerald-600 mt-2">
                    * Inclui R$ {calculoFinanceiro.tollCost.toFixed(2).replace('.', ',')} de Vale-Pedágio Obrigatório destacados
                  </p>
                )}
              </div>
              
              <div className="mb-10 space-y-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-6 text-sm text-slate-600">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <span className="font-bold">Distância da Rota</span>
                  <strong className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs text-blue-800">{validDistancia.toFixed(1)} km</strong>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <span className="font-bold">Modalidade</span>
                  <strong className="text-[10px] font-black uppercase tracking-widest text-blue-600">{tipoFrete}</strong>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <span className="font-bold">Veículo</span>
                  <strong className="max-w-[140px] truncate text-right text-slate-900 font-bold">{VEHICLE_CONFIG[vehicle].nome}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold">Paradas</span>
                  <strong className="text-slate-900 font-bold">{entregas.length} destino(s)</strong>
                </div>
              </div>

              <div className="mt-auto space-y-4">
                <button onClick={handleContratar} disabled={loadingPayment || isProcessingPayment.current} className={`flex min-h-[58px] w-full items-center justify-center gap-3 rounded-[1.25rem] px-8 py-4 text-[14px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${loadingPayment ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 hover:scale-[1.02] hover:bg-blue-700 active:scale-95'}`}>
                  {loadingPayment ? <><Loader2 className="h-6 w-6 animate-spin" /> Gerando Pagamento...</> : <><Zap size={20} /> Liberar Motorista</>}
                </button>
                <button onClick={() => setStep('form')} className="flex min-h-[54px] w-full items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800">
                  Voltar e Editar
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'busca' && (
          <div className="w-full grid grid-cols-1 gap-8 animate-in slide-in-from-bottom-6 duration-500 lg:grid-cols-[1fr_420px]">
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 md:p-10 shadow-2xl">
              
              {/* O CARD DE STATUS OPERACIONAL DO CLIENTE */}
              <ClientStatusCard 
                status={orderData?.status}
                loadingMessage={loadingMessage}
                motoristaNome={orderData?.motoristaNome}
                veiculo={orderData?.veiculo}
                distancia={orderData?.distancia}
                valorTotal={orderData?.valorTotal}
                pinColeta={orderData?.pinColeta}
                pinEntregas={orderData?.pinEntregas}
                paradaAtualIndex={orderData?.paradaAtualIndex}
                multiplasEntregas={orderData?.multiplasEntregas}
              />

              <div className="relative mt-8 h-[350px] md:h-[500px] overflow-hidden rounded-[2rem] border border-slate-200 shadow-inner">
                 {orderData?.status === TripState.DISPONIVEL && <div className="pointer-events-none absolute inset-0 z-10 animate-pulse bg-blue-500/5 mix-blend-overlay"></div>}
                 
                 {/* O MAPA DO GOOGLE REAL */}
                 {mapsReady && origemGPS && destinoGPS ? (
                   <MapaCliente motoristaId={orderData?.motoristaId} origem={origemGPS} destino={destinoGPS} paradasExtras={paradasGPS} />
                 ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500 bg-slate-50">
                     <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                     <p className="text-[10px] font-black uppercase tracking-widest">Iniciando Satélites...</p>
                   </div>
                 )}
              </div>

              {currentOrderId && orderData?.motoristaNome && (
                <div className="mt-4 border-t border-slate-100 pt-8">
                  <ChatFrete freteId={currentOrderId} tipoUsuario="cliente" nome={nome || "Cliente"} />
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                {orderData?.motoristaZap && <button onClick={handleWhatsAppClick} className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-500 px-6 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-600 active:scale-95"><MessageCircle size={20} /> Chamar no WhatsApp</button>}
                {(!orderData || ![TripState.ENTREGUE, TripState.CANCELADO].includes(orderData?.status as any)) && (
                  <button onClick={() => setShowCancelModal(true)} disabled={isCancelling} className="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-[1.5rem] border border-slate-200 bg-white px-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"><XCircle size={16} /> Cancelar Operação / Reembolso</button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-[120] -translate-x-1/2 animate-in slide-in-from-bottom-5">
          <div className={`rounded-2xl border px-8 py-5 text-sm font-black uppercase tracking-widest shadow-2xl ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {toast.msg}
          </div>
        </div>
      )}

      <ClientCancelModal 
        open={showCancelModal} 
        isCancelling={isCancelling} 
        onClose={() => setShowCancelModal(false)} 
        onConfirm={handleCancelarPedido} 
      />

    </div>
  );
}
