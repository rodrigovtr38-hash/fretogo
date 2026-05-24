export type DriverStatus =
  | "offline"
  | "online"
  | "busy"
  | "paused";

export interface DriverLocation {
  latitude: number;
  longitude: number;
  updatedAt: Date;
}

export interface DriverData {
  id: string;
  name: string;
  email: string;
  phone: string;

  status: DriverStatus;

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
