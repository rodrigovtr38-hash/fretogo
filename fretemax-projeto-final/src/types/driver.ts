// =========================================================
// NOME DO ARQUIVO: src/types/driver.ts
// CTO-Log: Refatoração para Estado Operacional isolado.
// Status: Previne colisão com o status de conta do index.ts.
// =========================================================

export type DriverOperationalStatus =
  | "offline"
  | "online"
  | "busy"
  | "paused";

export interface DriverLocation {
  latitude: number;
  longitude: number;
  updatedAt: Date;
}

// Foco em dados voláteis de telemetria e operação imediata
export interface DriverTelemetryData {
  id: string;
  name: string;
  email: string;
  phone: string;
  operationalStatus: DriverOperationalStatus;
  currentFreightId?: string;
  location?: DriverLocation;
  securityCode?: string;
  vehicleType?: string;
  createdAt: Date;
}

export interface DriverFreight {
  id: string;
  origin: string;
  destination: string;
  value: number;
  distanceKm: number;
  status:
    | "pending"
    | "accepted"
    | "collecting"
    | "delivering"
    | "finished";
  createdAt: Date;
}
