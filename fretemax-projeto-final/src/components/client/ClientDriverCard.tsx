import {
  MessageCircle,
  XCircle,
  Truck,
} from 'lucide-react';

interface ClientDriverCardProps {
  motoristaZap?: string | null;
  motoristaNome?: string | null;
  isFinal?: boolean;
  isCancelling?: boolean;
  onWhatsAppClick?: () => void;
  onCancelClick?: () => void;
}

export default function ClientDriverCard({
  motoristaZap,
  motoristaNome,
  isFinal = false,
  isCancelling = false,
  onWhatsAppClick,
  onCancelClick,
}: ClientDriverCardProps) {
  const hasDriver = Boolean(motoristaNome);

  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
          <Truck className="h-6 w-6 text-cyan-400" />
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cyan-400">
            Operação Ativa
          </p>

          <h2 className="text-xl font-black text-white">
            Central do Motorista
          </h2>
        </div>
      </div>

      <div className="space-y-4">

        <button
          type="button"
          onClick={() => {
            if (motoristaZap && onWhatsAppClick) {
              onWhatsAppClick();
            }
          }}
          disabled={!motoristaZap}
          className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-500 text-white font-black uppercase tracking-wider transition-all duration-300 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MessageCircle size={18} />

          {motoristaZap
            ? 'Falar no WhatsApp'
            : 'Motorista não conectado'}
        </button>

        {!isFinal && (
          <button
            type="button"
            onClick={() => {
              if (onCancelClick) {
                onCancelClick();
              }
            }}
            disabled={isCancelling}
            className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[1.5rem] border border-red-500/20 bg-red-500/10 text-red-400 font-black uppercase tracking-wider transition-all duration-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <XCircle size={18} />

            {isCancelling
              ? 'Cancelando...'
              : 'Cancelar Operação'}
          </button>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/50 p-5">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
          Motorista Atual
        </p>

        <p className="mt-2 text-sm font-bold text-white">
          {hasDriver
            ? motoristaNome
            : 'Aguardando conexão'}
        </p>
      </div>
    </div>
  );
}
