// =========================================================
// NOME DO ARQUIVO: src/components/DriverApp.tsx
// CTO-Log: Correção de Path Relativo.
// Status: Subindo um nível (../) para encontrar a pasta 'driver' a partir de 'motorista'.
// =========================================================

import { useCallback, useEffect, useRef, useState } from 'react';
// 🔥 CORREÇÃO DE CAMINHO: Subindo um nível para sair de 'motorista' e entrar em 'driver'
import DriverDashboardLayout, { OperationalFreight } from '../driver/dashboard/DriverDashboardLayout';

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
  onToggleOnline,
  onSelectFreight,
  onCloseFreight,
  onAcceptFreight,
  onRejectFreight,
  children,
}: DriverAppProps) {
  const mountedRef = useRef(false);
  const [runtimeReady, setRuntimeReady] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    const initialize = window.requestAnimationFrame(() => {
      if (mountedRef.current) setRuntimeReady(true);
    });
    return () => { mountedRef.current = false; window.cancelAnimationFrame(initialize); };
  }, []);

  const safeToggleOnline = useCallback((next: boolean) => { onToggleOnline?.(next); }, [onToggleOnline]);

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
