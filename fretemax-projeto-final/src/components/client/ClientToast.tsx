// =========================================================
// NOME DO ARQUIVO: src/components/client/ClientToast.tsx
// CTO-Log: Formatação limpa e tipagem estrita respeitada.
// =========================================================

import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

export interface ClientToastData {
  msg: string;
  type?: 'error' | 'success' | 'warning' | 'info';
}

interface ClientToastProps {
  toast?: ClientToastData | null;
}

export default function ClientToast({ toast }: ClientToastProps) {
  if (!toast || !toast.msg) return null;

  const type = toast.type || 'error';

  const styles = {
    success: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-400 shadow-[0_10px_30px_rgba(16,185,129,0.2)]',
    warning: 'border-amber-500/30 bg-amber-950/80 text-amber-400 shadow-[0_10px_30px_rgba(245,158,11,0.2)]',
    error: 'border-red-500/30 bg-red-950/80 text-red-400 shadow-[0_10px_30px_rgba(239,68,68,0.2)]',
    info: 'border-cyan-500/30 bg-cyan-950/80 text-cyan-400 shadow-[0_10px_30px_rgba(6,182,212,0.2)]',
  };

  const IconMap = {
    success: <CheckCircle size={20} className="shrink-0" />,
    warning: <AlertTriangle size={20} className="shrink-0" />,
    error: <XCircle size={20} className="shrink-0" />,
    info: <Info size={20} className="shrink-0" />
  };

  return (
    <div className="fixed right-4 top-4 md:right-8 md:top-8 z-[9999] animate-in slide-in-from-top-8 fade-in duration-400">
      <div className={`flex items-center gap-3.5 rounded-2xl border px-5 py-4 backdrop-blur-xl ${styles[type]}`}>
        {IconMap[type]}
        <span className="text-sm font-bold tracking-wide">
          {toast.msg}
        </span>
      </div>
    </div>
  );
}
