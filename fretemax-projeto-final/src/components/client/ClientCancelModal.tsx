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
  
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-red-500/20 bg-slate-950 p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <AlertTriangle className="text-red-400" size={24} />
          <h2 className="text-xl font-black text-white">Cancelar operação?</h2>
        </div>

        <p className="mb-8 text-sm leading-relaxed text-slate-400">
          Essa ação encerra completamente o frete atual e remove o motorista da operação.
        </p>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="flex-1 rounded-2xl border border-white/10 bg-slate-900 py-4 text-sm font-black uppercase tracking-wider text-slate-300 transition-all duration-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isCancelling}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-4 text-sm font-black uppercase tracking-wider text-white transition-all duration-300 hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCancelling ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Cancelando...
              </>
            ) : (
              'Cancelar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
