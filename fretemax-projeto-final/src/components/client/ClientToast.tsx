import {
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export interface ClientToastData {
  msg: string;
  type?: 'error' | 'success' | 'warning';
}

interface ClientToastProps {
  toast?: ClientToastData | null;
}

export default function ClientToast({
  toast,
}: ClientToastProps) {

  if (!toast?.msg) {
    return null;
  }

  const type =
    toast.type || 'error';

  const styles = {
    success:
      'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',

    warning:
      'border-amber-500/20 bg-amber-500/10 text-amber-300',

    error:
      'border-red-500/20 bg-red-500/10 text-red-300',
  };

  return (
    <div className="fixed right-6 top-6 z-[9999] animate-in slide-in-from-top-5 fade-in duration-300">

      <div
        className={`
          flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl
          ${styles[type]}
        `}
      >

        {type === 'success' ? (
          <CheckCircle size={18} />
        ) : type === 'warning' ? (
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
