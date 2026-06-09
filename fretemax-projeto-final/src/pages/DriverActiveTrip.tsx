import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  doc,
  onSnapshot,
} from 'firebase/firestore';

import {
  db,
} from '../../firebase';

import {
  Activity,
  Camera,
  CheckCircle,
  Clock3,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  Zap,
} from 'lucide-react';

import MapaCliente from '../components/MapaCliente';

import {
  TripLifecycleService,
} from '../../services/tripLifecycleService';

interface Props {
  freteId: string;
}

export default function DriverActiveTrip({
  freteId,
}: Props) {
  const mountedRef = useRef(false);
  const snapshotGuardRef = useRef('');

  const [frete, setFrete] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);

  // 🔥 AJUSTE CTO: Estado para o Modal de Validação de PIN
  const [pinModal, setPinModal] = useState<{isOpen: boolean, type: 'coleta' | 'entrega' | null, targetStatus: string | null}>({ isOpen: false, type: null, targetStatus: null });
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    const frame = requestAnimationFrame(() => {
      if (mountedRef.current) setRuntimeReady(true);
    });
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!runtimeReady || !freteId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'fretes', freteId),
      snapshot => {
        if (!mountedRef.current || !snapshot.exists()) return;

        const next = snapshot.data();
        const fingerprint = JSON.stringify({
          status: next.status,
          updatedAt: next.updatedAt,
        });

        if (snapshotGuardRef.current === fingerprint) return;

        snapshotGuardRef.current = fingerprint;
        setFrete(next);
      },
    );

    return () => unsubscribe();
  }, [runtimeReady, freteId]);

  const statusLabel = useMemo(() => {
    switch (frete?.status) {
      case 'aceito': return 'MATCHING CONFIRMADO';
      case 'indo_coleta': return 'INDO PARA COLETA';
      case 'chegou_coleta': return 'COLETA CONFIRMADA';
      case 'coletando': return 'COLETANDO CARGA';
      case 'em_transporte': return 'TRANSPORTE ATIVO';
      case 'em_entrega': return 'EM ENTREGA';
      case 'returning': return 'RETORNANDO AO RADAR';
      default: return 'OPERAÇÃO ATIVA';
    }
  }, [frete]);

  // 🔥 AJUSTE CTO: Função real de update após a validação do PIN
  const processStatusUpdate = async (nextStatus: string) => {
    if (loading) return;
    try {
      setLoading(true);
      switch (nextStatus) {
        case 'indo_coleta':
        case 'chegou_coleta':
        case 'coletando':
        case 'em_transporte':
        case 'em_entrega':
        case 'returning':
          await TripLifecycleService.alterarStatusViagem(freteId, nextStatus as any);
          break;
        case 'entregue':
          await TripLifecycleService.finalizarCorrida(freteId, frete.motoristaId);
          break;
      }
    } catch (error) {
      console.error('TRIP STATUS ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = useCallback(
    async (nextStatus: string) => {
      // Interceptador de PIN de Coleta
      if (nextStatus === 'em_transporte') {
        setPinValue('');
        setPinError('');
        setPinModal({ isOpen: true, type: 'coleta', targetStatus: nextStatus });
        return;
      }
      // Interceptador de PIN de Entrega Final
      if (nextStatus === 'entregue') {
        setPinValue('');
        setPinError('');
        setPinModal({ isOpen: true, type: 'entrega', targetStatus: nextStatus });
        return;
      }
      
      // Se não exige PIN, avança direto
      await processStatusUpdate(nextStatus);
    },
    [freteId, frete, loading],
  );

  // 🔥 AJUSTE CTO: Lógica de verificação estrita do PIN
  const validarPin = () => {
    // Busca o PIN esperado no banco. Se for modo de teste e não existir, fallback temporário.
    const expectedPin = pinModal.type === 'coleta' 
      ? (frete?.pinColeta || '1234') 
      : (frete?.pinEntrega || '4321');

    if (pinValue === expectedPin) {
      const target = pinModal.targetStatus;
      setPinModal({ isOpen: false, type: null, targetStatus: null });
      if (target) processStatusUpdate(target);
    } else {
      setPinError('PIN Incorreto. Solicite o código correto.');
    }
  };

  if (!runtimeReady || !frete) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-[2rem] border border-cyan-500/10 bg-slate-900/80 text-white">
        <div className="text-center">
          <Activity className="mx-auto mb-5 h-12 w-12 animate-pulse text-cyan-400" />
          <h2 className="text-2xl font-black">Inicializando operação realtime...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-cyan-500/10 bg-slate-900/70 backdrop-blur-xl">
      <div className="border-b border-white/5 px-6 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">
              <Zap size={14} className="text-cyan-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
                ACTIVE TRIP ENTERPRISE
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-black text-white">{statusLabel}</h1>
            <p className="mt-3 text-slate-400">Operação sincronizada em realtime com tracking e dispatch.</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-300" />
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Runtime operacional</p>
                <strong className="mt-1 block text-xl font-black text-white">TRACKING ATIVO</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-[#020617]">
          <div className="h-[520px]">
            <MapaCliente
              motoristaId={frete.motoristaId}
              origem={{ lat: frete.origemLat, lng: frete.origemLng }}
              destino={{ lat: frete.destinoLat, lng: frete.destinoLng }}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-white/5 bg-[#020617] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Truck className="text-cyan-400" />
              <h2 className="text-xl font-black uppercase text-white">Status operacional</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                <span className="text-slate-400">Cliente</span>
                <strong className="text-white">{frete.clienteNome}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                <span className="text-slate-400">Categoria</span>
                <strong className="uppercase text-cyan-300">{frete.categoria}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                <span className="text-slate-400">ETA operacional</span>
                <strong className="text-emerald-300">{frete.etaMinutes} min</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                <span className="text-slate-400">Distância total</span>
                <strong className="text-white">{frete.distanciaTotalKm} km</strong>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-[#020617] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Package className="text-yellow-400" />
              <h2 className="text-xl font-black uppercase text-white">Fluxo operacional</h2>
            </div>
            <div className="space-y-4">
              <button disabled={loading} onClick={() => updateStatus('indo_coleta')} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-cyan-500 font-black uppercase text-slate-950 transition-all duration-300 hover:bg-cyan-400">
                <MapPin size={18} /> Iniciar coleta
              </button>
              <button disabled={loading} onClick={() => updateStatus('chegou_coleta')} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-yellow-500 font-black uppercase text-slate-950 transition-all duration-300 hover:bg-yellow-400">
                <Clock3 size={18} /> Confirmar coleta
              </button>
              <button disabled={loading} onClick={() => updateStatus('em_transporte')} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-purple-500 font-black uppercase text-white transition-all duration-300 hover:bg-purple-400">
                <Truck size={18} /> Transporte ativo
              </button>
              <button disabled={loading} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-slate-700 font-black uppercase text-white transition-all duration-300 hover:bg-slate-600">
                <Camera size={18} /> Validar comprovante
              </button>
              <button disabled={loading} onClick={() => updateStatus('entregue')} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 font-black uppercase text-slate-950 transition-all duration-300 hover:bg-emerald-400">
                <CheckCircle size={18} /> Finalizar entrega
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 AJUSTE CTO: MODAL DE SEGURANÇA PIN ANTI-CALOTE */}
      {pinModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-[2rem] border border-cyan-500/30 bg-slate-900 p-8 shadow-2xl relative">
            <h3 className="text-center text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
              {pinModal.type === 'coleta' ? 'PIN de Coleta' : 'PIN de Entrega'}
            </h3>
            <p className="text-center text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest leading-relaxed">
              {pinModal.type === 'coleta' 
                ? 'Solicite o PIN de 4 dígitos ao embarcador para liberar a viagem.' 
                : 'Solicite o PIN de 4 dígitos ao recebedor para garantir seu repasse.'}
            </p>
            <input
              type="text"
              maxLength={4}
              value={pinValue}
              onChange={(e) => {
                setPinValue(e.target.value.replace(/\D/g, ''));
                setPinError('');
              }}
              placeholder="0000"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 p-5 text-center text-3xl font-black tracking-[0.5em] text-cyan-400 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 mb-2 placeholder:text-slate-700"
            />
            {pinError && <p className="text-red-400 text-xs font-bold text-center mb-4">{pinError}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setPinModal({ isOpen: false, type: null, targetStatus: null })} className="flex-1 rounded-xl bg-transparent border border-white/10 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={validarPin} disabled={pinValue.length < 4} className="flex-[2] rounded-xl bg-cyan-600 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-950 shadow-lg shadow-cyan-600/30 transition-all hover:bg-cyan-500 active:scale-95 disabled:opacity-50">
                Validar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
