import React from 'react';

import {
  AlertCircle,
  Clock,
  TrendingUp,
  MapPin,
  Truck,
  CreditCard,
  Navigation,
  Zap,
  MessageCircle
} from 'lucide-react';

const LandingCliente = () => {
  const CLIENTE_URL = "/simular";
  const WHATSAPP_LINK = "https://wa.me/5511946099840";

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">

      {/* HERO */}
      <section className="relative min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8">

        {/* FUNDO */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/4 w-96 h-96 border border-cyan-400 rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] border border-cyan-400/40 rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-[650px] h-[650px] border border-cyan-400/20 rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* TEXTO */}
            <div className="space-y-8">

              <div className="flex flex-col items-start gap-4">

                <a href="/">
                  <img
                    src="https://horizons-cdn.hostinger.com/9b5419fa-dd23-4135-8799-4e32004a3782/7c019b5a3cef7d446f89d375b4df5fc1.png"
                    alt="Logo FRETOGO"
                    className="h-20 md:h-24 w-auto hover:opacity-90 transition-all"
                  />
                </a>

                <h2 className="text-2xl md:text-3xl font-black italic tracking-widest text-cyan-400 uppercase">
                  FRETOGO.COM.BR
                </h2>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
                Sua Carga no Radar:
                <br />
                Encontre o Motorista Ideal em Minutos
              </h1>

              <p className="text-xl text-slate-300 leading-relaxed max-w-xl">
                Solicite fretes e mudanças agora com rastreamento em tempo real e preço justo.
                Sem burocracia, direto pelo celular.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">

                <a
                  href={CLIENTE_URL}
                  className="inline-flex justify-center items-center bg-cyan-400 text-black font-black uppercase px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-105 transition-all"
                >
                  Simular Frete Agora
                </a>

                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex justify-center items-center border-2 border-cyan-400 text-cyan-400 font-black uppercase px-8 py-4 rounded-xl hover:bg-cyan-400/10 transition-all gap-2"
                >
                  <MessageCircle size={20} />
                  Suporte Via WhatsApp
                </a>
              </div>
            </div>

            {/* IMAGEM */}
            <div className="hidden lg:block relative">

              <div className="absolute -inset-4 bg-cyan-400/20 rounded-full blur-3xl"></div>

              <img
                src="https://horizons-cdn.hostinger.com/1683b8d2-7bb3-4624-aa4b-7fcad49ae444/gemini_generated_image_qnpbzrqnpbzrqnpb-hz4us.png"
                alt="Frete"
                className="w-full rounded-3xl shadow-2xl relative z-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* RESTANTE DA LANDING PERMANECE IGUAL */}
    </div>
  );
};

export default LandingCliente;
