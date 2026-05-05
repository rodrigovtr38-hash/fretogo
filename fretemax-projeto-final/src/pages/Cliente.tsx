import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ArrowLeft, Zap, Truck, Package, Loader2, CheckCircle, MapPin } from 'lucide-react';
import MapaCliente from '../components/MapaCliente';
import ChatFrete from '../components/ChatFrete';

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
}

type VehicleType = 'moto' | 'carro_pequeno' | 'utilitario' | 'toco' | 'truck' | 'carreta_ls' | 'bi_trem_cegonha';

interface VehicleConfig {
  nome: string;
  fator: number;
}

const VEHICLE_CONFIG: Record<VehicleType, VehicleConfig> = {
  'moto': { nome: 'Moto', fator: 0.6 },
  'carro_pequeno': { nome: 'Carro Pequeno', fator: 1.0 },
  'utilitario': { nome: 'Utilitário', fator: 1.6 },
  'toco': { nome: 'Caminhão Toco', fator: 2.9 },
  'truck': { nome: 'Caminhão Truck', fator: 3.8 },
  'carreta_ls': { nome: 'Carreta LS', fator: 5.5 },
  'bi_trem_cegonha': { nome: 'Bi-trem / Cegonha', fator: 7.2 }
};

const getFallbackCoordsByCEP = (cep: string): Coords => {
  const prefix = parseInt(cep.replace(/\D/g, '').substring(0, 1) || '0', 10);
  const regions: Record<number, Coords> = {
    0: { lat: -23.5505, lng: -46.6333 },
    1: { lat: -22.9056, lng: -47.0608 },
    2: { lat: -22.9068, lng: -43.1729 },
    3: { lat: -19.9167, lng: -43.9345 },
    4: { lat: -12.9714, lng: -38.5014 },
    5: { lat: -8.0476, lng: -34.8770 },
    6: { lat: -3.7319, lng: -38.5267 },
    7: { lat: -15.7975, lng: -47.8919 },
    8: { lat: -25.4284, lng: -49.2733 },
    9: { lat: -30.0346, lng: -51.2177 },
  };
  return regions[prefix] || regions[0];
};

