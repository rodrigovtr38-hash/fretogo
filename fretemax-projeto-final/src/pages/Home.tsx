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
        <Zap className="text-yellow-400 w-7 h-7" />
      ),
      title: 'Agilidade',
      description: 'Match em menos de 1 minuto',
    },

    {
      icon: (
        <ShieldCheck className="text-green-400 w-7 h-7" />
      ),
      title: 'Segurança',
      description: 'Motoristas verificados',
    },

    {
      icon: (
        <MapPin className="text-cyan-400 w-7 h-7" />
      ),
      title: 'Radar Vivo',
      description: 'Rastreamento em tempo real',
    },

    {
      icon: (
        <Star className="text-orange-400 w-7 h-7" />
      ),
      title: 'Zero Taxa',
      description: 'Sem mensalidades escondidas',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020617] text-white">

      {/* =====================================================
          BACKGROUND SYSTEM
      ===================================================== */}

      <div className="absolute inset-0 pointer-events-none">

        {/* Base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.95),rgba(2,6,23,1))]" />

        {/* Ambient Top */}
        <div className="floating-ambient top-[-10%] left-[-5%] w-[32rem] h-[32rem] bg-cyan-500" />

        {/* Ambient Right */}
        <div className="floating-ambient top-[18%] right-[-10%] w-[28rem] h-[28rem] bg-blue-500 opacity-[0.08]" />

        {/* Ambient Bottom */}
        <div className="floating-ambient bottom-[-12%] left-[20%] w-[24rem] h-[24rem] bg-cyan-400 opacity-[0.05]" />

      </div>

      {/* =====================================================
          RADAR SYSTEM
      ===================================================== */}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">

        <div className="relative w-[1100px] h-[1100px] md:w-[1350px] md:h-[1350px] opacity-[0.22]">

          <div className="absolute inset-0 rounded-full border border-cyan-400/20 radar-pulse" />

          <div className="absolute inset-[14%] rounded-full border border-cyan-400/10 radar-pulse" />

          <div className="absolute inset-[28%] rounded-full border border-cyan-400/10 radar-pulse" />

          <div className="absolute inset-[42%] rounded-full border border-cyan-300/10" />

        </div>

      </div>

      {/* =====================================================
          MODAL APP
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="glass-card relative w-full max-w-sm overflow-hidden border border-cyan-500/20 p-10 text-center">

            <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

            <Download className="mx-auto mb-6 h-16 w-16 text-yellow-400 glow-yellow" />

            <h3 className="mb-4 text-2xl font-black uppercase italic tracking-tight text-white">
              App Em Breve
            </h3>

            <p className="mb-8 text-sm leading-relaxed text-slate-400">
              O aplicativo oficial da FRETOGO está sendo publicado nas lojas.
              Enquanto isso, você já pode usar o sistema completo pelo navegador.
            </p>

            <button
              onClick={() => setShowModal(false)}
              className="w-full rounded-2xl bg-cyan-500 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950 glow-cyan-sm"
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
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487" />
        </svg>
      </a>

      {/* =====================================================
          MAIN WRAPPER
      ===================================================== */}

      <div className="relative z-10 flex min-h-screen flex-col">

        {/* =====================================================
            NAVBAR
        ===================================================== */}

        <header className="w-full">

          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7">

            <div className="flex items-center gap-3">

              <Zap className="h-8 w-8 fill-cyan-400 text-cyan-400 glow-cyan-sm" />

              <span className="text-2xl font-black italic tracking-tighter text-white">
                FRETOGO
              </span>

            </div>

            <div className="hidden items-center gap-10 md:flex">

              <Link
                to="/contratar"
                className="text-sm font-bold text-slate-300 hover:text-cyan-300"
              >
                Simular Frete
              </Link>

              <Link
                to="/parceiros"
                className="text-sm font-bold text-slate-300 hover:text-white"
              >
                Sou Motorista
              </Link>

            </div>

          </nav>

        </header>

        {/* =====================================================
            HERO
        ===================================================== */}

        <main className="flex flex-1 items-center">

          <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-20 px-6 pb-24 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-16">

            {/* =====================================================
                LEFT CONTENT
            ===================================================== */}

            <div className="relative z-10 flex w-full max-w-[640px] flex-col items-start justify-center">

              {/* Badge */}

              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-950/30 px-5 py-2.5 backdrop-blur-sm">

                <span className="relative flex h-2.5 w-2.5">

                  <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60 radar-pulse" />

                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 glow-cyan-sm" />

                </span>

                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-cyan-300">
                  Radar ativo em sua região
                </span>

              </div>

              {/* Headline */}

              <h1 className="max-w-[780px] text-5xl font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">

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

              <p className="mt-8 max-w-[560px] text-lg leading-relaxed text-slate-300 md:text-xl">

                A primeira plataforma de fretes autônoma com matching inteligente.
                Contrate em segundos e acompanhe tudo em tempo real.

                <span className="mt-4 block text-xl font-bold text-white">
                  Sem mensalidade. Sem burocracia.
                </span>

              </p>

              {/* CTA */}

              <div className="mt-12 flex w-full flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center">

                <Link
                  to="/contratar"
                  className="group flex min-h-[68px] items-center justify-center gap-3 rounded-[1.4rem] bg-cyan-500 px-10 py-5 text-[14px] font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_18px_45px_rgba(34,211,238,0.22)]"
                >

                  Contratar Frete

                  <ChevronRight
                    size={20}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />

                </Link>

                <Link
                  to="/parceiros"
                  className="glass-card flex min-h-[68px] items-center justify-center border border-white/10 px-10 py-5 text-[14px] font-black uppercase tracking-[0.22em] text-white"
                >
                  Ser Motorista
                </Link>

                <button
                  onClick={() => setShowModal(true)}
                  className="flex min-h-[68px] items-center justify-center gap-3 rounded-[1.4rem] bg-yellow-400 px-10 py-5 text-[14px] font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_18px_45px_rgba(250,204,21,0.18)]"
                >

                  <Download size={18} />

                  Baixar App

                </button>

              </div>

            </div>

            {/* =====================================================
                RIGHT CONTENT
            ===================================================== */}

            <div className="relative flex w-full items-center justify-center">

              {/* Verified Badge */}

              <div className="absolute left-0 top-[28%] z-30 hidden rounded-2xl border border-green-500/20 bg-slate-900/90 px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-md xl:flex">

                <div className="flex items-center gap-3">

                  <ShieldCheck className="h-6 w-6 text-green-400" />

                  <span className="text-xs font-black uppercase tracking-[0.25em] text-white">
                    Verificado
                  </span>

                </div>

              </div>

              {/* Phone */}

              <div className="relative w-full max-w-[320px] xl:max-w-[350px]">

                <div className="glass-card relative aspect-[9/16] overflow-hidden rounded-[3rem] border border-white/10 bg-slate-950/90 shadow-[0_40px_80px_rgba(0,0,0,0.55)]">

                  {/* Background */}

                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),transparent_45%,rgba(59,130,246,0.06))]" />

                  {/* Radar */}

                  <div className="absolute inset-0 flex items-center justify-center">

                    <div className="relative h-56 w-56">

                      <div className="absolute inset-0 rounded-full border border-cyan-400/20 radar-pulse" />

                      <div className="absolute inset-[18%] rounded-full border border-cyan-400/10 radar-pulse" />

                    </div>

                  </div>

                  {/* Floating Card */}

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

        <section className="relative w-full overflow-hidden border-t border-white/5">

          <div className="absolute inset-0 bg-slate-900/20" />

          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">

              {benefits.map((item, index) => (

                <div
                  key={index}
                  className="glass-card premium-card flex h-full flex-col items-start gap-6 border border-white/10 p-8 text-left"
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

              ))}

            </div>

          </div>

        </section>

      </div>

    </div>
  );
}
