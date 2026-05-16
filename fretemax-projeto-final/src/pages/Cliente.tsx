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
        <Zap className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" />
      ),
      title: 'Agilidade',
      description: 'Match em menos de 1 minuto',
    },
    {
      icon: (
        <ShieldCheck className="h-7 w-7 text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
      ),
      title: 'Segurança',
      description: 'Motoristas verificados',
    },
    {
      icon: (
        <MapPin className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
      ),
      title: 'Radar Vivo',
      description: 'Rastreamento em tempo real',
    },
    {
      icon: (
        <Star className="h-7 w-7 text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.8)]" />
      ),
      title: 'Zero Taxa',
      description: 'Sem mensalidades escondidas',
    },
  ];

  return (
    <div className="relative isolate w-full overflow-hidden bg-[#020617] text-white selection:bg-cyan-500/30 selection:text-cyan-50">

      {/* =====================================================
          BACKGROUND SYSTEM
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Dark base more vibrant */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-[#020617]"></div>

        {/* Ambient Glows */}
        <div className="absolute left-[-10%] top-[-5%] h-[40rem] w-[40rem] rounded-full bg-cyan-500/15 blur-[120px] mix-blend-screen" />
        <div className="absolute right-[-10%] top-[15%] h-[35rem] w-[35rem] rounded-full bg-blue-600/15 blur-[140px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[20%] h-[30rem] w-[50rem] rounded-full bg-cyan-400/5 blur-[100px] mix-blend-screen" />
      </div>

      {/* =====================================================
          RADAR SYSTEM
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-30 mix-blend-screen">
        <div className="relative flex h-[1000px] w-[1000px] items-center justify-center md:h-[1200px] md:w-[1200px]">
          <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_40px_rgba(6,182,212,0.15)]" />
          <div className="absolute inset-[15%] rounded-full border border-cyan-400/20 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-[30%] rounded-full border border-cyan-300/10 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]" style={{ animationDelay: '4s' }} />
        </div>
      </div>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card relative w-full max-w-sm overflow-hidden border border-cyan-500/20 p-10 text-center shadow-[0_0_60px_rgba(6,182,212,0.15)]">
            <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
            <Download className="mx-auto mb-6 h-16 w-16 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]" />
            <h3 className="mb-4 text-2xl font-black uppercase italic tracking-tight text-white">
              App Em Breve
            </h3>
            <p className="mb-8 text-sm leading-relaxed text-slate-400 font-medium">
              O aplicativo oficial da FRETOGO está sendo publicado nas lojas.
              Enquanto isso, você já pode usar o sistema completo pelo navegador.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full rounded-2xl bg-cyan-500 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
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
        className="fixed bottom-6 right-6 z-50 rounded-full bg-[#25D366] p-4 shadow-[0_12px_32px_rgba(37,211,102,0.3)] hover:scale-110 active:scale-95 hover:bg-[#20bd5a] transition-all duration-300 group"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white group-hover:animate-pulse">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/10 bg-slate-900/70 shadow-inner">
                <Zap className="h-6 w-6 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              </div>
              <span className="text-2xl font-black italic tracking-tight text-white drop-shadow-sm">
                FRETOGO
              </span>
            </div>

            <div className="hidden items-center gap-10 lg:flex">
              <Link to="/contratar" className="text-sm font-bold text-slate-300 transition-colors hover:text-cyan-300">
                Simular Frete
              </Link>
              <Link to="/parceiros" className="text-sm font-bold text-slate-300 transition-colors hover:text-white">
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
              <div className="mb-7 inline-flex w-fit items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-950/40 px-5 py-2.5 backdrop-blur-md shadow-[0_4px_20px_rgba(6,182,212,0.15)]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300 drop-shadow-sm">
                  Radar ativo em sua região
                </span>
              </div>

              {/* Headline */}
              <h1 className="max-w-[760px] text-[3.2rem] font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-[4.5rem] lg:text-[5.8rem]">
                SUA CARGA NO{' '}
                <span className="text-gradient-cyan italic drop-shadow-[0_0_25px_rgba(6,182,212,0.5)]">
                  RADAR
                </span>
                .<br />
                O MOTORISTA NA{' '}
                <span className="italic text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                  PORTA
                </span>
                .
              </h1>

              {/* Description */}
              <p className="mt-8 max-w-[580px] text-lg leading-relaxed text-slate-300 md:text-[1.2rem] font-medium drop-shadow-sm">
                A primeira plataforma de fretes autônoma com matching inteligente.
                Contrate em segundos e acompanhe tudo em tempo real.
                <span className="mt-5 block text-xl font-bold text-white drop-shadow-md">
                  Sem mensalidade. Sem burocracia.
                </span>
              </p>

              {/* CTA (AJUSTADO: Padding maior, height maior, gaps maiores, estilo premium) */}
              <div className="mt-12 flex w-full flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  to="/contratar"
                  className="group flex min-h-[76px] items-center justify-center gap-3 rounded-[1.25rem] bg-cyan-500 px-12 py-6 text-[15px] font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_15px_40px_rgba(6,182,212,0.4)] transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-400 active:scale-95 sm:w-auto"
                >
                  Contratar Frete
                  <ChevronRight
                    size={22}
                    className="transition-transform duration-300 group-hover:translate-x-1.5"
                  />
                </Link>

                <Link
                  to="/parceiros"
                  className="flex min-h-[76px] items-center justify-center rounded-[1.25rem] border border-slate-600 bg-slate-800/60 px-12 py-6 text-[15px] font-black uppercase tracking-[0.22em] text-white backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-slate-500 hover:bg-slate-700 sm:w-auto"
                >
                  Ser Motorista
                </Link>

                <button
                  onClick={() => setShowModal(true)}
                  className="flex min-h-[76px] items-center justify-center gap-3 rounded-[1.25rem] bg-yellow-400 px-12 py-6 text-[15px] font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_15px_35px_rgba(250,204,21,0.35)] transition-all duration-300 hover:scale-[1.02] hover:bg-yellow-300 active:scale-95 sm:w-auto"
                >
                  <Download size={20} />
                  Baixar App
                </button>
              </div>

            </div>

            {/* =================================================
                RIGHT
            ================================================= */}

            <div className="relative flex w-full items-center justify-center pt-8 lg:pt-0">

              {/* Verified */}
              <div className="absolute left-[2%] top-[28%] z-30 hidden rounded-2xl border border-green-500/30 bg-slate-900/90 px-6 py-5 backdrop-blur-xl xl:flex shadow-[0_15px_30px_rgba(0,0,0,0.5)] animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-7 w-7 text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.6)]" />
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-white">
                    Verificado
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div className="relative flex w-full items-center justify-center">
                <div className="relative aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[3rem] border-[6px] border-slate-800/80 bg-slate-950 shadow-[0_40px_80px_rgba(0,0,0,0.8),0_0_50px_rgba(6,182,212,0.2)] backdrop-blur-sm gpu-accelerated">

                  {/* Ambient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10" />

                  {/* Radar Pulse Interno Celular */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative h-48 w-48">
                      <div className="absolute inset-0 rounded-full bg-cyan-500/15 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                      <div className="absolute inset-4 rounded-full bg-cyan-400/15 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '0.8s' }} />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="absolute left-1/2 top-1/2 z-20 w-[84%] -translate-x-1/2 -translate-y-1/2">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-md animate-[bounce_4s_infinite]">
                      <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-yellow-400 p-3 shadow-inner">
                          <Truck className="h-5 w-5 text-slate-950 drop-shadow-sm" />
                        </div>
                        <div>
                          <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
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
            BENEFITS (AJUSTADO: Centralizado, Padding, Glow)
        ===================================================== */}

        <section className="relative w-full border-t border-white/5 mt-auto">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-none" />

          {/* Wrapper interno com justify-center para centralizar a grid */}
          <div className="relative z-10 mx-auto flex w-full max-w-[1400px] justify-center px-5 py-20 md:px-8">
            
            {/* Grid controlada */}
            <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">

              {benefits.map((item, index) => (
                <div
                  key={index}
                  className="group flex flex-col items-center sm:items-start gap-6 rounded-[2rem] border border-white/10 bg-slate-900/50 p-10 shadow-[0_15px_40px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-900/80 hover:shadow-[0_15px_50px_rgba(6,182,212,0.15)] text-center sm:text-left w-full"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950 shadow-inner transition-transform duration-300 group-hover:scale-110">
                    {item.icon}
                  </div>

                  <div className="flex flex-col">
                    <h3 className="mb-2 text-lg font-black uppercase italic tracking-wide text-white transition-colors group-hover:text-cyan-50">
                      {item.title}
                    </h3>
                    <p className="text-sm font-medium leading-relaxed text-slate-400">
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
