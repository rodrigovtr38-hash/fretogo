import { useState } from "react";

import DriverDashboardLayout from "./dashboard/DriverDashboardLayout";
import RadarStatus from "./dashboard/RadarStatus";
import DriverStats from "./dashboard/DriverStats";
import AvailableFreights from "./dashboard/AvailableFreights";
import OnlinePulse from "./dashboard/OnlinePulse";
import FreightRequestModal from "./dashboard/FreightRequestModal";

export default function DriverApp() {
  const [isOnline, setIsOnline] = useState(false);

  const toggleStatus = () => {
    setIsOnline((prev) => !prev);
  };

  return (
    <DriverDashboardLayout>
      <div className="space-y-6">
        
        <OnlinePulse isOnline={isOnline} />

        <RadarStatus
          isOnline={isOnline}
          onToggle={toggleStatus}
        />

        <DriverStats
          totalFretes={24}
          totalGanhos={12850}
          avaliacao={4.9}
        />

        <AvailableFreights
          freights={[
            {
              id: "1",
              origem: "São Paulo - SP",
              destino: "Campinas - SP",
              valor: 850,
              distancia: 92,
            },
            {
              id: "2",
              origem: "Curitiba - PR",
              destino: "Joinville - SC",
              valor: 1200,
              distancia: 180,
            },
          ]}
        />

        <FreightRequestModal
          open={false}
          onAccept={() => {}}
          onReject={() => {}}
          freight={null}
        />
      </div>
    </DriverDashboardLayout>
  );
}
