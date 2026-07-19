// =========================================================
// NOME DO ARQUIVO: src/components/DriverApp.tsx
// CTO-Log: Correção de Path (Caminho) de Importação.
// Status: Caminho apontando corretamente para ./motorista/DriverDashboardLayout
// =========================================================

import { useCallback, useEffect, useRef, useState } from 'react';
// CORREÇÃO: Caminho corrigido para a estrutura exata que o seu projeto possui
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
