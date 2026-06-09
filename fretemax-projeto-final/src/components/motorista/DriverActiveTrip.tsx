import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { doc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { LockKeyhole, AlertTriangle } from 'lucide-react';
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
  const destinoAtual = paradas[paradaAtualIndex] || (frete.entrega || {});
  
  const mapOriginGPS = frete.status === AppTripState.EM_TRANSPORTE 
    ? (paradaAtualIndex === 0 ? { lat: frete.origemLat, lng: frete.origemLng } : { lat: paradas[paradaAtualIndex-1]?.lat, lng: paradas[paradaAtualIndex-1]?.lng })
    : null;
  const mapDestinoGPS = destinoAtual?.lat ? { lat: destinoAtual.lat, lng: destinoAtual.lng } : null;

  const handleStatusUpdate = async (novoStatus: AppTripState) => {
    setActionLoading(true);
    try {
      await dispatchRealtimeService.atualizarStatusTrip(frete.id, novoStatus);
    } catch (e) { console.error(e); } finally { setActionLoading(false); }
  };

  const handlePinSubmit = async () => {
    setActionLoading(true);
    setPinError('');
    try {
      if (frete.status === AppTripState.COLETANDO) {
        if (pinValue !== frete.pinColeta) { setPinError('PIN de Coleta incorreto.'); setActionLoading(false); return; }
        await dispatchRealtimeService.atualizarStatusTrip(frete.id, AppTripState.EM_TRANSPORTE);
      } else {
        const pinEntregas = frete.pinEntregas || [];
        if (pinValue !== pinEntregas[paradaAtualIndex]) { setPinError('PIN de entrega incorreto.'); setActionLoading(false); return; }
        
        if (paradaAtualIndex + 1 < paradas.length) {
           await dispatchRealtimeService.atualizarTripRealtime(frete.id, { paradaAtualIndex: paradaAtualIndex + 1 });
        } else {
           await dispatchRealtimeService.atualizarStatusTrip(frete.id, AppTripState.ENTREGUE);
        }
      }
      setIsPinModalOpen(false); setPinValue('');
    } catch (e) { setPinError('Erro ao validar.'); } finally { setActionLoading(false); }
  };

  // 🔥 CTO FIX: Rota de Fuga para Local Fechado / Recusa de Carga (O fim do Refém do PIN)
  const handleInsucesso = async () => {
    if (!window.confirm("ATENÇÃO: Deseja reportar insucesso nesta parada? O cliente será notificado.")) return;
    
    setActionLoading(true);
    try {
      if (frete.status === AppTripState.COLETANDO) {
        // Falha na coleta: Aborta a viagem inteira porque não tem o que entregar
        await dispatchRealtimeService.atualizarTripRealtime(frete.id, { 
          status: AppTripState.CANCELADO_MOTORISTA, 
          motivoCancelamento: 'Falha na coleta: Local fechado ou indisponível',
          alertaInsucesso: true 
        });
      } else {
        // Falha na entrega: Registra a falha, pula o PIN e avança para a próxima entrega
        if (paradaAtualIndex + 1 < paradas.length) {
           await dispatchRealtimeService.atualizarTripRealtime(frete.id, { 
             paradaAtualIndex: paradaAtualIndex + 1,
             paradasComInsucesso: arrayUnion(paradaAtualIndex),
             alertaInsucesso: true
           });
        } else {
           // Era a última parada e falhou
           await dispatchRealtimeService.atualizarTripRealtime(frete.id, { 
             status: AppTripState.ENTREGUE,
             paradasComInsucesso: arrayUnion(paradaAtualIndex),
             alertaInsucesso: true
           });
        }
      }
      setIsPinModalOpen(false); setPinValue('');
    } catch (e) { setPinError('Erro ao registrar insucesso.'); } finally { setActionLoading(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[2rem] border border-cyan-500/20 bg-slate-900 shadow-2xl p-6">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-black text-cyan-400 uppercase tracking-widest">
            {frete.status === AppTripState.ACEITO || frete.status === AppTripState.INDO_COLETA || frete.status === AppTripState.CHEGOU_COLETA || frete.status === AppTripState.COLETANDO 
              ? 'Etapa 1: Ir para a Coleta' 
              : frete.pinEntregas && frete.pinEntregas.length > 1 
                ? `Etapa 2: Entrega ${paradaAtualIndex + 1} de ${frete.pinEntregas.length}`
                : 'Etapa 2: Ir para Entrega Final'}
          </h2>
        </div>

        <div className="h-[250px] w-full mb-6 rounded-2xl overflow-hidden bg-slate-950">
          <MapaCliente origem={mapOriginGPS} destino={mapDestinoGPS} operationalMessage="Navegando..." />
        </div>
        
        <div className="space-y-4">
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
            <button onClick={() => setIsPinModalOpen(true)} disabled={actionLoading} className="w-full bg-cyan-500 py-4 font-black uppercase tracking-widest rounded-xl text-black disabled:opacity-50 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              Validar PIN para {frete.status === AppTripState.COLETANDO ? 'Sair com Carga' : 'Finalizar Entrega'}
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isPinModalOpen && (
          <motion.div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
            <motion.div className="bg-slate-900 p-8 rounded-3xl w-full max-w-sm border border-cyan-500">
              <div className="flex justify-center mb-4">
                <LockKeyhole size={40} className="text-cyan-400" />
              </div>
              <h3 className="text-white text-center font-black mb-2 uppercase">
                {frete.status === AppTripState.COLETANDO ? 'PIN de Coleta' : 'PIN de Entrega'}
              </h3>
              <p className="text-slate-400 text-xs text-center mb-6">Peça os 4 dígitos ao responsável no local para liberar o sistema.</p>
              
              <input type="text" maxLength={4} value={pinValue} onChange={(e) => { setPinValue(e.target.value.replace(/\D/g, '')); setPinError(''); }} className="w-full p-4 text-center text-4xl font-black tracking-[0.5em] bg-slate-950 text-cyan-400 border border-cyan-500/30 rounded-xl mb-4 focus:outline-none focus:border-cyan-400" placeholder="0000" />
              
              {pinError && <p className="text-red-400 text-xs font-bold text-center mb-4 uppercase">{pinError}</p>}
              
              <div className="flex flex-col gap-3 mt-4">
                <div className="flex gap-2">
                  <button onClick={() => { setIsPinModalOpen(false); setPinValue(''); setPinError(''); }} className="w-1/3 bg-transparent border border-white/10 py-4 font-black uppercase text-xs rounded-xl text-slate-400">Voltar</button>
                  <button onClick={handlePinSubmit} disabled={actionLoading || pinValue.length < 4} className="w-2/3 bg-cyan-500 py-4 font-black uppercase tracking-widest rounded-xl text-slate-950 disabled:opacity-50">Confirmar</button>
                </div>
                {/* 🔥 O BOTÃO DE SOS */}
                <button onClick={handleInsucesso} disabled={actionLoading} className="w-full bg-red-500/10 border border-red-500/30 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2">
                  <AlertTriangle size={14} /> Problema no Local (Recusa/Fechado)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
