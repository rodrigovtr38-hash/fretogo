import { useState } from "react";

import RadarStatus from "./RadarStatus";
import OnlinePulse from "./OnlinePulse";
import DriverStats from "./DriverStats";
import AvailableFreights from "./AvailableFreights";
import FreightRequestModal from "./FreightRequestModal";

export default function DriverDashboardLayout() {
  const [selectedFreight, setSelectedFreight] = useState<any>(null);

  const handleSelectFreight = (freight: any) => {
    setSelectedFreight(freight);
  };

  const closeModal = () => {
    setSelectedFreight(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white p-4 md:p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Painel do Motorista
          </h1>

          <p className="text-gray-400 mt-1">
            Monitoramento operacional em tempo real
          </p>
        </div>

        <RadarStatus />
      </div>

      {/* ONLINE STATUS */}
      <div className="mb-6">
        <OnlinePulse />
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* FRETES */}
        <div className="xl:col-span-2">
          <AvailableFreights
            onSelectFreight={handleSelectFreight}
          />
        </div>

        {/* ESTATÍSTICAS */}
        <div>
          <DriverStats />
        </div>
      </div>

      {/* MODAL */}
      {selectedFreight && (
        <FreightRequestModal
          freight={selectedFreight}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
