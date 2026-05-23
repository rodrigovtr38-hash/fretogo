import {
  Clock3,
  MapPinned,
  Package,
  Truck,
  X,
  Check,
  Zap,
} from 'lucide-react';

interface FreightRequestModalProps {
  visible?: boolean;
}

export default function FreightRequestModal({
  visible = true,
}: FreightRequestModalProps) {
  if (!visible) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[999]
        flex
        items-center
        justify-center
        bg-black/70
        px-4
        backdrop-blur-md
      "
    >
      {/* GLOW */}
      <div className="absolute h-[35rem] w-[35rem] rounded-full bg-cyan-500/10 blur-[180px]" />

      {/* MODAL */}
      <div
        className="
          relative
          w-full
          max-w-2xl
          overflow-hidden
          rounded-[2rem]
          border
          border-cyan-500/20
          bg-[#020617]/95
          shadow-[0_0_80px_rgba(6,182,212,0.12)]
        "
      >
        {/* TOP BAR */}
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-white/5
            px-6
            py-5
          "
        >
          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-cyan-500/10
              "
            >
              <Zap
                size={24}
                className="text-cyan-400"
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                Novo frete encontrado
              </p>

              <h2 className="mt-1 text-2xl font-black text-white">
                Carga compatível detectada
              </h2>
            </div>
          </div>

          <button
            className="
              rounded-xl
              border
              border-white/10
              p-3
              text-slate-400
              transition-all
              duration-300
              hover:border-red-500/30
              hover:bg-red-500/10
              hover:text-red-400
            "
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="space-y-6 p-6">

          {/* TIMER */}
          <div
            className="
              rounded-2xl
              border
              border-yellow-500/20
              bg-yellow-500/10
              p-5
            "
          >
            <div className="flex items-center gap-3">

              <Clock3
                size={22}
                className="text-yellow-400"
              />

              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-yellow-300">
                  Tempo para aceitar
                </p>

                <h3 className="mt-1 text-3xl font-black text-white">
                  15 segundos
                </h3>
              </div>
            </div>
          </div>

          {/* GRID */}
          <div className="grid gap-4 md:grid-cols-2">

            {/* COLETA */}
            <div
              className="
                rounded-3xl
                border
                border-cyan-500/10
                bg-slate-900/70
                p-5
              "
            >
              <MapPinned
                size={22}
                className="text-cyan-400"
              />

              <p className="mt-4 text-xs uppercase tracking-widest text-slate-500">
                Coleta
              </p>

              <h3 className="mt-1 text-xl font-black text-white">
                Santos Dumont
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Rua Dias Gomes, 188
              </p>
            </div>

            {/* ENTREGA */}
            <div
              className="
                rounded-3xl
                border
                border-emerald-500/10
                bg-slate-900/70
                p-5
              "
            >
              <Package
                size={22}
                className="text-emerald-400"
              />

              <p className="mt-4 text-xs uppercase tracking-widest text-slate-500">
                Entrega
              </p>

              <h3 className="mt-1 text-xl font-black text-white">
                Parque Bambi
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Rua Boca de Leão, 178
              </p>
            </div>
          </div>

          {/* INFO */}
          <div className="grid gap-4 md:grid-cols-3">

            <div
              className="
                rounded-2xl
                border
                border-white/5
                bg-slate-900/60
                p-4
              "
            >
              <Truck
                size={18}
                className="text-cyan-400"
              />

              <p className="mt-3 text-xs uppercase tracking-widest text-slate-500">
                Veículo
              </p>

              <h4 className="mt-1 text-lg font-black text-white">
                Carro Pequeno
              </h4>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-white/5
                bg-slate-900/60
                p-4
              "
            >
              <Package
                size={18}
                className="text-yellow-400"
              />

              <p className="mt-3 text-xs uppercase tracking-widest text-slate-500">
                Volume
              </p>

              <h4 className="mt-1 text-lg font-black text-white">
                5 caixas
              </h4>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-white/5
                bg-slate-900/60
                p-4
              "
            >
              <Zap
                size={18}
                className="text-emerald-400"
              />

              <p className="mt-3 text-xs uppercase tracking-widest text-slate-500">
                Ganho
              </p>

              <h4 className="mt-1 text-lg font-black text-emerald-400">
                R$ 80,00
              </h4>
            </div>
          </div>

          {/* FRASE */}
          <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-5">
            <p className="text-center text-sm leading-relaxed text-cyan-100">
              Cliente aguardando confirmação imediata.
              Motoristas que aceitam rápido recebem
              prioridade nas próximas cargas da região.
            </p>
          </div>

          {/* BUTTONS */}
          <div className="grid gap-4 md:grid-cols-2">

            <button
              className="
                flex
                items-center
                justify-center
                gap-3
                rounded-2xl
                border
                border-white/10
                bg-slate-900
                px-6
                py-5
                text-sm
                font-black
                uppercase
                tracking-[0.2em]
                text-slate-300
                transition-all
                duration-300
                hover:border-red-500/30
                hover:bg-red-500/10
                hover:text-red-300
              "
            >
              <X size={18} />

              Recusar
            </button>

            <button
              className="
                flex
                items-center
                justify-center
                gap-3
                rounded-2xl
                bg-cyan-500
                px-6
                py-5
                text-sm
                font-black
                uppercase
                tracking-[0.2em]
                text-black
                transition-all
                duration-300
                hover:scale-[1.02]
                hover:bg-cyan-400
              "
            >
              <Check size={18} />

              Aceitar frete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
