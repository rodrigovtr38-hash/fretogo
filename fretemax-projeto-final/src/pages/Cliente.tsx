import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ArrowLeft, Zap, Truck, Package, Loader2, CheckCircle, MapPin, AlertTriangle, ShieldCheck, XCircle, MessageCircle, Radar } from 'lucide-react';
import MapaCliente from '../components/MapaCliente';
import ChatFrete from '../components/ChatFrete';

interface AddressData { cep: string; bairro: string; rua: string; num: string; }
interface Coords { lat: number; lng: number; }
interface OrderData { status: string; motoristaNome?: string; motoristaZap?: string; rotaInteligente?: boolean; motoristaId?: string; }
type VehicleType = 'moto' | 'carro_pequeno' | 'utilitario' | 'toco' | 'truck' | 'carreta_ls' | 'bi_trem_cegonha';
interface VehicleConfig { nome: string; fator: number; }

const VEHICLE_CONFIG: Record<VehicleType, VehicleConfig> = {
  'moto': { nome: 'Moto', fator: 0.6 },
  'carro_pequeno': { nome: 'Carro Pequeno', fator: 1.0 },
  'utilitario': { nome: 'Utilitário', fator: 1.6 },
  'toco': { nome: 'Caminhão Toco', fator: 2.9 },
  'truck': { nome: 'Caminhão Truck', fator: 3.8 },
  'carreta_ls': { nome: 'Carreta LS', fator: 5.5 },
  'bi_trem_cegonha': { nome: 'Bi-trem / Cegonha', fator: 7.2 }
};

const LIMITES_PESO: Record<VehicleType, number> = {
  moto: 30,
  carro_pequeno: 250,
  utilitario: 800,
  toco: 4000,
  truck: 12000,
  carreta_ls: 30000,
  bi_trem_cegonha: 45000
};

const getFallbackCoordsByCEP = (cep: string): Coords => {
  const prefix = parseInt(cep.replace(/\D/g, '').substring(0, 1) || '0', 10);
  const regions: Record<number, Coords> = {
    0: { lat: -23.5505, lng: -46.6333 }, 1: { lat: -22.9056, lng: -47.0608 },
    2: { lat: -22.9068, lng: -43.1729 }, 3: { lat: -19.9167, lng: -43.9345 },
    4: { lat: -12.9714, lng: -38.5014 }, 5: { lat: -8.0476, lng: -34.8770 },
    6: { lat: -3.7319, lng: -38.5267 }, 7: { lat: -15.7975, lng: -47.8919 },
    8: { lat: -25.4284, lng: -49.2733 }, 9: { lat: -30.0346, lng: -51.2177 },
  };
  return regions[prefix] || regions[0];
};

const callWithRetryAndTimeout = async <T,>(callableName: string, payload: unknown, maxRetries = 2, timeoutMs = 8000): Promise<T> => {
  const functions = getFunctions();
  const fn = httpsCallable(functions, callableName);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_API')), timeoutMs));
      const result = await Promise.race([fn(payload), timeoutPromise]) as { data: T };
      if (!result || typeof result.data === 'undefined' || result.data === null) throw new Error('INVALID_API_RESPONSE');
      return result.data;
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
  throw new Error('MAX_RETRIES_EXCEEDED');
};

