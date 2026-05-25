interface DriverRadarProps {
  isOnline: boolean;
  setIsOnline: (value: boolean) => void;
  user: any;
  driver: any;
}

export default function DriverRadar({
  isOnline,
  setIsOnline,
  user,
  driver,
}: DriverRadarProps) {

  return (
    <div className="mx-auto mt-8 w-full max-w-7xl px-4 pb-20">

      {/* HEADER */}
      <div className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8">

        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <span className="mb-4 inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              RADAR OPERACIONAL
            </span>

            <h2 className="text-4xl font-black text-white">
              Sistema realtime ativo
            </h2>

            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-400">
              O radar inteligente monitora fretes próximos,
              disponibilidade operacional, redispatch automático
              e sincronização entre motorista, cliente e central.
            </p>

          </div>

          {/* ONLINE BUTTON */}
          <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">

            <div className="mb-5 flex items-center justify-between">

              <div>

                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                  STATUS OPERACIONAL
                </p>

                <h3 className="mt-2 text-3xl font-black text-white">
                  {isOnline
                    ? 'ONLINE'
                    : 'OFFLINE'}
                </h3>

              </div>

              <div
                className={`h-5 w-5 rounded-full ${
                  isOnline
                    ? 'bg-emerald-400 shadow-[0_0_20px_rgba(74,222,128,0.9)]'
                    : 'bg-red-500'
                }`}
              />

            </div>

            <button
              onClick={() =>
                setIsOnline(!isOnline)
              }
              className={`w-full rounded-2xl px-6 py-5 text-sm font-black uppercase tracking-[0.2em] transition-all ${
                isOnline
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                  : 'bg-red-500 text-white hover:bg-red-400'
              }`}
            >

              {isOnline
                ? 'FICAR OFFLINE'
                : 'ENTRAR ONLINE'}

            </button>

          </div>

        </div>

      </div>

      {/* GRID */}
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-900/70 p-6">

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
            MATCHING
          </p>

          <h3 className="mt-4 text-3xl font-black text-white">
            GPS LIVE
          </h3>

          <p className="mt-3 text-slate-400">
            Monitoramento inteligente por proximidade.
          </p>

        </div>

        <div className="rounded-[2rem] border border-emerald-500/10 bg-slate-900/70 p-6">

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
            DISTRIBUIÇÃO
          </p>

          <h3 className="mt-4 text-3xl font-black text-white">
            AUTO DISPATCH
          </h3>

          <p className="mt-3 text-slate-400">
            Fretes redistribuídos automaticamente.
          </p>

        </div>

        <div className="rounded-[2rem] border border-yellow-500/10 bg-slate-900/70 p-6">

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-400">
            REDE
          </p>

          <h3 className="mt-4 text-3xl font-black text-white">
            SINCRONIZADO
          </h3>

          <p className="mt-3 text-slate-400">
            Cliente, motorista e admin em realtime.
          </p>

        </div>

        <div className="rounded-[2rem] border border-purple-500/10 bg-slate-900/70 p-6">

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-purple-400">
            CONTA
          </p>

          <h3 className="mt-4 text-2xl font-black text-white">
            {driver?.nome || 'Motorista'}
          </h3>

          <p className="mt-3 text-slate-400">
            {driver?.categoria || 'Categoria indefinida'}
          </p>

        </div>

      </div>

      {/* OPERATION CENTER */}
      <div className="mt-8 rounded-[2rem] border border-white/5 bg-slate-900/70 p-8">

        <h2 className="text-2xl font-black text-white">
          Central operacional inteligente
        </h2>

        <p className="mt-4 max-w-4xl text-lg leading-relaxed text-slate-400">
          O motorista online entra automaticamente no sistema
          de matching logístico. O algoritmo analisa localização,
          categoria do veículo, prioridade da carga e distância
          da coleta para distribuir os fretes em tempo real.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5">

            <h3 className="font-black text-cyan-400">
              GPS Realtime
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              O sistema acompanha localização operacional continuamente.
            </p>

          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5">

            <h3 className="font-black text-cyan-400">
              Matching Inteligente
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Distribuição baseada em proximidade e compatibilidade.
            </p>

          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5">

            <h3 className="font-black text-cyan-400">
              Redispatch Automático
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Caso o frete seja recusado o sistema redistribui automaticamente.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}
