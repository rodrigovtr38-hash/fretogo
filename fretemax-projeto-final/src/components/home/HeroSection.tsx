
import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-cyan-500/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12),transparent_55%)]" />

      <div className="relative z-10 app-container">
        <div className="flex min-h-[92vh] flex-col items-center justify-center gap-14 py-20 lg:grid lg:grid-cols-2 lg:gap-20">

          {/* TEXTO */}
          <div className="w-full max-w-2xl text-center lg:text-left">
            <div className="mb-5 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
              Radar ativo em sua região
            </div>

            <h1 className="text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl md:text-6xl xl:text-7xl">
              Sua carga no{' '}
              <span className="text-cyan-400">
                radar.
              </span>

              <br />

              O motorista na{' '}
              <span className="text-yellow-400">
                porta.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg md:text-xl">
              Plataforma logística inteligente para conectar clientes e motoristas
              em tempo real com rastreamento, matching automático e fretes sob demanda.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">

              <Link
                to="/cliente"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-cyan-400 px-8 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.35)] transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-300"
              >
                Contratar frete
              </Link>

              <Link
                to="/motorista"
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/60 px-8 text-sm font-black uppercase tracking-wide text-white transition-all duration-300 hover:border-cyan-400 hover:bg-slate-800"
              >
                Sou motorista
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">

              <div className="rounded-2xl border border-cyan-500/10 bg-slate-900/40 p-4 backdrop-blur-sm">
                <div className="text-2xl font-black text-cyan-400">
                  24h
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Operação realtime
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-500/10 bg-slate-900/40 p-4 backdrop-blur-sm">
                <div className="text-2xl font-black text-cyan-400">
                  7
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Categorias
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-500/10 bg-slate-900/40 p-4 backdrop-blur-sm">
                <div className="text-2xl font-black text-cyan-400">
                  ETA
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Rastreamento vivo
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-500/10 bg-slate-900/40 p-4 backdrop-blur-sm">
                <div className="text-2xl font-black text-cyan-400">
                  IA
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Matching inteligente
                </div>
              </div>

            </div>
          </div>

          {/* VISUAL */}
          <div className="relative flex w-full items-center justify-center">

            <div className="absolute h-[24rem] w-[24rem] rounded-full bg-cyan-500/20 blur-3xl md:h-[34rem] md:w-[34rem]" />

            <div className="relative flex h-[560px] w-[290px] items-center justify-center rounded-[42px] border border-slate-700 bg-[#020817] shadow-[0_0_80px_rgba(0,0,0,0.6)]">

              <div className="absolute inset-4 rounded-[32px] border border-cyan-500/10 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.14),transparent_70%)]" />

              <div className="relative z-10 flex w-full flex-col gap-5 px-5">

                <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-4 backdrop-blur-sm">
                  <div className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                    Motorista próximo
                  </div>

                  <div className="mt-2 text-lg font-black text-white">
                    Ricardo S.
                  </div>

                  <div className="mt-1 text-sm text-slate-400">
                    2.4km da coleta
                  </div>
                </div>

                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                  <div className="text-xs font-black uppercase tracking-widest text-yellow-300">
                    ETA atualizado
                  </div>

                  <div className="mt-2 text-3xl font-black text-white">
                    08 min
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">
                      Status
                    </span>

                    <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold text-cyan-300">
                      Em rota
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-[72%] rounded-full bg-cyan-400" />
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