export default function Cliente() {
  const [step, setStep] = useState<'form' | 'preview' | 'busca'>('form');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'success' | 'warning'} | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [nome, setNome] = useState(''); 
  const [coleta, setColeta] = useState<AddressData>({ cep: '', bairro: '', rua: '', num: '' });
  const [entrega, setEntrega] = useState<AddressData>({ cep: '', bairro: '', rua: '', num: '' });
  const [peso, setPeso] = useState('');
  const [qtdVolumes, setQtdVolumes] = useState(''); 
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('carro_pequeno');
  const [tipoFrete, setTipoFrete] = useState<'imediato' | 'agendado'>('imediato');
  const [dataAgendada, setDataAgendada] = useState('');
  const [whatsapp, setWhatsapp] = useState(''); 
  
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [distanciaReal, setDistanciaReal] = useState(0);
  
  // 🔥 NOVO: Estado de UX para a busca de motorista
  const [loadingMessage, setLoadingMessage] = useState('Analisando parceiros disponíveis...');

  const coordsCache = useRef<Record<string, Coords>>({});
  // Ref para blindar cliques múltiplos durante o pagamento
  const isProcessingPayment = useRef(false);

  const validDistancia = Number.isNaN(distanciaReal) || distanciaReal <= 0 ? 5 : distanciaReal;
  const fatorVeiculo = VEHICLE_CONFIG[vehicle]?.fator || 1.0;
  const valorTotalBruto = (32 + (validDistancia * 3.80)) * fatorVeiculo;
  const valorAncora = valorTotalBruto * 1.42;

  const isFormValid = nome.trim() !== '' && whatsapp.length >= 10 && coleta.rua.trim() !== '' && entrega.rua.trim() !== '' && peso.trim() !== '' && qtdVolumes.trim() !== '';

  const showToast = (msg: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // 🔥 NOVO: Efeito para girar as mensagens na tela de "Buscando Motoristas"
  useEffect(() => {
    if (step === 'busca' && orderData?.status === 'disponivel') {
      const messages = [
        'Analisando parceiros na região...',
        'Otimizando melhor rota...',
        'Notificando motoristas próximos...',
        'Aguardando aceite do parceiro ideal...'
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [step, orderData?.status]);

  useEffect(() => {
    const savedOrder = localStorage.getItem('fretogo_current_order');
    const savedForm = localStorage.getItem('fretogo_form_backup');
    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        if (data.nome) setNome(data.nome);
        if (data.coleta) setColeta(data.coleta);
        if (data.entrega) setEntrega(data.entrega);
        if (data.peso) setPeso(data.peso);
        if (data.qtdVolumes) setQtdVolumes(data.qtdVolumes);
        if (data.tipoMaterial) setTipoMaterial(data.tipoMaterial);
        if (data.vehicle) setVehicle(data.vehicle);
        if (data.tipoFrete) setTipoFrete(data.tipoFrete);
        if (data.dataAgendada) setDataAgendada(data.dataAgendada);
        if (data.whatsapp) setWhatsapp(data.whatsapp);
      } catch { localStorage.removeItem('fretogo_form_backup'); }
    }
    if (savedOrder && savedOrder !== 'null') {
      setCurrentOrderId(savedOrder);
      setStep('busca');
    }
  }, []);

  useEffect(() => {
    const formData = { nome, coleta, entrega, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp };
    localStorage.setItem('fretogo_form_backup', JSON.stringify(formData));
  }, [nome, coleta, entrega, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp]);

  useEffect(() => {
    if (!currentOrderId) return;
    const unsubscribe = onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as OrderData;
        setOrderData(data);
        
        const falhasCriticas = ['erro_pagamento', 'sem_motorista', 'expirado', 'timeout_motorista'];
        
        if (falhasCriticas.includes(data.status)) {
          showToast('Problema com seu pedido ou parceiros indisponíveis. Retornando...', 'error');
          localStorage.removeItem('fretogo_current_order');
          setCurrentOrderId(null);
          setStep('form');
        } else if (data.status === 'cancelado') {
          showToast('Seu frete foi cancelado com sucesso.', 'success');
          localStorage.removeItem('fretogo_current_order');
          setCurrentOrderId(null);
          setStep('form');
        }
      }
    });
    return () => unsubscribe();
  }, [currentOrderId]);

  const calcularDistanciaReal = async () => {
    if (loadingRoute || loadingPayment) return;
    
    if (!isFormValid) {
      showToast("Preencha todas as informações obrigatórias para calcular o frete.");
      return;
    }

    const cepColetaLimpo = coleta.cep.replace(/\D/g, '');
    const cepEntregaLimpo = entrega.cep.replace(/\D/g, '');

    const pesoNumero = parseInt(peso.replace(/\D/g, ''));
    if (!isNaN(pesoNumero)) {
      const limite = LIMITES_PESO[vehicle];
      if (pesoNumero > limite) {
        showToast(`Peso excede o limite. O máximo para ${VEHICLE_CONFIG[vehicle].nome} é ${limite}kg. Troque a categoria.`, 'error');
        return;
      }
    }

    setLoadingRoute(true);
    try {
      const originStr = `${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`;
      const destStr = `${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`;
      
      const distanceResult = await callWithRetryAndTimeout<number | string>('getDistance', { origin: originStr, destination: destStr });
      const km = Number(distanceResult);
      if (Number.isNaN(km) || km <= 0) throw new Error("INVALID_DISTANCE");

      setDistanciaReal(km);
      setStep('preview');
    } catch {
      const estimativaKm = (cepColetaLimpo.substring(0, 2) === cepEntregaLimpo.substring(0, 2)) ? 15 : 35; 
      showToast("Calculando rota aproximada devido a instabilidade de rede.", "warning");
      setDistanciaReal(estimativaKm); 
      setStep('preview');
    } finally { setLoadingRoute(false); }
  };

  const getValidCoords = async (addressStr: string, cepFallback: string): Promise<Coords> => {
    if (coordsCache.current[addressStr]) return coordsCache.current[addressStr];
    try {
      const coords = await callWithRetryAndTimeout<Coords>('getCoords', { address: addressStr });
      if (coords && typeof coords.lat === 'number' && !Number.isNaN(coords.lat)) {
        coordsCache.current[addressStr] = coords; return coords;
      }
      throw new Error('INVALID_COORDS');
    } catch { return getFallbackCoordsByCEP(cepFallback); }
  };

  // 🔥 BLINDADO COM REF ANTI-DUPLO CLIQUE
  const handleContratar = async () => {
    if (loadingRoute || loadingPayment || isProcessingPayment.current) return;
    
    if (Number.isNaN(valorTotalBruto) || valorTotalBruto <= 0) {
      showToast("Erro no cálculo do valor. Tente novamente."); return;
    }
    if (tipoFrete === 'agendado' && (!dataAgendada || new Date(dataAgendada) < new Date())) {
      showToast("Data de agendamento inválida."); return;
    }
    
    isProcessingPayment.current = true;
    setLoadingPayment(true);
    
    try {
      const c1 = await getValidCoords(`${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`, coleta.cep);
      const c2 = await getValidCoords(`${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`, entrega.cep);
      
      const finalValTotal = Number(valorTotalBruto.toFixed(2));
      const docRef = await addDoc(collection(db, 'fretes'), {
        distancia: validDistancia, veiculo: vehicle, 
        valorTotal: finalValTotal, valorMotorista: Number((valorTotalBruto * 0.8).toFixed(2)),
        lucroPlataforma: Number((valorTotalBruto * 0.2).toFixed(2)), 
        cidadeOrigem: coleta.bairro, cidadeDestino: entrega.bairro,
        enderecoColetaTexto: `${coleta.rua}, ${coleta.num} - ${coleta.bairro}`,
        enderecoEntregaTexto: `${entrega.rua}, ${entrega.num} - ${entrega.bairro}`,
        peso: peso || 'Não informado', 
        qtdVolumes: qtdVolumes || 'Não informado', 
        tipoMaterial: tipoMaterial || 'Carga geral',
        clienteNome: nome || 'Anônimo',
        clienteZap: whatsapp, 
        coleta, entrega, origemLat: c1.lat, origemLng: c1.lng, destinoLat: c2.lat, destinoLng: c2.lng,
        tipoFrete, dataAgendada: tipoFrete === 'agendado' ? new Date(dataAgendada) : null,
        status: tipoFrete === 'agendado' ? 'agendado' : 'aguardando_pagamento',
        createdAt: serverTimestamp()
      });
      
      localStorage.setItem('fretogo_current_order', docRef.id);
      setCurrentOrderId(docRef.id);
      
      if (tipoFrete === 'imediato') {
        const payload = { titulo: `FRETOGO - ${VEHICLE_CONFIG[vehicle].nome}`, idPedido: docRef.id };
        const res = await fetch('/api/pagamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        
        if (!res.ok) throw new Error("O provedor de pagamento recusou a conexão.");
        
        const data = await res.json();
        
        if (data?.url && typeof data.url === 'string' && data.url.startsWith('https://')) {
          window.location.href = data.url; 
        } else {
          throw new Error("Link seguro de pagamento não gerado.");
        }
      } else {
        setStep('busca');
      }
    } catch (e: any) { 
      showToast(`Falha de transação: ${e.message}. Tente novamente.`); 
      localStorage.removeItem('fretogo_current_order');
      setCurrentOrderId(null);
    } finally { 
      setLoadingPayment(false); 
      isProcessingPayment.current = false;
    }
  };

  const handleCancelarPedido = async () => {
    if (!currentOrderId || isCancelling) return;
    setIsCancelling(true);
    try {
      const reembolsoRes = await fetch('/api/reembolso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPedido: currentOrderId })
      });
      
      if (!reembolsoRes.ok) {
        const err = await reembolsoRes.json();
        if (err.error?.includes('Nenhum pagamento')) {
          console.log("Frete não estava pago, cancelando diretamente.");
        } else {
          showToast('Erro ao processar devolução. Tente novamente.', 'error');
          setIsCancelling(false);
          return;
        }
      }

      await updateDoc(doc(db, 'fretes', currentOrderId), {
        status: 'cancelado',
        canceladoEm: serverTimestamp(),
        canceladoPor: 'cliente'
      });

      setShowCancelModal(false); 
    } catch (error) {
      showToast("Falha na conexão ao cancelar o pedido.", "error");
      setIsCancelling(false);
    }
  };

  const handleWhatsAppClick = () => {
    if (!orderData?.motoristaZap) return;
    const cleanPhone = orderData.motoristaZap.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && cleanPhone.length <= 13) window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  // 🔥 LIMPEZA IMPECÁVEL NO RESET
  const resetFlow = () => {
    if (step === 'form') { 
      window.location.href = '/'; 
    } else { 
      localStorage.removeItem('fretogo_current_order'); 
      setCurrentOrderId(null);
      setOrderData(null);
      setStep('form'); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-10 relative">
      
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 w-[90%] max-w-sm ${
          toast.type === 'error' ? 'bg-red-500 text-white' :
          toast.type === 'success' ? 'bg-green-500 text-white' :
          'bg-amber-500 text-amber-950'
        }`}>
          {toast.type === 'error' && <AlertTriangle size={24} className="shrink-0" />}
          {toast.type === 'success' && <CheckCircle size={24} className="shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle size={24} className="shrink-0" />}
          <span className="font-bold text-sm leading-tight flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"><XCircle size={20} /></button>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl border-4 border-slate-100">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 drop-shadow-md" />
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase italic">Cancelar Frete?</h3>
            <p className="text-slate-500 font-medium text-sm mb-8">Esta ação não pode ser desfeita. O parceiro será removido da rota.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-xl transition-colors uppercase text-xs">Voltar</button>
              <button onClick={handleCancelarPedido} disabled={isCancelling} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-xl transition-colors uppercase text-xs flex items-center justify-center gap-2">
                {isCancelling ? <Loader2 className="animate-spin w-4 h-4" /> : 'Sim, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <a href="https://wa.me/5511946099840" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#128C7E] hover:scale-110 transition-all p-4 rounded-full shadow-2xl flex items-center justify-center group">
        <svg viewBox="0 0 24 24" className="w-8 h-8 animate-pulse fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      </a>

      <nav className="bg-slate-950 p-4 flex items-center justify-between text-white font-black italic sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2 text-xl tracking-tight">
          <button onClick={resetFlow} className="cursor-pointer hover:scale-110 transition-all bg-transparent border-none"><ArrowLeft /></button>
          <Zap className="text-yellow-400 fill-yellow-400" size={24} /> FRETOGO
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 mt-6">
        {step === 'form' && (
          <div className="space-y-3 bg-white p-6 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            
            <h2 className="text-slate-950 font-black uppercase text-xs mb-4 flex items-center gap-2"><MessageCircle className="text-green-500 w-4 h-4"/> Seus Dados</h2>
            <div className="grid grid-cols-1 gap-2 mb-4">
              <input className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 text-sm focus:border-blue-500 outline-none transition-all" placeholder="Seu Nome Completo" value={nome} onChange={e => setNome(e.target.value)} />
              <input className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 text-sm focus:border-blue-500 outline-none transition-all" placeholder="WhatsApp (DDD)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
            </div>

            <h2 className="text-slate-950 font-black uppercase text-xs mb-4 flex items-center gap-2"><MapPin className="text-blue-600 w-4 h-4"/> Onde coletamos?</h2>
            <div className="grid grid-cols-3 gap-2">
              <input className="col-span-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 text-sm focus:border-blue-500 outline-none transition-all" placeholder="Rua Coleta" value={coleta.rua} onChange={e => setColeta({...coleta, rua: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 text-sm focus:border-blue-500 outline-none transition-all" placeholder="Nº" value={coleta.num} onChange={e => setColeta({...coleta, num: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 text-sm focus:border-blue-500 outline-none transition-all" placeholder="Bairro" value={coleta.bairro} onChange={e => setColeta({...coleta, bairro: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 text-sm focus:border-blue-500 outline-none transition-all" placeholder="CEP" value={coleta.cep} onChange={e => setColeta({...coleta, cep: e.target.value})} />
            </div>
            <hr className="my-4 border-slate-100" />
            <h2 className="text-slate-950 font-black uppercase text-xs mb-4 flex items-center gap-2"><Truck className="text-blue-600 w-4 h-4"/> Destino da Carga</h2>
            <div className="grid grid-cols-3 gap-2">
              <input className="col-span-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 text-sm focus:border-blue-500 outline-none transition-all" placeholder="Rua Entrega" value={entrega.rua} onChange={e => setEntrega({...entrega, rua: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 text-sm focus:border-blue-500 outline-none transition-all" placeholder="Nº" value={entrega.num} onChange={e => setEntrega({...entrega, num: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 text-sm focus:border-blue-500 outline-none transition-all" placeholder="Bairro" value={entrega.bairro} onChange={e => setEntrega({...entrega, bairro: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 text-sm focus:border-blue-500 outline-none transition-all" placeholder="CEP" value={entrega.cep} onChange={e => setEntrega({...entrega, cep: e.target.value})} />
            </div>
            <select className="w-full p-4 bg-slate-950 text-white rounded-xl font-black outline-none cursor-pointer hover:bg-slate-900 transition-all shadow-md" value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)}>
              {Object.entries(VEHICLE_CONFIG).map(([key, conf]) => (<option key={key} value={key}>{conf.nome}</option>))}
            </select>
            <div className="bg-slate-100 p-4 rounded-2xl border-2 border-slate-200">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Previsão de Coleta</p>
               <div className="flex gap-2">
                 <button onClick={() => setTipoFrete('imediato')} className={`flex-1 p-3 rounded-xl font-black text-xs uppercase transition-all ${tipoFrete === 'imediato' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>Agora</button>
                 <button onClick={() => setTipoFrete('agendado')} className={`flex-1 p-3 rounded-xl font-black text-xs uppercase transition-all ${tipoFrete === 'agendado' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>Agendar</button>
               </div>
               {tipoFrete === 'agendado' && <input type="datetime-local" className="w-full mt-3 p-3 rounded-xl border-2 text-slate-950 font-black outline-none focus:border-blue-500 transition-all" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all" placeholder="Peso (ex: 20kg)" value={peso} onChange={e => setPeso(e.target.value)} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all" placeholder="Volumes (ex: 2 cx)" value={qtdVolumes} onChange={e => setQtdVolumes(e.target.value)} />
            </div>
            <input className="w-full p-4 mt-1 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all" placeholder="Material (ex: Móveis, Documentos)" value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)} />
            
            {!isFormValid && (
              <p className="text-amber-600 text-[11px] font-bold uppercase text-center mt-4 bg-amber-50 p-2 rounded-lg border border-amber-100">⚠️ Preencha todas as informações para liberar o cálculo</p>
            )}
            
            {/* 🔥 BOTÃO BLINDADO E ANIMADO */}
            <button 
              onClick={calcularDistanciaReal} 
              disabled={loadingRoute || loadingPayment || !isFormValid} 
              className={`w-full font-black py-5 rounded-2xl shadow-xl uppercase italic mt-2 flex items-center justify-center gap-2 transition-all duration-300 ${!isFormValid ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:scale-[1.02] hover:bg-blue-700 text-white shadow-blue-500/30'}`}
            >
              {loadingRoute ? <><Loader2 className="animate-spin w-5 h-5"/> Processando Rota...</> : 'CALCULAR FRETE'}
            </button>
          </div>
        )}

        {step === 'preview' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <MapaCliente />
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl mt-4 text-center border-t-8 border-slate-950 relative overflow-hidden">
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-6 flex items-start gap-3 text-left">
                  <ShieldCheck className="text-blue-500 w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-black text-blue-900 uppercase">Preço Protegido</p>
                    <p className="text-[11px] font-medium text-blue-800">O valor do frete é garantido e bloqueado. Sem surpresas.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400 line-through font-bold">Preço médio: R$ {valorAncora.toFixed(2).replace('.', ',')}</p>
                <p className="text-6xl font-black text-slate-950 italic mb-2 drop-shadow-sm tracking-tighter">R$ {valorTotalBruto.toFixed(2).replace('.', ',')}</p>
                <p className="text-[11px] font-black uppercase text-green-700 bg-green-100 inline-block px-4 py-2 rounded-xl mb-6 shadow-sm">Melhor Oferta da Região</p>
                
                <div className="bg-slate-50 p-4 rounded-2xl mb-8 text-slate-900 font-bold text-xs border border-slate-100 shadow-inner flex items-center justify-between">
                  <div className="text-left flex-1 truncate pr-2">
                    {coleta.rua}, {coleta.num} ➔ {entrega.bairro}
                  </div>
                  <span className="text-blue-600 font-black bg-blue-100 px-3 py-1 rounded-lg">{validDistancia.toFixed(1)} KM</span>
                </div>
                
                {/* 🔥 BOTÃO PAGAMENTO PREMIUM E BLINDADO */}
                <button 
                  onClick={handleContratar} 
                  disabled={loadingRoute || loadingPayment || isProcessingPayment.current} 
                  className={`w-full py-6 rounded-3xl font-black uppercase italic shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 ${loadingPayment ? 'bg-slate-300 text-slate-600' : 'bg-blue-600 hover:scale-[1.02] hover:bg-blue-700 text-white shadow-blue-500/40'}`}
                >
                  {loadingPayment ? <><Loader2 className="animate-spin w-5 h-5" /> Protegendo Transação...</> : <><ShieldCheck size={20} /> IR PARA PAGAMENTO SEGURO</>}
                </button>
            </div>
          </div>
        )}

        {step === 'busca' && (
           <div className="bg-white rounded-[3rem] p-8 text-center shadow-2xl border-4 border-slate-100 mt-10 animate-in slide-in-from-bottom-6 overflow-hidden relative">
              
              {/* STATUS: MATCH OU A CAMINHO */}
              {['aceito', 'coleta', 'em_transporte', 'entregue'].includes(orderData?.status || '') ? (
                 <div className="animate-in zoom-in fade-in duration-500 text-left relative z-10">
                    
                    <div className="mb-6 -mt-2 rounded-2xl overflow-hidden shadow-inner border border-slate-200">
                      <MapaCliente motoristaId={orderData?.motoristaId} />
                    </div>

                    <h2 className="text-2xl font-black italic uppercase text-slate-950 text-center tracking-tight">Motorista Confirmado</h2>
                    
                    <div className="text-center mt-2 mb-6">
                      {orderData?.rotaInteligente && (<p className="text-[11px] font-black uppercase text-green-700 bg-green-100 px-4 py-2 rounded-xl mt-2 mb-2 inline-block shadow-sm">🚚 Na sua rota</p>)}
                      <p className="font-black text-blue-600 text-xl uppercase bg-blue-50 py-3 rounded-xl inline-block px-6 w-full border border-blue-100">{orderData?.motoristaNome || 'Motorista Parceiro'}</p>
                    </div>

                    <div className="mt-6 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest text-center">Status em Tempo Real</h3>
                        <ul className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-2">
                            <li className="relative pl-6">
                                <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-white transition-all duration-500 ${['aceito', 'coleta', 'em_transporte', 'entregue'].includes(orderData!.status) ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)] scale-110' : 'bg-slate-300'}`}></div>
                                <p className={`font-black text-sm uppercase leading-tight ${['aceito', 'coleta', 'em_transporte', 'entregue'].includes(orderData!.status) ? 'text-blue-600' : 'text-slate-400'}`}>Indo para a coleta</p>
                            </li>
                            <li className="relative pl-6">
                                <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-white transition-all duration-500 ${['coleta', 'em_transporte', 'entregue'].includes(orderData!.status) ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)] scale-110' : 'bg-slate-300'}`}></div>
                                <p className={`font-black text-sm uppercase leading-tight ${['coleta', 'em_transporte', 'entregue'].includes(orderData!.status) ? 'text-blue-600' : 'text-slate-400'}`}>No Local / Embarcando</p>
                            </li>
                            <li className="relative pl-6">
                                <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-white transition-all duration-500 ${['em_transporte', 'entregue'].includes(orderData!.status) ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.7)] scale-110' : 'bg-slate-300'}`}></div>
                                <p className={`font-black text-sm uppercase leading-tight ${['em_transporte', 'entregue'].includes(orderData!.status) ? 'text-amber-500' : 'text-slate-400'}`}>Em Transporte</p>
                            </li>
                            <li className="relative pl-6">
                                <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-white transition-all duration-500 ${['entregue'].includes(orderData!.status) ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.7)] scale-110' : 'bg-slate-300'}`}></div>
                                <p className={`font-black text-sm uppercase leading-tight ${['entregue'].includes(orderData!.status) ? 'text-green-500' : 'text-slate-400'}`}>Carga Entregue</p>
                            </li>
                        </ul>
                    </div>

                    <div className="mt-6">{currentOrderId && <ChatFrete freteId={currentOrderId} tipoUsuario="cliente" nome="Você (Cliente)" />}</div>
                    <button onClick={handleWhatsAppClick} className="w-full bg-green-500 py-5 rounded-2xl font-black mt-8 text-white uppercase shadow-[0_10px_20px_rgba(34,197,94,0.3)] hover:scale-[1.02] transition-all text-lg italic flex items-center justify-center gap-2"><MessageCircle size={20}/> Contato Direto</button>
                 </div>
              ) : (
                 /* 🔥 NOVO STATUS: PROCURANDO MOTORISTA (UX PREMIUM UBER) */
                 <div className="py-12 text-center flex flex-col items-center relative z-10">
                    <div className="relative mb-10 mt-6">
                      {/* Efeito Radar Expandindo */}
                      <div className="absolute inset-0 bg-blue-400 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30 w-32 h-32 -left-4 -top-4"></div>
                      <div className="absolute inset-0 bg-blue-500 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20 w-48 h-48 -left-12 -top-12" style={{ animationDelay: '0.5s'}}></div>
                      <div className="bg-slate-950 w-24 h-24 rounded-full flex items-center justify-center relative z-10 shadow-2xl border-4 border-white">
                        <Radar className="text-cyan-400 w-12 h-12 animate-[spin_4s_linear_infinite]" />
                      </div>
                    </div>
                    
                    <h2 className="text-3xl font-black italic uppercase text-slate-950 mb-3 tracking-tighter">
                        {orderData?.status === 'agendado' ? 'Agendamento Confirmado' : (orderData?.status === 'disponivel' ? 'Radar FRETOGO Ativo' : 'Aguardando Banco...')}
                    </h2>
                    
                    {/* Mensagem Giratória Anti-Ansiedade */}
                    <div className="h-10">
                      <p className="text-blue-600 font-bold text-sm uppercase tracking-wider bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm animate-in fade-in duration-300" key={loadingMessage}>
                          {orderData?.status === 'agendado' ? 'Aguarde o horário combinado' : (orderData?.status === 'disponivel' ? loadingMessage : 'Confirme no app do seu banco')}
                      </p>
                    </div>
                 </div>
              )}

              {['aguardando_pagamento', 'disponivel', 'agendado', 'aceito'].includes(orderData?.status || '') && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={isCancelling}
                  className="w-full mt-8 bg-transparent text-slate-400 py-4 rounded-2xl font-bold uppercase text-xs hover:text-red-500 transition-all flex items-center justify-center gap-2 relative z-10"
                >
                  <XCircle size={16} /> Cancelar Pedido
                </button>
              )}
           </div>
        )}
      </div>
    </div>
  );
}
