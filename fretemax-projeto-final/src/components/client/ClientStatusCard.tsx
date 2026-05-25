import {
  CheckCircle,
  Clock3,
  Truck,
  XCircle,
} from 'lucide-react';

import {
  AppTripState,
} from '../../state/tripStateMachine';

type ClientStatusCardProps = {
  status?: string;
  motoristaNome?: string | null;
};

export default function ClientStatusCard({
  status,
  motoristaNome,
}: ClientStatusCardProps) {
  const getStatusData = () => {
    switch (status) {
      case AppTripState.DISPONIVEL:
        return {
          icon: (
            <Clock3 className="h-7 w-7 text-yellow-400" />
          ),

          title:
            'Procurando motorista',

          description:
            'Seu frete está disponível para motoristas próximos.',

          bg:
            'border-yellow-500/20 bg-yellow-500/5',
        };

      case AppTripState.OFERTANDO:
        return {
          icon: (
            <Clock3 className="h-7 w-7 text-blue-400" />
          ),

          title:
            'Motoristas recebendo oferta',

          description:
            'Estamos enviando sua corrida em tempo real.',

          bg:
            'border-blue-500/20 bg-blue-500/5',
        };

      case AppTripState.ACEITO:
        return {
          icon: (
            <CheckCircle className="h-7 w-7 text-green-400" />
          ),

          title:
            'Motorista encontrado',

          description: motoristaNome
            ? `${motoristaNome} aceitou sua corrida.`
            : 'Seu motorista foi definido.',

          bg:
            'border-green-500/20 bg-green-500/5',
        };

      case AppTripState.EM_TRANSPORTE:
        return {
          icon: (
            <Truck className="h-7 w-7 text-cyan-400" />
          ),

          title:
            'Em transporte',

          description:
            'Sua carga está em rota de entrega.',

          bg:
            'border-cyan-500/20 bg-cyan-500/5',
        };

      case AppTripState.FINALIZANDO:
        return {
          icon: (
            <Truck className="h-7 w-7 text-purple-400" />
          ),

          title:
            'Finalizando corrida',

          description:
            'Estamos encerrando a operação.',

          bg:
            'border-purple-500/20 bg-purple-500/5',
        };

      case AppTripState.CANCELADO:
        return {
          icon: (
            <XCircle className="h-7 w-7 text-red-400" />
          ),

          title:
            'Corrida cancelada',

          description:
            'O frete foi cancelado.',

          bg:
            'border-red-500/20 bg-red-500/5',
        };

      default:
        return {
          icon: (
            <Clock3 className="h-7 w-7 text-zinc-400" />
          ),

          title:
            'Inicializando',

          description:
            'Aguarde enquanto sincronizamos.',

          bg:
            'border-zinc-700 bg-zinc-900',
        };
    }
  };

  const statusData =
    getStatusData();

  return (
    <div
      className={`
        rounded-3xl
        border
        p-6
        backdrop-blur-xl
        ${statusData.bg}
      `}
    >
      <div className="flex items-start gap-4">
        <div className="mt-1">
          {statusData.icon}
        </div>

        <div>
          <h2 className="text-lg font-black uppercase tracking-wide text-white">
            {statusData.title}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {statusData.description}
          </p>
        </div>
      </div>
    </div>
  );
}
