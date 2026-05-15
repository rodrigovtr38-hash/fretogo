import React, { useEffect, useState } from 'react';

import {
  Truck,
  ArrowLeftRight,
  MapPin,
  MessageSquare,
  Clock,
  Smartphone,
  Radar,
  Route,
  MapPinned,
  Car,
  Users,
  Bike,
  Package,
  Bus,
  CheckCircle2,
  ChevronRight,
  Zap,
  ShieldCheck
} from 'lucide-react';

const LandingMotorista = () => {
  const [onlineDrivers, setOnlineDrivers] = useState(0);

  const targetDrivers = 1247;

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = targetDrivers / steps;

    let current = 0;

    const timer = setInterval(() => {
      current += increment;

      if (current >= targetDrivers) {
        setOnlineDrivers(targetDrivers);
        clearInterval(timer);
      } else {
        setOnlineDrivers(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-hidden relative">

      {/* =====================================================
          FUNDO GLOBAL
      ===================================================== */}

      <div className="absolute inset-0 bg-gradient-to-br from-[#050816] via-[#07101f] to-cyan-950/20"></div>

      {/* Glow */}
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]"></div>

      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]"></div>

      {/* RADAR */}
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

      <section className="relative min-h-screen flex items-center overflow-hidden z-10">

        <div className="max-w-7xl mx-auto px-4 py-20 w-full">

          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* =====================================================
                TEXTO
            ===================================================== */}

            <div>

              {/* LOGO */}
              <div className="mb-8 flex flex-col items-start gap-5">

                <a
                  href="/"
                  className="hover:opacity-90 transition-all"
                >

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
                    {onlineDrivers}+ motoristas no radar agora
                  </span>

                </div>

              </div>

              {/* HEADLINE */}
              <h1 className="text-5xl md:text-7xl leading-[0.95] font-black mb-8">

                Aplicativo de Frete para{' '}

                <span className="text-cyan-400 italic drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                  Motoristas
                </span>

                <br />

                Autônomos

              </h1>

              {/* TEXTO */}
              <p className="text-xl text-slate-300 mb-10 max-w-xl leading-relaxed">

                Receba fretes próximos, cargas de retorno e oportunidades em tempo real direto no celular.

                <span className="block mt-4 text-white font-bold">
                  Menos tempo parado. Mais corridas. Mais lucro.
                </span>

              </p>

              {/* BOTÕES */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10">

                <a
                  href="/motorista"
                  className="group bg-cyan-400 hover:bg-cyan-300 text-black font-black px-8 py-5 rounded-2xl hover:scale-[1.02] transition-all text-center inline-flex justify-center items-center gap-2 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                >
                  Cadastrar Meu Veículo

                  <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </a>

                <a
                  href="https://chat.whatsapp.com/IGylgsZPYhsDfMZDKzVjHT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-cyan-400/30 bg-white/5 backdrop-blur-sm text-cyan-300 font-black px-8 py-5 rounded-2xl hover:bg-cyan-400/10 transition-all text-center"
                >
                  Entrar no Grupo VIP
                </a>

              </div>

              {/* BENEFÍCIOS */}
              <div className="grid grid-cols-2 gap-5">

                <div className="flex items-center gap-3">

                  <div className="bg-cyan-500/10 border border-cyan-400/20 p-3 rounded-2xl">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>

                  <div>
                    <p className="font-black text-sm uppercase">
                      Fretes instantâneos
                    </p>

                    <p className="text-xs text-slate-400">
                      Corridas em tempo real
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-3">

                  <div className="bg-green-500/10 border border-green-400/20 p-3 rounded-2xl">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                  </div>

                  <div>
                    <p className="font-black text-sm uppercase">
                      Plataforma segura
                    </p>

                    <p className="text-xs text-slate-400">
                      Aprovação verificada
                    </p>
                  </div>

                </div>

              </div>

            </div>

            {/* =====================================================
                IMAGENS
            ===================================================== */}

            <div className="grid grid-cols-2 gap-5 relative">

              {/* Glow */}
              <div className="absolute inset-0 bg-cyan-400/10 blur-[100px] rounded-full"></div>

              {/* CARD FLUTUANTE */}
              <div className="absolute -top-5 left-10 z-20 bg-[#111827] border border-white/10 backdrop-blur-md px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-pulse">

                <div className="bg-green-500 p-3 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-black" />
                </div>

                <div>

                  <p className="text-[10px] uppercase font-black text-slate-400">
                    Novo frete encontrado
                  </p>

                  <p className="font-black italic">
                    Guarulhos • R$ 248
                  </p>

                </div>

              </div>

              <img
                src="https://horizons-cdn.hostinger.com/93e14fe7-39ec-4c78-ac41-90974e98d3e3/gemini_generated_image_qnpbzrqnpbzrqnpb-ER5OB.png"
                alt="Motorista"
                className="rounded-[2rem] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6)] relative z-10"
              />

              <img
                src="https://horizons-cdn.hostinger.com/93e14fe7-39ec-4c78-ac41-90974e98d3e3/gemini_generated_image_xj98yixj98yixj98-n2hyA.png"
                alt="Mapa"
                className="rounded-[2rem] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6)] mt-10 relative z-10"
              />

            </div>

          </div>

        </div>

      </section>

    </div>
  );
};

export default LandingMotorista;
