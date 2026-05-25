import { motion } from 'framer-motion';

import {
  Activity,
  CircleDollarSign,
  Clock3,
  MapPin,
  Navigation,
  Radar,
  ShieldCheck,
  Truck,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface DriverRadarProps {
  online: boolean;
  onToggleOnline: () => void;
}

const availableFreights = [
  {
    id: 1,
    origem: 'São Paulo - SP',
    destino: 'Campinas - SP',
    valor: 'R$ 850',
    distancia: '92km',
    urgente: true,
  },
  {
    id: 2,
    origem: 'Guarulhos - SP',
    destino: 'Santos - SP',
    valor: 'R$ 1.250',
    distancia: '110km',
    urgente: false,
  },
  {
    id: 3,
    origem: 'Osasco - SP',
    destino: 'Sorocaba - SP',
    valor: 'R$ 640',
    distancia: '87km',
    urgente: true,
  },
];

export default function DriverRadar({
  online,
  onToggleOnline,
}: DriverRadarProps) {

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <motion.div
        initial={{
          opacity: 0,
          y: -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="overflow-hidden rounded-[2rem] border border-cyan-500/10 bg-white/5"
      >

        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-4 flex items-center gap-3">

              <Radar className="text-cyan-400" />

              <h2 className="text-3xl font-black text-white">
                Radar Inteligente
              </h2>

            </div>

            <p className="max-w-2xl text-slate-400">
              Sistema inteligente monitorando fretes
              disponíveis em tempo real próximos da
              sua localização.
            </p>

          </div>

          <button
            onClick={onToggleOnline}
            className={`flex items-center justify-center gap-3 rounded-2xl px-8 py-5 text-sm font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02]
              ${
                online
                  ? 'bg-emerald-500 text-black'
                  : 'bg-red-500 text-white'
              }
            `}
          >

            {online
              ? <Wifi size={20} />
              : <WifiOff size={20} />
            }

            {online
              ? 'ONLINE'
              : 'OFFLINE'
            }

          </button>

        </div>

      </motion.div>

      {/* STATUS */}
      <div className="grid gap-5 md:grid-cols-4">

        <div className="rounded-[2rem] border border-cyan-500/10 bg-white/5 p-5">

          <div className="mb-4 flex items-center gap-3">

            <Truck className="text-cyan-400" />

            <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              Fretes
            </span>

          </div>

          <h3 className="text-4xl font-black text-white">
            28
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            disponíveis agora
          </p>

        </div>

        <div className="rounded-[2rem] border border-emerald-500/10 bg-white/5 p-5">

          <div className="mb-4 flex items-center gap-3">

            <Navigation className="text-emerald-400" />

            <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              Região
            </span>

          </div>

          <h3 className="text-2xl font-black text-white">
            São Paulo
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            raio 25km
          </p>

        </div>

        <div className="rounded-[2rem] border border-yellow-500/10 bg-white/5 p-5">

          <div className="mb-4 flex items-center gap-3">

            <CircleDollarSign className="text-yellow-400" />

            <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              Média
            </span>

          </div>

          <h3 className="text-3xl font-black text-white">
            R$ 940
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            por entrega
          </p>

        </div>

        <div className="rounded-[2rem] border border-purple-500/10 bg-white/5 p-5">

          <div className="mb-4 flex items-center gap-3">

            <Activity className="text-purple-400" />

            <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              Sistema
            </span>

          </div>

          <h3 className="text-2xl font-black text-white">
            Ativo
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            sincronizado
          </p>

        </div>

      </div>

      {/* FRETES */}
      <div className="space-y-5">

        {availableFreights.map((freight) => (

          <motion.div
            key={freight.id}
            whileHover={{
              scale: 1.01,
            }}
            className="overflow-hidden rounded-[2rem] border border-white/5 bg-white/5"
          >

            <div className="p-6">

              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                {/* LEFT */}
                <div className="flex-1">

                  <div className="mb-5 flex items-center gap-3">

                    <div className="rounded-full bg-cyan-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-400">

                      FRETE #{freight.id}

                    </div>

                    {freight.urgente && (
                      <div className="rounded-full bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white">

                        URGENTE

                      </div>
                    )}

                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">

                    <div>

                      <div className="mb-2 flex items-center gap-2">

                        <MapPin
                          size={18}
                          className="text-cyan-400"
                        />

                        <span className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500">
                          Origem
                        </span>

                      </div>

                      <p className="text-lg font-bold text-white">
                        {freight.origem}
                      </p>

                    </div>

                    <div>

                      <div className="mb-2 flex items-center gap-2">

                        <Navigation
                          size={18}
                          className="text-emerald-400"
                        />

                        <span className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500">
                          Destino
                        </span>

                      </div>

                      <p className="text-lg font-bold text-white">
                        {freight.destino}
                      </p>

                    </div>

                  </div>

                </div>

                {/* RIGHT */}
                <div className="w-full lg:w-[320px]">

                  <div className="rounded-[2rem] bg-[#0f172a] p-6">

                    <div className="flex items-center justify-between">

                      <div>

                        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                          Valor
                        </p>

                        <h3 className="mt-2 text-4xl font-black text-emerald-400">
                          {freight.valor}
                        </h3>

                      </div>

                      <ShieldCheck className="text-emerald-400" />

                    </div>

                    <div className="mt-5 flex items-center gap-3 text-sm text-slate-400">

                      <Clock3 size={16} />

                      {freight.distancia}

                    </div>

                    <button className="mt-6 w-full rounded-2xl bg-cyan-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02]">

                      Aceitar Frete

                    </button>

                  </div>

                </div>

              </div>

            </div>

          </motion.div>

        ))}

      </div>

    </div>
  );
}
