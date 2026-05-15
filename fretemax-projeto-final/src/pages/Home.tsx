import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  ShieldCheck,
  Zap,
  Truck,
  MapPin,
  Star,
  ChevronRight,
  Download
} from 'lucide-react';

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#050816] text-white font-sans overflow-x-hidden relative">

      {/* =====================================================
          FUNDO PREMIUM
      ===================================================== */}

      <div className="absolute inset-0 bg-gradient-to-br from-[#050816] via-[#0b1120] to-cyan-950/30 pointer-events-none"></div>

      {/* Glow superior */}
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full"></div>

      {/* Glow lateral */}
      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-blue-500/10 blur-[140px] rounded-full"></div>

      {/* Radar */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">

        <div className="relative w-[700px] h-[700px]">

          <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-ping"></div>

          <div
            className="absolute inset-[10%] rounded-full border border-cyan-400/10 animate-ping"
            style={{ animationDelay: '1s' }}
          ></div>

          <div
            className="absolute inset-[20%] rounded-full border border-cyan-300/10 animate-ping"
            style={{ animationDelay: '2s' }}
          ></div>

        </div>
      </div>

      {/* =====================================================
          MODAL APP
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">

          <div className="bg-[#111827] border border-cyan-500/20 rounded-[2rem] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(6,182,212,0.25)]">

            <Download className="w-14 h-14 text-yellow-400 mx-auto mb-5" />

            <h3 className="text-2xl font-black italic uppercase mb-3">
              App Em Breve
            </h3>

            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              O aplicativo oficial da FRETOGO está sendo publicado nas lojas.
              Enquanto isso, você já pode usar o sistema completo pelo navegador.
            </p>

            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 hover:scale-[1.02] transition-all text-black font-black py-4 rounded-2xl uppercase text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)]"
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
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:scale-110 transition-all p-4 rounded-full shadow-[0_0_30px_rgba(37,211,102,0.4)]"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487" />
        </svg>
      </a>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="relative z-20 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">

        {/* LOGO */}
        <div className="flex items-center gap-3">

          {/* FUTURA LOGO PNG */}
          {/* <img src="/logo-fretogo.png" className="h-10 w-auto" /> */}

          <Zap className="w-8 h-8 text-cyan-400 fill-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]" />

          <span className="font-black text-2xl italic tracking-tighter">
            FRETOGO
          </span>

        </div>

        {/* LINKS */}
        <div className="hidden md:flex items-center gap-8">

          <Link
            to="/contratar"
            className="text-sm font-bold text-slate-300 hover:text-cyan-400 transition"
          >
            Simular Frete
          </Link>

          <Link
            to="/parceiros"
            className="text-sm font-bold text-slate-300 hover:text-white transition"
          >
            Sou Motorista
          </Link>

        </div>
      </nav>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative z-10 max-w-7xl mx-auto px-6 py-14 md:py-24 grid md:grid-cols-2 gap-16 items-center">

        {/* TEXTO */}
        <div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-400/20 px-5 py-2 rounded-full mb-8 backdrop-blur-sm">

            <span className="relative flex h-2 w-2">

              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping"></span>

              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>

            </span>

            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
              Radar ativo em sua região
            </span>

          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl leading-[0.92] font-black mb-8">

            SUA CARGA NO{' '}

            <span className="text-cyan-400 italic drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">
              RADAR
            </span>

            .<br />

            O MOTORISTA NA{' '}

            <span className="text-yellow-400 italic">
              PORTA
            </span>

            .

          </h1>

          {/* Texto */}
          <p className="text-slate-300 text-lg md:text-xl leading-relaxed max-w-xl mb-10">

            A primeira plataforma de fretes autônoma com matching inteligente.
            Contrate em segundos e acompanhe tudo em tempo real.

            <span className="block mt-3 text-white font-bold">
              Sem mensalidade. Sem burocracia.
            </span>

          </p>

          {/* BOTÕES */}
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">

            <Link
              to="/contratar"
              className="group bg-cyan-500 hover:bg-cyan-400 hover:scale-[1.02] transition-all text-black px-8 py-5 rounded-2xl font-black uppercase italic flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.35)]"
            >
              Contratar Frete

              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/parceiros"
              className="bg-white/5 border border-white/10 hover:bg-white/10 transition-all px-8 py-5 rounded-2xl font-black uppercase italic flex items-center justify-center"
            >
              Ser Motorista
            </Link>

            <button
              onClick={() => setShowModal(true)}
              className="bg-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] transition-all text-black px-8 py-5 rounded-2xl font-black uppercase italic flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
            >
              <Download size={20} />

              Baixar App
            </button>

          </div>

        </div>

        {/* CELULAR */}
        <div className="relative flex justify-center">

          <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-[3rem] border-[8px] border-[#27272a] bg-[#111827] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)]">

            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10"></div>

            {/* Radar Pulse */}
            <div className="absolute inset-0 flex items-center justify-center">

              <div className="relative w-40 h-40">

                <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-ping"></div>

                <div
                  className="absolute inset-4 rounded-full bg-cyan-400/10 animate-ping"
                  style={{ animationDelay: '1s' }}
                ></div>

              </div>

            </div>

            {/* Card motorista */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%]">

              <div className="bg-white rounded-2xl p-4 shadow-2xl animate-bounce">

                <div className="flex items-center gap-3">

                  <div className="bg-yellow-400 p-2 rounded-xl">
                    <Truck className="w-5 h-5 text-black" />
                  </div>

                  <div>

                    <p className="text-[10px] uppercase font-black text-slate-400">
                      Motorista Próximo
                    </p>

                    <p className="font-black italic text-slate-900">
                      Ricardo S. • 2.4km
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* Verificado */}
          <div className="absolute -left-4 top-1/4 bg-[#111827] border border-white/10 backdrop-blur-md px-5 py-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-pulse">

            <ShieldCheck className="text-green-500 w-6 h-6" />

            <span className="text-xs font-black uppercase">
              Verificado
            </span>

          </div>

        </div>

      </section>

      {/* =====================================================
          CARDS
      ===================================================== */}

      <section className="relative z-10 max-w-7xl mx-auto px-6 py-14 border-t border-white/5">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {[
            {
              icon: <Zap className="text-yellow-400" />,
              t: 'Agilidade',
              d: 'Match em menos de 1 minuto'
            },
            {
              icon: <ShieldCheck className="text-green-500" />,
              t: 'Segurança',
              d: 'Motoristas verificados'
            },
            {
              icon: <MapPin className="text-cyan-400" />,
              t: 'Radar',
              d: 'Rastreamento em tempo real'
            },
            {
              icon: <Star className="text-orange-400" />,
              t: 'Zero Taxa',
              d: 'Sem mensalidade'
            }
          ].map((item, i) => (
            <div
              key={i}
              className="flex flex-col md:flex-row gap-4 items-center md:items-start text-center md:text-left"
            >

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                {item.icon}
              </div>

              <div>

                <p className="font-black uppercase italic text-sm">
                  {item.t}
                </p>

                <p className="text-slate-400 text-xs mt-1">
                  {item.d}
                </p>

              </div>

            </div>
          ))}

        </div>

      </section>

    </div>
  );
}
