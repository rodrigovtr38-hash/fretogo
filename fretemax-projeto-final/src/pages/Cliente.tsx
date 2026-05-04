import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ArrowLeft, Zap, Truck, Package, Loader2, CheckCircle, Bike, MapPin, Calendar } from 'lucide-react';
import MapaCliente from '../components/MapaCliente';
import ChatFrete from '../components/ChatFrete';

export default function Cliente() {
  const [step, setStep] = useState('form'); 
  const [loadingPay, setLoadingPay] = useState(false);
  const [coleta, setColeta] = useState({ cep: '', bairro: '', rua: '', num: '' });
  const [entrega, setEntrega] = useState({ cep: '', bairro: '', rua: '', num: '' });
  const [peso, setPeso] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [vehicle, setVehicle] = useState('carro_pequeno');
  const [tipoFrete, setTipoFrete] = useState<'imediato' | 'agendado'>('imediato');
  const [dataAgendada, setDataAgendada] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [distanciaReal, setDistanciaReal] = useState(0);

  const configuracao: any = { 
    'moto': { nome: 'Moto', fator: 0.6 },
    'carro_pequeno': { nome: 'Carro Pequeno', fator: 1.0 },
    'utilitario': { nome: 'Utilitário', fator: 1.6 },
    'toco': { nome: 'Caminhão Toco', fator: 2.9 },
    'truck': { nome: 'Caminhão Truck', fator: 3.8 },
    'carreta_ls': { nome: 'Carreta LS', fator: 5.5 },
    'bi_trem_cegonha': { nome: 'Bi-trem / Cegonha', fator: 7.2 }
  };

  const valorTotalBruto = (32 + (distanciaReal * 3.80)) * configuracao[vehicle].fator;

  useEffect(() => {
    const savedOrder = localStorage.getItem('fretogo_current_order');
    const savedForm = localStorage.getItem('fretogo_form_backup');
    if (savedForm) {
      const data = JSON.parse(savedForm);
      setColeta(data.coleta); setEntrega(data.entrega);
      setPeso(data.peso); setTipoMaterial(data.tipoMaterial);
      setVehicle(data.vehicle); setTipoFrete(data.tipoFrete);
      setDataAgendada(data.dataAgendada);
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

  const calcularDistanciaReal = async () => {
    if (coleta.cep.length < 8 || entrega.cep.length < 8) return;
    setLoadingPay(true);
    try {
      const functions = getFunctions();
      const getDistanceBackend = httpsCallable(functions, 'getDistance');
      const result: any = await getDistanceBackend({ origin: coleta.cep, destination: entrega.cep });
      setDistanciaReal(result.data);
      setStep('preview');
    } catch (e) {
      alert("Erro ao processar rota segura. Verifique os CEPs.");
    } finally {
      setLoadingPay(false);
    }
  };

  useEffect(() => {
    if (!currentOrderId) return;
    return onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => {
      if (snap.exists()) setOrderData(snap.data());
    });
  }, [currentOrderId]);

  const getCoordsBackend = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const functions = getFunctions();
      const getCoordsCall = httpsCallable(functions, 'getCoords');
      const result: any = await getCoordsCall({ address });
      return result.data;
    } catch (e) {
      console.warn('getCoords falhou para:', address, e);
      return null;
    }
  };

  const handleContratar = async () => {
    if (tipoFrete === 'agendado' && (!dataAgendada || new Date(dataAgendada) < new Date())) {
      alert("Data de agendamento inválida."); return;
    }
    setLoadingPay(true);
    try {
      const c1 = await getCoordsBackend(`${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`);
      const c2 = await getCoordsBackend(`${entrega.rua}, ${entrega.num}, ${entrega.bairro}, Brazil`);
      
      if (!c1 || !c2) {
        alert('Não foi possível localizar as coordenadas dos endereços fornecidos.');
        setLoadingPay(false);
        return;
      }

      const docRef = await addDoc(collection(db, 'fretes'), {
        distancia: distanciaReal, veiculo: vehicle, 
        valorTotal: Number(valorTotalBruto.toFixed(2)),
        valorMotorista: Number((valorTotalBruto * 0.8).toFixed(2)),
        cidadeOrigem: coleta.bairro, cidadeDestino: entrega.bairro,
        enderecoColetaTexto: `${coleta.rua}, ${coleta.num} - ${coleta.bairro}`,
        enderecoEntregaTexto: `${entrega.rua}, ${entrega.num} - ${entrega.bairro}`,
        peso: peso || 'Não informado', tipoMaterial: tipoMaterial || 'Carga geral',
        coleta, entrega, origemLat: c1.lat, origemLng: c1.lng,
        destinoLat: c2.lat, destinoLng: c2.lng,
        tipoFrete, dataAgendada: tipoFrete === 'agendado' ? new Date(dataAgendada) : null,
        status: tipoFrete === 'agendado' ? 'agendado' : 'aguardando_pagamento',
        createdAt: serverTimestamp()
      });

      localStorage.setItem('fretogo_current_order', docRef.id);
      setCurrentOrderId(docRef.id);
      
      const res = await fetch('/api/pagamento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: `FRETOGO - ${configuracao[vehicle].nome}`, preco: valorTotalBruto.toFixed(2), idPedido: docRef.id })
      });
      const data = await res.json();
      
      if (data.url) window.location.href = data.url;
      else setStep('busca');

    } catch (e) { 
      alert("Erro na contratação."); 
      setLoadingPay(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <nav className="bg-slate-950 p-4 flex items-center justify-between text-white font-black italic sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ArrowLeft onClick={() => { if (step === 'form') window.location.href = '/'; else { localStorage.removeItem('fretogo_current_order'); setStep('form'); } }} className="cursor-pointer" />
          <Zap className="text-yellow-400" /> FRETOGO
        </div>
      </nav>
      <div className="max-w-md mx-auto px-4 mt-6">
        {step === 'form' && (
          <div className="space-y-3 bg-white p-6 rounded-3xl shadow-2xl animate-in fade-in">
            <h2 className="text-slate-950 font-black uppercase text-xs mb-4 flex items-center gap-2"><MapPin className="text-blue-600 w-4 h-4"/> Onde coletamos?</h2>
            <div className="grid grid-cols-3 gap-2">
              <input className="col-span-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 font-bold text-sm" placeholder="Rua Coleta" value={coleta.rua} onChange={e => setColeta({...coleta, rua: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 font-bold text-sm" placeholder="Nº" value={coleta.num} onChange={e => setColeta({...coleta, num: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 font-bold text-sm" placeholder="Bairro" value={coleta.bairro} onChange={e => setColeta({...coleta, bairro: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 font-bold text-sm" placeholder="CEP" value={coleta.cep} onChange={e => setColeta({...coleta, cep: e.target.value})} />
            </div>
            <hr className="my-4 border-slate-100" />
            <h2 className="text-slate-950 font-black uppercase text-xs mb-4 flex items-center gap-2"><Truck className="text-blue-600 w-4 h-4"/> Destino da Carga</h2>
            <div className="grid grid-cols-3 gap-2">
              <input className="col-span-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 font-bold text-sm" placeholder="Rua Entrega" value={entrega.rua} onChange={e => setEntrega({...entrega, rua: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 font-bold text-sm" placeholder="Nº" value={entrega.num} onChange={e => setEntrega({...entrega, num: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 font-bold text-sm" placeholder="Bairro" value={entrega.bairro} onChange={e => setEntrega({...entrega, bairro: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 font-bold text-sm" placeholder="CEP" value={entrega.cep} onChange={e => setEntrega({...entrega, cep: e.target.value})} />
            </div>
            <select className="w-full p-4 bg-slate-950 text-white rounded-xl font-black outline-none" value={vehicle} onChange={e => setVehicle(e.target.value)}>
              {Object.keys(configuracao).map(k => <option key={k} value={k}>{configuracao[k].nome}</option>)}
            </select>
            <div className="bg-slate-100 p-4 rounded-2xl border-2 border-slate-200">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Previsão</p>
               <div className="flex gap-2">
                 <button onClick={() => setTipoFrete('imediato')} className={`flex-1 p-3 rounded-xl font-black text-xs uppercase ${tipoFrete === 'imediato' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>Agora</button>
                 <button onClick={() => setTipoFrete('agendado')} className={`flex-1 p-3 rounded-xl font-black text-xs uppercase ${tipoFrete === 'agendado' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>Agendar</button>
               </div>
               {tipoFrete === 'agendado' && <input type="datetime-local" className="w-full mt-3 p-3 rounded-xl border-2 text-slate-900 font-bold" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 font-bold" placeholder="Peso (ex: 20kg)" value={peso} onChange={e => setPeso(e.target.value)} />
              <input className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 font-bold" placeholder="Material" value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)} />
            </div>
            <button onClick={calcularDistanciaReal} disabled={!peso || loadingPay} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase italic mt-4">{loadingPay ? <Loader2 className="animate-spin mx-auto"/> : 'CALCULAR FRETE'}</button>
          </div>
        )}

        {step === 'preview' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <MapaCliente />
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl mt-4 text-center border-t-8 border-green-500">
                <p className="text-6xl font-black text-slate-950 italic mb-6">R$ {valorTotalBruto.toFixed(2).replace('.', ',')}</p>
                <div className="bg-slate-50 p-4 rounded-2xl mb-8 text-slate-900 font-bold text-xs">{coleta.rua}, {coleta.num} ➔ {entrega.bairro} ({distanciaReal.toFixed(1)} KM)</div>
                <button onClick={handleContratar} disabled={loadingPay} className="w-full bg-slate-950 text-white py-6 rounded-3xl font-black uppercase italic shadow-2xl">{loadingPay ? <Loader2 className="animate-spin mx-auto" /> : 'CONTRATAR AGORA'}</button>
            </div>
          </div>
        )}

        {step === 'busca' && (
           <div className="bg-white rounded-[3rem] p-8 text-center shadow-2xl border-4 border-slate-100 mt-10">
              {['aceito', 'coleta', 'em_transporte'].includes(orderData?.status) ? (
                 <div className="animate-in fade-in">
                    <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-black italic uppercase text-slate-950">Motorista Confirmado</h2>
                    <p className="font-black text-blue-600 mt-4 text-xl uppercase">{orderData?.motoristaNome}</p>
                    <ChatFrete freteId={currentOrderId} tipoUsuario="cliente" nome="Você (Cliente)" />
                    <button onClick={() => window.open(`https://wa.me/55${orderData?.motoristaZap?.replace(/\D/g,'')}`)} className="w-full bg-green-500 py-5 rounded-2xl font-black mt-8 text-white uppercase shadow-2xl text-lg italic">WhatsApp Direto</button>
                 </div>
              ) : (
                 <div className="py-10 text-center">
                    <Package className="text-blue-600 w-20 h-20 mx-auto mb-6 animate-bounce" />
                    <h2 className="text-2xl font-black italic uppercase text-slate-950 animate-pulse">Buscando Motorista...</h2>
                    <p className="text-slate-400 font-bold text-xs mt-2 uppercase">Sua carga está visível no radar</p>
                 </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
}
