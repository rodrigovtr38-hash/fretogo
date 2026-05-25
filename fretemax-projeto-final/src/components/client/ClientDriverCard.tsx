import {
  MessageCircle,
  XCircle,
} from 'lucide-react';

interface ClientDriverCardProps {
  motoristaZap?: string;
  motoristaNome?: string;
  isFinal: boolean;
  isCancelling: boolean;
  onWhatsAppClick: () => void;
  onCancelClick: () => void;
}

export default function ClientDriverCard({
  motoristaZap,
  motoristaNome,
  isFinal,
  isCancelling,
  onWhatsAppClick,
  onCancelClick,
}: ClientDriverCardProps) {
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
      <h2 className="mb-6 text-xl font-black text-white">
        Central do Motorista
      </h2>

      <div className="space-y-4">
        <button
          onClick={onWhatsAppClick}
          disabled={!motoristaZap}
          className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-500 text-white font-black uppercase tracking-wider hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MessageCircle size={18} />
          WhatsApp
        </button>

        {!isFinal && (
          <button
            onClick={onCancelClick}
            disabled={isCancelling}
            className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[1.5rem] border border-red-500/20 bg-red-500/10 text-red-400 font-black uppercase tracking-wider hover:bg-red-500/20"
          >
            <XCircle size={18} />
            Cancelar Operação
          </button>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/50 p-5">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
          Motorista Atual
        </p>

        <p className="mt-2 text-sm font-bold text-white">
          {motoristaNome || 'Aguardando conexão'}
        </p>
      </div>
    </div>
  );
}
