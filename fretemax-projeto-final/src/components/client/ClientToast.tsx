import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ClientToastProps {
  toast: {
    msg: string;
    type: 'error' | 'success' | 'warning';
  } | null;
}

export default function ClientToast({
  toast,
}: ClientToastProps) {
  if (!toast) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-top-5 fade-in duration-300">
      <div
        className={`flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl ${
          toast.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            : toast.type === 'warning'
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
            : 'border-red-500/20 bg-red-500/10 text-red-300'
        }`}
      >
        {toast.type === 'success' ? (
          <CheckCircle size={18} />
        ) : toast.type === 'warning' ? (
          <AlertTriangle size={18} />
        ) : (
          <XCircle size={18} />
        )}

        <span className="text-sm font-bold">
          {toast.msg}
        </span>
      </div>
    </div>
  );
}
