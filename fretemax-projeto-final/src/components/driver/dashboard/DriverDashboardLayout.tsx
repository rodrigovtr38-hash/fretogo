import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import RadarStatus from './RadarStatus';
import OnlinePulse from './OnlinePulse';
import DriverStats from './DriverStats';
import AvailableFreights from './AvailableFreights';
import FreightRequestModal from './FreightRequestModal';

export type DriverCategory =
  | 'moto'
  | 'carro'
  | 'utilitario'
  | 'toco'
  | 'truck'
  | 'carreta'
  | 'bitrem';

export interface OperationalFreight {
  id: string;

  status?: string;

  prioridade?: boolean;

  agendado?: boolean;

  categoria?: DriverCategory;

  enderecoColetaTexto?: string;

  enderecoEntregaTexto?: string;

  distanciaColetaKm?: number;

  distanciaEntregaKm?: number;

  distanciaTotalKm?: number;

  valorCliente?: number;

  valorMotorista?: number;

  pesoKg?: number;

  volumes?: number;

  etaMinutes?: number;

  motoristaId?: string | null;

  createdAt?: unknown;

  updatedAt?: unknown;
}

interface DriverDashboardLayoutProps {
  freights: OperationalFreight[];

  selectedFreight?: OperationalFreight | null;

  activeFreight?: OperationalFreight | null;

  isOnline: boolean;

  loading?: boolean;

  driverCategory?: string;

  onToggleOnline: (
    nextState: boolean,
  ) => void;

  onSelectFreight: (
    freight: OperationalFreight,
  ) => void;

  onCloseFreight: () => void;

  onAcceptFreight: (
    freight: OperationalFreight,
  ) => Promise<void> | void;

  onRejectFreight: (
    freight: OperationalFreight,
  ) => Promise<void> | void;
}

const CATEGORY_LABELS: Record<
  DriverCategory,
  string
> = {
  moto: 'Moto',
  carro: 'Carro',
  utilitario: 'Utilitário',
  toco: 'Toco',
  truck: 'Truck',
  carreta: 'Carreta',
  bitrem: 'Bitrem',
};

export default function DriverDashboardLayout({
  freights,
  selectedFreight,
  activeFreight,
  isOnline,
  loading = false,
  driverCategory,
  onToggleOnline,
  onSelectFreight,
  onCloseFreight,
  onAcceptFreight,
  onRejectFreight,
}: DriverDashboardLayoutProps) {
  const normalizedCategory =
    useMemo(() => {
      if (!driverCategory) {
        return 'carro';
      }

      const category =
        driverCategory
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

      if (
        category === 'utilitario'
      ) {
        return 'utilitario';
      }

      if (
        category === 'moto' ||
        category === 'carro' ||
        category === 'toco' ||
        category === 'truck' ||
        category === 'carreta' ||
        category === 'bitrem'
      ) {
        return category;
      }

      return 'carro';
    }, [driverCategory]);

  const [processingAction, setProcessingAction] =
    useState(false);

  const handleAccept =
    useCallback(async () => {
      if (
        !selectedFreight ||
        processingAction
      ) {
        return;
      }

      try {
        setProcessingAction(true);

        await onAcceptFreight(
          selectedFreight,
        );
      } finally {
        setProcessingAction(false);
      }
    }, [
      selectedFreight,
      processingAction,
      onAcceptFreight,
    ]);

  const handleReject =
    useCallback(async () => {
      if (
        !selectedFreight ||
        processingAction
      ) {
        return;
      }

      try {
        setProcessingAction(true);

        await onRejectFreight(
          selectedFreight,
        );
      } finally {
        setProcessingAction(false);
      }
    }, [
      selectedFreight,
      processingAction,
      onRejectFreight,
    ]);

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6">
          <RadarStatus
            online={isOnline}
            onToggle={onToggleOnline}
            category={
              CATEGORY_LABELS[
                normalizedCategory as DriverCategory
              ]
            }
          />
        </div>

        <div className="mb-6">
          <OnlinePulse
            online={isOnline}
          />
        </div>

        {activeFreight && (
          <div className="mb-6 overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5">
            <div className="border-b border-white/5 px-6 py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
                    CORRIDA ATIVA
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-white">
                    Operação em andamento
                  </h2>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
                    Status operacional
                  </p>

                  <strong className="mt-1 block text-xl font-black text-white">
                    {activeFreight.status ||
                      'EM TRÂNSITO'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-4">
              <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Coleta
                </p>

                <h3 className="mt-3 text-lg font-black text-white">
                  {activeFreight.enderecoColetaTexto ||
                    'Não informado'}
                </h3>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Entrega
                </p>

                <h3 className="mt-3 text-lg font-black text-white">
                  {activeFreight.enderecoEntregaTexto ||
                    'Não informado'}
                </h3>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Valor líquido
                </p>

                <h3 className="mt-3 text-3xl font-black text-emerald-400">
                  R$
                  {' '}
                  {(
                    activeFreight.valorMotorista ||
                    0
                  ).toFixed(2)}
                </h3>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Distância total
                </p>

                <h3 className="mt-3 text-3xl font-black text-cyan-300">
                  {(
                    activeFreight.distanciaTotalKm ||
                    0
                  ).toFixed(1)}
                  km
                </h3>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <AvailableFreights
              freights={freights}
              isOnline={isOnline}
              loading={loading}
              onSelectFreight={
                onSelectFreight
              }
            />
          </div>

          <div>
            <DriverStats />
          </div>
        </div>
      </div>

      <FreightRequestModal
        freight={selectedFreight}
        visible={Boolean(
          selectedFreight,
        )}
        processing={processingAction}
        onClose={onCloseFreight}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </div>
  );
}
