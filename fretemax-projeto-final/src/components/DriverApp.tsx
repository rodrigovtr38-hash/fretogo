// =========================================================
// NOME DO ARQUIVO: src/components/DriverApp.tsx
// CTO-Log: Auditoria Sprint Final (Product Polish).
// Status: Arquivo validado como Logical Wrapper (Ponte Fantasma). 
// Nenhuma alteração estrutural necessária. Mantido para sustentar o Modal legado.
// =========================================================

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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
  onToggleOnline?: (next: boolean) => void;
  onSelectFreight?: (freight: OperationalFreight) => void;
  onCloseFreight?: () => void;
  onAcceptFreight?: (freight: OperationalFreight) => Promise<void> | void;
  onRejectFreight?: (freight: OperationalFreight) => Promise<void> | void;
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
  const mountedRef = useRef(false);
  const heartbeatRef = useRef<number | null>(null);

  const [runtimeReady, setRuntimeReady] = useState(false);
  const [runtimeVisible, setRuntimeVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    mountedRef.current = true;
    const initialize = window.requestAnimationFrame(() => {
      if (mountedRef.current) {
        setRuntimeReady(true);
      }
    });

    return () => {
      mountedRef.current = false;
      window.cancelAnimationFrame(initialize);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => setRuntimeVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility, { passive: true });
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    heartbeatRef.current = window.setInterval(
      () => {
        // Heartbeat logico mantido para não quebrar integrações, mas sem renderização visual.
      },
      runtimeVisible ? 15000 : 30000
    );

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [runtimeVisible]);

  const safeToggleOnline = useCallback(
    (next: boolean) => {
      onToggleOnline?.(next);
    },
    [onToggleOnline]
  );

  // Removido o Skeleton de Loading nativo para não conflitar com o Motorista.tsx
  if (!runtimeReady) return null;

  // Componente agora é totalmente transparente (sem divs de background, sem headers)
  // Serve estritamente como wrapper lógico para renderizar o Modal através do Layout legado.
  return (
    <>
      <DriverDashboardLayout
        freights={freights}
        selectedFreight={selectedFreight}
        activeFreight={activeFreight}
        isOnline={isOnline}
        loading={loading}
        driverCategory={driverCategory}
        onToggleOnline={safeToggleOnline}
        onSelectFreight={onSelectFreight || (() => {})}
        onCloseFreight={onCloseFreight || (() => {})}
        onAcceptFreight={onAcceptFreight || (() => {})}
        onRejectFreight={onRejectFreight || (() => {})}
      />
      {children}
    </>
  );
}
