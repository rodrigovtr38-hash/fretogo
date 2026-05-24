import {
  Activity,
  Radar,
  Search,
  Wifi,
  Zap,
} from 'lucide-react';

export default function OnlinePulse() {
  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[2.5rem]
        border
        border-cyan-500/10
        bg-[#020817]
        px-6
        py-16
        md:px-12
      "
    >

      {/* GLOW */}
      <div
        className="
          absolute
          left-1/2
          top-1/2
          h-[500px]
          w-[500px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-cyan-500/10
          blur-[120px]
        "
      />

      {/* GRID */}
      <div
        className="
          absolute
          inset-0
          opacity-[0.03]
          [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]
          [background-size:40px_40px]
        "
      />

      <div
        className="
          relative
          z-10
          flex
          flex-col
          items-center
          justify-center
          text-center
        "
      >

        {/* BADGE */}
        <div
          className="
            mb-6
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-cyan-500/20
            bg-cyan-500/10
            px-5
            py-2
          "
        >
          <Radar
            size={15}
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
            RADAR OPERACIONAL
          </span>
        </div>

        {/* RADAR */}
        <div className="relative flex items-center justify-center">

          {/* RING 1 */}
          <div
            className="
              absolute
              h-[320px]
              w-[320px]
              rounded-full
              border
              border-cyan-500/10
              animate-ping
            "
          />

          {/* RING 2 */}
          <div
            className="
              absolute
              h-[240px]
              w-[240px]
              rounded-full
              border
              border-cyan-400/10
            "
          />

          {/* RING 3 */}
          <div
            className="
              absolute
              h-[160px]
              w-[160px]
              rounded-full
              border
              border-cyan-300/10
            "
          />

          {/* CENTER */}
          <div
            className="
              relative
              z-10
              flex
              h-40
              w-40
              items-center
              justify-center
              rounded-full
              border-4
              border-cyan-400
              bg-[#061224]
              shadow-[0_0_60px_rgba(6,182,212,0.45)]
            "
          >

            <div
              className="
                absolute
                inset-0
                rounded-full
                bg-cyan-400/10
                animate-pulse
              "
            />

            <div
              className="
                relative
                z-10
                flex
                flex-col
                items-center
                justify-center
              "
            >
              <Wifi
                size={42}
                className="text-cyan-300"
              />

              <span
                className="
                  mt-3
                  text-[11px]
                  font-black
                  uppercase
                  tracking-[0.35em]
                  text-cyan-300
                "
              >
                ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* TEXT */}
        <div className="mt-16 max-w-2xl">

          <h2
            className="
              text-4xl
              font-black
              tracking-tight
              text-white
              md:text-6xl
            "
          >
            Radar ativo em tempo real
          </h2>

          <p
            className="
              mt-6
              text-lg
              leading-relaxed
              text-slate-400
            "
          >
            Nossa inteligência operacional está analisando fretes próximos,
            cruzando categorias, distância, prioridade e disponibilidade
            para encontrar as melhores cargas para você.
          </p>
        </div>

        {/* STATUS */}
        <div
          className="
            mt-12
            grid
            w-full
            max-w-5xl
            gap-5
            md:grid-cols-3
          "
        >

          {/* CARD */}
          <div
            className="
              rounded-[2rem]
              border
              border-cyan-500/10
              bg-[#061224]
              p-6
            "
          >
            <Search
              size={26}
              className="text-cyan-400"
            />

            <h3 className="mt-5 text-xl font-black text-white">
              Buscando cargas
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Sistema monitorando solicitações em tempo real.
            </p>
          </div>

          {/* CARD */}
          <div
            className="
              rounded-[2rem]
              border
              border-emerald-500/10
              bg-[#061224]
              p-6
            "
          >
            <Activity
              size={26}
              className="text-emerald-400"
            />

            <h3 className="mt-5 text-xl font-black text-white">
              Match inteligente
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              IA conectando cargas ideais ao seu perfil operacional.
            </p>
          </div>

          {/* CARD */}
          <div
            className="
              rounded-[2rem]
              border
              border-yellow-500/10
              bg-[#061224]
              p-6
            "
          >
            <Zap
              size={26}
              className="text-yellow-400"
            />

            <h3 className="mt-5 text-xl font-black text-white">
              Prioridade premium
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Motoristas online recebem cargas prioritárias automaticamente.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
