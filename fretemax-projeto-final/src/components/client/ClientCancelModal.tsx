// =========================================================
// NOME DO ARQUIVO: src/components/client/ClientCancelModal.tsx
// CTO-Log: Injeção de Fricção (Sunk Cost) para reduzir Churn de Cargas.
// =========================================================

import { AlertTriangle, Loader2 } from 'lucide-react';

interface ClientCancelModalProps {
  open?: boolean;
  isCancelling?: boolean;
  onConfirm?: () => void;
  onClose?: () => void;
}

export default function ClientCancelModal({
  open = false,
  isCancelling = false,
  onConfirm,
  onClose,
}: ClientCancelModalProps) {
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-[2rem] border border-red-500/30 bg-slate-900 p-8 shadow-[0_0_60px_rgba(239,68,68,0.15)] animate-in zoom-in-95 duration-300">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
             <AlertTriangle className="text-red-400" size={28} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Abortar Operação?</h2>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-slate-300">
          Essa ação encerra completamente o frete atual e desconecta o motorista da sua carga.
        </p>

        {/* GATILHO DE RETENÇÃO: Fricção Psicológica */}
        <div className="mb-8 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 relative overflow-hidden">
           <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
           <p className="text-xs font-bold text-amber-400 ml-2">
             ⚠️ Atenção: Ao cancelar, sua carga perde a prioridade no radar. Uma nova tentativa de postagem poderá sofrer reajustes de tarifa conforme a demanda da região.
           </p>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950 py-4 text-sm font-black uppercase tracking-wider text-slate-300 transition-all duration-300 hover:bg-slate-800 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Manter Frete
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isCancelling}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-4 text-sm font-black uppercase tracking-wider text-white transition-all duration-300 hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40 shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
          >
            {isCancelling ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Cancelando...
              </>
            ) : (
              'Sim, Cancelar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
