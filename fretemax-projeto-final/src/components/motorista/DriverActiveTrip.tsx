// src/components/motorista/DriverActiveTrip.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
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
  const isMultiDrop = paradas.length > 1;

  // Lógica de GPS para o mapa
  const mapOriginGPS = frete.status === 'em_transporte' 
    ? (paradaAtualIndex === 0 ? { lat: frete.origemLat, lng: frete.origemLng } : { lat: paradas[paradaAtualIndex-1].lat, lng: paradas[paradaAtualIndex-1].lng })
    : null;
  const mapDestinoGPS = destinoAtual?.lat ? { lat: destinoAtual.lat, lng: destinoAtual.lng } : null;

  const handleStatusUpdate = async (novoStatus: string) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'fretes', frete.id), { status: novoStatus, updatedAt: serverTimestamp() });
    } catch (e) { console.error(e); } finally { setActionLoading(false); }
  };

  const handlePinSubmit = async () => {
    setActionLoading(true);
    try {
      const docRef = doc(db, 'fretes', frete.id);
      if (frete.status === 'coletando') {
        if (pinValue !== frete.pinColeta) { setPinError('PIN de Coleta incorreto.'); setActionLoading(false); return; }
        await updateDoc(docRef, { status: 'em_transporte', paradaAtualIndex: 0, updatedAt: serverTimestamp() });
      } else {
        const pinEntregas = frete.pinEntregas || [];
        if (pinValue !== pinEntregas[paradaAtualIndex]) { setPinError('PIN de entrega incorreto.'); setActionLoading(false); return; }
        
        if (paradaAtualIndex + 1 < paradas.length) {
          await updateDoc(docRef, { paradaAtualIndex: paradaAtualIndex + 1, updatedAt: serverTimestamp() });
        } else {
          await updateDoc(docRef, { status: 'entregue', updatedAt: serverTimestamp() });
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
          {frete.status === 'aceito' && <button onClick={() => handleStatusUpdate('indo_coleta')} className="w-full bg-blue-600 py-4 font-black uppercase tracking-widest rounded-xl">Deslocar p/ Coleta</button>}
          {frete.status === 'indo_coleta' && <button onClick={() => handleStatusUpdate('coletando')} className="w-full bg-amber-500 py-4 font-black uppercase tracking-widest rounded-xl text-black">Cheguei (Coletar)</button>}
          {['coletando', 'em_transporte'].includes(frete.status) && <button onClick={() => setIsPinModalOpen(true)} className="w-full bg-cyan-500 py-4 font-black uppercase tracking-widest rounded-xl text-black">Validar PIN</button>}
        </div>
      </motion.div>

      <AnimatePresence>
        {isPinModalOpen && (
          <motion.div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
            <motion.div className="bg-slate-900 p-8 rounded-3xl w-full max-w-sm border border-cyan-500">
              <h3 className="text-white text-center font-black mb-6 uppercase">Digite o PIN</h3>
              <input type="text" maxLength={4} value={pinValue} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))} className="w-full p-4 text-center text-4xl bg-slate-950 text-white rounded-xl mb-4" />
              {pinError && <p className="text-red-400 text-xs text-center mb-4">{pinError}</p>}
              <button onClick={handlePinSubmit} className="w-full bg-cyan-500 py-4 font-black uppercase rounded-xl">Confirmar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
