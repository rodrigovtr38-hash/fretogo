import { useEffect, useState } from "react";

export interface Freight {
  id: number;
  origem: string;
  destino: string;
  valor: number;
  distancia: string;
  tipoCarga: string;
  urgente: boolean;
}

interface FreightMatchingHook {
  freights: Freight[];
  loading: boolean;
}

export default function useFreightMatching(): FreightMatchingHook {
  const [freights, setFreights] = useState<Freight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const simulatedFreights: Freight[] = [
      {
        id: 1,
        origem: "São Paulo - SP",
        destino: "Campinas - SP",
        valor: 850,
        distancia: "92km",
        tipoCarga: "Carga seca",
        urgente: true,
      },
      {
        id: 2,
        origem: "Guarulhos - SP",
        destino: "Santos - SP",
        valor: 1200,
        distancia: "110km",
        tipoCarga: "Container",
        urgente: false,
      },
      {
        id: 3,
        origem: "Osasco - SP",
        destino: "Sorocaba - SP",
        valor: 640,
        distancia: "87km",
        tipoCarga: "Mudança",
        urgente: true,
      },
    ];

    const timer = setTimeout(() => {
      setFreights(simulatedFreights);
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return {
    freights,
    loading,
  };
}
