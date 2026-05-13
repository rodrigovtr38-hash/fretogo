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
  CheckCircle2
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

  const problems = [
    {
      icon: Truck,
      title: 'Caminhão parado sem carga',
      description:
        'Dias de espera sem frete significam prejuízo e despesas acumuladas.',
    },
    {
      icon: ArrowLeftRight,
      title: 'Volta vazia sem frete',
      description:
        'Retornar sem carga representa combustível e tempo perdidos.',
    },
    {
      icon: MapPin,
      title: 'Frete de retorno perdido',
      description:
        'Oportunidades passam despercebidas sem informação em tempo real.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp desorganizado',
      description:
        'Informações de frete se perdem em grupos confusos.',
    },
    {
      icon: Clock,
      title: 'Frete perdido por demora',
      description:
        'Resposta lenta faz você perder oportunidades.',
    },
  ];

  const solutions = [
    {
      icon: Smartphone,
      title: 'Frete em tempo real',
      description:
        'Receba notificações instantâneas direto no celular.',
    },
    {
      icon: Radar,
      title: 'Radar inteligente',
      description:
        'O sistema encontra cargas próximas automaticamente.',
    },
    {
      icon: Route,
      title: 'Retorno inteligente',
      description:
        'Evite voltar vazio com sugestões de carga retorno.',
    },
    {
      icon: MapPinned,
      title: 'Oportunidades regionais',
      description:
        'Expanda seu raio de atuação com segurança.',
    },
    {
      icon: Car,
      title: 'Corridas direto no app',
      description:
        'Aceite fretes com apenas um toque.',
    },
    {
      icon: Users,
      title: 'Sem intermediários',
      description:
        'Mais lucro e menos taxas desnecessárias.',
    },
  ];

  const vehicles = [
    { icon: Bike, name: 'Moto' },
    { icon: Car, name: 'Fiorino' },
    { icon: Package, name: 'Utilitário' },
    { icon: Car, name: 'Van' },
    { icon: Truck, name: 'HR' },
    { icon: Truck, name: 'Toco' },
    { icon: Truck, name: 'Truck' },
    { icon: Bus, name: 'Carreta' },
  ];

  const faqs = [
    {
      question: 'Como conseguir frete online?',
      answer:
        'Receba notificações em tempo real diretamente pelo celular.',
    },
    {
      question: 'Como funciona o retorno inteligente?',
      answer:
        'O sistema sugere cargas compatíveis com sua rota.',
    },
    {
      question: 'Quanto custa usar o FRETOGO?',
      answer:
        'O cadastro inicial é gratuito para motoristas.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/20"></div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px]">
          <div className="absolute inset-0 rounded-full border border-cyan-400/10"></div>
          <div className="absolute inset-10 rounded-full border border-cyan-400/10"></div>
          <div className="absolute inset-20 rounded-full border border-cyan-400/10"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 py-20">

          <div className="grid lg:grid-cols-2 gap-12 items-center">

            <div>

              <div className="mb-6">
                <h2 className="text-cyan-400 text-2xl font-black uppercase tracking-wider">
                  FRETOGO
                </h2>
              </div>

              <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
                Aplicativo de Frete para Motoristas Autônomos
              </h1>

              <p className="text-xl text-slate-300 mb-8 max-w-xl">
                Receba fretes próximos, cargas de retorno e oportunidades em tempo real direto no celular.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">

                <a
                  href="/motorista"
                  className="bg-cyan-400 text-black font-black px-8 py-4 rounded-xl hover:scale-105 transition-all text-center"
                >
                  Cadastrar Meu Veículo
                </a>

                <a
                  href="https://chat.whatsapp.com/IGylgsZPYhsDfMZDKzVjHT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-cyan-400 text-cyan-400 font-black px-8 py-4 rounded-xl hover:bg-cyan-400/10 transition-all text-center"
                >
                  Entrar no Grupo VIP
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">

              <img
                src="https://horizons-cdn.hostinger.com/93e14fe7-39ec-4c78-ac41-90974e98d3e3/gemini_generated_image_qnpbzrqnpbzrqnpb-ER5OB.png"
                alt="Motorista"
                className="rounded-3xl"
              />

              <img
                src="https://horizons-cdn.hostinger.com/93e14fe7-39ec-4c78-ac41-90974e98d3e3/gemini_generated_image_xj98yixj98yixj98-n2hyA.png"
                alt="Mapa"
                className="rounded-3xl mt-8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMAS */}
      <section className="py-24 bg-slate-900 border-t border-slate-800">

        <div className="max-w-7xl mx-auto px-4">

          <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
            O que faz você perder dinheiro hoje?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

            {problems.map((problem, index) => {
              const Icon = problem.icon;

              return (
                <div
                  key={index}
                  className="bg-slate-950 border border-cyan-400/20 rounded-2xl p-8"
                >
                  <Icon className="w-12 h-12 text-cyan-400 mb-4" />

                  <h3 className="text-2xl font-bold mb-3">
                    {problem.title}
                  </h3>

                  <p className="text-slate-400">
                    {problem.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SOLUÇÕES */}
      <section className="py-24">

        <div className="max-w-7xl mx-auto px-4">

          <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
            Como o FRETOGO resolve isso
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

            {solutions.map((solution, index) => {
              const Icon = solution.icon;

              return (
                <div
                  key={index}
                  className="bg-slate-900 border border-cyan-400/20 rounded-2xl p-8"
                >
                  <Icon className="w-12 h-12 text-cyan-400 mb-4" />

                  <h3 className="text-2xl font-bold mb-3">
                    {solution.title}
                  </h3>

                  <p className="text-slate-400">
                    {solution.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* VEÍCULOS */}
      <section className="py-24 bg-slate-900 border-t border-slate-800">

        <div className="max-w-6xl mx-auto px-4">

          <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
            Temos frete para seu veículo
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

            {vehicles.map((vehicle, index) => {
              const Icon = vehicle.icon;

              return (
                <div
                  key={index}
                  className="bg-slate-950 border border-cyan-400/20 rounded-2xl p-8 text-center hover:border-cyan-400 transition-all"
                >
                  <Icon className="w-12 h-12 text-cyan-400 mx-auto mb-4" />

                  <h3 className="font-bold text-lg">
                    {vehicle.name}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL */}
      <section className="py-24">

        <div className="max-w-5xl mx-auto px-4 text-center">

          <h2 className="text-4xl md:text-5xl font-black mb-10">
            Motoristas já estão entrando no radar
          </h2>

          <div className="inline-flex items-center gap-4 bg-slate-900 border border-cyan-400 rounded-2xl px-8 py-6">

            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>

            <span className="text-slate-300">
              Motoristas aguardando aprovação:
            </span>

            <span className="text-4xl font-black text-cyan-400">
              {onlineDrivers.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </section>

      {/* COMUNIDADE */}
      <section className="py-24 bg-slate-900 border-t border-slate-800">

        <div className="max-w-6xl mx-auto px-4">

          <div className="grid lg:grid-cols-2 gap-12 items-center">

            <div>

              <h2 className="text-4xl md:text-5xl font-black mb-6">
                Entre para a Comunidade VIP
              </h2>

              <p className="text-xl text-slate-300 mb-8">
                Os primeiros motoristas terão prioridade máxima na distribuição de fretes.
              </p>

              <div className="space-y-4 mb-8">

                {[
                  'Prioridade nos fretes',
                  'Análise acelerada',
                  'Contato direto com suporte',
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="text-cyan-400 w-5 h-5" />

                    <span className="text-slate-300">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <a
                href="https://chat.whatsapp.com/IGylgsZPYhsDfMZDKzVjHT"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex bg-cyan-400 text-black font-black px-8 py-4 rounded-xl hover:scale-105 transition-all"
              >
                Garantir Minha Vaga
              </a>
            </div>

            <div>
              <img
                src="https://horizons-cdn.hostinger.com/93e14fe7-39ec-4c78-ac41-90974e98d3e3/hq720-6o0VY.jpg"
                alt="Comunidade"
                className="rounded-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">

        <div className="max-w-4xl mx-auto px-4">

          <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
            Perguntas Frequentes
          </h2>

          <div className="space-y-6">

            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-slate-900 border border-cyan-400/20 rounded-2xl p-6"
              >
                <h3 className="text-xl font-bold mb-3">
                  {faq.question}
                </h3>

                <p className="text-slate-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 border-t border-slate-800 z-50">

        <a
          href="/motorista"
          className="block w-full bg-cyan-400 text-black font-black text-center py-4 rounded-xl"
        >
          Cadastrar Meu Veículo
        </a>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 text-center">

        <div className="max-w-4xl mx-auto px-4">

          <h3 className="text-cyan-400 text-2xl font-black mb-4">
            FRETOGO
          </h3>

          <p className="text-slate-500">
            © 2026 FRETOGO • Plataforma Inteligente de Fretes
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingMotorista;
