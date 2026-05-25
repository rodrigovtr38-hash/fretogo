import { AlertTriangle, Loader2 } from 'lucide-react';

interface ClientCancelModalProps {
  show: boolean;
  isCancelling: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ClientCancelModal({
  show,
  isCancelling,
  onConfirm,
  onClose,
}: ClientCancelModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-red-500/20 bg-slate-950 p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <AlertTriangle className="text-red-400" size={24} />
          <h2 className="text-xl font-black text-white">
            Cancelar operação?
          </h2>
        </div>

        <p className="mb-8 text-sm leading-relaxed text-slate-400">
          Essa ação encerra completamente o frete atual
          e remove o motorista da operação.
        </p>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="flex-1 rounded-2xl border border-white/10 bg-slate-900 py-4 text-sm font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800"
          >
            Voltar
          </button>

          <button
            onClick={onConfirm}
            disabled={isCancelling}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-4 text-sm font-black uppercase tracking-wider text-white hover:bg-red-400"
          >
            {isCancelling ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              'Cancelar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
