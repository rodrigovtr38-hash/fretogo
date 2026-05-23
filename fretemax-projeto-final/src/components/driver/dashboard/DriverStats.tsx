import {
  Award,
  DollarSign,
  Star,
  TrendingUp,
  Truck,
  ShieldCheck,
} from 'lucide-react';

export default function DriverStats() {
  return (
    <section className="relative w-full">

      {/* GRID */}
      <div
        className="
          grid
          gap-5
          md:grid-cols-2
          xl:grid-cols-4
        "
      >

        {/* GANHOS */}
        <div
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
            hover:shadow-[0_0_40px_rgba(6,182,212,0.12)]
          "
        >
          {/* GLOW */}
          <div
            className="
              absolute
              right-[-2rem]
              top-[-2rem]
              h-32
              w-32
              rounded-full
              bg-cyan-500/10
              blur-3xl
            "
          />

          <div
            className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-cyan-500/10
            "
          >
            <DollarSign
              size={28}
              className="text-cyan-400"
            />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-slate-500">
            Ganhos hoje
          </p>

          <h2 className="mt-2 text-4xl font-black text-white">
            R$ 480
          </h2>

          <div className="mt-5 flex items-center gap-2">
            <TrendingUp
              size={16}
              className="text-emerald-400"
            />

            <span className="text-sm font-semibold text-emerald-400">
              +18% hoje
            </span>
          </div>
        </div>

        {/* ENTREGAS */}
        <div
          className="
            group
            relative
            overflow-hidden
            rounded-[2rem]
            border
            border-emerald-500/10
            bg-[#020817]
            p-6
            transition-all
            duration-300
            hover:border-emerald-400/30
            hover:shadow-[0_0_40px_rgba(16,185,129,0.12)]
          "
        >
          <div
            className="
              absolute
              left-[-2rem]
              top-[-2rem]
              h-32
              w-32
              rounded-full
              bg-emerald-500/10
              blur-3xl
            "
          />

          <div
            className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-emerald-500/10
            "
          >
            <Truck
              size={28}
              className="text-emerald-400"
            />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-slate-500">
            Entregas
          </p>

          <h2 className="mt-2 text-4xl font-black text-white">
            24
          </h2>

          <p className="mt-4 text-sm text-slate-400">
            Finalizadas nas últimas 24h
          </p>
        </div>

        {/* REPUTAÇÃO */}
        <div
          className="
            group
            relative
            overflow-hidden
            rounded-[2rem]
            border
            border-yellow-500/10
            bg-[#020817]
            p-6
            transition-all
            duration-300
            hover:border-yellow-400/30
            hover:shadow-[0_0_40px_rgba(234,179,8,0.12)]
          "
        >
          <div
            className="
              absolute
              right-[-2rem]
              bottom-[-2rem]
              h-32
              w-32
              rounded-full
              bg-yellow-500/10
              blur-3xl
            "
          />

          <div
            className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-yellow-500/10
            "
          >
            <Star
              size={28}
              className="text-yellow-400"
            />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-slate-500">
            Avaliação
          </p>

          <h2 className="mt-2 text-4xl font-black text-white">
            4.9
          </h2>

          <p className="mt-4 text-sm text-slate-400">
            Motorista elite da plataforma
          </p>
        </div>

        {/* RANK */}
        <div
          className="
            group
            relative
            overflow-hidden
            rounded-[2rem]
            border
            border-purple-500/10
            bg-[#020817]
            p-6
            transition-all
            duration-300
            hover:border-purple-400/30
            hover:shadow-[0_0_40px_rgba(168,85,247,0.12)]
          "
        >
          <div
            className="
              absolute
              left-[-2rem]
              bottom-[-2rem]
              h-32
              w-32
              rounded-full
              bg-purple-500/10
              blur-3xl
            "
          />

          <div
            className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-purple-500/10
            "
          >
            <Award
              size={28}
              className="text-purple-400"
            />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-slate-500">
            Nível atual
          </p>

          <h2 className="mt-2 text-4xl font-black text-white">
            PRO
          </h2>

          <div className="mt-4 flex items-center gap-2">
            <ShieldCheck
              size={16}
              className="text-cyan-400"
            />

            <span className="text-sm text-cyan-300">
              Prioridade em cargas premium
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
