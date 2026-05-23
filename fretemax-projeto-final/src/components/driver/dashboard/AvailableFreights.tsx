import {
  Clock3,
  MapPin,
  Package,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react';

const FREIGHTS = [
  {
    id: 1,
    origin: 'Moema • SP',
    destination: 'Pinheiros • SP',
    distance: '4.2 km',
    value: 'R$ 38',
    vehicle: 'Moto',
    eta: 'Coleta imediata',
    priority: true,
  },
  {
    id: 2,
    origin: 'Centro • SP',
    destination: 'Osasco • SP',
    distance: '12 km',
    value: 'R$ 96',
    vehicle: 'Carro Pequeno',
    eta: 'Retirada em 12 min',
    priority: false,
  },
  {
    id: 3,
    origin: 'Campinas • SP',
    destination: 'Jundiaí • SP',
    distance: '48 km',
    value: 'R$ 320',
    vehicle: 'Utilitário',
    eta: 'Carga agendada',
    priority: true,
  },
];

export default function AvailableFreights() {
  return (
    <section className="relative w-full">

      {/* HEADER */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div
            className="
              mb-3
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-cyan-500/20
              bg-cyan-500/10
              px-4
              py-2
            "
          >
            <Sparkles
              size={14}
              className="text-cyan-300"
            />

            <span
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.35em]
                text-cyan-300
              "
            >
              IA OPERACIONAL
            </span>
          </div>

          <h2
            className="
              text-3xl
              font-black
              tracking-tight
              text-white
              md:text-4xl
            "
          >
            Fretes próximos
          </h2>

          <p className="mt-2 text-slate-400">
            Matching inteligente baseado na sua localização e categoria.
          </p>
        </div>

        <div
          className="
            hidden
            rounded-2xl
            border
            border-emerald-500/20
            bg-emerald-500/10
            px-5
            py-3
            md:flex
            md:flex-col
          "
        >
          <span className="text-xs uppercase tracking-[0.25em] text-emerald-300">
            Radar ativo
          </span>

          <strong className="mt-1 text-2xl font-black text-white">
            12
          </strong>
        </div>
      </div>

      {/* FRETES */}
      <div className="grid gap-6">

        {FREIGHTS.map((freight) => (
          <div
            key={freight.id}
            className="
              group
              relative
              overflow-hidden
              rounded-[2rem]
              border
              border-cyan-500/10
              bg-[#020817]
              p-6
              transition-all
              duration-300
              hover:border-cyan-400/30
              hover:shadow-[0_0_60px_rgba(6,182,212,0.12)]
            "
          >

            {/* GLOW */}
            <div
              className="
                absolute
                right-[-4rem]
                top-[-4rem]
                h-40
                w-40
                rounded-full
                bg-cyan-500/5
                blur-3xl
              "
            />

            {/* TOP */}
            <div
              className="
                flex
                flex-col
                gap-5
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >

              {/* LEFT */}
              <div className="flex-1">

                <div className="flex flex-wrap items-center gap-3">

                  {freight.priority && (
                    <div
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-yellow-500/20
                        bg-yellow-500/10
                        px-3
                        py-1.5
                      "
                    >
                      <Zap
                        size={14}
                        className="text-yellow-300"
                      />

                      <span
                        className="
                          text-[10px]
                          font-black
                          uppercase
                          tracking-[0.25em]
                          text-yellow-300
                        "
                      >
                        PRIORIDADE
                      </span>
                    </div>
                  )}

                  <div
                    className="
                      rounded-full
                      border
                      border-cyan-500/20
                      bg-cyan-500/10
                      px-3
                      py-1.5
                    "
                  >
                    <span
                      className="
                        text-[10px]
                        font-black
                        uppercase
                        tracking-[0.25em]
                        text-cyan-300
                      "
                    >
                      {freight.vehicle}
                    </span>
                  </div>
                </div>

                {/* ROTA */}
                <div className="mt-5 flex flex-col gap-4">

                  <div className="flex items-start gap-3">
                    <MapPin
                      size={18}
                      className="mt-1 text-cyan-400"
                    />

                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        Coleta
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-white">
                        {freight.origin}
                      </h3>
                    </div>
                  </div>

                  <div className="ml-2 h-8 w-px bg-cyan-500/20" />

                  <div className="flex items-start gap-3">
                    <Truck
                      size={18}
                      className="mt-1 text-emerald-400"
                    />

                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        Destino
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-white">
                        {freight.destination}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div
                className="
                  flex
                  w-full
                  flex-col
                  gap-4
                  lg:w-[320px]
                "
              >

                {/* VALUE */}
                <div
                  className="
                    rounded-3xl
                    border
                    border-cyan-500/10
                    bg-[#061224]
                    p-5
                  "
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Valor operacional
                  </p>

                  <h2 className="mt-2 text-5xl font-black text-white">
                    {freight.value}
                  </h2>

                  <div className="mt-5 grid grid-cols-2 gap-3">

                    <div
                      className="
                        rounded-2xl
                        border
                        border-cyan-500/10
                        bg-[#020817]
                        p-3
                      "
                    >
                      <div className="flex items-center gap-2">
                        <Package
                          size={15}
                          className="text-cyan-400"
                        />

                        <span className="text-xs text-slate-400">
                          Distância
                        </span>
                      </div>

                      <strong className="mt-2 block text-white">
                        {freight.distance}
                      </strong>
                    </div>

                    <div
                      className="
                        rounded-2xl
                        border
                        border-cyan-500/10
                        bg-[#020817]
                        p-3
                      "
                    >
                      <div className="flex items-center gap-2">
                        <Clock3
                          size={15}
                          className="text-emerald-400"
                        />

                        <span className="text-xs text-slate-400">
                          ETA
                        </span>
                      </div>

                      <strong className="mt-2 block text-white">
                        {freight.eta}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <button
                  className="
                    h-14
                    rounded-2xl
                    bg-cyan-500
                    text-sm
                    font-black
                    uppercase
                    tracking-[0.25em]
                    text-black
                    transition-all
                    duration-300
                    hover:scale-[1.02]
                    hover:bg-cyan-400
                    hover:shadow-[0_0_35px_rgba(6,182,212,0.45)]
                  "
                >
                  ACEITAR FRETE
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
