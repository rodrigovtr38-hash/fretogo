import { useEffect, useState } from "react";

interface DriverLocation {
  latitude: number;
  longitude: number;
}

interface RealtimeDriverHook {
  isOnline: boolean;
  currentLocation: DriverLocation | null;
  lastUpdate: Date | null;
  toggleOnlineStatus: () => void;
}

export default function useRealtimeDriver(): RealtimeDriverHook {
  const [isOnline, setIsOnline] = useState(false);

  const [currentLocation, setCurrentLocation] =
    useState<DriverLocation | null>(null);

  const [lastUpdate, setLastUpdate] =
    useState<Date | null>(null);

  const toggleOnlineStatus = () => {
    setIsOnline((prev) => !prev);
  };

  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      const simulatedLocation = {
        latitude: -23.55052 + Math.random() * 0.01,
        longitude: -46.633308 + Math.random() * 0.01,
      };

      setCurrentLocation(simulatedLocation);
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [isOnline]);

  return {
    isOnline,
    currentLocation,
    lastUpdate,
    toggleOnlineStatus,
  };
}
