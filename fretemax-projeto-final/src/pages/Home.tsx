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
    <div className="w-full min-h-screen bg-[#050816] text-white font-sans overflow-hidden relative">

      {/* =====================================================
          FUNDO PREMIUM
      ===================================================== */}

      <div className="absolute inset-0 bg-gradient-to-br from-[#050816] via-[#0b1120] to-cyan-950/40 pointer-events-none"></div>

      {/* Glow superior */}
      <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-cyan-500/20 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Glow lateral */}
      <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] bg-blue-500/20 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Radar */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">

        <div className="relative w-[800px] h-[800px]">

          <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: '3s' }}></div>

          <div
            className="absolute inset-[15%] rounded-full border border-cyan-400/20 animate-ping"
            style={{ animationDuration: '3s', animationDelay: '1s' }}
          ></div>

          <div
            className="absolute inset-[30%] rounded-full border border-cyan-300/20 animate-ping"
            style={{ animationDuration: '3s', animationDelay: '2s' }}
          ></div>

        </div>
      </div>

      {/* =====================================================
          MODAL APP
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">

          <div className="bg-[#111827] border border-cyan-500/20 rounded-[2rem] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(6,182,212,0.25)]">

            <Download className="w-14 h-14 text-yellow-400 mx-auto mb-5 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]" />

            <h3 className="text-2xl font-black italic uppercase mb-3 text-white">
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
          WRAPPER PRINCIPAL (CORRIGIDO)
      ===================================================== */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col min-h-screen">
      
        {/* =====================================================
            NAVBAR
        ===================================================== */}

        <nav className="w-full px-6 py-6 flex items-center justify-between">

          {/* LOGO */}
          <div className="flex items-center gap-3">

            {/* FUTURA LOGO PNG */}
            {/* <img src="/logo-fretogo.png" className="h-10 w-auto" /> */}

            <Zap className="w-8 h-8 text-cyan-400 fill-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />

            <span className="font-black text-2xl italic tracking-tighter text-white">
              FRETOGO
            </span>

          </div>

          {/* LINKS */}
          <div className="hidden md:flex items-center gap-8">

            <Link
              to="/contratar"
              className="text-sm font-bold text-slate-300 hover:text-cyan-400 transition-colors"
            >
              Simular Frete
            </Link>

            <Link
              to="/parceiros"
              className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
            >
              Sou Motorista
            </Link>

          </div>
        </nav>

        {/* =====================================================
            HERO (CORRIGIDO)
        ===================================================== */}

        <section className="flex-1 w-full px-6 py-12 md:py-20 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20">

          {/* TEXTO */}
          <div className="w-full md:w-1/2 flex flex-col items-start justify-center">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-400/20 px-5 py-2 rounded-full mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">

              <span className="relative flex h-2 w-2">

                <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping"></span>

                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]"></span>

              </span>

              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                Radar ativo em sua região
              </span>

            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] font-black mb-8 text-white">

              SUA CARGA NO{' '}

              <span className="text-cyan-400 italic drop-shadow-[0_0_25px_rgba(6,182,212,0.7)] relative inline-block">
                RADAR
              </span>

              .<br />

              O MOTORISTA NA{' '}

              <span className="text-yellow-400 italic drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                PORTA
              </span>

              .

            </h1>

            {/* Texto */}
            <p className="text-slate-300 text-lg md:text-xl leading-relaxed max-w-[540px] mb-10">

              A primeira plataforma de fretes autônoma com matching inteligente.
              Contrate em segundos e acompanhe tudo em tempo real.

              <span className="block mt-4 text-white font-bold text-xl drop-shadow-md">
                Sem mensalidade. Sem burocracia.
              </span>

            </p>

            {/* BOTÕES */}
            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">

              <Link
                to="/contratar"
                className="group bg-cyan-500 hover:bg-cyan-400 hover:scale-[1.03] active:scale-95 transition-all duration-300 text-black px-8 py-5 rounded-2xl font-black uppercase italic flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(6,182,212,0.4)] w-full sm:w-auto text-sm md:text-base"
              >
                Contratar Frete

                <ChevronRight className="group-hover:translate-x-1.5 transition-transform" />
              </Link>

              <Link
                to="/parceiros"
                className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 px-8 py-5 rounded-2xl font-black uppercase italic flex items-center justify-center w-full sm:w-auto text-sm md:text-base text-white backdrop-blur-sm"
              >
                Ser Motorista
              </Link>

              <button
                onClick={() => setShowModal(true)}
                className="bg-yellow-400 hover:bg-yellow-300 hover:scale-[1.03] active:scale-95 transition-all duration-300 text-black px-8 py-5 rounded-2xl font-black uppercase italic flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(250,204,21,0.35)] w-full sm:w-auto text-sm md:text-base"
              >
                <Download size={20} />

                Baixar App
              </button>

            </div>

          </div>

          {/* CELULAR (CORRIGIDO) */}
          <div className="w-full md:w-1/2 flex justify-center items-center relative mt-10 md:mt-0">

            <div className="relative w-full max-w-[320px] lg:max-w-[360px] aspect-[9/16] rounded-[3rem] border-[8px] border-[#1f2937] bg-[#0b1120] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex-shrink-0">

              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-transparent to-blue-500/15"></div>

              {/* Radar Pulse */}
              <div className="absolute inset-0 flex items-center justify-center">

                <div className="relative w-48 h-48">

                  <div className="absolute inset-0 rounded-full bg-cyan-500/15 animate-ping" style={{ animationDuration: '2.5s' }}></div>

                  <div
                    className="absolute inset-4 rounded-full bg-cyan-400/15 animate-ping"
                    style={{ animationDuration: '2.5s', animationDelay: '0.8s' }}
                  ></div>

                </div>

              </div>

              {/* Card motorista */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%]">

                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-bounce" style={{ animationDuration: '3s' }}>

                  <div className="flex items-center gap-3">

                    <div className="bg-yellow-400 p-2.5 rounded-xl shadow-inner">
                      <Truck className="w-5 h-5 text-black drop-shadow-sm" />
                    </div>

                    <div>

                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                        Motorista Próximo
                      </p>

                      <p className="font-black italic text-slate-900 text-sm mt-0.5">
                        Ricardo S. • 2.4km
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* Verificado */}
            <div className="absolute -left-2 md:-left-8 top-1/4 bg-[#0f172a]/90 border border-cyan-500/30 backdrop-blur-xl px-5 py-4 rounded-2xl flex items-center gap-3 shadow-[0_15px_30px_rgba(0,0,0,0.5)] animate-pulse z-20" style={{ animationDuration: '4s' }}>

              <ShieldCheck className="text-green-400 w-6 h-6 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]" />

              <span className="text-xs font-black uppercase text-white tracking-wide">
                Verificado
              </span>

            </div>

          </div>

        </section>

        {/* =====================================================
            CARDS (CORRIGIDO)
        ===================================================== */}

        <section className="w-full px-6 py-12 md:py-16 border-t border-white/5 mt-auto">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 w-full">

            {[
              {
                icon: <Zap className="text-yellow-400 w-6 h-6 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />,
                t: 'Agilidade',
                d: 'Match em menos de 1 minuto'
              },
              {
                icon: <ShieldCheck className="text-green-400 w-6 h-6 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />,
                t: 'Segurança',
                d: 'Motoristas verificados'
              },
              {
                icon: <MapPin className="text-cyan-400 w-6 h-6 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />,
                t: 'Radar',
                d: 'Rastreamento em tempo real'
              },
              {
                icon: <Star className="text-orange-400 w-6 h-6 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />,
                t: 'Zero Taxa',
                d: 'Sem mensalidade'
              }
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
              >

                <div className="bg-slate-900/80 border border-white/10 p-3.5 rounded-xl backdrop-blur-md shrink-0 shadow-inner">
                  {item.icon}
                </div>

                <div className="flex flex-col justify-center pt-1">

                  <p className="font-black uppercase italic text-sm text-white tracking-wide">
                    {item.t}
                  </p>

                  <p className="text-slate-400 text-xs mt-1.5 font-medium leading-snug">
                    {item.d}
                  </p>

                </div>

              </div>
            ))}

          </div>

        </section>
      </div>
    </div>
  );
}
