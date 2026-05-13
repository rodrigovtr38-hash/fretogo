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
                <a
                  href="/"
                  className="text-cyan-400 text-2xl font-black uppercase tracking-wider hover:text-cyan-300 transition-all"
                >
                  FRETOGO
                </a>
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

      {/* restante permanece igual */}
    </div>
  );
};

export default LandingMotorista;
