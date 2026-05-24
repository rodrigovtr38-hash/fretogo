import { useState } from "react";

interface SecurityCodes {
  pickupCode: string;
  deliveryCode: string;
}

interface SecurityHook {
  securityCodes: SecurityCodes | null;
  generateSecurityCodes: () => void;
  validatePickupCode: (code: string) => boolean;
  validateDeliveryCode: (code: string) => boolean;
}

export default function useFreightSecurity(): SecurityHook {
  const [securityCodes, setSecurityCodes] =
    useState<SecurityCodes | null>(null);

  const generateRandomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const generateSecurityCodes = () => {
    const pickupCode = generateRandomCode();
    const deliveryCode = generateRandomCode();

    setSecurityCodes({
      pickupCode,
      deliveryCode,
    });
  };

  const validatePickupCode = (code: string) => {
    return securityCodes?.pickupCode === code;
  };

  const validateDeliveryCode = (code: string) => {
    return securityCodes?.deliveryCode === code;
  };

  return {
    securityCodes,
    generateSecurityCodes,
    validatePickupCode,
    validateDeliveryCode,
  };
}
