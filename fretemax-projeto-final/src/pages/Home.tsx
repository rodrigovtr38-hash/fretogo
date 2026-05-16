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
      icon: <Zap className="h-6 w-6 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />,
      title: 'Agilidade',
      description: 'Match inteligente em menos de 1 minuto.',
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.6)]" />,
      title: 'Segurança',
      description: '100% dos motoristas com CNH validada.',
    },
    {
      icon: <MapPin className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]" />,
      title: 'Radar Vivo',
      description: 'Rastreamento ponta a ponta realtime.',
    },
    {
      icon: <Star className="h-6 w-6 text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.6)]" />,
      title: 'Zero Taxa',
      description: 'Plataforma sem mensalidades escondidas.',
    },
  ];

  return (
    <div className="relative w-full min-h-screen bg-[#020617] text-white flex flex-col">

      {/* =====================================================
          BACKGROUND SYSTEM (CINEMATIC)
      ===================================================== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-[#020617]"></div>
        {/* Glows mais abertos e centralizados para dar profundidade sem borrar */}
        <div className="absolute left-[-15%] top-[-5%] h-[55rem] w-[55rem] rounded-full bg-cyan-600/20 blur-[160px] mix-blend-screen" />
        <div className="absolute right-[-10%] top-[15%] h-[45rem] w-[45rem] rounded-full bg-blue-600/20 blur-[180px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[20%] h-[35rem] w-[65rem] rounded-full bg-cyan-400/10 blur-[140px] mix-blend-screen" />
      </div>

      {/* =====================================================
          RADAR SYSTEM (CONTAINMENT E ELEGÂNCIA PREMIUM)
      ===================================================== */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-0 opacity-60 mix-blend-screen">
        <div className="relative flex h-[1000px] w-[1000px] md:h-[1200px] md:w-[1200px] items-center justify-center gpu-accelerated overflow-hidden">
          <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_40px_rgba(6,182,212,0.2),0_0_20px_rgba(6,182,212,0.1)] bg-cyan-500/5" />
          <div className="absolute inset-[15%] rounded-full border border-cyan-400/25 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_30px_rgba(6,182,212,0.2),0_0_15px_rgba(6,182,212,0.1)] bg-cyan-400/5" style={{ animationDelay: '1.5s' }} />
          <div className="absolute inset-[30%] rounded-full border border-cyan-300/20 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_20px_rgba(6,182,212,0.2),0_0_10px_rgba(6,182,212,0.1)] bg-cyan-300/5" style={{ animationDelay: '3s' }} />
        </div>
      </div>

      {/* =====================================================
          MODAL (SAFE AREA)
      ===================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card relative w-full max-w-sm overflow-hidden p-10 text-center shadow-[0_0_60px_rgba(250,204,21,0.15)] border-yellow-400/20">
            <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
            <Download className="mx-auto mb-6 h-16 w-16 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            <h3 className="mb-3 text-2xl font-black uppercase italic tracking-tight text-white">
              App Em Breve
            </h3>
            <p className="mb-8 text-sm leading-relaxed text-slate-300 font-medium">
              O aplicativo oficial da FRETOGO está sendo publicado nas lojas.
              Enquanto isso, você já pode usar o sistema completo pelo navegador.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full rounded-[1.25rem] bg-cyan-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:bg-cyan-400 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          WHATSAPP (FLOATING PREMIUM)
      ===================================================== */}
      <a
        href="https://wa.me/5511946099840"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-[100] rounded-full bg-[#25D366] p-4 shadow-[0_10px_35px_rgba(37,211,102,0.4)] hover:bg-[#20bd5a] hover:scale-110 active:scale-95 transition-all duration-300 group"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white group-hover:animate-pulse">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487" />
        </svg>
      </a>

      {/* =====================================================
          NAVBAR (MAX-WIDTH CENTRALIZADO)
      ===================================================== */}
      <header className="relative z-30 w-full">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
            <span className="text-2xl font-black italic tracking-tighter text-white">
              FRETOGO
            </span>
          </div>
          <div className="hidden items-center gap-10 md:flex">
            <Link to="/contratar" className="text-sm font-bold text-slate-300 transition-colors hover:text-cyan-400">
              Simular Frete
            </Link>
            <Link to="/parceiros" className="text-sm font-bold text-slate-300 transition-colors hover:text-white">
              Sou Motorista
            </Link>
          </div>
        </nav>
      </header>

      {/* =====================================================
          HERO MAIN (ORCHESTRATION & BALANCE)
      ===================================================== */}
      <main className="relative z-20 flex w-full flex-1 items-center justify-center">
        {/* GRID PROPORCIONAL: 1.1fr (Texto) / 0.9fr (Celular) evita esmagamento */}
        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center justify-items-center gap-16 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:py-24">

          {/* =================== LEFT COLUMN =================== */}
          <div className="flex w-full max-w-[620px] flex-col justify-center lg:justify-self-start">
            
            {/* Badge Premium */}
            <div className="mb-8 inline-flex w-fit items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-950/40 px-5 py-2.5 backdrop-blur-md shadow-[0_4px_25px_rgba(6,182,212,0.15)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300 drop-shadow-sm">
                Radar ativo em sua região
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white md:text-6xl lg:text-[4.5rem]">
              SUA CARGA NO{' '}
              <span className="text-gradient-cyan italic drop-shadow-[0_0_35px_rgba(6,182,212,0.6)]">RADAR</span>.<br />
              O MOTORISTA NA{' '}
              <span className="italic text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]">PORTA</span>.
            </h1>

            {/* Subheadline */}
            <p className="mt-8 max-w-[560px] text-lg font-medium leading-relaxed text-slate-300 drop-shadow-sm md:text-xl">
              A primeira plataforma de fretes autônoma com matching inteligente.
              Contrate em segundos e acompanhe tudo em tempo real.
              <span className="mt-4 block text-xl font-bold text-white drop-shadow-md">
                Sem mensalidade. Sem burocracia.
              </span>
            </p>

            {/* Call To Actions (Mobile Stack / Desktop Row) */}
            <div className="mt-12 flex w-full flex-col gap-5 sm:flex-row sm:flex-wrap">
              <Link
                to="/contratar"
                className="group flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.25rem] bg-cyan-500 px-10 py-5 text-[15px] font-black uppercase italic tracking-widest text-slate-950 shadow-[0_15px_40px_rgba(6,182,212,0.4)] transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-400 active:scale-95 sm:w-auto"
              >
                Contratar Frete
                <ChevronRight size={20} className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>

              <Link
                to="/parceiros"
                className="flex min-h-[72px] w-full items-center justify-center rounded-[1.25rem] border border-slate-600 bg-slate-800/60 px-10 py-5 text-[15px] font-black uppercase italic tracking-widest text-white backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-slate-500 hover:bg-slate-700 sm:w-auto"
              >
                Ser Motorista
              </Link>

              <button
                onClick={() => setShowModal(true)}
                className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[1.25rem] bg-yellow-400 px-10 py-5 text-[15px] font-black uppercase italic tracking-widest text-slate-950 shadow-[0_15px_35px_rgba(250,204,21,0.35)] transition-all duration-300 hover:scale-[1.02] hover:bg-yellow-300 active:scale-95 sm:w-auto"
              >
                <Download size={20} />
                Baixar App
              </button>
            </div>
          </div>

          {/* =================== RIGHT COLUMN =================== */}
          <div className="relative flex w-full items-center justify-center lg:justify-self-end mt-8 lg:mt-0">
            
            {/* Box do Celular */}
            <div className="relative w-full max-w-[320px] lg:max-w-[340px] aspect-[9/16] shrink-0 overflow-hidden rounded-[3rem] border-[6px] border-slate-800/80 bg-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(6,182,212,0.2)] backdrop-blur-sm gpu-accelerated">
              
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10" />

              {/* Radar Interno Celular */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-48 w-48">
                  <div className="absolute inset-0 rounded-full bg-cyan-500/15 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <div className="absolute inset-4 rounded-full bg-cyan-400/15 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '0.8s' }} />
                </div>
              </div>

              {/* Card Motorista Interno */}
              <div className="absolute left-1/2 top-1/2 z-20 w-[85%] -translate-x-1/2 -translate-y-1/2">
                <div className="animate-[bounce_4s_infinite] rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-yellow-400 p-2.5 shadow-inner">
                      <Truck className="h-5 w-5 text-slate-950 drop-shadow-sm" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
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

            {/* Badge Verificado */}
            <div className="absolute -left-2 top-[30%] z-30 flex items-center gap-3 rounded-2xl border border-green-500/40 bg-slate-900/95 px-6 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite] md:-left-8">
              <ShieldCheck className="h-7 w-7 text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.7)]" />
              <span className="text-sm font-black uppercase tracking-widest text-white">
                Verificado
              </span>
            </div>

          </div>
        </section>
      </main>

      {/* =====================================================
          BENEFITS SECTION (CORRIGIDO: DISTRIBUIÇÃO E WIDTH)
      ===================================================== */}
      <section className="relative z-20 w-full mt-auto">
        <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-none" />
        <div className="relative border-t border-white/10 px-6 py-16 w-full flex flex-col items-center">
          <div className="w-full max-w-7xl grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 mx-auto">
            {benefits.map((item, index) => (
              <div
                key={index}
                className="group flex flex-col items-center sm:items-start gap-5 rounded-[2rem] border border-white/5 bg-slate-900/40 p-8 shadow-[0_15px_40px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-900/80 hover:shadow-[0_15px_50px_rgba(6,182,212,0.15)] text-center sm:text-left w-full"
              >
                <div className="shrink-0 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-inner transition-transform duration-300 group-hover:scale-110">
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
  );
}
