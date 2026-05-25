interface DriverDashboardProps {
  driver: any;
}

export default function DriverDashboard({
  driver,
}: DriverDashboardProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">

      {/* HERO */}
      <div className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-8">

        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <span className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              CENTRAL OPERACIONAL
            </span>

            <h1 className="max-w-2xl text-4xl font-black leading-tight text-white md:text-5xl">
              Bem-vindo ao radar operacional FRETOGO
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
              Sistema inteligente de distribuição logística em tempo real.
              Fique online para começar a receber fretes compatíveis com sua categoria e localização.
            </p>

          </div>

          {/* DRIVER CARD */}
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">

            <div className="mb-6 flex items-center gap-4">

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl font-black text-cyan-400">
                {driver?.nome?.charAt(0) || 'M'}
              </div>

              <div>

                <h2 className="text-2xl font-black text-white">
                  {driver?.nome || 'Motorista'}
                </h2>

                <p className="text-slate-400">
                  Parceiro FRETOGO
                </p>

              </div>

            </div>

            <div className="space-y-4">

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/80 px-4 py-4">

                <span className="text-slate-400">
                  Categoria
                </span>

                <span className="font-black uppercase text-cyan-400">
                  {driver?.categoria || 'Não definida'}
                </span>

              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/80 px-4 py-4">

                <span className="text-slate-400">
                  Status
                </span>

                <span className="font-black text-emerald-400">
                  APROVADO
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* STATUS GRID */}
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-900/70 p-6">

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
            STATUS
          </p>

          <h3 className="mt-4 text-3xl font-black text-white">
            ONLINE READY
          </h3>

          <p className="mt-3 text-slate-400">
            Sistema preparado para receber fretes em tempo real.
          </p>

        </div>

        <div className="rounded-[2rem] border border-emerald-500/10 bg-slate-900/70 p-6">

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
            MATCHING
          </p>

          <h3 className="mt-4 text-3xl font-black text-white">
            GPS ATIVO
          </h3>

          <p className="mt-3 text-slate-400">
            Busca inteligente por proximidade e categoria.
          </p>

        </div>

        <div className="rounded-[2rem] border border-yellow-500/10 bg-slate-900/70 p-6">

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-400">
            DISTRIBUIÇÃO
          </p>

          <h3 className="mt-4 text-3xl font-black text-white">
            REDISPATCH
          </h3>

          <p className="mt-3 text-slate-400">
            Fretes redistribuídos automaticamente em caso de recusa.
          </p>

        </div>

        <div className="rounded-[2rem] border border-purple-500/10 bg-slate-900/70 p-6">

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-purple-400">
            ENTERPRISE
          </p>

          <h3 className="mt-4 text-3xl font-black text-white">
            REALTIME
          </h3>

          <p className="mt-3 text-slate-400">
            Comunicação sincronizada entre cliente, motorista e central.
          </p>

        </div>

      </div>

      {/* OPERATIONAL INFO */}
      <div className="mt-8 rounded-[2rem] border border-white/5 bg-slate-900/70 p-8">

        <h2 className="text-2xl font-black text-white">
          Central logística inteligente
        </h2>

        <p className="mt-4 max-w-4xl text-lg leading-relaxed text-slate-400">
          O sistema FRETOGO monitora automaticamente motoristas online,
          localização em tempo real, categoria compatível, distância da coleta,
          redispatch operacional e sincronização completa das corridas.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
            <h3 className="font-black text-cyan-400">
              Match inteligente
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Motoristas recebem apenas cargas compatíveis com veículo e proximidade.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
            <h3 className="font-black text-cyan-400">
              Distribuição automática
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              O sistema redispara automaticamente caso o frete seja recusado.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
            <h3 className="font-black text-cyan-400">
              Rastreamento realtime
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Cliente acompanha coleta, transporte e entrega em tempo real.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
