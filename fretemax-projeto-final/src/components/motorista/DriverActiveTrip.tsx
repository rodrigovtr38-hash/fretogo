// src/components/motorista/DriverActiveTrip.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { LockKeyhole, X } from 'lucide-react';
import MapaCliente from '../MapaCliente';
import { dispatchRealtimeService } from '../../services/dispatchRealtimeService';

// 🔥 Importamos os estados oficiais para garantir sincronização perfeita
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
  const destinoAtual = paradas[paradaAtualIndex] || (frete.entrega || {});
  
  // 🔥 Usando o Enum oficial para o mapa
  const mapOriginGPS = frete.status === AppTripState.EM_TRANSPORTE 
    ? (paradaAtualIndex === 0 ? { lat: frete.origemLat, lng: frete.origemLng } : { lat: paradas[paradaAtualIndex-1].lat, lng: paradas[paradaAtualIndex-1].lng })
    : null;
  const mapDestinoGPS = destinoAtual?.lat ? { lat: destinoAtual.lat, lng: destinoAtual.lng } : null;

  // 🔥 REGRA: Tipado com AppTripState para evitar erros de digitação (Case Sensitivity)
  const handleStatusUpdate = async (novoStatus: AppTripState) => {
    setActionLoading(true);
    try {
      await dispatchRealtimeService.atualizarStatusTrip(frete.id, novoStatus);
    } catch (e) { console.error(e); } finally { setActionLoading(false); }
  };

  const handlePinSubmit = async () => {
    setActionLoading(true);
    try {
      // 🔥 Usando o Enum oficial para validação da coleta
      if (frete.status === AppTripState.COLETANDO) {
        if (pinValue !== frete.pinColeta) { setPinError('PIN de Coleta incorreto.'); setActionLoading(false); return; }
        
        await dispatchRealtimeService.atualizarStatusTrip(frete.id, AppTripState.EM_TRANSPORTE);
      } else {
        const pinEntregas = frete.pinEntregas || [];
        if (pinValue !== pinEntregas[paradaAtualIndex]) { setPinError('PIN de entrega incorreto.'); setActionLoading(false); return; }
        
        if (paradaAtualIndex + 1 < paradas.length) {
           await dispatchRealtimeService.atualizarTripRealtime(frete.id, { paradaAtualIndex: paradaAtualIndex + 1 });
        } else {
           // 🔥 Usando o Enum oficial para a entrega final
           await dispatchRealtimeService.atualizarStatusTrip(frete.id, AppTripState.ENTREGUE);
        }
      }
      setIsPinModalOpen(false); setPinValue('');
    } catch (e) { setPinError('Erro ao validar.'); } finally { setActionLoading(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[2rem] border border-cyan-500/20 bg-slate-900 shadow-2xl p-6">
        <div className="h-[250px] w-full mb-6 rounded-2xl overflow-hidden bg-slate-950">
          <MapaCliente origem={mapOriginGPS} destino={mapDestinoGPS} operationalMessage="Navegando..." />
        </div>
        
        <div className="space-y-4">
          {/* 🔥 Fluxo completo blindado com Enums, incluindo o CHEGOU_COLETA que faltava */}
          {frete.status === AppTripState.ACEITO && (
            <button onClick={() => handleStatusUpdate(AppTripState.INDO_COLETA)} disabled={actionLoading} className="w-full bg-blue-600 py-4 font-black uppercase tracking-widest rounded-xl disabled:opacity-50">
              Deslocar p/ Coleta
            </button>
          )}
          
          {frete.status === AppTripState.INDO_COLETA && (
            <button onClick={() => handleStatusUpdate(AppTripState.CHEGOU_COLETA)} disabled={actionLoading} className="w-full bg-indigo-500 py-4 font-black uppercase tracking-widest rounded-xl text-white disabled:opacity-50">
              Cheguei no Local
            </button>
          )}

          {frete.status === AppTripState.CHEGOU_COLETA && (
            <button onClick={() => handleStatusUpdate(AppTripState.COLETANDO)} disabled={actionLoading} className="w-full bg-amber-500 py-4 font-black uppercase tracking-widest rounded-xl text-black disabled:opacity-50">
              Iniciar Coleta
            </button>
          )}

          {[AppTripState.COLETANDO, AppTripState.EM_TRANSPORTE].includes(frete.status) && (
            <button onClick={() => setIsPinModalOpen(true)} disabled={actionLoading} className="w-full bg-cyan-500 py-4 font-black uppercase tracking-widest rounded-xl text-black disabled:opacity-50">
              Validar PIN
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isPinModalOpen && (
          <motion.div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
            <motion.div className="bg-slate-900 p-8 rounded-3xl w-full max-w-sm border border-cyan-500">
              <h3 className="text-white text-center font-black mb-6 uppercase">Digite o PIN</h3>
              <input type="text" maxLength={4} value={pinValue} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))} className="w-full p-4 text-center text-4xl bg-slate-950 text-white rounded-xl mb-4" />
              {pinError && <p className="text-red-400 text-xs text-center mb-4">{pinError}</p>}
              <button onClick={handlePinSubmit} disabled={actionLoading} className="w-full bg-cyan-500 py-4 font-black uppercase rounded-xl disabled:opacity-50">
                {actionLoading ? 'Validando...' : 'Confirmar'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
