import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Wifi,
  WifiOff,
  Activity,
  ShieldCheck,
} from 'lucide-react';

import DriverDashboardLayout, {
  OperationalFreight,
} from './driver/dashboard/DriverDashboardLayout';

interface DriverAppProps {
  freights?: OperationalFreight[];

  activeFreight?: OperationalFreight | null;

  selectedFreight?: OperationalFreight | null;

  isOnline?: boolean;

  loading?: boolean;

  driverCategory?: string;

  driverName?: string;

  onToggleOnline?: (
    next: boolean,
  ) => void;

  onSelectFreight?: (
    freight: OperationalFreight,
  ) => void;

  onCloseFreight?: () => void;

  onAcceptFreight?: (
    freight: OperationalFreight,
  ) => Promise<void> | void;

  onRejectFreight?: (
    freight: OperationalFreight,
  ) => Promise<void> | void;

  children?: React.ReactNode;
}

export default function DriverApp({
  freights = [],
  activeFreight = null,
  selectedFreight = null,
  isOnline = false,
  loading = false,
  driverCategory,
  driverName,
  onToggleOnline,
  onSelectFreight,
  onCloseFreight,
  onAcceptFreight,
  onRejectFreight,
  children,
}: DriverAppProps) {
  const mountedRef =
    useRef(false);

  const heartbeatRef =
    useRef<number | null>(
      null,
    );

  const [
    runtimeReady,
    setRuntimeReady,
  ] = useState(false);

  const [
    runtimeVisible,
    setRuntimeVisible,
  ] = useState(
    typeof document !==
      'undefined'
      ? !document.hidden
      : true,
  );

  const [
    connectionOnline,
    setConnectionOnline,
  ] = useState(
    typeof navigator !==
      'undefined'
      ? navigator.onLine
      : true,
  );

  const [
    heartbeat,
    setHeartbeat,
  ] = useState(Date.now());

  useEffect(() => {
    mountedRef.current =
      true;

    const initialize =
      window.requestAnimationFrame(
        () => {
          if (
            mountedRef.current
          ) {
            setRuntimeReady(
              true,
            );
          }
        },
      );

    return () => {
      mountedRef.current =
        false;

      window.cancelAnimationFrame(
        initialize,
      );
    };
  }, []);

  useEffect(() => {
    const handleVisibility =
      () => {
        setRuntimeVisible(
          !document.hidden,
        );
      };

    const handleOnline =
      () => {
        setConnectionOnline(
          true,
        );
      };

    const handleOffline =
      () => {
        setConnectionOnline(
          false,
        );
      };

    document.addEventListener(
      'visibilitychange',
      handleVisibility,
      {
        passive: true,
      },
    );

    window.addEventListener(
      'online',
      handleOnline,
    );

    window.addEventListener(
      'offline',
      handleOffline,
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibility,
      );

      window.removeEventListener(
        'online',
        handleOnline,
      );

      window.removeEventListener(
        'offline',
        handleOffline,
      );
    };
  }, []);

  useEffect(() => {
    if (
      heartbeatRef.current
    ) {
      clearInterval(
        heartbeatRef.current,
      );
    }

    heartbeatRef.current =
      window.setInterval(
        () => {
          if (
            mountedRef.current
          ) {
            setHeartbeat(
              Date.now(),
            );
          }
        },
        runtimeVisible
          ? 15000
          : 30000,
      );

    return () => {
      if (
        heartbeatRef.current
      ) {
        clearInterval(
          heartbeatRef.current,
        );
      }
    };
  }, [runtimeVisible]);

  const runtimeStatus =
    useMemo(() => {
      if (
        !connectionOnline
      ) {
        return {
          label:
            'Reconectando runtime operacional',
          color:
            'text-red-300',
          icon:
            WifiOff,
        };
      }

      if (!isOnline) {
        return {
          label:
            'Radar operacional offline',
          color:
            'text-yellow-300',
          icon:
            ShieldCheck,
        };
      }

      return {
        label:
          'Operação sincronizada em realtime',
        color:
          'text-emerald-300',
        icon:
          Wifi,
      };
    }, [
      connectionOnline,
      isOnline,
    ]);

  const RuntimeIcon =
    runtimeStatus.icon;

  const safeToggleOnline =
    useCallback(
      (
        next: boolean,
      ) => {
        onToggleOnline?.(
          next,
        );
      },
      [onToggleOnline],
    );

  if (!runtimeReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-cyan-500/20 bg-cyan-500/10">
            <Activity className="h-12 w-12 animate-pulse text-cyan-400" />
          </div>

          <h1 className="text-4xl font-black">
            FRETOGO
          </h1>

          <p className="mt-4 text-slate-400">
            Inicializando runtime operacional...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.10),transparent_35%)]" />

      <div className="relative z-10">
        <div className="border-b border-white/5 bg-black/20 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10">
                  <Activity className="text-cyan-400" />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
                    CENTRAL LOGÍSTICA REALTIME
                  </p>

                  <h1 className="mt-1 text-2xl font-black text-white">
                    Runtime operacional ativo
                  </h1>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-400">
                Matching inteligente • Tracking realtime • Dispatch operacional
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3">
                <div className="flex items-center gap-2">
                  <RuntimeIcon
                    size={16}
                    className={
                      runtimeStatus.color
                    }
                  />

                  <span
                    className={`text-xs font-black uppercase tracking-[0.25em] ${runtimeStatus.color}`}
                  >
                    {
                      runtimeStatus.label
                    }
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Heartbeat:
                  {' '}
                  {new Date(
                    heartbeat,
                  ).toLocaleTimeString()}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3">
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
                  Motorista
                </p>

                <strong className="mt-1 block text-lg font-black text-white">
                  {driverName ||
                    'Operador'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <DriverDashboardLayout
          freights={freights}
          selectedFreight={
            selectedFreight
          }
          activeFreight={
            activeFreight
          }
          isOnline={isOnline}
          loading={loading}
          driverCategory={
            driverCategory
          }
          onToggleOnline={
            safeToggleOnline
          }
          onSelectFreight={
            onSelectFreight ||
            (() => {})
          }
          onCloseFreight={
            onCloseFreight ||
            (() => {})
          }
          onAcceptFreight={
            onAcceptFreight ||
            (() => {})
          }
          onRejectFreight={
            onRejectFreight ||
            (() => {})
          }
        />

        {children}
      </div>
    </div>
  );
}
