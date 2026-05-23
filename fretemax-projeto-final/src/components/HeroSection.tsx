import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Download,
  ShieldCheck,
  Truck,
} from 'lucide-react';

type Props = {
  onOpenModal: () => void;
};

export default function HeroSection({
  onOpenModal,
}: Props) {
  return (
    <main className="relative z-20 flex w-full flex-1 items-center justify-center">
      <section className="app-container grid min-h-[calc(100dvh-120px)] grid-cols-1 items-center gap-14 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">

        {/* LEFT */}
        <div className="flex w-full flex-col">

          <div className="mb-8 inline-flex w-fit items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-950/40 px-5 py-2.5 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
            </span>

            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
              Radar ativo em sua região
            </span>
          </div>

          <h1 className="max-w-[900px] text-5xl font-black leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
            SUA CARGA NO{' '}
            <span className="italic text-cyan-400">
              RADAR
            </span>
            . <br />

            O MOTORISTA NA{' '}
            <span className="italic text-yellow-400">
              PORTA
            </span>
            .
          </h1>

          <p className="mt-8 max-w-[640px] text-base leading-relaxed text-slate-300 md:text-xl">
            Plataforma inteligente de fretes em tempo real.
            Solicite cargas, encontre motoristas próximos
            e acompanhe tudo com rastreamento ao vivo.
          </p>

          <div className="mt-10 flex flex-col gap-4 md:flex-row md:flex-wrap">

            <Link
              to="/cliente"
              className="group flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-8 py-5 text-sm font-black uppercase tracking-wider text-slate-950 transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-400"
            >
              Contratar Frete

              <ChevronRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <Link
              to="/motorista"
              className="flex min-h-[64px] items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70 px-8 py-5 text-sm font-black uppercase tracking-wider text-white backdrop-blur-md transition-all duration-300 hover:border-cyan-500"
            >
              Ser Motorista
            </Link>

            <button
              onClick={onOpenModal}
              className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-white px-8 py-5 text-sm font-black uppercase tracking-wider text-black transition-all duration-300 hover:scale-[1.02]"
            >
              <Download size={20} />

              Baixar App
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="relative flex w-full items-center justify-center">

          <div className="relative aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-[3rem] border-[6px] border-slate-800 bg-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.9)]">

            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10" />

            <div className="absolute inset-0 flex items-center justify-center">

              <div className="relative h-48 w-48">
                <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/10" />
                <div className="absolute inset-5 animate-ping rounded-full bg-cyan-400/10 [animation-delay:1s]" />
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 z-20 w-[85%] -translate-x-1/2 -translate-y-1/2">

              <div className="rounded-2xl border border-white/10 bg-slate-900/95 p-4 backdrop-blur-md">

                <div className="flex items-center gap-3">

                  <div className="rounded-xl bg-yellow-400 p-2.5">
                    <Truck className="h-5 w-5 text-slate-950" />
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Motorista Próximo
                    </p>

                    <p className="text-sm font-black text-white">
                      Ricardo S. • 2.4km
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute left-0 top-[28%] hidden items-center gap-3 rounded-2xl border border-green-500/30 bg-slate-900/90 px-5 py-4 backdrop-blur-xl md:flex">

            <ShieldCheck className="h-7 w-7 text-green-400" />

            <span className="text-sm font-black uppercase tracking-widest text-white">
              Verificado
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