const callWithRetryAndTimeout = async <T,>(
  callableName: string,
  payload: unknown,
  maxRetries = 2,
  timeoutMs = 8000
): Promise<T> => {
  const functions = getFunctions();
  const fn = httpsCallable(functions, callableName);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_API')), timeoutMs)
      );
      
      const result = await Promise.race([fn(payload), timeoutPromise]) as { data: T };
      
      if (!result || typeof result.data === 'undefined' || result.data === null) {
        throw new Error('INVALID_API_RESPONSE');
      }
      
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

  const [coleta, setColeta] = useState<AddressData>({ cep: '', bairro: '', rua: '', num: '' });
  const [entrega, setEntrega] = useState<AddressData>({ cep: '', bairro: '', rua: '', num: '' });
  const [peso, setPeso] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('carro_pequeno');
  const [tipoFrete, setTipoFrete] = useState<'imediato' | 'agendado'>('imediato');
  const [dataAgendada, setDataAgendada] = useState('');
  
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [distanciaReal, setDistanciaReal] = useState(0);

  const coordsCache = useRef<Record<string, Coords>>({});

  const validDistancia = Number.isNaN(distanciaReal) || distanciaReal <= 0 ? 5 : distanciaReal;
  const fatorVeiculo = VEHICLE_CONFIG[vehicle]?.fator || 1.0;
  
  const valorTotalBruto = (32 + (validDistancia * 3.80)) * fatorVeiculo;
  const valorAncora = valorTotalBruto * 1.42;

  useEffect(() => {
    const savedOrder = localStorage.getItem('fretogo_current_order');
    const savedForm = localStorage.getItem('fretogo_form_backup');
    
    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        if (data.coleta) setColeta(data.coleta);
        if (data.entrega) setEntrega(data.entrega);
        if (data.peso) setPeso(data.peso);
        if (data.tipoMaterial) setTipoMaterial(data.tipoMaterial);
        if (data.vehicle) setVehicle(data.vehicle);
        if (data.tipoFrete) setTipoFrete(data.tipoFrete);
        if (data.dataAgendada) setDataAgendada(data.dataAgendada);
      } catch {
        localStorage.removeItem('fretogo_form_backup');
      }
    }
    
    if (savedOrder && savedOrder !== 'null') {
      setCurrentOrderId(savedOrder);
      setStep('busca');
    }
  }, []);

  useEffect(() => {
    const formData = { coleta, entrega, peso, tipoMaterial, vehicle, tipoFrete, dataAgendada };
    localStorage.setItem('fretogo_form_backup', JSON.stringify(formData));
  }, [coleta, entrega, peso, tipoMaterial, vehicle, tipoFrete, dataAgendada]);

  useEffect(() => {
    if (!currentOrderId) return;
    
    const unsubscribe = onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as OrderData;
        setOrderData(data);
        
        const falhasCriticas = ['erro_pagamento', 'sem_motorista', 'cancelado', 'expirado', 'timeout_motorista'];
        if (falhasCriticas.includes(data.status)) {
          alert('Aviso do sistema: Ocorreu um problema com seu pedido ou não há parceiros disponíveis no momento. Retornando ao início.');
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

    const cepColetaLimpo = coleta.cep.replace(/\D/g, '');
    const cepEntregaLimpo = entrega.cep.replace(/\D/g, '');

    if (!coleta.rua || !coleta.num || !entrega.rua || !entrega.num || cepColetaLimpo.length < 8 || cepEntregaLimpo.length < 8) {
      alert("Preencha todos os campos corretamente. Rua, Número e CEP são obrigatórios.");
      return;
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
      if (Number.isNaN(km) || km <= 0) throw new Error("INVALID_DISTANCE");

      setDistanciaReal(km);
      setStep('preview');
    } catch {
      const cepOrigemPrefixo = cepColetaLimpo.substring(0, 2);
      const cepDestinoPrefixo = cepEntregaLimpo.substring(0, 2);
      const estimativaKm = (cepOrigemPrefixo && cepOrigemPrefixo === cepDestinoPrefixo) ? 15 : 35; 
      
      alert("Calculando rota por aproximação geográfica devido a instabilidade de rede.");
      setDistanciaReal(estimativaKm); 
      setStep('preview');
    } finally { 
      setLoadingRoute(false); 
    }
  };

  const getValidCoords = async (addressStr: string, cepFallback: string): Promise<Coords> => {
    if (coordsCache.current[addressStr]) {
      return coordsCache.current[addressStr];
    }
    
    try {
      const coords = await callWithRetryAndTimeout<Coords>('getCoords', { address: addressStr });
      
      if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number' && !Number.isNaN(coords.lat) && !Number.isNaN(coords.lng)) {
        coordsCache.current[addressStr] = coords;
        return coords;
      }
      throw new Error('INVALID_COORDS');
    } catch {
      return getFallbackCoordsByCEP(cepFallback);
    }
  };

  const handleContratar = async () => {
    if (loadingRoute || loadingPayment) return;

    if (Number.isNaN(valorTotalBruto) || valorTotalBruto <= 0) {
      alert("Erro no cálculo do valor. Tente novamente.");
      return;
    }

    if (tipoFrete === 'agendado' && (!dataAgendada || new Date(dataAgendada) < new Date())) {
      alert("Data de agendamento inválida."); 
      return;
    }
    
    setLoadingPayment(true);
    
    try {
      const c1 = await getValidCoords(`${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`, coleta.cep);
      const c2 = await getValidCoords(`${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`, entrega.cep);
      
      const finalValTotal = Number(valorTotalBruto.toFixed(2));
      const finalValMotorista = Number((valorTotalBruto * 0.8).toFixed(2));
      const finalLucro = Number((valorTotalBruto * 0.2).toFixed(2));

      const docRef = await addDoc(collection(db, 'fretes'), {
        distancia: validDistancia,
        veiculo: vehicle, 
        valorTotal: finalValTotal,
        valorMotorista: finalValMotorista,
        lucroPlataforma: finalLucro, 
        cidadeOrigem: coleta.bairro,
        cidadeDestino: entrega.bairro,
        enderecoColetaTexto: `${coleta.rua}, ${coleta.num} - ${coleta.bairro}`,
        enderecoEntregaTexto: `${entrega.rua}, ${entrega.num} - ${entrega.bairro}`,
        peso: peso || 'Não informado',
        tipoMaterial: tipoMaterial || 'Carga geral',
        coleta,
        entrega, 
        origemLat: c1.lat,
        origemLng: c1.lng,
        destinoLat: c2.lat,
        destinoLng: c2.lng,
        tipoFrete,
        dataAgendada: tipoFrete === 'agendado' ? new Date(dataAgendada) : null,
        status: tipoFrete === 'agendado' ? 'agendado' : 'aguardando_pagamento',
        createdAt: serverTimestamp()
      });
      
      localStorage.setItem('fretogo_current_order', docRef.id);
      setCurrentOrderId(docRef.id);
      
      if (tipoFrete === 'imediato') {
        const payload = {
          titulo: `FRETOGO - ${VEHICLE_CONFIG[vehicle].nome}`,
          preco: finalValTotal.toString(),
          idPedido: docRef.id
        };

        const res = await fetch('/api/pagamento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (data && data.url && typeof data.url === 'string' && data.url.startsWith('https://')) {
          window.location.href = data.url; 
        } else {
          setStep('busca');
        }
      } else {
        setStep('busca');
      }

    } catch { 
      alert("Falha de conexão. Verifique sua rede e tente novamente."); 
      localStorage.removeItem('fretogo_current_order');
      setCurrentOrderId(null);
    } finally {
      setLoadingPayment(false); 
    }
  };

  const handleWhatsAppClick = () => {
    if (!orderData?.motoristaZap) return;
    const cleanPhone = orderData.motoristaZap.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && cleanPhone.length <= 13) {
      window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    }
  };

  const resetFlow = () => {
    if (step === 'form') {
      window.location.href = '/';
    } else {
      localStorage.removeItem('fretogo_current_order');
      setStep('form');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <nav className="bg-slate-950 p-4 flex items-center justify-between text-white font-black italic sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2 text-xl tracking-tight">
          <button onClick={resetFlow} className="cursor-pointer hover:scale-110 transition-all bg-transparent border-none">
            <ArrowLeft />
          </button>
          <Zap className="text-yellow-400 fill-yellow-400" size={24} /> FRETOGO
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 mt-6">
        {step === 'form' && (
          <div className="space-y-3 bg-white p-6 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
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
            
            <select className="w-full p-4 bg-slate-950 text-white rounded-xl font-black outline-none cursor-pointer hover:bg-slate-900 transition-all" value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)}>
              {Object.entries(VEHICLE_CONFIG).map(([key, conf]) => (
                <option key={key} value={key}>{conf.nome}</option>
              ))}
            </select>
            
            <div className="bg-slate-100 p-4 rounded-2xl border-2 border-slate-200">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Previsão</p>
               <div className="flex gap-2">
                 <button onClick={() => setTipoFrete('imediato')} className={`flex-1 p-3 rounded-xl font-black text-xs uppercase transition-all ${tipoFrete === 'imediato' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>Agora</button>
                 <button onClick={() => setTipoFrete('agendado')} className={`flex-1 p-3 rounded-xl font-black text-xs uppercase transition-all ${tipoFrete === 'agendado' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>Agendar</button>
               </div>
               {tipoFrete === 'agendado' && <input type="datetime-local" className="w-full mt-3 p-3 rounded-xl border-2 text-slate-950 font-black outline-none focus:border-blue-500 transition-all" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all" placeholder="Peso (ex: 20kg)" value={peso} onChange={e => setPeso(e.target.value)} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 text-slate-950 font-black placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all" placeholder="Material" value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)} />
            </div>

            <button onClick={calcularDistanciaReal} disabled={loadingRoute || loadingPayment} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase italic mt-4 hover:scale-[1.02] hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2">
              {loadingRoute ? <><Loader2 className="animate-spin w-5 h-5"/> Calculando rota...</> : 'CALCULAR FRETE'}
            </button>
          </div>
        )}

        {step === 'preview' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <MapaCliente />
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl mt-4 text-center border-t-8 border-green-500 relative overflow-hidden">
                <p className="text-sm text-slate-400 line-through font-bold">
                  Preço médio: R$ {valorAncora.toFixed(2).replace('.', ',')}
                </p>
                
                <p className="text-6xl font-black text-green-600 italic mb-2 drop-shadow-sm">
                  R$ {valorTotalBruto.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-[11px] font-black uppercase text-green-700 bg-green-100 inline-block px-4 py-2 rounded-xl mb-6">
                  Melhor preço disponível agora
                </p>
                <div className="bg-slate-50 p-4 rounded-2xl mb-8 text-slate-900 font-bold text-xs border border-slate-100 shadow-inner">
                  {coleta.rua}, {coleta.num} ➔ {entrega.bairro} <br/>
                  <span className="text-blue-600 font-black">({validDistancia.toFixed(1)} KM)</span>
                </div>
                <button onClick={handleContratar} disabled={loadingRoute || loadingPayment} className="w-full bg-slate-950 text-white py-6 rounded-3xl font-black uppercase italic shadow-2xl hover:scale-[1.02] hover:bg-black transition-all duration-200 flex items-center justify-center gap-2">
                  {loadingPayment ? <><Loader2 className="animate-spin w-5 h-5" /> Processando...</> : 'CONTRATAR AGORA'}
                </button>
            </div>
          </div>
        )}

        {step === 'busca' && (
           <div className="bg-white rounded-[3rem] p-8 text-center shadow-2xl border-4 border-slate-100 mt-10 animate-in slide-in-from-bottom-6">
              {['aceito', 'coleta', 'em_transporte', 'entregue'].includes(orderData?.status || '') ? (
                 <div className="animate-in zoom-in fade-in duration-500">
                    <CheckCircle className="text-green-500 w-20 h-20 mx-auto mb-4 drop-shadow-md" />
                    <h2 className="text-2xl font-black italic uppercase text-slate-950">Motorista Confirmado</h2>
                    
                    {orderData?.rotaInteligente && (
                      <p className="text-[11px] font-black uppercase text-green-700 bg-green-100 px-4 py-2 rounded-xl mt-2 mb-2 inline-block">
                        🚚 Motorista já está na sua rota
                      </p>
                    )}

                    <p className="font-black text-blue-600 mt-2 text-xl uppercase bg-blue-50 py-2 rounded-xl inline-block px-6">
                      {orderData?.motoristaNome || 'Motorista'}
                    </p>
                    <div className="mt-6">
                      {currentOrderId && <ChatFrete freteId={currentOrderId} tipoUsuario="cliente" nome="Você (Cliente)" />}
                    </div>
                    <button onClick={handleWhatsAppClick} className="w-full bg-green-500 py-5 rounded-2xl font-black mt-8 text-white uppercase shadow-xl hover:scale-[1.02] transition-all text-lg italic flex items-center justify-center gap-2">
                      WhatsApp Direto
                    </button>
                 </div>
              ) : (
                 <div className="py-10 text-center flex flex-col items-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                      <Package className="text-blue-600 w-24 h-24 relative z-10 animate-bounce" />
                    </div>
                    <h2 className="text-3xl font-black italic uppercase text-slate-950 mt-8 mb-2">
                        {orderData?.status === 'agendado' ? 'Agendamento Confirmado' : (orderData?.status === 'disponivel' ? 'Acionando Motoristas...' : 'Aguardando Pagamento...')}
                    </h2>
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-wide px-4">
                        {orderData?.status === 'agendado' ? 'Aguarde o horário combinado' : (orderData?.status === 'disponivel' ? 'Buscando parceiros próximos' : 'Confirme no app de pagamento')}
                    </p>
                 </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
}
