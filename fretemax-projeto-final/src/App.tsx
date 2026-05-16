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
      icon: <Zap className="h-6 w-6 text-yellow-400" />,
      title: 'Agilidade',
      description: 'Match inteligente em menos de 1 minuto.',
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-green-400" />,
      title: 'Segurança',
      description: 'Motoristas verificados e rastreamento ativo.',
    },
    {
      icon: <MapPin className="h-6 w-6 text-cyan-400" />,
      title: 'Radar Vivo',
      description: 'Localização em tempo real.',
    },
    {
      icon: <Star className="h-6 w-6 text-orange-400" />,
      title: 'Zero Taxa',
      description: 'Sem mensalidades escondidas.',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white">

      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.12),transparent_40%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_40%)]" />

        {/* RADAR GIGANTE */}
        <div className="absolute left-1/2 top-1/2 h-[1400px] w-[1400px] -translate-x-1/2 -translate-y-1/2">

          <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-[pulse_6s_linear_infinite]" />

          <div className="absolute inset-[12%] rounded-full border border-cyan-400/20 animate-[pulse_5s_linear_infinite]" />

          <div className="absolute inset-[24%] rounded-full border border-cyan-300/20 animate-[pulse_4s_linear_infinite]" />

          <div className="absolute inset-[36%] rounded-full border border-cyan-200/20 animate-[pulse_3s_linear_infinite]" />

        </div>
      </div>

      {/* WHATSAPP */}
      <a
        href="https://wa.me/5511946099840"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 rounded-full bg-[#25D366] p-4 shadow-2xl transition hover:scale-110"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207" />
        </svg>
      </a>

      {/* NAVBAR */}
      <header className="relative z-30">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">

          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 fill-cyan-400 text-cyan-400" />
            <span className="text-2xl font-black italic tracking-tight">
              FRETOGO
            </span>
          </div>

          <div className="hidden gap-8 md:flex">

            <Link
              to="/cliente"
              className="text-sm font-bold text-slate-300 hover:text-cyan-400"
            >
              Simular Frete
            </Link>

            <Link
              to="/motorista"
              className="text-sm font-bold text-slate-300 hover:text-yellow-400"
            >
              Sou Motorista
            </Link>

          </div>

        </nav>
      </header>

      {/* HERO */}
      <main className="relative z-20 mx-auto flex min-h-[85vh] max-w-7xl items-center px-6">

        <div className="grid w-full grid-cols-1 gap-16 lg:grid-cols-2">

          {/* TEXTO */}
          <div className="flex flex-col justify-center">

            <div className="mb-6 flex w-fit items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-950/40 px-5 py-2">

              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-400"></span>
              </span>

              <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                Radar ativo em sua região
              </span>

            </div>

            <h1 className="text-5xl font-black leading-[1.05] md:text-7xl">

              SUA CARGA NO{' '}

              <span className="italic text-cyan-400">
                RADAR
              </span>

              .<br />

              O MOTORISTA NA{' '}

              <span className="italic text-yellow-400">
                PORTA
              </span>

              .

            </h1>

            <p className="mt-8 max-w-xl text-xl leading-relaxed text-slate-300">
              Plataforma inteligente de fretes em tempo real.
              Solicite cargas, encontre motoristas próximos e acompanhe tudo pelo radar operacional.
            </p>

            {/* BOTÕES */}
            <div className="mt-12 flex flex-wrap gap-5">

              {/* CLIENTE */}
              <Link
                to="/cliente"
                className="flex min-h-[70px] items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-10 py-5 text-sm font-black uppercase tracking-widest text-slate-950 shadow-[0_0_40px_rgba(6,182,212,0.45)] transition hover:scale-105 hover:bg-cyan-400"
              >
                Contratar Frete
                <ChevronRight size={18} />
              </Link>

              {/* MOTORISTA */}
              <Link
                to="/motorista"
                className="flex min-h-[70px] items-center justify-center rounded-2xl border border-yellow-400/50 bg-yellow-400/10 px-10 py-5 text-sm font-black uppercase tracking-widest text-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.18)] transition hover:scale-105 hover:bg-yellow-400 hover:text-slate-950"
              >
                Ser Motorista
              </Link>

              {/* APP */}
              <button
                onClick={() => setShowModal(true)}
                className="flex min-h-[70px] items-center justify-center gap-3 rounded-2xl bg-slate-800 px-10 py-5 text-sm font-black uppercase tracking-widest text-white transition hover:scale-105 hover:bg-slate-700"
              >
                <Download size={18} />
                Baixar App
              </button>

            </div>
          </div>

          {/* CELULAR */}
          <div className="relative flex items-center justify-center">

            <div className="relative h-[650px] w-[320px] overflow-hidden rounded-[3rem] border-[6px] border-slate-800 bg-slate-950 shadow-[0_0_80px_rgba(6,182,212,0.2)]">

              {/* RADAR INTERNO */}
              <div className="absolute inset-0 flex items-center justify-center">

                <div className="relative h-56 w-56">

                  <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20"></div>

                  <div className="absolute inset-10 animate-ping rounded-full bg-cyan-400/20"></div>

                </div>

              </div>

              {/* CARD */}
              <div className="absolute left-1/2 top-1/2 z-20 w-[85%] -translate-x-1/2 -translate-y-1/2">

                <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 backdrop-blur-xl">

                  <div className="flex items-center gap-3">

                    <div className="rounded-xl bg-yellow-400 p-3">
                      <Truck className="h-5 w-5 text-slate-950" />
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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

      </main>

      {/* BENEFÍCIOS */}
      <section className="relative z-20 border-t border-white/10 bg-slate-950/40 px-6 py-16 backdrop-blur-sm">

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">

          {benefits.map((item, index) => (
            <div
              key={index}
              className="rounded-3xl border border-white/5 bg-slate-900/50 p-8 backdrop-blur-xl transition hover:border-cyan-500/30 hover:bg-slate-900"
            >
              <div className="mb-5">
                {item.icon}
              </div>

              <h3 className="mb-2 text-lg font-black uppercase italic">
                {item.title}
              </h3>

              <p className="text-sm leading-relaxed text-slate-400">
                {item.description}
              </p>

            </div>
          ))}

        </div>

      </section>

    </div>
  );
}
