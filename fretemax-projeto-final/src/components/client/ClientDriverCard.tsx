// =========================================================
// NOME DO ARQUIVO: src/components/client/ClientDriverCard.tsx
// CTO-Log: Implementação de Prova Social (Badge Verificado) e UX de Autoridade.
// =========================================================

import { MessageCircle, XCircle, ShieldCheck, Truck } from 'lucide-react';

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
    <div className="rounded-[2.5rem] border border-cyan-500/20 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Detalhe visual premium */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

      <div className="mb-6 flex items-center gap-4 relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-cyan-500/10 border border-cyan-500/30 shrink-0">
          <Truck className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
            Painel de Controle
          </p>
          <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Comando Logístico
          </h2>
        </div>
      </div>

      <div className="space-y-4 relative">
        <button
          type="button"
          onClick={() => {
            if (motoristaZap && onWhatsAppClick) onWhatsAppClick();
          }}
          disabled={!motoristaZap}
          className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-500 text-slate-950 font-black uppercase tracking-wider transition-all duration-300 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed shadow-[0_10px_20px_rgba(16,185,129,0.15)]"
        >
          <MessageCircle size={20} />
          {motoristaZap ? 'Acionar Motorista' : 'Aguardando Conexão...'}
        </button>

        {!isFinal && (
          <button
            type="button"
            onClick={() => {
              if (onCancelClick) onCancelClick();
            }}
            disabled={isCancelling}
            className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[1.5rem] border border-red-500/20 bg-red-500/5 text-red-400 font-black uppercase tracking-wider transition-all duration-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <XCircle size={18} />
            {isCancelling ? 'Processando...' : 'Abortar Operação'}
          </button>
        )}
      </div>

      {/* BOX DO MOTORISTA COM PROVA SOCIAL */}
      <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/60 p-5 relative overflow-hidden">
        {hasDriver && (
          <div className="absolute top-0 right-0 bg-emerald-500/10 border-b border-l border-emerald-500/20 px-3 py-1.5 rounded-bl-xl flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Perfil Validado</span>
          </div>
        )}
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
          Profissional em Rota
        </p>
        <p className="text-base font-bold text-white flex items-center gap-2">
          {hasDriver ? motoristaNome : <span className="text-slate-400 italic">Radar escaneando a malha...</span>}
        </p>
      </div>
    </div>
  );
}
