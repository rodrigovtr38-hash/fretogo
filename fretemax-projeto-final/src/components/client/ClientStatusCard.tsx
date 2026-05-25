import {
  Radar,
  Truck,
  User,
  Package,
} from 'lucide-react';

interface ClientStatusCardProps {
  status?: string;
  loadingMessage?: string;
  motoristaNome?: string;
  veiculo?: string;
  distancia?: number;
  valorTotal?: number;
}

export default function ClientStatusCard({
  status,
  loadingMessage,
  motoristaNome,
  veiculo,
  distancia,
  valorTotal,
}: ClientStatusCardProps) {
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-8 flex items-center gap-3">
        <Radar className="animate-spin text-cyan-400" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
            Status Operacional
          </p>

          <h2 className="text-2xl font-black text-white">
            {status || loadingMessage}
          </h2>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <User size={16} className="text-cyan-400" />

            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Motorista
            </span>
          </div>

          <p className="text-sm font-bold text-white">
            {motoristaNome || 'Aguardando motorista'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Truck size={16} className="text-green-400" />

            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Veículo
            </span>
          </div>

          <p className="text-sm font-bold text-white">
            {veiculo || 'Não definido'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Package size={16} className="text-yellow-400" />

            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Operação
            </span>
          </div>

          <p className="text-sm font-bold text-white">
            {distancia?.toFixed(1) || '0'} km · R$ {valorTotal?.toFixed(2) || '0,00'}
          </p>
        </div>
      </div>
    </div>
  );
}
