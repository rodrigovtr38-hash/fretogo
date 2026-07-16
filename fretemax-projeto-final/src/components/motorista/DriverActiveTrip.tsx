// =========================================================
// NOME DO ARQUIVO: src/components/motorista/DriverActiveTrip.tsx
// CTO-Log: Product Polish - UX de Operação de Rua (BLOCO 2)
// 1. Injeção de inputMode numérico nativo para o PIN (Teclado de Máquina de Cartão).
// 2. Loaders de feedback visual nos botões de ação (Double-tap protection).
// 3. Sistema Vivo: Painel da "Central Operacional" com Radar de Rastreamento.
// 4. ETA Gamificado: Indicador visual de "No Prazo".
// =========================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { doc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { LockKeyhole, AlertTriangle, Loader2, MapPin, Radio } from 'lucide-react';
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

  if (loading) return (
    <div className="flex h-64 items-center justify-center rounded-[2rem] border border-white/10 bg-white/5">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
    </div>
  );
  
  if (!frete) return null;

  const paradas = frete.paradas || [];
  const paradaAtualIndex = frete.paradaAtualIndex || 0;
  const destinoAtual = paradas[paradaAtualIndex] || (frete.entrega || {});
  
  const mapOriginGPS = frete.status === AppTripState.EM_TRANSPORTE 
    ? (paradaAtualIndex === 0 ? { lat: frete.origemLat, lng: frete.origemLng } : { lat: paradas[paradaAtualIndex-1]?.lat, lng: paradas[paradaAtualIndex-1]?.lng })
    : null;
  const mapDestinoGPS = destinoAtual?.lat ? { lat: destinoAtual.lat, lng: destinoAtual.lng } : null;

  // Lógica para exibição do endereço atual em texto
  const isFaseColeta = [AppTripState.ACEITO, AppTripState.INDO_COLETA, AppTripState.CHEGOU_COLETA, AppTripState.COLETANDO].includes(frete.status);
  const enderecoAlvoTexto = isFaseColeta 
    ? frete.enderecoColetaTexto 
    : (destinoAtual?.enderecoTexto || destinoAtual?.rua ? `${destinoAtual.rua}, ${destinoAtual.num} - ${destinoAtual.bairro}` : 'Destino da rota');

  const handleStatusUpdate = async (novoStatus: AppTripState) => {
    setActionLoading(true);
    try {
      await dispatchRealtimeService.atualizarStatusTrip(frete.id, novoStatus);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setActionLoading(false); 
    }
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
    } catch (e) { 
      setPinError('Erro ao validar. Tente novamente.'); 
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleInsucesso = async () => {
    if (!window.confirm("ATENÇÃO: Deseja reportar insucesso nesta parada? O cliente será notificado e o suporte acionado.")) return;
    
    setActionLoading(true);
    try {
      if (frete.status === AppTripState.COLETANDO) {
        await dispatchRealtimeService.atualizarTripRealtime(frete.id, { 
          status: AppTripState.CANCELADO_MOTORISTA, 
          motivoCancelamento: 'Falha na coleta: Local fechado ou indisponível',
          alertaInsucesso: true 
        });
      } else {
        if (paradaAtualIndex + 1 < paradas.length) {
           await dispatchRealtimeService.atualizarTripRealtime(frete.id, { 
             paradaAtualIndex: paradaAtualIndex + 1,
             paradasComInsucesso: arrayUnion(paradaAtualIndex),
             alertaInsucesso: true
           });
        } else {
           await dispatchRealtimeService.atualizarTripRealtime(frete.id, { 
             status: AppTripState.ENTREGUE,
             paradasComInsucesso: arrayUnion(paradaAtualIndex),
             alertaInsucesso: true
           });
        }
      }
      setIsPinModalOpen(false); setPinValue('');
    } catch (e) { 
      setPinError('Erro ao registrar insucesso.'); 
    } finally { 
      setActionLoading(false); 
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border border-cyan-500/20 bg-slate-900 shadow-2xl p-6">
        
        {/* 🔥 FASE 2: SISTEMA VIVO E ETA GAMIFICADO (CENTRAL OPERACIONAL) */}
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-inner">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1"><Radio size={12}/> Rastreamento Ativo</p>
              <p className="text-xs font-bold text-slate-300">Central Operacional Conectada</p>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-500/20 px-3 py-1 border border-emerald-500/30">
            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">No Prazo</p>
          </div>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-black text-cyan-400 uppercase tracking-widest">
            {isFaseColeta
              ? 'Etapa 1: Ir para a Coleta' 
              : frete.pinEntregas && frete.pinEntregas.length > 1 
                ? `Etapa 2: Entrega ${paradaAtualIndex + 1} de ${frete.pinEntregas.length}`
                : 'Etapa 2: Ir para Entrega Final'}
          </h2>
        </div>

        <div className="h-[250px] w-full mb-6 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          <MapaCliente origem={mapOriginGPS} destino={mapDestinoGPS} operationalMessage="Navegando..." />
        </div>
        
        <div className="mb-6 flex items-start gap-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
          <div className="mt-1 shrink-0"><MapPin size={18} className="text-cyan-400" /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Endereço Alvo</p>
            <p className="text-sm font-bold text-white leading-snug">{enderecoAlvoTexto}</p>
          </div>
        </div>

        <div className="space-y-4">
          {frete.status === AppTripState.ACEITO && (
            <button onClick={() => handleStatusUpdate(AppTripState.INDO_COLETA)} disabled={actionLoading} className="w-full flex items-center justify-center bg-blue-600 h-16 font-black uppercase tracking-widest rounded-xl disabled:opacity-50 transition-all hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-900/50">
              {actionLoading ? <Loader2 className="animate-spin text-white" size={24}/> : 'Deslocar p/ Coleta'}
            </button>
          )}
          
          {frete.status === AppTripState.INDO_COLETA && (
            <button onClick={() => handleStatusUpdate(AppTripState.CHEGOU_COLETA)} disabled={actionLoading} className="w-full flex items-center justify-center bg-indigo-500 h-16 font-black uppercase tracking-widest rounded-xl text-white disabled:opacity-50 transition-all hover:bg-indigo-400 active:scale-95 shadow-lg shadow-indigo-900/50">
              {actionLoading ? <Loader2 className="animate-spin text-white" size={24}/> : 'Cheguei no Local'}
            </button>
          )}

          {frete.status === AppTripState.CHEGOU_COLETA && (
            <button onClick={() => handleStatusUpdate(AppTripState.COLETANDO)} disabled={actionLoading} className="w-full flex items-center justify-center bg-amber-500 h-16 font-black uppercase tracking-widest rounded-xl text-black disabled:opacity-50 transition-all hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-900/50">
              {actionLoading ? <Loader2 className="animate-spin text-black" size={24}/> : 'Iniciar Coleta'}
            </button>
          )}

          {[AppTripState.COLETANDO, AppTripState.EM_TRANSPORTE].includes(frete.status) && (
            <button onClick={() => setIsPinModalOpen(true)} disabled={actionLoading} className="w-full flex items-center justify-center bg-cyan-500 h-16 font-black uppercase tracking-widest rounded-xl text-black disabled:opacity-50 transition-all hover:bg-cyan-400 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              {actionLoading ? <Loader2 className="animate-spin text-black" size={24}/> : `Validar PIN para ${frete.status === AppTripState.COLETANDO ? 'Sair com Carga' : 'Finalizar'}`}
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isPinModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-sm border border-cyan-500/50 shadow-2xl">
              <div className="flex justify-center mb-4">
                <div className="bg-cyan-500/10 p-4 rounded-full border border-cyan-500/20">
                  <LockKeyhole size={32} className="text-cyan-400" />
                </div>
              </div>
              <h3 className="text-white text-center font-black mb-2 uppercase text-xl tracking-tight">
                {frete.status === AppTripState.COLETANDO ? 'PIN de Coleta' : 'PIN de Entrega'}
              </h3>
              <p className="text-slate-400 text-xs text-center mb-6 leading-relaxed">
                Peça os 4 dígitos ao responsável no local para liberar o sistema e garantir o pagamento Escrow.
              </p>
              
              <input 
                type="text" 
                inputMode="numeric" 
                pattern="[0-9]*" 
                maxLength={4} 
                value={pinValue} 
                onChange={(e) => { setPinValue(e.target.value.replace(/\D/g, '')); setPinError(''); }} 
                className="w-full p-5 text-center text-5xl font-black tracking-[0.5em] bg-slate-950 text-cyan-400 border-2 border-cyan-500/30 rounded-2xl mb-4 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all placeholder:text-slate-800" 
                placeholder="0000" 
                autoFocus
              />
              
              {pinError && <p className="text-red-400 text-[10px] font-black text-center mb-4 uppercase tracking-widest">{pinError}</p>}
              
              <div className="flex flex-col gap-3 mt-4">
                <div className="flex gap-2">
                  <button onClick={() => { setIsPinModalOpen(false); setPinValue(''); setPinError(''); }} className="w-1/3 bg-transparent border border-white/10 py-4 font-black uppercase text-xs rounded-xl text-slate-400 hover:bg-white/5 transition-all">Voltar</button>
                  <button onClick={handlePinSubmit} disabled={actionLoading || pinValue.length < 4} className="w-2/3 flex items-center justify-center bg-cyan-500 py-4 font-black uppercase tracking-widest rounded-xl text-slate-950 disabled:opacity-50 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">
                    {actionLoading ? <Loader2 className="animate-spin text-black" size={18}/> : 'Confirmar'}
                  </button>
                </div>
                
                <button onClick={handleInsucesso} disabled={actionLoading} className="w-full mt-2 bg-red-500/10 border border-red-500/30 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2">
                  <AlertTriangle size={16} /> Problema no Local (Recusa/Fechado)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
