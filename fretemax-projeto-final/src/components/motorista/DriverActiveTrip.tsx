import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Truck,
  User,
  AlertTriangle,
  LockKeyhole,
  X,
  Map as MapIcon,
  Package
} from 'lucide-react';
import MapaCliente from '../MapaCliente';

interface DriverActiveTripProps {
  freteId?: string;
}

export default function DriverActiveTrip({ freteId }: DriverActiveTripProps) {
  const [frete, setFrete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Controle do Modal de PIN
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Escuta o frete em tempo real no banco de dados
  useEffect(() => {
    if (!freteId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'fretes', freteId), (docSnap) => {
      if (docSnap.exists()) {
        setFrete({ id: docSnap.id, ...docSnap.data() });
      } else {
        setFrete(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [freteId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/5">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!freteId || !frete || frete.status === 'entregue' || frete.status === 'cancelado') {
    return (
      <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
        <Truck size={60} className="mx-auto mb-5 text-slate-600" />
        <h2 className="text-2xl font-black text-white">Nenhuma corrida ativa</h2>
        <p className="mt-3 text-slate-400">Fique online no radar para receber novas cargas na sua região.</p>
      </div>
    );
  }

  // Lógica de Múltiplas Paradas e Roteirização Dinâmica
  const paradas = frete.paradas && frete.paradas.length > 0 ? frete.paradas : [frete.destino || frete.entrega];
  const paradaAtualIndex = frete.paradaAtualIndex || 0;
  const destinoAtual = paradas[paradaAtualIndex];
  const isMultiDrop = paradas.length > 1;

  // Calculando o Ponto de Partida e o Destino Atual baseado na Fase da Viagem
  let mapOriginGPS = null;
  let mapDestinoGPS = null;

  if (['aceito', 'indo_coleta', 'coletando'].includes(frete.status)) {
     // Fase 1: Motorista -> Origem (Mostramos apenas a Origem como destino dele no momento)
     mapOriginGPS = null; // Mapa foca no destino imediato (Coleta)
     mapDestinoGPS = frete.origemLat && frete.origemLng ? { lat: frete.origemLat, lng: frete.origemLng } : null;
  } else if (frete.status === 'em_transporte') {
     // Fase 2: Saindo da Coleta (ou parada anterior) -> Parada Atual
     if (paradaAtualIndex === 0) {
       mapOriginGPS = frete.origemLat && frete.origemLng ? { lat: frete.origemLat, lng: frete.origemLng } : null;
     } else {
       const paradaAnterior = paradas[paradaAtualIndex - 1];
       mapOriginGPS = paradaAnterior?.lat && paradaAnterior?.lng ? { lat: paradaAnterior.lat, lng: paradaAnterior.lng } : null;
     }
     mapDestinoGPS = destinoAtual?.lat && destinoAtual?.lng ? { lat: destinoAtual.lat, lng: destinoAtual.lng } : null;
  }

  // Renderização Dinâmica do Botão Principal seguindo o fluxo do Backend
  const renderActionButton = () => {
    switch (frete.status) {
      case 'aceito':
        return (
          <button onClick={() => handleStatusUpdate('indo_coleta')} disabled={actionLoading} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-5 text-sm md:text-base font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95">
            <Navigation size={20} /> Deslocar p/ Coleta
          </button>
        );
      case 'indo_coleta':
        return (
          <button onClick={() => handleStatusUpdate('coletando')} disabled={actionLoading} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-5 text-sm md:text-base font-black uppercase tracking-[0.2em] text-black shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-95">
            <MapPin size={20} /> Cheguei (Embarcar Carga)
          </button>
        );
      case 'coletando':
        return (
          <button onClick={() => setIsPinModalOpen(true)} disabled={actionLoading} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-5 text-sm md:text-base font-black uppercase tracking-[0.2em] text-black shadow-lg shadow-cyan-500/30 transition-all hover:scale-[1.02] active:scale-95">
            <LockKeyhole size={20} /> Iniciar Transporte (PIN)
          </button>
        );
      case 'em_transporte':
        return (
          <button onClick={() => setIsPinModalOpen(true)} disabled={actionLoading} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-5 text-sm md:text-base font-black uppercase tracking-[0.2em] text-black shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95">
            <LockKeyhole size={20} /> Entregar {isMultiDrop ? `Parada ${paradaAtualIndex + 1}` : 'Carga'} (PIN)
          </button>
        );
      default:
        return null;
    }
  };

  const handleStatusUpdate = async (novoStatus: string) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'fretes', frete.id), { 
        status: novoStatus, 
        atualizadoEm: serverTimestamp() 
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    } finally {
      setActionLoading(false);
    }
  };

  // Validação do PIN de Segurança Anti-Fraude
  const handlePinSubmit = async () => {
    setActionLoading(true);
    setPinError('');

    try {
      const docRef = doc(db, 'fretes', frete.id);

      if (frete.status === 'coletando') {
        // Valida PIN da Coleta
        if (pinValue !== frete.pinColeta) {
          setPinError('PIN de Coleta incorreto. Verifique com o embarcador.');
          setActionLoading(false);
          return;
        }
        await updateDoc(docRef, { status: 'em_transporte', paradaAtualIndex: 0, atualizadoEm: serverTimestamp() });
        
      } else if (frete.status === 'em_transporte') {
        // Valida PIN da Entrega Específica (Multi-drop)
        const pinCorreto = frete.pinEntregas && frete.pinEntregas.length > 0 
                           ? frete.pinEntregas[paradaAtualIndex] 
                           : frete.pinEntrega || frete.pinEntregas?.[0]; // fallback robusto

        if (pinValue !== pinCorreto) {
          setPinError(`PIN do Destino ${isMultiDrop ? paradaAtualIndex + 1 : ''} incorreto.`);
          setActionLoading(false);
          return;
        }

        // Verifica se existem mais paradas na rota
        if (paradaAtualIndex + 1 < paradas.length) {
          await updateDoc(docRef, { paradaAtualIndex: paradaAtualIndex + 1, atualizadoEm: serverTimestamp() });
        } else {
          // Última parada concluída! Libera o dinheiro.
          await updateDoc(docRef, { status: 'entregue', dispatchStatus: 'finalizado', finalizadoEm: serverTimestamp() });
        }
      }

      setIsPinModalOpen(false);
      setPinValue('');
    } catch (error) {
      console.error("Erro ao validar PIN:", error);
      setPinError('Erro de conexão. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-900 shadow-2xl flex flex-col"
      >
        {/* HEADER */}
        <div className="border-b border-white/5 bg-slate-950/50 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">Rota Operacional</h2>
              <p className="text-xs md:text-sm font-bold text-cyan-400 mt-1">
                {frete.status === 'aceito' ? 'Aguardando Deslocamento' : frete.status === 'indo_coleta' ? 'A caminho da Coleta' : frete.status === 'coletando' ? 'Embarcando Carga' : 'A caminho do Destino'}
              </p>
            </div>
            <div className={`rounded-full px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-black ${['aceito', 'indo_coleta', 'coletando'].includes(frete.status) ? 'bg-cyan-500' : 'bg-emerald-500'}`}>
              {['aceito', 'indo_coleta', 'coletando'].includes(frete.status) ? 'COLETA' : 'ENTREGA'}
            </div>
          </div>
        </div>

        {/* MAPA VIVO INJETADO E FOCADO NO TRECHO ATUAL */}
        <div className="relative h-[250px] md:h-[350px] w-full border-b border-white/5 bg-slate-950">
          {mapDestinoGPS ? (
            <MapaCliente 
              origem={mapOriginGPS} 
              destino={mapDestinoGPS} 
              vehicleType={frete.veiculo || 'carro'} 
              operationalMessage={['aceito', 'indo_coleta', 'coletando'].includes(frete.status) ? 'Siga para o ponto de coleta' : 'Siga a rota otimizada para entrega'} 
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
              <MapIcon size={32} className="animate-pulse" />
              <p className="text-xs font-black uppercase tracking-widest">Sincronizando GPS...</p>
            </div>
          )}
        </div>

        {/* BODY (DADOS DA VIAGEM) */}
        <div className="p-6 space-y-6">
          
          {/* CLIENT */}
          <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-950 p-5 shadow-inner">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
              <User className="text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg md:text-xl font-black text-white truncate uppercase">{frete.clienteNome || 'Cliente Fretogo'}</h3>
              <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">{frete.clienteDocumento ? 'Identidade Verificada' : 'Cliente Verificado'}</p>
            </div>
          </div>

          {/* ROUTE */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className={`rounded-2xl border bg-slate-950 p-5 shadow-inner relative overflow-hidden ${['aceito', 'indo_coleta', 'coletando'].includes(frete.status) ? 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'border-white/5'}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className={`${['aceito', 'indo_coleta', 'coletando'].includes(frete.status) ? 'text-cyan-400' : 'text-slate-500'} w-5 h-5`} />
                  <h3 className="font-black text-white uppercase tracking-widest text-xs">Ponto de Coleta</h3>
                </div>
              </div>
              <p className="text-slate-200 font-bold truncate text-sm md:text-base">{frete.enderecoColetaTexto?.split('-')[0]}</p>
              <p className="mt-1 text-xs text-slate-500 truncate">{frete.cidadeOrigem}</p>
            </div>

            <div className={`rounded-2xl border p-5 shadow-inner relative ${frete.status === 'em_transporte' ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/5 bg-slate-950'}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Navigation className={`${frete.status === 'em_transporte' ? 'text-emerald-400' : 'text-slate-500'} w-5 h-5`} />
                  <h3 className="font-black text-white uppercase tracking-widest text-xs">
                    {isMultiDrop ? `Destino Atual (${paradaAtualIndex + 1}/${paradas.length})` : 'Destino Final'}
                  </h3>
                </div>
              </div>
              <p className="text-slate-200 font-bold truncate text-sm md:text-base">{destinoAtual?.rua}, {destinoAtual?.num || destinoAtual?.numero}</p>
              <p className="mt-1 text-xs text-slate-400 truncate">{destinoAtual?.bairro} • {destinoAtual?.cep}</p>
            </div>
          </div>

          {/* INFO */}
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-slate-950 p-5 shadow-inner">
              <div className="mb-3 flex items-center gap-3">
                <Package className="text-blue-400 h-5 w-5" />
                <h3 className="font-black text-white text-xs uppercase tracking-widest">Carga</h3>
              </div>
              <p className="text-slate-300 font-bold truncate">{frete.tipoMaterial || frete.tipoCarga || 'Geral'}</p>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{frete.peso} • {frete.qtdVolumes}</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5 shadow-inner">
              <div className="mb-3 flex items-center gap-3">
                <Clock3 className="text-emerald-400 h-5 w-5" />
                <h3 className="font-black text-white text-xs uppercase tracking-widest">A Receber</h3>
              </div>
              <p className="text-emerald-400 font-black text-2xl tracking-tighter">R$ {Number(frete.valorMotorista).toFixed(2).replace('.', ',')}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500 mt-1 tracking-widest">Em até 24h úteis</p>
            </div>

            <div className="rounded-2xl border border-purple-500/10 bg-purple-500/5 p-5 shadow-inner">
              <div className="mb-3 flex items-center gap-3">
                <ShieldCheck className="text-purple-400 h-5 w-5" />
                <h3 className="font-black text-white text-xs uppercase tracking-widest">Segurança</h3>
              </div>
              <p className="text-purple-300 font-bold">Liberação por PIN</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Peça ao cliente</p>
            </div>
          </div>

          {/* ACTION BUTTON MÁGICO */}
          <div className="mt-8">
            {renderActionButton()}
          </div>

          {/* CONTACT */}
          {frete.clienteZap && (
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950 p-5 mt-4">
              <div>
                <h3 className="font-black text-white text-xs md:text-sm uppercase tracking-widest">Central de Suporte</h3>
                <p className="text-sm font-bold text-slate-400 mt-1">{frete.clienteZap}</p>
              </div>
              <button onClick={() => window.open(`https://wa.me/55${frete.clienteZap.replace(/\D/g, '')}`, '_blank')} className="flex items-center gap-2 rounded-xl bg-green-500/10 px-5 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-green-400 hover:bg-green-500/20 transition-colors">
                <Phone size={16} /> WhatsApp
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* MODAL DO PIN (ANTIFRAUDE) */}
      <AnimatePresence>
        {isPinModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-[2.5rem] border border-cyan-500/30 bg-slate-900 p-8 shadow-[0_20px_50px_rgba(6,182,212,0.2)] relative"
            >
              <button onClick={() => { setIsPinModalOpen(false); setPinError(''); setPinValue(''); }} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-cyan-500/10 border border-cyan-500/20">
                <LockKeyhole className="h-10 w-10 text-cyan-400 drop-shadow-md" />
              </div>
              
              <h3 className="text-center text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Liberação Fretogo</h3>
              <p className="text-center text-xs font-bold text-slate-400 mb-8 uppercase tracking-widest leading-relaxed">
                Peça ao cliente o PIN Exclusivo de <span className="text-cyan-400">{frete.status === 'coletando' ? 'Coleta' : 'Entrega'}</span> para garantir seu pagamento.
              </p>

              <input 
                type="text" 
                maxLength={4}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 p-6 text-center text-5xl font-black tracking-[0.5em] text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 mb-4 placeholder:text-slate-700"
              />

              {pinError && (
                <div className="mb-6 flex items-center justify-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl">
                  <AlertTriangle size={16} /> <span className="text-[10px] uppercase tracking-widest font-black">{pinError}</span>
                </div>
              )}

              <button 
                onClick={handlePinSubmit} 
                disabled={pinValue.length !== 4 || actionLoading}
                className="w-full rounded-[1.25rem] bg-cyan-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_10px_20px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Validando Cofre...' : 'Confirmar PIN e Seguir'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
