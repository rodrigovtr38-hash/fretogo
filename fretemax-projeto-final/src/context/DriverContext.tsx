import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

interface DriverContextData {
  isOnline: boolean;
  currentFreight: string | null;
  securityCode: string | null;

  setIsOnline: (value: boolean) => void;
  setCurrentFreight: (value: string | null) => void;
  setSecurityCode: (value: string | null) => void;
}

const DriverContext = createContext<DriverContextData | undefined>(
  undefined
);

interface DriverProviderProps {
  children: ReactNode;
}

export function DriverProvider({
  children,
}: DriverProviderProps) {
  const [isOnline, setIsOnline] =
    useState(false);

  const [currentFreight, setCurrentFreight] =
    useState<string | null>(null);

  const [securityCode, setSecurityCode] =
    useState<string | null>(null);

  return (
    <DriverContext.Provider
      value={{
        isOnline,
        currentFreight,
        securityCode,

        setIsOnline,
        setCurrentFreight,
        setSecurityCode,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
}

export function useDriverContext() {
  const context =
    useContext(DriverContext);

  if (!context) {
    throw new Error(
      "useDriverContext deve ser usado dentro de DriverProvider"
    );
  }

  return context;
}
