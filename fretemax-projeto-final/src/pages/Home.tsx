import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  ShieldCheck,
  Zap,
  Truck,
  MapPin,
  Star,
  ChevronRight,
  Download,
} from 'lucide-react';

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  const benefits = [
    {
      icon: (
        <Zap className="h-7 w-7 text-yellow-400" />
      ),
      title: 'Agilidade',
      description: 'Match em menos de 1 minuto',
    },

    {
      icon: (
        <ShieldCheck className="h-7 w-7 text-green-400" />
      ),
      title: 'Segurança',
      description: 'Motoristas verificados',
    },

    {
      icon: (
        <MapPin className="h-7 w-7 text-cyan-400" />
      ),
      title: 'Radar Vivo',
      description: 'Rastreamento em tempo real',
    },

    {
      icon: (
        <Star className="h-7 w-7 text-orange-400" />
      ),
      title: 'Zero Taxa',
      description:
        'Sem mensalidades escondidas',
    },
  ];

  return (
    <div className="relative isolate w-full overflow-hidden bg-[#020617] text-white">

      {/* =====================================================
          BACKGROUND SYSTEM
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.95),rgba(2,6,23,1))]" />

        <div className="absolute left-[-12%] top-[-10%] h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute right-[-10%] top-[12%] h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute bottom-[-12%] left-[20%] h-[24rem] w-[24rem] rounded-full bg-cyan-400/5 blur-3xl" />

      </div>

      {/* =====================================================
          RADAR
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">

        <div className="relative flex h-[880px] w-[880px] items-center justify-center opacity-[0.18] md:h-[1100px] md:w-[1100px]">

          <div className="absolute inset-0 rounded-full border border-cyan-400/10" />

          <div className="absolute inset-[14%] rounded-full border border-cyan-400/10" />

          <div className="absolute inset-[28%] rounded-full border border-cyan-400/10" />

          <div className="absolute inset-[42%] rounded-full border border-cyan-400/5" />

        </div>

      </div>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">

          <div className="glass-card relative w-full max-w-sm overflow-hidden border border-cyan-500/20 p-10 text-center">

            <div className="absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

            <Download className="glow-yellow mx-auto mb-6 h-16 w-16 text-yellow-400" />

            <h3 className="mb-4 text-2xl font-black uppercase italic tracking-tight text-white">
              App Em Breve
            </h3>

            <p className="mb-8 text-sm leading-relaxed text-slate-400">
              O aplicativo oficial da FRETOGO está sendo publicado nas lojas.
              Enquanto isso, você já pode usar o sistema completo pelo navegador.
            </p>

            <button
              onClick={() =>
                setShowModal(false)
              }
              className="glow-cyan-sm w-full rounded-2xl bg-cyan-500 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950"
            >
              Entendi
            </button>

          </div>

        </div>
      )}

      {/* =====================================================
          WHATSAPP
      ===================================================== */}

      <a
        href="https://wa.me/5511946099840"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 rounded-full bg-[#25D366] p-4 shadow-[0_12px_32px_rgba(37,211,102,0.22)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 fill-white"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207" />
        </svg>
      </a>

      {/* =====================================================
          ROOT
      ===================================================== */}

      <div className="relative z-10 flex min-h-screen w-full flex-col">

        {/* =====================================================
            NAVBAR
        ===================================================== */}

        <header className="relative z-20 w-full">

          <nav className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-5 py-6 md:px-8">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/10 bg-slate-900/70">

                <Zap className="h-6 w-6 fill-cyan-400 text-cyan-400" />

              </div>

              <span className="text-2xl font-black italic tracking-tight text-white">
                FRETOGO
              </span>

            </div>

            <div className="hidden items-center gap-10 lg:flex">

              <Link
                to="/contratar"
                className="text-sm font-bold text-slate-300 transition-colors hover:text-cyan-300"
              >
                Simular Frete
              </Link>

              <Link
                to="/parceiros"
                className="text-sm font-bold text-slate-300 transition-colors hover:text-white"
              >
                Sou Motorista
              </Link>

            </div>

          </nav>

        </header>

        {/* =====================================================
            HERO
        ===================================================== */}

        <main className="relative flex flex-1 items-center">

          <section className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-16 px-5 pb-20 pt-4 md:px-8 lg:grid-cols-2 lg:gap-8 lg:pb-28 lg:pt-10">

            {/* =================================================
                LEFT
            ================================================= */}

            <div className="relative z-10 flex w-full max-w-[680px] flex-col justify-center">

              {/* Badge */}

              <div className="mb-7 inline-flex w-fit items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-950/20 px-5 py-2.5">

                <span className="relative flex h-2.5 w-2.5">

                  <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60 animate-ping" />

                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />

                </span>

                <span className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">
                  Radar ativo em sua região
                </span>

              </div>

              {/* Headline */}

              <h1 className="max-w-[760px] text-[3.2rem] font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-[4.5rem] lg:text-[5.8rem]">

                SUA CARGA NO{' '}

                <span className="text-gradient-cyan italic">
                  RADAR
                </span>

                .<br />

                O MOTORISTA NA{' '}

                <span className="italic text-yellow-400">
                  PORTA
                </span>

                .

              </h1>

              {/* Description */}

              <p className="mt-8 max-w-[580px] text-lg leading-relaxed text-slate-300 md:text-[1.2rem]">

                A primeira plataforma de fretes autônoma com matching inteligente.
                Contrate em segundos e acompanhe tudo em tempo real.

                <span className="mt-5 block text-xl font-bold text-white">
                  Sem mensalidade. Sem burocracia.
                </span>

              </p>

              {/* CTA */}

              <div className="mt-12 flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">

                <Link
                  to="/contratar"
                  className="group flex min-h-[70px] items-center justify-center gap-3 rounded-[1.5rem] bg-cyan-500 px-10 py-5 text-[14px] font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_18px_45px_rgba(34,211,238,0.18)]"
                >

                  Contratar Frete

                  <ChevronRight
                    size={20}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />

                </Link>

                <Link
                  to="/parceiros"
                  className="glass-card flex min-h-[70px] items-center justify-center border border-white/10 px-10 py-5 text-[14px] font-black uppercase tracking-[0.22em] text-white"
                >
                  Ser Motorista
                </Link>

                <button
                  onClick={() =>
                    setShowModal(true)
                  }
                  className="flex min-h-[70px] items-center justify-center gap-3 rounded-[1.5rem] bg-yellow-400 px-10 py-5 text-[14px] font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_18px_45px_rgba(250,204,21,0.14)]"
                >

                  <Download size={18} />

                  Baixar App

                </button>

              </div>

            </div>

            {/* =================================================
                RIGHT
            ================================================= */}

            <div className="relative flex w-full items-center justify-center pt-8 lg:pt-0">

              {/* Verified */}

              <div className="absolute left-[2%] top-[28%] z-30 hidden rounded-2xl border border-green-500/20 bg-slate-900/85 px-5 py-4 backdrop-blur-md xl:flex">

                <div className="flex items-center gap-3">

                  <ShieldCheck className="h-6 w-6 text-green-400" />

                  <span className="text-xs font-black uppercase tracking-[0.25em] text-white">
                    Verificado
                  </span>

                </div>

              </div>

              {/* Phone */}

              <div className="relative flex w-full items-center justify-center">

                <div className="glass-card relative aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[3rem] border border-white/10 bg-slate-950/90 shadow-[0_40px_80px_rgba(0,0,0,0.55)]">

                  {/* Ambient */}

                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(34,211,238,0.06),transparent_45%,rgba(59,130,246,0.04))]" />

                  {/* Radar */}

                  <div className="absolute inset-0 flex items-center justify-center">

                    <div className="relative h-64 w-64">

                      <div className="absolute inset-0 rounded-full border border-cyan-400/15" />

                      <div className="absolute inset-[18%] rounded-full border border-cyan-400/10" />

                    </div>

                  </div>

                  {/* Card */}

                  <div className="absolute left-1/2 top-1/2 z-20 w-[84%] -translate-x-1/2 -translate-y-1/2">

                    <div className="glass-card premium-card border border-white/10 p-5">

                      <div className="flex items-center gap-4">

                        <div className="rounded-2xl bg-yellow-400 p-3">

                          <Truck className="h-5 w-5 text-slate-950" />

                        </div>

                        <div>

                          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                            Motorista Próximo
                          </p>

                          <p className="text-sm font-black italic text-white">
                            Ricardo S. • 2.4km
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </section>

        </main>

        {/* =====================================================
            BENEFITS
        ===================================================== */}

        <section className="relative w-full border-t border-white/5">

          <div className="absolute inset-0 bg-slate-900/20" />

          <div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 py-20 md:px-8">

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">

              {benefits.map(
                (item, index) => (
                  <div
                    key={index}
                    className="glass-card premium-card flex h-full flex-col items-start gap-6 border border-white/10 p-8"
                  >

                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70">

                      {item.icon}

                    </div>

                    <div>

                      <h3 className="mb-2 text-lg font-black uppercase italic tracking-wide text-white">
                        {item.title}
                      </h3>

                      <p className="text-sm leading-relaxed text-slate-400">
                        {item.description}
                      </p>

                    </div>

                  </div>
                ),
              )}

            </div>

          </div>

        </section>

      </div>

    </div>
  );
}
