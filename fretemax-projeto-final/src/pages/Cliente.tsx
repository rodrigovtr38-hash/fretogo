// Substitua o conteúdo de Cliente.tsx
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
    'moto': { nome: 'Moto', peso: 'Até 20kg', fator: 0.6, pisoANTT: 0 },
    'carro_pequeno': { nome: 'Carro Pequeno', peso: 'Até 500kg', fator: 1.0, pisoANTT: 0 },
    'utilitario': { nome: 'Utilitário / Fiorino', peso: 'Até 1.5ton', fator: 1.6, pisoANTT: 0 },
    'toco': { nome: 'Caminhão Toco', peso: 'Até 6ton', fator: 2.9, pisoANTT: 3.12 },
    'truck': { nome: 'Caminhão Truck', peso: 'Até 12ton', fator: 3.8, pisoANTT: 3.89 },
    'carreta_ls': { nome: 'Carreta LS', peso: 'Até 30ton', fator: 5.5, pisoANTT: 5.08 }
  };

  const dist = (coleta.cep.length >= 8 && entrega.cep.length >= 8) ? 25 : 0;
  const valorTotalBruto = (32 + (dist * 3.80)) * configuracao[vehicle].fator;

  useEffect(() => {
    const saved = localStorage.getItem('fretogo_current_order');
    if (saved) { setCurrentOrderId(saved); setStep('busca'); }
  }, []);

  useEffect(() => {
    if (!currentOrderId) return;
    return onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => setOrderData(snap.data()));
  }, [currentOrderId]);

  const getCoords = async (address: string) => {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`);
    const data = await res.json();
    return data.status === 'OK' ? data.results[0].geometry.location : null;
  };

  const handleContratar = async () => {
    setLoadingPay(true);
    const c1 = await getCoords(`${coleta.rua}, ${coleta.num}, ${coleta.bairro}, ${coleta.cep}`);
    const c2 = await getCoords(`${entrega.rua}, ${entrega.num}, ${entrega.bairro}, ${entrega.cep}`);
    
    const docRef = await addDoc(collection(db, 'fretes'), {
      distancia: dist, veiculo: vehicle, valorTotal: Number(valorTotalBruto.toFixed(2)),
      valorMotorista: Number((valorTotalBruto * 0.8).toFixed(2)),
      coleta, entrega, peso, tipoMaterial,
      origemLat: c1?.lat || 0, origemLng: c1?.lng || 0,
      destinoLat: c2?.lat || 0, destinoLng: c2?.lng || 0,
      status: 'aguardando_pagamento', createdAt: serverTimestamp()
    });

    localStorage.setItem('fretogo_current_order', docRef.id);
    const res = await fetch('/api/pagamento', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: `Frete FRETOGO - ${configuracao[vehicle].nome}`, preco: valorTotalBruto.toFixed(2), idPedido: docRef.id })
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <nav className="bg-slate-950 p-4 flex items-center justify-between shadow-xl text-white font-black italic">
        <div className="flex items-center gap-2">
          {step !== 'form' && <ArrowLeft onClick={() => { localStorage.removeItem('fretogo_current_order'); setStep('form'); }} className="cursor-pointer" />}
          <Zap className="text-yellow-400" /> FRETOGO
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 mt-4">
        {step === 'form' && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <input className="p-4 bg-white rounded-2xl border" placeholder="Bairro Coleta" onChange={e => setColeta({...coleta, bairro: e.target.value})} />
              <input className="p-4 bg-white rounded-2xl border" placeholder="CEP Coleta" onChange={e => setColeta({...coleta, cep: e.target.value})} />
              <input className="p-4 bg-white rounded-2xl border" placeholder="Bairro Entrega" onChange={e => setEntrega({...entrega, bairro: e.target.value})} />
              <input className="p-4 bg-white rounded-2xl border" placeholder="CEP Entrega" onChange={e => setEntrega({...entrega, cep: e.target.value})} />
              <select className="p-4 bg-white rounded-2xl border font-bold" value={vehicle} onChange={e => setVehicle(e.target.value)}>
                {Object.keys(configuracao).map(k => <option key={k} value={k}>{configuracao[k].nome}</option>)}
              </select>
              <input className="p-4 bg-white rounded-2xl border" placeholder="Peso (ex: 20kg)" onChange={e => setPeso(e.target.value)} />
              <input className="p-4 bg-white rounded-2xl border" placeholder="Material (ex: Caixa)" onChange={e => setTipoMaterial(e.target.value)} />
            </div>
            <button onClick={() => setStep('preview')} disabled={!peso || dist === 0} className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-xl">VER RADAR E PREÇO</button>
          </div>
        )}

        {step === 'preview' && (
          <div className="animate-in zoom-in">
            <MapaCliente />
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl mt-4 text-center">
                <p className="text-5xl font-black text-green-600 italic mb-4">R$ {valorTotalBruto.toFixed(2).replace('.', ',')}</p>
                <button onClick={handleContratar} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase italic flex items-center justify-center gap-3">
                   {loadingPay ? <Loader2 className="animate-spin" /> : 'CONTRATAR AGORA'}
                </button>
            </div>
          </div>
        )}

        {step === 'busca' && (
           <div className="bg-white rounded-[2.5rem] p-8 text-center shadow-2xl border">
              {['aceito', 'coleta', 'em_transporte'].includes(orderData?.status) ? (
                 <div>
                    <Truck className="text-green-600 w-12 h-12 mx-auto mb-4" />
                    <h2 className="text-2xl font-black italic uppercase">Motorista a caminho!</h2>
                    <p className="font-bold text-slate-500 mt-2">{orderData?.motoristaNome}</p>
                    <button onClick={() => window.open(`https://wa.me/55${orderData?.motoristaZap?.replace(/\D/g,'')}`)} className="w-full bg-green-500 py-4 rounded-xl font-black mt-6 text-white uppercase shadow-lg">WhatsApp</button>
                 </div>
              ) : (
                 <div className="py-8">
                    <Package className="text-blue-600 w-12 h-12 mx-auto mb-6 animate-bounce" />
                    <h2 className="text-xl font-black italic uppercase animate-pulse">Aguardando Pagamento...</h2>
                 </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
}
