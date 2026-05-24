import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

interface ClientContextData {
  activeRequest: string | null;
  destinationCode: string | null;
  driverAccepted: boolean;

  setActiveRequest: (
    value: string | null
  ) => void;

  setDestinationCode: (
    value: string | null
  ) => void;

  setDriverAccepted: (
    value: boolean
  ) => void;
}

const ClientContext =
  createContext<ClientContextData | undefined>(
    undefined
  );

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({
  children,
}: ClientProviderProps) {
  const [activeRequest, setActiveRequest] =
    useState<string | null>(null);

  const [destinationCode, setDestinationCode] =
    useState<string | null>(null);

  const [driverAccepted, setDriverAccepted] =
    useState(false);

  return (
    <ClientContext.Provider
      value={{
        activeRequest,
        destinationCode,
        driverAccepted,

        setActiveRequest,
        setDestinationCode,
        setDriverAccepted,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const context =
    useContext(ClientContext);

  if (!context) {
    throw new Error(
      "useClientContext deve ser usado dentro de ClientProvider"
    );
  }

  return context;
}
