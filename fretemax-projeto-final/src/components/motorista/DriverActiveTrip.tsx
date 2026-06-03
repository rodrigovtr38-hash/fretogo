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
  X
} from 'lucide-react';

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
        <p className="mt-3 text-slate-400">Aceite um frete no radar para iniciar uma nova rota operacional.</p>
      </div>
    );
  }

  // Lógica de Múltiplas Paradas
  const paradas = frete.paradas || [frete.destino];
  const paradaAtualIndex = frete.paradaAtualIndex || 0;
  const destinoAtual = paradas[paradaAtualIndex];
  const isMultiDrop = paradas.length > 1;

  // Renderização Dinâmica do Botão Principal
  const renderActionButton = () => {
    switch (frete.status) {
      case 'aceito':
        return (
          <button onClick={() => handleStatusUpdate('indo_coleta')} disabled={actionLoading} className="w-full rounded-2xl bg-blue-600 py-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95">
            Iniciar Deslocamento
          </button>
        );
      case 'indo_coleta':
        return (
          <button onClick={() => setIsPinModalOpen(true)} disabled={actionLoading} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-black shadow-lg shadow-cyan-500/30 transition-all hover:scale-[1.02] active:scale-95">
            <LockKeyhole size={18} /> Cheguei na Coleta
          </button>
        );
      case 'em_transporte':
        return (
          <button onClick={() => setIsPinModalOpen(true)} disabled={actionLoading} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-black shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95">
            <LockKeyhole size={18} /> Entregar {isMultiDrop ? `Destino ${paradaAtualIndex + 1}` : 'Carga'}
          </button>
        );
      default:
        return null;
    }
  };

  // Ação Simples (Sem PIN)
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

  // Validação do PIN de Segurança
  const handlePinSubmit = async () => {
    setActionLoading(true);
    setPinError('');

    try {
      const docRef = doc(db, 'fretes', frete.id);

      if (frete.status === 'indo_coleta') {
        // Valida PIN da Coleta
        if (pinValue !== frete.pinColeta) {
          setPinError('PIN de Coleta incorreto.');
          setActionLoading(false);
          return;
        }
        await updateDoc(docRef, { status: 'em_transporte', paradaAtualIndex: 0, atualizadoEm: serverTimestamp() });
        
      } else if (frete.status === 'em_transporte') {
        // Valida PIN da Entrega Específica
        const pinCorreto = frete.pinEntregas ? frete.pinEntregas[paradaAtualIndex] : frete.pinEntrega;
        if (pinValue !== pinCorreto) {
          setPinError('PIN de Entrega incorreto.');
          setActionLoading(false);
          return;
        }

        // Verifica se existem mais paradas
        if (paradaAtualIndex + 1 < paradas.length) {
          await updateDoc(docRef, { paradaAtualIndex: paradaAtualIndex + 1, atualizadoEm: serverTimestamp() });
        } else {
          // Última parada concluída!
          await updateDoc(docRef, { status: 'entregue', dispatchStatus: 'finalizado', finalizadoEm: serverTimestamp() });
        }
      }

      setIsPinModalOpen(false);
      setPinValue('');
    } catch (error) {
      console.error("Erro ao validar PIN:", error);
      setPinError('Erro no servidor. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-900 shadow-2xl"
      >
        {/* HEADER */}
        <div className="border-b border-white/5 bg-slate-950/50 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Corrida Ativa</h2>
              <p className="text-sm font-bold text-cyan-400">
                {frete.status === 'aceito' ? 'Deslocamento Pendente' : frete.status === 'indo_coleta' ? 'A caminho da Coleta' : 'Em Transporte'}
              </p>
            </div>
            <div className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-black ${frete.status === 'em_transporte' ? 'bg-emerald-500' : 'bg-cyan-500'}`}>
              {frete.status === 'em_transporte' ? 'EM ROTA' : 'DESPACHO'}
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">
          
          {/* CLIENT */}
          <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-950 p-5 shadow-inner">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
              <User className="text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-black text-white truncate">{frete.clienteNome || 'Cliente Fretogo'}</h3>
              <p className="text-slate-400 text-sm">{frete.clienteDocumento ? 'Empresa/Documento Verificado' : 'Cliente Verificado'}</p>
            </div>
          </div>

          {/* ROUTE */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-slate-950 p-5 shadow-inner relative overflow-hidden">
              {frete.status === 'em_transporte' && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex items-center justify-center"><CheckCircle2 className="text-emerald-500 h-10 w-10 opacity-50" /></div>}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="text-cyan-400" />
                  <h3 className="font-black text-white uppercase tracking-widest text-xs">Origem (Coleta)</h3>
                </div>
              </div>
              <p className="text-slate-300 font-bold truncate">{frete.origem?.rua}, {frete.origem?.num || frete.origem?.numero}</p>
              <p className="mt-1 text-sm text-slate-500 truncate">{frete.origem?.bairro} • {frete.origem?.cep}</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-inner relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Navigation className="text-emerald-400" />
                  <h3 className="font-black text-white uppercase tracking-widest text-xs">
                    {isMultiDrop ? `Destino Atual (${paradaAtualIndex + 1}/${paradas.length})` : 'Destino Final'}
                  </h3>
                </div>
              </div>
              <p className="text-slate-200 font-bold truncate">{destinoAtual?.rua}, {destinoAtual?.num || destinoAtual?.numero}</p>
              <p className="mt-1 text-sm text-slate-400 truncate">{destinoAtual?.bairro} • {destinoAtual?.cep}</p>
            </div>
          </div>

          {/* INFO */}
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-slate-950 p-5 shadow-inner">
              <div className="mb-3 flex items-center gap-3">
                <Truck className="text-blue-400 h-5 w-5" />
                <h3 className="font-black text-white text-xs uppercase tracking-widest">Carga</h3>
              </div>
              <p className="text-slate-300 font-bold truncate">{frete.tipoCarga || 'Geral'}</p>
              <p className="text-xs text-slate-500 mt-1">{frete.pesoKg}kg • {frete.volumes} vol</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-950 p-5 shadow-inner">
              <div className="mb-3 flex items-center gap-3">
                <Clock3 className="text-yellow-400 h-5 w-5" />
                <h3 className="font-black text-white text-xs uppercase tracking-widest">Ganhos</h3>
              </div>
              <p className="text-emerald-400 font-black text-lg">R$ {Number(frete.valorMotorista).toFixed(2).replace('.', ',')}</p>
              <p className="text-xs text-slate-500 mt-1">KM Total: {frete.kmTotal}km</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-950 p-5 shadow-inner">
              <div className="mb-3 flex items-center gap-3">
                <ShieldCheck className="text-purple-400 h-5 w-5" />
                <h3 className="font-black text-white text-xs uppercase tracking-widest">Segurança</h3>
              </div>
              <p className="text-slate-300 font-bold">PIN Dinâmico</p>
              <p className="text-xs text-slate-500 mt-1">Validado no local</p>
            </div>
          </div>

          {/* ACTION BUTTON MÁGICO */}
          <div className="mt-8">
            {renderActionButton()}
          </div>

          {/* CONTACT */}
          {frete.clienteTelefone && (
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950 p-5">
              <div>
                <h3 className="font-black text-white text-sm">Contato de Suporte</h3>
                <p className="text-sm text-slate-400 mt-1">{frete.clienteTelefone}</p>
              </div>
              <button onClick={() => window.open(`https://wa.me/55${frete.clienteTelefone.replace(/\D/g, '')}`, '_blank')} className="flex items-center gap-2 rounded-xl bg-green-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-green-400 hover:bg-green-500/20 transition-colors">
                <Phone size={16} /> WhatsApp
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* MODAL DO PIN */}
      <AnimatePresence>
        {isPinModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] border border-cyan-500/30 bg-slate-900 p-8 shadow-2xl relative"
            >
              <button onClick={() => { setIsPinModalOpen(false); setPinError(''); setPinValue(''); }} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10">
                <LockKeyhole className="h-8 w-8 text-cyan-400" />
              </div>
              
              <h3 className="text-center text-2xl font-black text-white mb-2">Validação de Segurança</h3>
              <p className="text-center text-sm text-slate-400 mb-8">
                Peça o PIN de 4 dígitos para o responsável no local da {frete.status === 'indo_coleta' ? 'Coleta' : 'Entrega'}.
              </p>

              <input 
                type="text" 
                maxLength={4}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 p-6 text-center text-4xl font-black tracking-[0.5em] text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 mb-4"
              />

              {pinError && (
                <div className="mb-6 flex items-center justify-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl">
                  <AlertTriangle size={16} /> <span className="text-sm font-bold">{pinError}</span>
                </div>
              )}

              <button 
                onClick={handlePinSubmit} 
                disabled={pinValue.length !== 4 || actionLoading}
                className="w-full rounded-2xl bg-cyan-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-black shadow-lg shadow-cyan-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Validando...' : 'Confirmar PIN'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
