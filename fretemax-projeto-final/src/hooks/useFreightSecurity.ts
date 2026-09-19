// =========================================================================
// ARQUIVO: src/hooks/useFreightSecurity.ts
// CTO-Log: [PURGADO] - DEPRECATED HOOK (ZERO TRUST ENFORCED)
// A validação local do Frontend foi eliminada permanentemente.
// A validação de PIN e Evidência (POD) agora acontece 100% no Backend (Cloud Functions).
// Este arquivo foi mantido apensas como Stub Vazio para evitar a quebra (Build Error)
// de possíveis componentes legados que ainda mantenham a linha de import.
// Pode (e deve) ser deletado fisicamente em futuras limpezas de repositório.
// =========================================================================

import { useState } from "react";

interface SecurityHook {
  validatePickupCode: (inputCode: string, realCode: string) => boolean;
  validateDeliveryCode: (inputCode: string, realCodes: string[] | string, stopIndex: number) => boolean;
  enforcePhotoBeforePin: (photoFile: File | string | null) => boolean;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export default function useFreightSecurity(): SecurityHook {
  const [isProcessing, setIsProcessing] = useState(false);

  // Validação local inativada (Força retorno 'false' se usado indevidamente)
  const validatePickupCode = (inputCode: string, realCode: string) => {
    console.warn("[CTO-Log] ALERTA DE ARQUITETURA: Função deprecada acionada. Utilize TripLifecycleService.");
    return false;
  };

  // Validação local inativada (Força retorno 'false' se usado indevidamente)
  const validateDeliveryCode = (inputCode: string, realCodes: string[] | string, stopIndex: number) => {
    console.warn("[CTO-Log] ALERTA DE ARQUITETURA: Função deprecada acionada. Utilize TripLifecycleService.");
    return false;
  };

  // Trava de upload movida para DriverActiveTrip + Cloud Function
  const enforcePhotoBeforePin = (photoFile: File | string | null) => {
    console.warn("[CTO-Log] ALERTA DE ARQUITETURA: Função deprecada acionada.");
    return false;
  };

  return {
    validatePickupCode,
    validateDeliveryCode,
    enforcePhotoBeforePin,
    isProcessing,
    setIsProcessing
  };
}
