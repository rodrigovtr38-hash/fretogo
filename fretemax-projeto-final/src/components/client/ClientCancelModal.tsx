import {
  AlertTriangle,
  Loader2,
} from 'lucide-react';

type ClientCancelModalProps = {
  open: boolean;

  loading?: boolean;

  onClose: () => void;

  onConfirm: () => void;
};

export default function ClientCancelModal({
  open,
  loading = false,
  onClose,
  onConfirm,
}: ClientCancelModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-[92%] max-w-md rounded-3xl border border-red-500/20 bg-zinc-950 p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle className="h-10 w-10" />
          </div>
        </div>

        <h2 className="mb-4 text-center text-2xl font-black uppercase tracking-widest text-white">
          Cancelar corrida?
        </h2>

        <p className="mb-8 text-center text-sm leading-relaxed text-zinc-400">
          Essa ação irá remover a corrida da fila de motoristas
          e cancelar todo o processo atual.
        </p>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="
              flex-1
              rounded-2xl
              border
              border-zinc-700
              bg-zinc-900
              px-5
              py-4
              text-sm
              font-black
              uppercase
              tracking-wider
              text-zinc-300
              transition-all
              hover:bg-zinc-800
              disabled:opacity-50
            "
          >
            Voltar
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="
              flex-1
              rounded-2xl
              bg-red-600
              px-5
              py-4
              text-sm
              font-black
              uppercase
              tracking-wider
              text-white
              transition-all
              hover:bg-red-500
              disabled:opacity-50
            "
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelando
              </span>
            ) : (
              'Confirmar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
