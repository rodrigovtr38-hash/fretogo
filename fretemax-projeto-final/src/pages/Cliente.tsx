import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, doc } from 'firebase/firestore';
import { ArrowLeft, Zap, Truck, Package, Loader2, CheckCircle } from 'lucide-react';
import MapaCliente from '../components/MapaCliente';

export default function Cliente() {
  const [step, setStep] = useState('form'); 
  const [loadingPay, setLoadingPay] = useState(false);
  
  // Estrutura de Endereços mantida
  const [coleta, setColeta] = useState({ cep: '', bairro: '', rua: '', num: '' });
  const [entrega, setEntrega] = useState({ cep: '', bairro: '', rua: '', num: '' });
  
  // NOVOS CAMPOS DE CARGA (Passo 2)
  const [peso, setPeso] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');

  const [vehicle, setVehicle] = useState('carro_pequeno');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);

  const configuracao: any = { 
    'carro_pequeno': { nome: 'Carro Pequeno', peso: 'Até 500kg', fator: 1.0, pisoANTT: 0 },
    'utilitario': { nome: 'Utilitário / Fiorino', peso: 'Até 1.5ton', fator: 1.6, pisoANTT: 0 },
    'toco': { nome: 'Caminhão Toco', peso: 'Até 6ton', fator: 2.9, pisoANTT: 3.12 },
    'truck': { nome: 'Caminhão Truck', peso: 'Até 12ton', fator: 3.8, pisoANTT: 3.89 },
    'carreta_ls': { nome: 'Carreta LS', peso: 'Até 30ton', fator: 5.5, pisoANTT: 5.08 },
    'bi_trem_cegonha': { nome: 'Bi-trem / Cegonha', peso: 'Especial', fator: 7.2, pisoANTT: 6.11 } 
  };

  const dist = (coleta.cep.length >= 8 && entrega.cep.length >= 8) ? 25 : 0;
  
  const calcularValorFinal = () => {
    const hora = new Date().getHours();
    const mult = (hora >= 17 && hora <= 20) ? 1.15 : 1.0;
    const valorBase = (32 + (dist * 3.80)) * configuracao[vehicle].fator;
    const precoDinamico = valorBase * mult;
    const pisoMinimo = dist * configuracao[vehicle].pisoANTT;
    return Math.max(precoDinamico, pisoMinimo);
  };

  const valorTotalBruto = calcularValorFinal();

  // Fim do Loop
  useEffect(() => {
    const savedOrderId = localStorage.getItem('fretogo_current_order');
    if (savedOrderId && savedOrderId !== 'null') { 
      setCurrentOrderId(savedOrderId); 
      setStep('busca'); 
    }
  }, []);

  useEffect(() => {
    if (!currentOrderId) return;
    const unsub = onSnapshot(doc(db, 'fretes', currentOrderId), (docSnap) => {
      if (docSnap.exists()) setOrderData(docSnap.data());
    });
    return () => unsub();
  }, [currentOrderId]);

  const obterCoordenadas = async (cep: string) => {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${cep}&key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`);
      const data = await res.json();
      return data.status === 'OK' ? data.results[0].geometry.location : null;
    } catch (e) { return null; }
  };

  const handleContratar = async () => {
    setLoadingPay(true);
    try {
      const coords = await obterCoordenadas(coleta.cep);
      
      // ✅ SALVAMENTO ESTRUTURADO NO FIRESTORE
      const docRef = await addDoc(collection(db, 'fretes'), {
        distancia: dist, 
        veiculo: vehicle, 
        valorTotal: Number(valorTotalBruto.toFixed(2)),
        valorMotorista: Number((valorTotalBruto * 0.80).toFixed(2)),
        
        // Objetos de Endereço Completos
        coleta: coleta,
        entrega: entrega,
        
        // Dados Vitais da Carga
        peso: peso,
        tipoMaterial: tipoMaterial,
        
        origemLat: coords?.lat || 0, 
        origemLng: coords?.lng || 0,
        
        // Controle Duplo de Status
        status: 'aguardando_pagamento',
        statusPagamento: 'pendente',
        
        createdAt: serverTimestamp()
      });
      
      setCurrentOrderId(docRef.id);
      localStorage.setItem('fretogo_current_order', docRef.id);
      
      const res = await fetch('/api/pagamento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: `Frete FRETOGO - ${configuracao[vehicle].nome}`, preco: valorTotalBruto.toFixed(2), idPedido: docRef.id })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) { alert("Erro no pagamento."); setLoadingPay(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <nav className="bg-slate-950 p-4 flex items-center justify-between shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-2 text-white">
          {step !== 'form' && (
            <ArrowLeft 
              onClick={() => {
                if (step === 'busca') {
                  localStorage.removeItem('fretogo_current_order');
                  setCurrentOrderId(null);
                }
                setStep('form');
              }} 
              className="cursor-pointer" 
            />
          )}
          <Zap className="text-yellow-400 fill-yellow-400" />
          <span className="font-black text-xl italic uppercase text-white">FRETOGO</span>
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 mt-4">
        {step === 'form' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Início
            </button>

            <div className="grid gap-2">
              <input className="w-full p-4 bg-slate-100 rounded-2xl font-bold border border-slate-200 outline-none text-slate-950 placeholder:text-slate-400" placeholder="Bairro Coleta" onChange={e => setColeta({...coleta, bairro: e.target.value})} />
              <input className="w-full p-4 bg-slate-100 rounded-2xl font-bold border border-slate-200 outline-none text-slate-950 placeholder:text-slate-400" placeholder="CEP Coleta" onChange={e => setColeta({...coleta, cep: e.target.value})} />
              <input className="w-full p-4 bg-slate-100 rounded-2xl font-bold border border-slate-200 outline-none text-slate-950 placeholder:text-slate-400" placeholder="Bairro Entrega" onChange={e => setEntrega({...entrega, bairro: e.target.value})} />
              <input className="w-full p-4 bg-slate-100 rounded-2xl font-bold border border-slate-200 outline-none text-slate-950 placeholder:text-slate-400" placeholder="CEP Entrega" onChange={e => setEntrega({...entrega, cep: e.target.value})} />
              <select className="w-full p-4 bg-slate-100 rounded-2xl font-black outline-none text-slate-950" value={vehicle} onChange={e => setVehicle(e.target.value)}>
                  {Object.keys(configuracao).map(key => (
                    <option key={key} value={key}>{configuracao[key].nome}</option>
                  ))}
              </select>
              
              {/* ✅ NOVOS CAMPOS DE INFORMAÇÃO DA CARGA */}
              <input className="w-full p-4 bg-slate-100 rounded-2xl font-bold border border-slate-200 outline-none text-slate-950 placeholder:text-slate-400 mt-2" placeholder="Peso estimado (ex: 200kg)" onChange={e => setPeso(e.target.value)} />
              <input className="w-full p-4 bg-slate-100 rounded-2xl font-bold border border-slate-200 outline-none text-slate-950 placeholder:text-slate-400" placeholder="Tipo de material (ex: caixas, móveis)" onChange={e => setTipoMaterial(e.target.value)} />
            </div>
            
            <button onClick={() => setStep('preview')} disabled={dist <= 0 || !peso || !tipoMaterial} className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] text-lg uppercase italic shadow-xl active:scale-95 transition-transform mt-4 disabled:opacity-50 disabled:active:scale-100">VER RADAR E PREÇO</button>
          </div>
        )}

        {step === 'preview' && (
          <div className="animate-in fade-in zoom-in duration-500">
            <MapaCliente />
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 mt-4 text-center">
                <div className="flex justify-center mb-2">
                  <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Distância: {dist} KM
                  </span>
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Valor Estimado do Frete</p>
                <p className="text-5xl font-black text-green-600 italic mb-6">R$ {valorTotalBruto.toFixed(2).replace('.', ',')}</p>
                
                {/* Validação visual dos dados da carga antes de pagar */}
                <div className="flex justify-center gap-4 mb-6 text-slate-500 text-xs font-bold uppercase">
                   <span>⚖️ {peso}</span>
                   <span>📦 {tipoMaterial}</span>
                </div>

                <button onClick={handleContratar} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase italic flex items-center justify-center gap-3">
                   {loadingPay ? <Loader2 className="animate-spin" /> : <>CONTRATAR AGORA <CheckCircle className="text-green-500"/></>}
                </button>
            </div>
          </div>
        )}

        {step === 'busca' && (
           <div className="bg-white rounded-[2.5rem] p-8 text-center shadow-2xl border border-slate-100 animate-in zoom-in duration-500">
              {['aceito', 'coleta', 'em_transporte', 'entregue'].includes(orderData?.status) ? (
                 <div>
                    <Truck className="text-green-600 w-12 h-12 mx-auto mb-4" />
                    <h2 className="text-2xl font-black italic uppercase text-slate-900">Carga Ativa!</h2>
                    <p className="font-bold text-slate-500 mt-2">{orderData.motoristaNome}</p>
                    <button onClick={() => window.open(`https://wa.me/55${orderData.motoristaZap?.replace(/\D/g,'')}?text=Olá!`)} className="w-full bg-green-500 py-4 rounded-xl font-black mt-6 text-white shadow-lg uppercase tracking-widest">WhatsApp</button>
                 </div>
              ) : (
                 <div className="py-8">
                    <MapaCliente />
                    <Package className="text-blue-600 w-12 h-12 mx-auto mt-6 mb-6 animate-bounce" />
                    <h2 className="text-xl font-black italic uppercase text-slate-900 animate-pulse">Aguardando Pagamento...</h2>
                 </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
}
