import React from 'react';

import {
  Clock,
  MapPin,
  Truck,
  ShieldCheck,
  Zap,
  MessageCircle,
  ChevronRight
} from 'lucide-react';

const LandingCliente = () => {
  const CLIENTE_URL = "/simular";
  const WHATSAPP_LINK = "https://wa.me/5511946099840";

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-hidden relative">

      {/* =====================================================
          FUNDO GLOBAL
      ===================================================== */}

      <div className="absolute inset-0 bg-gradient-to-br from-[#050816] via-[#081020] to-cyan-950/20"></div>

      {/* Glow */}
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]"></div>

      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]"></div>

      {/* Radar */}
      <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">

        <div className="relative w-[900px] h-[900px]">

          <div className="absolute inset-0 border border-cyan-400/10 rounded-full animate-ping"></div>

          <div
            className="absolute inset-[10%] border border-cyan-400/10 rounded-full animate-ping"
            style={{ animationDelay: '1s' }}
          ></div>

          <div
            className="absolute inset-[20%] border border-cyan-400/10 rounded-full animate-ping"
            style={{ animationDelay: '2s' }}
          ></div>

        </div>

      </div>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8 z-10">

        <div className="max-w-7xl mx-auto w-full">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* =====================================================
                TEXTO
            ===================================================== */}

            <div className="space-y-8">

              {/* LOGO */}
              <div className="flex flex-col items-start gap-5">

                <a href="/" className="hover:opacity-90 transition-all">

                  <img
                    src="https://horizons-cdn.hostinger.com/9b5419fa-dd23-4135-8799-4e32004a3782/7c019b5a3cef7d446f89d375b4df5fc1.png"
                    alt="Logo FRETOGO"
                    className="h-20 md:h-24 w-auto drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                  />

                </a>

                <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-400/20 px-4 py-2 rounded-full backdrop-blur-sm">

                  <span className="relative flex h-2 w-2">

                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>

                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>

                  </span>

                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                    Motoristas online em tempo real
                  </span>

                </div>

              </div>

              {/* HEADLINE */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl leading-[0.95] font-black">

                Sua Carga no{' '}

                <span className="text-cyan-400 italic drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                  Radar
                </span>

                :<br />

                Encontre o Motorista Ideal em Minutos

              </h1>

              {/* TEXTO */}
              <p className="text-xl text-slate-300 leading-relaxed max-w-xl">

                Solicite fretes, mudanças e entregas com rastreamento em tempo real,
                suporte imediato e motoristas próximos da sua região.

                <span className="block mt-4 text-white font-bold">
                  Sem burocracia. Sem mensalidade. Direto do celular.
                </span>

              </p>

              {/* BOTÕES */}
              <div className="flex flex-col sm:flex-row gap-4">

                <a
                  href={CLIENTE_URL}
                  className="group inline-flex justify-center items-center bg-cyan-400 hover:bg-cyan-300 hover:scale-[1.02] transition-all text-black font-black uppercase px-8 py-5 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.4)] gap-2"
                >
                  Simular Frete Agora

                  <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </a>

                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex justify-center items-center border border-cyan-400/30 bg-white/5 backdrop-blur-sm text-cyan-300 hover:bg-cyan-400/10 transition-all font-black uppercase px-8 py-5 rounded-2xl gap-3"
                >
                  <MessageCircle size={20} />

                  WhatsApp
                </a>

              </div>

              {/* BENEFÍCIOS */}
              <div className="grid grid-cols-2 gap-5 pt-6">

                <div className="flex items-center gap-3">

                  <div className="bg-cyan-500/10 border border-cyan-400/20 p-3 rounded-2xl">
                    <Clock className="w-5 h-5 text-cyan-400" />
                  </div>

                  <div>
                    <p className="font-black text-sm uppercase">
                      Match Rápido
                    </p>

                    <p className="text-xs text-slate-400">
                      Motoristas próximos
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-3">

                  <div className="bg-green-500/10 border border-green-400/20 p-3 rounded-2xl">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                  </div>

                  <div>
                    <p className="font-black text-sm uppercase">
                      Segurança
                    </p>

                    <p className="text-xs text-slate-400">
                      Motoristas verificados
                    </p>
                  </div>

                </div>

              </div>

            </div>

            {/* =====================================================
                IMAGEM
            ===================================================== */}

            <div className="hidden lg:flex justify-center relative">

              {/* Glow */}
              <div className="absolute inset-0 bg-cyan-400/10 blur-[100px] rounded-full"></div>

              {/* Card flutuante */}
              <div className="absolute top-10 -left-8 z-20 bg-[#111827] border border-white/10 backdrop-blur-md px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-pulse">

                <div className="bg-yellow-400 p-3 rounded-xl">
                  <Truck className="w-5 h-5 text-black" />
                </div>

                <div>

                  <p className="text-[10px] uppercase font-black text-slate-400">
                    Motorista próximo
                  </p>

                  <p className="font-black italic">
                    Ricardo S. • 2.3km
                  </p>

                </div>

              </div>

              {/* Imagem */}
              <img
                src="https://horizons-cdn.hostinger.com/1683b8d2-7bb3-4624-aa4b-7fcad49ae444/gemini_generated_image_qnpbzrqnpbzrqnpb-hz4us.png"
                alt="Frete"
                className="relative z-10 w-full max-w-[650px] rounded-[2rem] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
              />

              {/* Card inferior */}
              <div className="absolute bottom-10 right-0 z-20 bg-[#111827] border border-white/10 backdrop-blur-md px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4">

                <div className="bg-cyan-500/10 p-3 rounded-xl">
                  <Navigation className="w-5 h-5 text-cyan-400" />
                </div>

                <div>

                  <p className="text-[10px] uppercase font-black text-slate-400">
                    Rastreamento ativo
                  </p>

                  <p className="font-black italic">
                    Atualização em tempo real
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
};

export default LandingCliente;
