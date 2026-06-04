// src/pages/Cliente.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Truck, Phone, User, CheckCircle, ArrowLeft, ShieldCheck, Zap, Flame } from 'lucide-react';
import MapaCliente from '../components/MapaCliente';
import { mapsLoader } from '../services/mapsLoader';
import { useClientFreight } from '../hooks/useClientFreight';

type Step = 'FORM' | 'QUOTE';

export default function Cliente() {
  const navigate = useNavigate();
  const { createFreight, loadingPayment } = useClientFreight();

  const [step, setStep] = useState<Step>('FORM');
  const [geocoding, setGeocoding] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [documento, setDocumento] = useState('');
  const [origemTexto, setOrigemTexto] = useState('');
  const [destinoTexto, setDestinoTexto] = useState('');
  const [categoria, setCategoria] = useState('carreta');
  const [peso, setPeso] = useState('');
  const [volumes, setVolumes] = useState('');
  const [tipoCarga, setTipoCarga] = useState('');

  // Estados de GPS
  const [origemGPS, setOrigemGPS] = useState<{lat: number, lng: number} | null>(null);
  const [destinoGPS, setDestinoGPS] = useState<{lat: number, lng: number} | null>(null);
  
  // Gatilho Psicológico
  const [motoristasProximos, setMotoristasProximos] = useState(0);

  // Inicializa o Google Maps
  useEffect(() => {
    mapsLoader.load().then(() => setMapsReady(true)).catch(console.error);
  }, []);

  const geocodeAddress = async (address: string) => {
    if (!window.google) return null;
    const geocoder = new window.google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ address: `${address}, Brasil` });
      if (response.results[0]) {
        return {
          lat: response.results[0].geometry.location.lat(),
          lng: response.results[0].geometry.location.lng(),
          enderecoFormatado: response.results[0].formatted_address
        };
      }
    } catch (e) {
      console.error("Geocode falhou:", e);
    }
    return null;
  };

  const handleSimular = async () => {
    if (!origemTexto || !destinoTexto) return alert('Preencha os endereços!');
    
    setGeocoding(true);
    const originCoords = await geocodeAddress(origemTexto);
    const destCoords = await geocodeAddress(destinoTexto);
    
    if (originCoords && destCoords) {
      setOrigemGPS(originCoords);
      setDestinoGPS(destCoords);
      // Gatilho de urgência: número aleatório de motoristas próximos
      setMotoristasProximos(Math.floor(Math.random() * 8) + 3);
      setStep('QUOTE');
    } else {
      alert('Não conseguimos localizar esse endereço exato. Tente colocar Rua e Cidade.');
    }
    setGeocoding(false);
  };

  const handlePagar = async () => {
    if (!origemGPS || !destinoGPS) return;

    const freightData = {
      clienteId: 'cliente_web_' + Math.floor(Math.random() * 10000), // Mock temporário
      clienteNome: nome,
      clienteTelefone: telefone,
      clienteDocumento: documento,
      categoria,
      pesoKg: Number(peso) || 0,
      volumes: Number(volumes) || 1,
      tipoCarga: tipoCarga || 'Geral',
      prioridade: 'normal',
      origem: { ...origemGPS, enderecoFormatado: origemTexto },
      destino: { ...destinoGPS, enderecoFormatado: destinoTexto },
      paradas: [], // Múltiplas entregas podem ser injetadas aqui futuramente
    };

    await createFreight({
      freightData,
      onSuccess: (id) => {
        // Redireciona para um radar de acompanhamento (fase final)
        alert('Carga criada no banco! Direcionando para Checkout Mercado Pago...');
        // window.location.href = url_mercado_pago
      },
      onError: (err) => alert(err)
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* HEADER LIGHT MODE */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {step === 'QUOTE' && (
            <button onClick={() => setStep('FORM')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Zap className="text-blue-600 w-6 h-6 fill-blue-600" />
            <span className="text-xl font-black italic tracking-tighter">FRETOGO</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
          <ShieldCheck className="w-3.5 h-3.5" /> Plataforma Segura
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 md:pt-12">
        {step === 'FORM' && (
          <div className="max-w-3xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 mb-6">
              Orçamento Inteligente
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-8">
              Para onde vai a <span className="text-blue-600 italic">carga?</span>
            </h1>

            <div className="space-y-8">
              {/* CONTATO */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Contato Responsável
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input type="text" placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input type="tel" placeholder="Telefone / WhatsApp" value={telefone} onChange={e=>setTelefone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input type="text" placeholder="CPF / CNPJ" value={documento} onChange={e=>setDocumento(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              {/* ENDEREÇO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Endereço de Coleta
                  </p>
                  <input type="text" placeholder="Ex: Rua Dias Gomes, 188, São Paulo" value={origemTexto} onChange={e=>setOrigemTexto(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Destino Final
                  </p>
                  <input type="text" placeholder="Ex: Rua Boca de Leão, 178, Guarulhos" value={destinoTexto} onChange={e=>setDestinoTexto(e.target.value)} className="w-full bg-slate-50 border border-emerald-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>

              {/* CARGA */}
              <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 md:p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Especificações da Carga
                </p>
                <select value={categoria} onChange={e=>setCategoria(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold mb-3 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                  <option value="moto">Moto (Pequenos volumes)</option>
                  <option value="utilitario">Fiorino / Utilitário</option>
                  <option value="toco">Caminhão Toco</option>
                  <option value="carreta">Carreta LS</option>
                </select>
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" placeholder="Peso (Kg)" value={peso} onChange={e=>setPeso(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-500" />
                  <input type="number" placeholder="Qtd" value={volumes} onChange={e=>setVolumes(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-500" />
                  <input type="text" placeholder="Tipo (Caixa)" value={tipoCarga} onChange={e=>setTipoCarga(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-500" />
                </div>
              </div>

              <button 
                onClick={handleSimular} 
                disabled={geocoding}
                className="w-full bg-blue-600 text-white font-black text-xs md:text-sm uppercase tracking-widest py-5 rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:bg-blue-700 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
              >
                {geocoding ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Zap className="w-4 h-4" /> Calcular Frete</>}
              </button>
            </div>
          </div>
        )}

        {step === 'QUOTE' && origemGPS && destinoGPS && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-right-8">
            
            {/* COLUNA ESQUERDA: MAPA */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-[2rem] p-4 shadow-xl flex flex-col">
              <div className="px-4 py-2 flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Prévia Operacional</p>
                  <h2 className="text-2xl font-black italic tracking-tight">Trajeto Mapeado</h2>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>

              {/* 🔥 GATILHO PSICOLÓGICO DE URGÊNCIA */}
              <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                <div className="bg-amber-100 p-1.5 rounded-full shrink-0">
                  <Flame className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-900 uppercase">Atenção: Alta Demanda</p>
                  <p className="text-[10px] text-amber-700 mt-0.5 font-bold">Identificamos <strong>{motoristasProximos} motoristas</strong> operando a menos de 5km da coleta. Conclua o pagamento para reservar o veículo imediatamente.</p>
                </div>
              </div>

              <div className="flex-1 min-h-[400px] w-full bg-slate-100 rounded-2xl overflow-hidden relative">
                {mapsReady ? (
                  <MapaCliente 
                    origem={origemGPS} 
                    destino={destinoGPS} 
                    vehicleType={categoria} 
                    operationalMessage={`Simulando rota para ${categoria.toUpperCase()}...`} 
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Iniciando Satélites...</p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: CHECKOUT */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-xl flex flex-col">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-6 self-start">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-700">Valor Blindado</span>
              </div>
              
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Estimativa Calculada</p>
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter mt-1 mb-8">
                R$ <span className="animate-pulse blur-[4px] bg-slate-200 text-transparent rounded select-none">250,00</span>
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-500">Modalidade</span>
                  <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase">Imediato</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-500">Veículo Solicitado</span>
                  <span className="text-sm font-black text-slate-900 uppercase">{categoria}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-500">Mercadoria</span>
                  <span className="text-sm font-black text-slate-900 uppercase">{peso} KG • {volumes} vol</span>
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <button 
                  onClick={handlePagar}
                  disabled={loadingPayment}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl shadow-[0_10px_20px_rgba(37,99,235,0.2)] transition-all flex justify-center items-center gap-2"
                >
                  {loadingPayment ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Zap className="w-4 h-4"/> Pagar e Liberar Motorista</>}
                </button>
                <button onClick={() => setStep('FORM')} className="w-full bg-transparent border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest py-4 rounded-xl transition-all">
                  Voltar e Editar Rota
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
