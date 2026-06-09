import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { LockKeyhole, X } from 'lucide-react';
import MapaCliente from '../MapaCliente';
import { dispatchRealtimeService } from '../../services/dispatchRealtimeService';
import { AppTripState } from '../../state/tripStateMachine';

interface DriverActiveTripProps {
  freteId?: string;
}

export default function DriverActiveTrip({ freteId }: DriverActiveTripProps) {
  const [frete, setFrete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!freteId) { setLoading(false); return; }
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

  if (loading) return <div className="flex h-64 items-center justify-center rounded-[2rem] border border-white/10 bg-white/5"><div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div></div>;
  if (!frete) return null;

  const paradas = frete.paradas || [];
  const paradaAtualIndex = frete.paradaAtualIndex || 0;
  const destinoAtual = paradas.length > 0 ? paradas[paradaAtualIndex] : (frete.destino || {});
  
  // Lógica do Mapa
  const mapOriginGPS = frete.origem?.lat && frete.origem?.lng ? { lat: frete.origem.lat, lng: frete.origem.lng } : null;
  const mapDestinoGPS = frete.destino?.lat && frete.destino?.lng ? { lat: frete.destino.lat, lng: frete.destino.lng } : null;
  
  const currentMapOrigin = (frete.status === 'em_transporte' && paradaAtualIndex > 0 && paradas[paradaAtualIndex - 1]?.lat)
    ? { lat: paradas[paradaAtualIndex - 1].lat, lng: paradas[paradaAtualIndex - 1].lng }
    : mapOriginGPS;
  
  const currentMapDestino = destinoAtual?.lat && destinoAtual?.lng ? { lat: destinoAtual.lat, lng: destinoAtual.lng } : mapDestinoGPS;

  const handleStatusUpdate = async (novoStatus: string) => {
    setActionLoading(true);
    try {
      await dispatchRealtimeService.atualizarStatusTrip(frete.id, novoStatus);
    } catch (e) { console.error(e); } finally { setActionLoading(false); }
  };

  const handlePinSubmit = async () => {
    setActionLoading(true);
    setPinError('');
    try {
      // Validação do PIN de Coleta
      if (frete.status === 'coletando') {
        if (pinValue !== frete.pinColeta) { setPinError('PIN de Coleta incorreto.'); setActionLoading(false); return; }
        
        await dispatchRealtimeService.atualizarStatusTrip(frete.id, 'em_transporte');
      } 
      // Validação do PIN de Entrega (Multi-drop)
      else { 
        const pinEntregas = frete.pinEntregas || [];
        // Se houver array de PINs (Multi-drop) ou se for um frete simples com 1 destino
        const expectedPin = pinEntregas.length > 0 ? pinEntregas[paradaAtualIndex] : frete.pinEntrega;

        if (pinValue !== expectedPin) { setPinError('PIN de entrega incorreto.'); setActionLoading(false); return; }
        
        // Verifica se há mais paradas ou se é a última entrega
        if (pinEntregas.length > 0 && paradaAtualIndex + 1 < pinEntregas.length) {
           await updateDoc(doc(db, 'fretes', frete.id), { paradaAtualIndex: paradaAtualIndex + 1 });
        } else {
           await dispatchRealtimeService.atualizarStatusTrip(frete.id, 'entregue');
        }
      }
      setIsPinModalOpen(false); setPinValue('');
    } catch (e) { setPinError('Erro ao validar.'); } finally { setActionLoading(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[2rem] border border-cyan-500/20 bg-slate-900 shadow-2xl p-6">
        
        {/* Título Dinâmico informando a etapa */}
        <div className="mb-4 text-center">
          <h2 className="text-xl font-black text-cyan-400 uppercase tracking-widest">
            {frete.status === 'aceito' || frete.status === 'indo_coleta' || frete.status === 'chegou_coleta' || frete.status === 'coletando' 
              ? 'Etapa 1: Ir para a Coleta' 
              : frete.pinEntregas && frete.pinEntregas.length > 1 
                ? `Etapa 2: Entrega ${paradaAtualIndex + 1} de ${frete.pinEntregas.length}`
                : 'Etapa 2: Ir para Entrega Final'}
          </h2>
        </div>

        <div className="h-[250px] w-full mb-6 rounded-2xl overflow-hidden bg-slate-950">
          <MapaCliente origem={currentMapOrigin} destino={currentMapDestino} operationalMessage="Navegando..." />
        </div>
        
        <div className="space-y-4">
          {frete.status === 'aceito' && (
            <button onClick={() => handleStatusUpdate('indo_coleta')} disabled={actionLoading} className="w-full bg-blue-600 py-4 font-black uppercase tracking-widest rounded-xl disabled:opacity-50">
              Deslocar p/ Coleta
            </button>
          )}
          
          {frete.status === 'indo_coleta' && (
            <button onClick={() => handleStatusUpdate('chegou_coleta')} disabled={actionLoading} className="w-full bg-indigo-500 py-4 font-black uppercase tracking-widest rounded-xl text-white disabled:opacity-50">
              Cheguei no Local
            </button>
          )}

          {frete.status === 'chegou_coleta' && (
            <button onClick={() => handleStatusUpdate('coletando')} disabled={actionLoading} className="w-full bg-amber-500 py-4 font-black uppercase tracking-widest rounded-xl text-black disabled:opacity-50">
              Iniciar Coleta
            </button>
          )}

          {['coletando', 'em_transporte'].includes(frete.status) && (
            <button onClick={() => setIsPinModalOpen(true)} disabled={actionLoading} className="w-full bg-cyan-500 py-4 font-black uppercase tracking-widest rounded-xl text-black disabled:opacity-50 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              Validar PIN para {frete.status === 'coletando' ? 'Sair com Carga' : 'Finalizar Entrega'}
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isPinModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 50 }} 
              className="bg-slate-900 p-8 rounded-3xl w-full max-w-sm border border-cyan-500"
            >
              <div className="flex justify-center mb-4">
                <LockKeyhole size={40} className="text-cyan-400" />
              </div>
              <h3 className="text-white text-center font-black mb-2 uppercase">
                {frete.status === 'coletando' ? 'PIN do Embarcador' : 'PIN do Recebedor'}
              </h3>
              <p className="text-slate-400 text-xs text-center mb-6">
                Peça os 4 dígitos ao responsável no local para liberar o sistema.
              </p>
              
              <input 
                type="text" 
                maxLength={4} 
                value={pinValue} 
                onChange={(e) => { setPinValue(e.target.value.replace(/\D/g, '')); setPinError(''); }} 
                className="w-full p-4 text-center text-4xl font-black tracking-[0.5em] bg-slate-950 text-cyan-400 border border-cyan-500/30 rounded-xl mb-4 focus:outline-none focus:border-cyan-400"
                placeholder="0000"
              />
              
              {pinError && <p className="text-red-400 font-bold text-xs text-center mb-4 uppercase">{pinError}</p>}
              
              <div className="flex gap-2">
                <button onClick={() => { setIsPinModalOpen(false); setPinValue(''); setPinError(''); }} className="w-1/3 bg-transparent border border-white/10 py-4 font-black uppercase text-xs rounded-xl text-slate-400">
                  Voltar
                </button>
                <button onClick={handlePinSubmit} disabled={actionLoading || pinValue.length < 4} className="w-2/3 bg-cyan-500 py-4 font-black uppercase tracking-widest rounded-xl text-slate-950 disabled:opacity-50">
                  {actionLoading ? 'Validando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
