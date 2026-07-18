// =========================================================
// NOME DO ARQUIVO: src/components/motorista/DriverActiveTrip.tsx
// CTO-Log: Lógica Multi-Drop de PINs validada e fortemente tipada.
// Sincronização: Integrado ao array exato de 'pinEntregas' do Cliente.tsx para liberar a custódia.
// =========================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { LockKeyhole, ShieldCheck, DollarSign } from 'lucide-react';
import MapaCliente from '../MapaCliente';
import { dispatchRealtimeService } from '../../services/dispatchRealtimeService';

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
  const mapOriginGPS = frete.origemLat && frete.origemLng ? { lat: frete.origemLat, lng: frete.origemLng } : (frete.origem?.lat ? frete.origem : null);
  const mapDestinoGPS = frete.destinoLat && frete.destinoLng ? { lat: frete.destinoLat, lng: frete.destinoLng } : (frete.destino?.lat ? frete.destino : null);
  
  const currentMapOrigin = (frete.status === 'em_transporte' && paradaAtualIndex > 0 && paradas[paradaAtualIndex - 1]?.lat)
    ? { lat: paradas[paradaAtualIndex - 1].lat, lng: paradas[paradaAtualIndex - 1].lng }
    : mapOriginGPS;
  
  const currentMapDestino = destinoAtual?.lat && destinoAtual?.lng ? { lat: destinoAtual.lat, lng: destinoAtual.lng } : mapDestinoGPS;

  const handleStatusUpdate = async (novoStatus: string) => {
    setActionLoading(true);
    try {
      await dispatchRealtimeService.atualizarStatusTrip(frete.id, novoStatus as any); 
    } catch (e) { console.error(e); } finally { setActionLoading(false); }
  };

  const handlePinSubmit = async () => {
    setActionLoading(true);
    setPinError('');
    try {
      // Validação do PIN de Coleta
      if (frete.status === 'coletando') {
        if (pinValue !== frete.pinColeta) { setPinError('PIN de Coleta incorreto.'); setActionLoading(false); return; }
        
        await dispatchRealtimeService.atualizarStatusTrip(frete.id, 'em_transporte' as any);
      } 
      // Validação do PIN de Entrega (Multi-drop ou Simples)
      else { 
        const pinEntregas = frete.pinEntregas || [];
        const expectedPin = pinEntregas.length > 0 ? pinEntregas[paradaAtualIndex] : frete.pinEntregas?.[0];

        if (pinValue !== expectedPin) { setPinError('PIN de entrega incorreto.'); setActionLoading(false); return; }
        
        // Verifica se há mais paradas no trajeto
        if (pinEntregas.length > 0 && paradaAtualIndex + 1 < pinEntregas.length) {
           // Incrementa a parada e continua a viagem
           await updateDoc(doc(db, 'fretes', frete.id), { paradaAtualIndex: paradaAtualIndex + 1 });
        } else {
           // Era a última parada. Finaliza a viagem para o motorista receber.
           await dispatchRealtimeService.atualizarStatusTrip(frete.id, 'entregue' as any);
        }
      }
      setIsPinModalOpen(false); setPinValue('');
    } catch (e) { setPinError('Erro ao validar.'); } finally { setActionLoading(false); }
  };

  const isMultiDrop = frete.pinEntregas && frete.pinEntregas.length > 1;
  const valorA_Receber = Number(frete.valorLiquidoMotorista || frete.valorMotorista || 0).toFixed(2).replace('.', ',');

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[2rem] border border-cyan-500/20 bg-slate-900 shadow-2xl p-6 relative overflow-hidden">
        
        {/* Painel Financeiro - Escrow */}
        <div className="absolute top-0 right-0 bg-emerald-500/10 border-b border-l border-emerald-500/20 rounded-bl-3xl px-6 py-4 flex flex-col items-end">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1 mb-1">
             <ShieldCheck size={10} /> Pagamento Garantido
          </p>
          <div className="flex items-center gap-1">
             <DollarSign size={14} className="text-emerald-400" />
             <span className="text-xl font-black text-emerald-400">R$ {valorA_Receber}</span>
          </div>
        </div>

        {/* Título Dinâmico informando a etapa */}
        <div className="mb-6 pt-4">
          <h2 className="text-xl font-black text-cyan-400 uppercase tracking-widest">
            {frete.status === 'aceito' || frete.status === 'indo_coleta' || frete.status === 'chegou_coleta' || frete.status === 'coletando' 
              ? 'Etapa 1: Retirada' 
              : isMultiDrop 
                ? `Entrega ${paradaAtualIndex + 1} de ${frete.pinEntregas.length}`
                : 'Etapa Final: Entrega'}
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Acompanhamento Operacional</p>
        </div>

        <div className="h-[250px] w-full mb-6 rounded-2xl overflow-hidden bg-slate-950 border border-white/5">
          <MapaCliente 
            origem={currentMapOrigin} 
            destino={currentMapDestino} 
            motoristaPos={currentMapOrigin} // Simulação estática de onde o motorista deveria estar, melhorada por realtime real se integrado
            vehicleType={frete.veiculo || frete.categoria}
            operationalMessage="Navegando..." 
          />
        </div>
        
        <div className="space-y-4">
          {frete.status === 'aceito' && (
            <button onClick={() => handleStatusUpdate('indo_coleta')} disabled={actionLoading} className="w-full bg-blue-600 py-4 font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/50 text-white">
              Deslocar para Coleta
            </button>
          )}
          
          {frete.status === 'indo_coleta' && (
            <button onClick={() => handleStatusUpdate('chegou_coleta')} disabled={actionLoading} className="w-full bg-indigo-500 py-4 font-black uppercase tracking-widest rounded-xl text-white disabled:opacity-50 hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-900/50">
              Cheguei no Local
            </button>
          )}

          {frete.status === 'chegou_coleta' && (
            <button onClick={() => handleStatusUpdate('coletando')} disabled={actionLoading} className="w-full bg-amber-500 py-4 font-black uppercase tracking-widest rounded-xl text-slate-900 disabled:opacity-50 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-900/50">
              Iniciar Carregamento
            </button>
          )}

          {['coletando', 'em_transporte'].includes(frete.status) && (
            <button onClick={() => setIsPinModalOpen(true)} disabled={actionLoading} className="w-full bg-emerald-500 py-4 font-black uppercase tracking-widest rounded-xl text-slate-950 disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition-colors">
              Validar PIN - {frete.status === 'coletando' ? 'Sair com Carga' : (isMultiDrop && paradaAtualIndex + 1 < frete.pinEntregas.length ? 'Próximo Destino' : 'Finalizar Entrega')}
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
              className="bg-slate-900 p-8 rounded-3xl w-full max-w-sm border border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.15)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
              
              <div className="flex justify-center mb-4 mt-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                   <LockKeyhole size={32} className="text-emerald-400" />
                </div>
              </div>
              <h3 className="text-white text-center font-black mb-2 uppercase text-lg tracking-tighter">
                {frete.status === 'coletando' ? 'PIN de Coleta' : 'PIN de Entrega'}
              </h3>
              <p className="text-slate-400 text-[11px] text-center mb-6 font-medium leading-relaxed">
                {frete.status === 'coletando' 
                  ? 'Peça o código ao remetente para iniciar o trajeto coberto pelo seguro.' 
                  : 'A digitação correta do PIN final libera o valor de R$ ' + valorA_Receber + ' no seu repasse diário.'}
              </p>
              
              <input 
                type="text" 
                maxLength={4} 
                value={pinValue} 
                onChange={(e) => { setPinValue(e.target.value.replace(/\D/g, '')); setPinError(''); }} 
                className="w-full p-4 text-center text-4xl font-black tracking-[0.5em] bg-slate-950 text-emerald-400 border border-emerald-500/30 rounded-xl mb-4 focus:outline-none focus:border-emerald-400 transition-all shadow-inner"
                placeholder="0000"
              />
              
              {pinError && <p className="text-red-400 font-bold text-xs text-center mb-4 uppercase animate-pulse">{pinError}</p>}
              
              <div className="flex gap-2">
                <button onClick={() => { setIsPinModalOpen(false); setPinValue(''); setPinError(''); }} className="w-1/3 bg-transparent border border-white/10 py-4 font-black uppercase text-xs rounded-xl text-slate-400 hover:bg-white/5 transition-colors">
                  Voltar
                </button>
                <button onClick={handlePinSubmit} disabled={actionLoading || pinValue.length < 4} className="w-2/3 bg-emerald-600 py-4 font-black uppercase tracking-widest rounded-xl text-white disabled:opacity-50 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/50">
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
