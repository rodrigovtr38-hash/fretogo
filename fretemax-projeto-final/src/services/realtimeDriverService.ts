// =========================================================
// NOME DO ARQUIVO: src/services/realtimeDriverService.ts
// CTO-Log: Higienização de Sintaxe e Cache de Memória
// Status: Validação de cache local do motorista.
// =========================================================

import { DriverData, DriverLocation } from "../types/driver";

class RealtimeDriverService {
  private drivers: Map<string, DriverData> = new Map();

  updateDriverStatus(driverId: string, status: DriverData["status"]) {
    const driver = this.drivers.get(driverId);
    if (!driver) return;
    
    driver.status = status;
    this.drivers.set(driverId, driver);
  }

  updateDriverLocation(driverId: string, location: DriverLocation) {
    const driver = this.drivers.get(driverId);
    if (!driver) return;
    
    driver.location = location;
    this.drivers.set(driverId, driver);
  }

  registerDriver(driver: DriverData) {
    this.drivers.set(driver.id, driver);
  }

  getDriver(driverId: string) {
    return this.drivers.get(driverId);
  }

  getAllDrivers() {
    return Array.from(this.drivers.values());
  }
}

export const realtimeDriverService = new RealtimeDriverService();
