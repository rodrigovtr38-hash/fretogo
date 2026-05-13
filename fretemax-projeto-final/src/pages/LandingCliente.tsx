import React from 'react';
import {
  AlertCircle,
  Clock,
  TrendingUp,
  MapPin,
  Truck,
  CreditCard,
  Navigation,
  Star,
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

        {/* EFEITO FUNDO */}
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
                <img
                  src="https://horizons-cdn.hostinger.com/9b5419fa-dd23-4135-8799-4e32004a3782/7c019b5a3cef7d446f89d375b4df5fc1.png"
                  alt="Logo FRETOGO"
                  className="h-20 md:h-24 w-auto"
                />

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

      {/* DOR DO CLIENTE */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">

          <h2 className="text-4xl font-bold text-center mb-16">
            Cansado de esperar por orçamentos demorados?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            <div className="bg-slate-900 border border-cyan-400 rounded-2xl p-8">
              <AlertCircle className="w-12 h-12 text-cyan-400 mb-4" />
              <p className="text-lg">
                Dificuldade de encontrar motoristas confiáveis
              </p>
            </div>

            <div className="bg-slate-900 border border-cyan-400 rounded-2xl p-8">
              <Clock className="w-12 h-12 text-cyan-400 mb-4" />
              <p className="text-lg">
                Falta de rastreamento em tempo real
              </p>
            </div>

            <div className="bg-slate-900 border border-cyan-400 rounded-2xl p-8">
              <TrendingUp className="w-12 h-12 text-cyan-400 mb-4" />
              <p className="text-lg">
                Preços abusivos de última hora
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VEÍCULOS */}
      <section className="py-24 px-4 bg-slate-900/50 border-y border-slate-800">

        <div className="max-w-7xl mx-auto text-center">

          <h2 className="text-4xl font-bold mb-6">
            O Veículo Certo para Qualquer Carga
          </h2>

          <p className="text-slate-400 text-lg mb-16">
            De pequenas encomendas a logística pesada
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            <div className="bg-slate-950 border border-cyan-400/30 p-8 rounded-2xl">
              <Zap className="w-12 h-12 text-cyan-400 mb-4 mx-auto" />
              <h3 className="text-2xl font-bold mb-2">Cargas Leves</h3>
              <p className="text-slate-400">
                Moto, Fiorino e Utilitários
              </p>
            </div>

            <div className="bg-slate-950 border border-cyan-400/30 p-8 rounded-2xl">
              <Truck className="w-12 h-12 text-cyan-400 mb-4 mx-auto" />
              <h3 className="text-2xl font-bold mb-2">Cargas Médias</h3>
              <p className="text-slate-400">
                Vans, HR e Caminhão Toco
              </p>
            </div>

            <div className="bg-slate-950 border border-cyan-400/30 p-8 rounded-2xl">
              <Navigation className="w-12 h-12 text-cyan-400 mb-4 mx-auto" />
              <h3 className="text-2xl font-bold mb-2">Cargas Pesadas</h3>
              <p className="text-slate-400">
                Truck, Carreta e Bitrem
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-24 px-4">

        <div className="max-w-7xl mx-auto">

          <h2 className="text-4xl font-bold text-center mb-16">
            Como Funciona
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

            {[
              {
                icon: <MapPin className="w-10 h-10 text-cyan-400 mx-auto mb-3" />,
                title: "Informe a coleta",
                text: "Digite origem e destino"
              },
              {
                icon: <Truck className="w-10 h-10 text-cyan-400 mx-auto mb-3" />,
                title: "Escolha o veículo",
                text: "Selecione a categoria ideal"
              },
              {
                icon: <CreditCard className="w-10 h-10 text-cyan-400 mx-auto mb-3" />,
                title: "Pague com segurança",
                text: "Pagamento rápido e seguro"
              },
              {
                icon: <Navigation className="w-10 h-10 text-cyan-400 mx-auto mb-3" />,
                title: "Acompanhe no mapa",
                text: "Rastreamento em tempo real"
              }
            ].map((item, index) => (
              <div
                key={index}
                className="bg-slate-900 border border-cyan-400 rounded-2xl p-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-cyan-400 flex items-center justify-center text-black text-2xl font-bold mx-auto mb-4">
                  {index + 1}
                </div>

                {item.icon}

                <h3 className="text-xl font-bold mb-2">
                  {item.title}
                </h3>

                <p className="text-slate-400">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-28 text-center bg-slate-900 border-y border-slate-800">

        <div className="max-w-4xl mx-auto px-4">

          <h2 className="text-5xl md:text-7xl font-black uppercase italic mb-8">
            Sua carga não pode esperar
          </h2>

          <p className="text-xl text-slate-300 mb-10">
            Simule seu frete agora e encontre um motorista na sua região em poucos minutos.
          </p>

          <a
            href={CLIENTE_URL}
            className="inline-flex justify-center items-center bg-cyan-400 text-black font-black uppercase px-12 py-5 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.5)] hover:scale-105 transition-all text-xl"
          >
            Simular Frete Agora
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 py-16 border-t border-slate-800">

        <div className="max-w-7xl mx-auto text-center space-y-6 px-4">

          <div>
            <p className="text-sm text-slate-400 font-bold">
              CNPJ: 64.172.243/0001-90
            </p>

            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline font-bold flex items-center justify-center gap-2 mt-2"
            >
              <MessageCircle size={16} />
              Suporte Oficial: 11 94609-9840
            </a>
          </div>

          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="text-slate-400 hover:text-white">
              Política de Privacidade
            </a>

            <span className="text-slate-600">|</span>

            <a href="#" className="text-slate-400 hover:text-white">
              Termos de Uso
            </a>
          </div>

          <p className="text-sm text-slate-500">
            © 2026 FRETOGO. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingCliente;
