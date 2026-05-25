import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

type ToastType =
  | 'success'
  | 'error'
  | 'warning';

type ClientToastProps = {
  toast: {
    msg: string;
    type: ToastType;
  } | null;
};

export default function ClientToast({
  toast,
}: ClientToastProps) {
  if (!toast) {
    return null;
  }

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          container:
            'border-green-500/30 bg-green-950/80 text-green-300',
          icon: (
            <CheckCircle
              className="h-5 w-5"
            />
          ),
        };

      case 'warning':
        return {
          container:
            'border-yellow-500/30 bg-yellow-950/80 text-yellow-300',
          icon: (
            <AlertTriangle
              className="h-5 w-5"
            />
          ),
        };

      default:
        return {
          container:
            'border-red-500/30 bg-red-950/80 text-red-300',
          icon: (
            <AlertCircle
              className="h-5 w-5"
            />
          ),
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed bottom-8 left-1/2 z-[120] -translate-x-1/2 animate-in slide-in-from-bottom-5">
      <div
        className={`
          flex items-center gap-3
          rounded-2xl
          border
          px-8
          py-5
          text-sm
          font-black
          uppercase
          tracking-widest
          shadow-2xl
          backdrop-blur-xl
          ${styles.container}
        `}
      >
        {styles.icon}

        <span>
          {toast.msg}
        </span>
      </div>
    </div>
  );
}
