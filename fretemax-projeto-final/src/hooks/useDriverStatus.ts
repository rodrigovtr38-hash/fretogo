import { useCallback, useEffect, useState } from "react";

interface DriverStatusHook {
  isOnline: boolean;
  lastUpdated: Date | null;
  toggleStatus: () => void;
}

export default function useDriverStatus(): DriverStatusHook {
  const [isOnline, setIsOnline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const toggleStatus = useCallback(() => {
    setIsOnline((prev) => !prev);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    if (isOnline) {
      console.log("Motorista ONLINE");
    } else {
      console.log("Motorista OFFLINE");
    }
  }, [isOnline]);

  return {
    isOnline,
    lastUpdated,
    toggleStatus,
  };
}
