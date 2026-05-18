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

  // Listener Master da Corrida
  useEffect(() => {
    if (!currentOrderId) return;
    const unsubscribe = onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as OrderData;
      setOrderData(data);
      
      // Tratamento de Erros Fatais Logísticos
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

  // Dispatch Integrado ao Orchestrator
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
        const res = await fetch('/api/pagamento', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo: `FRETOGO - ${VEHICLE_CONFIG[vehicle].nome}`, idPedido: docRef.id }),
        });
        if (!res.ok) throw new Error('Pagamento falhou.');
        const data = await res.json();
        
        // Em um sistema real o Webhook de pagamento chama o executeDispatch do Orchestrator.
        // Simulando a aprovação do banco para ativar a corrida:
        if (data?.url && data.url.startsWith('https://')) {
           window.location.href = data.url; 
        } else {
           // Simulação direta para teste de UI (CUIDADO EM PROD)
           await executeDispatch(docRef.id, {
             categoria: vehicle, origemLat: c1.lat, origemLng: c1.lng, destinoLat: c2.lat, destinoLng: c2.lng
           });
           setStep('busca');
        }
      } else { 
        setStep('busca'); 
      }
    } catch (e: any) {
      showToast(`Falha: ${e.message}`, 'error'); localStorage.removeItem('fretogo_current_order'); setCurrentOrderId(null);
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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => { step === 'form' ? window.location.href = '/' : (() => { localStorage.removeItem('fretogo_current_order'); setCurrentOrderId(null); setOrderData(null); setStep('form'); })() }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10">
              <ArrowLeft size={18} className="text-slate-300" />
            </button>
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
              <span className="text-xl font-black italic tracking-tight text-white">FRETOGO</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 pb-32">
        {step === 'form' && (
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/60 p-6 md:p-10 shadow-2xl backdrop-blur-md">
            <h1 className="mb-8 text-3xl font-black text-white">Para onde vai a <span className="text-cyan-400 italic">carga?</span></h1>
            
            <div className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase text-slate-400"><User className="h-4 w-4 text-cyan-400" /> Contato</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-white focus:border-cyan-500/50 outline-none" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                <input className="rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-white focus:border-cyan-500/50 outline-none" placeholder="WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-400" /> Coleta</h2>
                <input className="w-full rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none" placeholder="Rua e Nº" value={coleta.rua} onChange={e => setColeta({...coleta, rua: e.target.value})} />
                <input className="w-full rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none" placeholder="Bairro" value={coleta.bairro} onChange={e => setColeta({...coleta, bairro: e.target.value})} />
              </div>
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Truck className="h-4 w-4 text-green-400" /> Entrega</h2>
                <input className="w-full rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none" placeholder="Rua e Nº" value={entrega.rua} onChange={e => setEntrega({...entrega, rua: e.target.value})} />
                <input className="w-full rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none" placeholder="Bairro" value={entrega.bairro} onChange={e => setEntrega({...entrega, bairro: e.target.value})} />
              </div>
            </div>

            <div className="mb-8 rounded-2xl border border-white/5 bg-slate-950/50 p-6">
              <h2 className="mb-4 text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Package className="h-4 w-4 text-yellow-400" /> Carga</h2>
              <select className="w-full mb-4 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm font-bold text-white outline-none cursor-pointer" value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)}>
                {Object.entries(VEHICLE_CONFIG).map(([key, conf]) => (<option key={key} value={key}>{conf.nome}</option>))}
              </select>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input className="rounded-xl border border-white/10 bg-slate-900 p-4 text-sm text-white outline-none" placeholder="Peso (ex: 50kg)" value={peso} onChange={e => setPeso(e.target.value)} />
                <input className="rounded-xl border border-white/10 bg-slate-900 p-4 text-sm text-white outline-none" placeholder="Volumes (ex: 2 cx)" value={qtdVolumes} onChange={e => setQtdVolumes(e.target.value)} />
              </div>
              <div className="flex bg-slate-900 border border-white/10 rounded-xl p-1 mb-4">
                <button onClick={() => setTipoFrete('imediato')} className={`flex-1 rounded-lg py-2.5 text-xs font-black uppercase ${tipoFrete === 'imediato' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500'}`}>Imediato</button>
                <button onClick={() => setTipoFrete('agendado')} className={`flex-1 rounded-lg py-2.5 text-xs font-black uppercase ${tipoFrete === 'agendado' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500'}`}>Agendar</button>
              </div>
              {tipoFrete === 'agendado' && <input type="datetime-local" className="w-full rounded-xl border border-white/10 bg-slate-900 p-4 text-sm text-white outline-none" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />}
            </div>

            <button onClick={calcularDistanciaReal} disabled={loadingRoute || !isFormValid} className={`flex w-full items-center justify-center gap-2 rounded-xl py-5 text-sm font-black uppercase tracking-widest transition-all ${!isFormValid ? 'bg-slate-800 text-slate-600' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'}`}>
              {loadingRoute ? <Loader2 className="animate-spin h-5 w-5" /> : 'Calcular Frete'}
            </button>
          </div>
        )}

        {step === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 animate-in fade-in">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-2xl font-black italic mb-6">Trajeto</h2>
              <div className="h-[300px] rounded-2xl overflow-hidden mb-6"><MapaCliente /></div>
            </div>
            <div className="rounded-[2rem] border border-cyan-500/30 bg-slate-900 p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col">
              <h2 className="text-xl font-black uppercase text-cyan-400 mb-6">Resumo</h2>
              <p className="text-5xl font-black text-white mb-6">R$ {valorTotalBruto.toFixed(2).replace('.', ',')}</p>
              <div className="space-y-4 text-sm text-slate-300 mb-8 flex-1">
                <div className="flex justify-between border-b border-white/5 pb-2"><span>Distância</span><strong>{validDistancia.toFixed(1)} km</strong></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span>Veículo</span><strong>{VEHICLE_CONFIG[vehicle].nome}</strong></div>
              </div>
              <button onClick={handleContratar} disabled={loadingPayment} className="w-full rounded-xl bg-cyan-500 py-5 text-sm font-black uppercase text-slate-950 hover:bg-cyan-400 flex justify-center items-center gap-2 mb-3">
                {loadingPayment ? <Loader2 className="animate-spin" /> : 'Confirmar e Pagar'}
              </button>
              <button onClick={() => setStep('form')} className="w-full rounded-xl border border-white/10 py-4 text-xs font-bold uppercase text-slate-400">Voltar</button>
            </div>
          </div>
        )}

        {step === 'busca' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 animate-in fade-in">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic">Radar Operacional</h2>
                <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-full"><div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"/><span className="text-[10px] uppercase font-bold text-cyan-400">Online</span></div>
              </div>
              <div className="h-[300px] rounded-2xl overflow-hidden mb-6"><MapaCliente motoristaId={orderData?.motoristaId} /></div>
              {currentOrderId && orderData?.motoristaNome && <ChatFrete freteId={currentOrderId} tipoUsuario="cliente" nome={nome} />}
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-8 flex flex-col">
              {[TripState.AGUARDANDO_PAGAMENTO, TripState.DISPONIVEL, TripState.REDISPATCH, 'agendado'].includes(orderData?.status as any) ? (
                <div className="text-center my-auto">
                  <Radar className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-6" />
                  <h3 className="text-xl font-black uppercase text-white mb-2">{orderData?.status === 'agendado' ? 'Agendado' : 'Buscando Motorista'}</h3>
                  <p className="text-sm text-cyan-400 font-bold">{loadingMessage}</p>
                </div>
              ) : (
                <div className="my-auto">
                  <h3 className="text-2xl font-black uppercase text-white mb-6 text-center">{orderData?.motoristaNome || 'Parceiro Encontrado'}</h3>
                  <div className="space-y-4">
                    <p className={`text-sm font-bold uppercase ${[TripState.ACEITO, TripState.INDO_COLETA, TripState.COLETANDO, TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'text-cyan-400' : 'text-slate-600'}`}>1. A Caminho</p>
                    <p className={`text-sm font-bold uppercase ${[TripState.COLETANDO, TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'text-blue-400' : 'text-slate-600'}`}>2. Na Coleta</p>
                    <p className={`text-sm font-bold uppercase ${[TripState.EM_TRANSPORTE, TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'text-amber-400' : 'text-slate-600'}`}>3. Em Transporte</p>
                    <p className={`text-sm font-bold uppercase ${[TripState.ENTREGUE].includes(orderData!.status as TripState) ? 'text-green-400' : 'text-slate-600'}`}>4. Entregue</p>
                  </div>
                </div>
              )}
              <div className="mt-8 space-y-3">
                {orderData?.motoristaZap && <button onClick={handleWhatsAppClick} className="w-full bg-green-500 text-slate-950 py-4 rounded-xl font-black uppercase text-xs flex justify-center items-center gap-2"><MessageCircle size={16}/> WhatsApp</button>}
                {![TripState.ENTREGUE, TripState.CANCELADO].includes(orderData?.status as any) && <button onClick={() => setShowCancelModal(true)} className="w-full border border-red-500/20 text-red-400 py-4 rounded-xl font-bold uppercase text-xs">Cancelar Pedido</button>}
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-full border border-white/10 font-bold shadow-2xl">{toast.msg}</div>
      )}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 p-8 rounded-3xl max-w-sm w-full text-center">
            <h3 className="text-xl font-black text-white mb-4">Cancelar Pedido?</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-slate-800 py-3 rounded-xl font-bold">Voltar</button>
              <button onClick={handleCancelarPedido} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
