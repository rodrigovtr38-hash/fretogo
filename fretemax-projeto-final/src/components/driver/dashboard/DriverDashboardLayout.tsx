// =========================================================
// NOME DO ARQUIVO: src/components/motorista/DriverDashboardLayout.tsx
// CTO-Log: Container Mestre unificado.
// Status: Auditoria completa. Sem erros de importação.
// =========================================================

import { useCallback, useState } from 'react';
import { MessageCircle, ShieldAlert } from 'lucide-react';
import FreightRequestModal from './FreightRequestModal';
import DriverStats from './DriverStats';

export type DriverCategory = 'moto' | 'carro' | 'utilitario' | 'toco' | 'truck' | 'carreta' | 'bitrem';

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
  selectedFreight,
  onCloseFreight,
  onAcceptFreight,
  onRejectFreight,
  driver,
}: DriverDashboardLayoutProps) {
  
  const [processingAction, setProcessingAction] = useState(false);

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
    window.open('https://wa.me/5511946099840?text=Olá,%20preciso%20de%20suporte%20operacional%20no%20app%20Fretogo.', '_blank');
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 space-y-10">
      <DriverStats driver={driver} />

      <div className="flex flex-col md:flex-row items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 gap-6 shadow-lg">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="h-14 w-14 rounded-2xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] shrink-0 border border-[#25D366]/20">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h4 className="text-base font-black text-white uppercase tracking-widest">Base de Apoio Logístico</h4>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Problemas na coleta ou entrega? Nossa equipe resolve gargalos em tempo real.
            </p>
          </div>
        </div>
        <button 
          onClick={openWhatsAppSupport}
          className="w-full md:w-auto px-8 py-4 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#25D366] hover:text-slate-950 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,211,102,0.15)]"
        >
          <MessageCircle size={18} />
          Acionar Suporte
        </button>
      </div>

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
