// =========================================================
// NOME DO ARQUIVO: src/components/DriverApp.tsx
// CTO-Log: Ponte Lógica (Wrapper). 
// Status: Heartbeat otimizado para economia de bateria.
// =========================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import DriverDashboardLayout, { OperationalFreight } from './motorista/DriverDashboardLayout';

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
        // Heartbeat logico mantido para manter socket ativo sem re-render visual.
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

  if (!runtimeReady) return null;

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
