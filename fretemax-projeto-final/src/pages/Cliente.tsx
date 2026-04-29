import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, doc } from 'firebase/firestore';
import { ArrowLeft, Zap, Truck, Package, Loader2, CheckCircle, Bike } from 'lucide-react';
import MapaCliente from '../components/MapaCliente';

export default function Cliente() {
  const [step, setStep] = useState('form'); 
  const [loadingPay, setLoadingPay] = useState(false);
  const [coleta, setColeta] = useState({ cep: '', bairro: '', rua: '', num: '' });
  const [entrega, setEntrega] = useState({ cep: '', bairro: '', rua: '', num: '' });
  const [peso, setPeso] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [vehicle, setVehicle] = useState('carro_pequeno');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);

  const configuracao: any = { 
    'moto': { nome: 'Moto', fator: 0.6 },
    'carro_pequeno': { nome: 'Carro Pequeno', fator: 1.0 },
    'utilitario': { nome: 'Utilitário', fator: 1.6 },
    'toco': { nome: 'Caminhão Toco', fator: 2.9 },
    'truck': { nome: 'Caminhão Truck', fator: 3.8 },
    'carreta_ls': { nome: 'Carreta LS', fator: 5.5 }
  };

  const dist = (coleta.cep.length >= 8 && entrega.cep.length >= 8) ? 25 : 0;
  const valorTotalBruto = (32 + (dist * 3.80)) * configuracao[vehicle].fator;

  useEffect(() => {
    const saved = localStorage.getItem('fretogo_current_order');
    if (saved && saved !== 'null') { 
      setCurrentOrderId(saved); 
      setStep('busca'); 
    }
  }, []);

  useEffect(() => {
    if (!currentOrderId) return;
    return onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => {
      if (snap.exists()) setOrderData(snap.data());
    });
  }, [currentOrderId]);

  const getCoords = async (address: string) => {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`);
      const data = await res.json();
      return data.status === 'OK' ? data.results[0].geometry.location : null;
    } catch (e) { return null; }
  };

  const handleContratar = async () => {
    setLoadingPay(true);
    try {
      const c1 = await getCoords(`${coleta.bairro}, ${coleta.cep}, Brasil`);
      const c2 = await getCoords(`${entrega.bairro}, ${entrega.cep}, Brasil`);
      
      const docRef = await addDoc(collection(db, 'fretes'), {
        distancia: dist, veiculo: vehicle, valorTotal: Number(valorTotalBruto.toFixed(2)),
        valorMotorista: Number((valorTotalBruto * 0.8).toFixed(2)),
        coleta, entrega, peso, tipoMaterial,
        origemLat: c1?.lat || 0, origemLng: c1?.lng || 0,
        destinoLat: c2?.lat || 0, destinoLng: c2?.lng || 0,
        status: 'aguardando_pagamento', createdAt: serverTimestamp()
      });

      localStorage.setItem('fretogo_current_order', docRef.id);
      setCurrentOrderId(docRef.id);
      
      const res = await fetch('/api/pagamento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: `Frete FRETOGO - ${configuracao[vehicle].nome}`, preco: valorTotalBruto.toFixed(2), idPedido: docRef.id })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setStep('busca');
    } catch (e) { 
      alert("Erro no processo."); 
      setLoadingPay(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <nav className="bg-slate-900 p-4 flex items-center justify-between text-white font-black italic sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {step !== 'form' && <ArrowLeft onClick={() => { localStorage.removeItem('fretogo_current_order'); setStep('form'); }} className="cursor-pointer" />}
          <Zap className="text-yellow-400 fill-yellow-400" /> FRETOGO
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 mt-6">
        {step === 'form' && (
          <div className="space-y-3 bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
            <h2 className="text-slate-900 font-black uppercase text-sm mb-4">Dados do Frete</h2>
            <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400" placeholder="Bairro Coleta" onChange={e => setColeta({...coleta, bairro: e.target.value})} />
            <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400" placeholder="CEP Coleta" onChange={e => setColeta({...coleta, cep: e.target.value})} />
            <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400" placeholder="Bairro Entrega" onChange={e => setEntrega({...entrega, bairro: e.target.value})} />
            <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400" placeholder="CEP Entrega" onChange={e => setEntrega({...entrega, cep: e.target.value})} />
            <select className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-black" value={vehicle} onChange={e => setVehicle(e.target.value)}>
              {Object.keys(configuracao).map(k => <option key={k} value={k}>{configuracao[k].nome}</option>)}
            </select>
            <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-bold" placeholder="Peso (ex: 20kg)" onChange={e => setPeso(e.target.value)} />
            <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-bold" placeholder="Material (ex: Caixa)" onChange={e => setTipoMaterial(e.target.value)} />
            <button onClick={() => setStep('preview')} disabled={!peso || dist === 0} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase italic mt-4 active:scale-95 transition-transform">VER RADAR E PREÇO</button>
          </div>
        )}

        {step === 'preview' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <MapaCliente />
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl mt-4 text-center border-t-4 border-green-500">
                <p className="text-slate-400 font-black text-[10px] uppercase mb-1">Valor do Frete</p>
                <p className="text-6xl font-black text-slate-900 italic mb-6">R$ {valorTotalBruto.toFixed(2).replace('.', ',')}</p>
                <div className="flex justify-center gap-6 mb-8 text-slate-500 text-xs font-black uppercase bg-slate-50 p-4 rounded-2xl">
                   <span>⚖️ {peso}</span> <span>📦 {tipoMaterial}</span>
                </div>
                <button onClick={handleContratar} disabled={loadingPay} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase italic flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-transform">
                   {loadingPay ? <Loader2 className="animate-spin" /> : 'CONTRATAR AGORA'}
                </button>
            </div>
          </div>
        )}

        {step === 'busca' && (
           <div className="bg-white rounded-[2.5rem] p-10 text-center shadow-2xl border border-slate-100 mt-10">
              {['aceito', 'coleta', 'em_transporte'].includes(orderData?.status) ? (
                 <div className="animate-in fade-in">
                    <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-black italic uppercase text-slate-900">Motorista a Caminho</h2>
                    <p className="font-bold text-slate-500 mt-2 text-lg">{orderData?.motoristaNome}</p>
                    <button onClick={() => window.open(`https://wa.me/55${orderData?.motoristaZap?.replace(/\D/g,'')}`)} className="w-full bg-green-500 py-4 rounded-2xl font-black mt-8 text-white uppercase shadow-xl hover:bg-green-600 transition-colors">WhatsApp do Motorista</button>
                 </div>
              ) : (
                 <div className="py-10">
                    <Package className="text-blue-600 w-16 h-16 mx-auto mb-6 animate-bounce" />
                    <h2 className="text-xl font-black italic uppercase text-slate-900 animate-pulse tracking-tight">Aguardando Pagamento...</h2>
                    <p className="text-slate-400 font-bold mt-4 text-sm leading-relaxed">Seu frete será visível para os motoristas assim que o Pix for aprovado.</p>
                 </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
}
