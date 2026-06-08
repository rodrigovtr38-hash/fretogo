import { useCallback, useMemo, useState } from 'react';
import { DollarSign, Truck, Star, Award, MessageCircle } from 'lucide-react';
import AvailableFreights from './AvailableFreights';
import FreightRequestModal from './FreightRequestModal';

export type DriverCategory =
  | 'moto'
  | 'carro'
  | 'utilitario'
  | 'toco'
  | 'truck'
  | 'carreta'
  | 'bitrem';

export interface OperationalFreight {
  id: string;
  status?: string;
  prioridade?: boolean;
  agendado?: boolean;
  categoria?: DriverCategory;
  enderecoColetaTexto?: string;
  enderecoEntregaTexto?: string;
  distanciaColetaKm?: number;
  distanciaEntregaKm?: number;
  distanciaTotalKm?: number;
  valorCliente?: number;
  valorMotorista?: number;
  pesoKg?: number;
  volumes?: number;
  tipoCarga?: string;
  etaMinutes?: number;
  motoristaId?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  multiplasEntregas?: boolean;
}

interface DriverDashboardLayoutProps {
  freights: OperationalFreight[];
  selectedFreight?: OperationalFreight | null;
  activeFreight?: OperationalFreight | null;
  isOnline: boolean;
  loading?: boolean;
  driverCategory?: string;
  onToggleOnline: (nextState: boolean) => void;
  onSelectFreight: (freight: OperationalFreight) => void;
  onCloseFreight: () => void;
  onAcceptFreight: (freight: OperationalFreight) => Promise<void> | void;
  onRejectFreight: (freight: OperationalFreight) => Promise<void> | void;
  driver?: any;
}

export default function DriverDashboardLayout({
  freights,
  selectedFreight,
  activeFreight,
  isOnline,
  loading = false,
  driverCategory,
  onToggleOnline,
  onSelectFreight,
  onCloseFreight,
  onAcceptFreight,
  onRejectFreight,
  driver,
}: DriverDashboardLayoutProps) {
  
  const [processingAction, setProcessingAction] = useState(false);
  const isPremium = (driver?.score && Number(driver?.score) >= 4.8) || driver?.categoria?.includes('carreta');

  const handleAccept = useCallback(async () => {
    if (!selectedFreight || processingAction) return;
    try {
      setProcessingAction(true);
      await onAcceptFreight(selectedFreight);
    } finally {
      setProcessingAction(false);
    }
  }, [selectedFreight, processingAction, onAcceptFreight]);

  const handleReject = useCallback(async () => {
    if (!selectedFreight || processingAction) return;
    try {
      setProcessingAction(true);
      await onRejectFreight(selectedFreight);
    } finally {
      setProcessingAction(false);
    }
  }, [selectedFreight, processingAction, onRejectFreight]);

  const openWhatsAppSupport = () => {
    window.open('https://wa.me/5511946099840', '_blank');
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      
      {/* STATUS GRID OPERACIONAL (UBER STYLE) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-10">
        <div className="rounded-3xl border border-emerald-500/10 bg-slate-900/50 p-5 flex flex-col justify-between group hover:border-emerald-500/30 transition-colors">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
            <DollarSign size={12} /> Ganhos Hoje
          </p>
          <h3 className="mt-3 text-2xl font-black text-white tracking-tighter">R$ 0,00</h3>
        </div>

        <div className="rounded-3xl border border-blue-500/10 bg-slate-900/50 p-5 flex flex-col justify-between group hover:border-blue-500/30 transition-colors">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
            <Truck size={12} /> Entregas
          </p>
          <h3 className="mt-3 text-2xl font-black text-white tracking-tighter">0</h3>
        </div>

        <div className="rounded-3xl border border-amber-500/10 bg-slate-900/50 p-5 flex flex-col justify-between group hover:border-amber-500/30 transition-colors">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
            <Star size={12} /> Nota
          </p>
          <h3 className="mt-3 text-2xl font-black text-white tracking-tighter">
            {driver?.score ? Number(driver.score).toFixed(1) : '5.0'}
          </h3>
        </div>

        <div className="rounded-3xl border border-purple-500/10 bg-slate-900/50 p-5 flex flex-col justify-between group hover:border-purple-500/30 transition-colors">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
            <Award size={12} /> Nível
          </p>
          <h3 className="mt-3 text-xl font-black text-white tracking-tighter uppercase italic">
            {isPremium ? 'ELITE' : 'PIONEIRO'}
          </h3>
        </div>
      </div>

      {/* RADAR DE OFERTAS */}
      <AvailableFreights
        freights={freights}
        isOnline={isOnline}
        loading={loading}
        onSelectFreight={onSelectFreight}
      />

      {/* SUPORTE RÁPIDO */}
      <div className="mt-12 flex flex-col md:flex-row items-center justify-between rounded-3xl border border-white/5 bg-slate-900/30 p-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
            <MessageCircle size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Suporte Direto</h4>
            <p className="text-xs text-slate-500 mt-0.5">Dúvidas na operação? Nossa equipe ajuda você.</p>
          </div>
        </div>
        <button 
          onClick={openWhatsAppSupport}
          className="w-full md:w-auto px-6 py-3 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#25D366] hover:text-black transition-all active:scale-95"
        >
          Chamar no WhatsApp
        </button>
      </div>

      {/* MODAL DE DETALHES DA OFERTA */}
      <FreightRequestModal
        freight={selectedFreight}
        visible={Boolean(selectedFreight)}
        processing={processingAction}
        onClose={onCloseFreight}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </div>
  );
}
