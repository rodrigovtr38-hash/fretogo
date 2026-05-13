import React from 'react';
import { Helmet } from 'react-helmet';
import { AlertCircle, Clock, TrendingUp, MapPin, Truck, CreditCard, Navigation, Star, Zap, MessageCircle } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation.js';
import RadarPulse from '@/components/RadarPulse.jsx';

const LandingCliente = () => {
  // 🔥 LINK AJUSTADO PELO CTO: Aponta para o Formulário Real (O "Caixa")
  const CLIENTE_URL = "/simular";
  const WHATSAPP_LINK = "https://wa.me/5511946099840";
  
  const painPoint1 = useScrollAnimation();
  const painPoint2 = useScrollAnimation();
  const painPoint3 = useScrollAnimation();
  const testimonial1 = useScrollAnimation();
  const testimonial2 = useScrollAnimation();
  const testimonial3 = useScrollAnimation();
  const testimonial4 = useScrollAnimation();
  const step1 = useScrollAnimation();
  const step2 = useScrollAnimation();
  const step3 = useScrollAnimation();
  const step4 = useScrollAnimation();

  // Animação para a nova seção de veículos
  const vehiclesAnim = useScrollAnimation();

  return (
    <>
      <Helmet>
        <title>FRETOGO - Frete Rápido e Carreto Urgente em São Paulo | Rastreamento em Tempo Real</title>
        <meta name="description" content="Contrate fretes e carretos urgentes em minutos. Mais de 1.200 motoristas confiáveis, rastreamento em tempo real e preço justo. Simule seu frete agora!" />
        <meta name="keywords" content="frete rápido, carreto urgente, caminhão para mudança, aplicativo de frete, rastreamento em tempo real" />
      </Helmet>

      <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        
        {/* SECTION 1 - HERO (AJUSTADA COM LOGO GIGANTE E MARCA) */}
        <section className="relative min-h-[100dvh] flex items-center overflow-hidden py-20 md:py-32 px-4 sm:px-6 lg:px-8">
          <RadarPulse />
          
          <div className="max-w-7xl mx-auto w-full relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="space-y-8">
                
                {/* LOGO MAIOR E DOMÍNIO EM DESTAQUE */}
                <div className="flex flex-col items-start gap-4 mb-2">
                  <img src="https://horizons-cdn.hostinger.com/9b5419fa-dd23-4135-8799-4e32004a3782/7c019b5a3cef7d446f89d375b4df5fc1.png" alt="Logo FRETOGO" className="h-20 md:h-24 w-auto drop-shadow-xl" />
                  <h2 className="text-2xl md:text-3xl font-black italic tracking-widest text-[#00f5ff] uppercase drop-shadow-md">
                    FRETOGO.COM.BR
                  </h2>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight" style={{ letterSpacing: '-0.02em' }}>
                  Sua Carga no Radar: Encontre o Motorista Ideal em Minutos
                </h1>
                
                <p className="text-lg md:text-xl text-[hsl(var(--secondary))] leading-relaxed max-w-prose">
                  Solicite fretes e mudanças agora com rastreamento em tempo real e preço justo. Sem burocracia, direto pelo celular.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* BOTÕES COM LINKS EXTERNOS (Ajustado contraste do texto para escuro) */}
                  <a href={CLIENTE_URL} className="inline-flex justify-center items-center bg-[hsl(var(--accent))] text-[hsl(var(--background))] font-black uppercase px-8 py-4 rounded-lg glow-accent hover:brightness-110 active:scale-[0.98] transition-all duration-200">
                    Simular Frete Agora
                  </a>
                  <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex justify-center items-center border-2 border-[hsl(var(--accent))] text-[hsl(var(--accent))] font-black uppercase px-8 py-4 rounded-lg hover:bg-[hsl(var(--accent))]/10 active:scale-[0.98] transition-all duration-200 gap-2">
                    <MessageCircle size={20} /> Suporte Via WhatsApp
                  </a>
                </div>
              </div>
              
              {/* Right Image */}
              <div className="hidden lg:block relative">
                <div className="absolute -inset-4 bg-[hsl(var(--accent))]/20 rounded-full blur-3xl animate-pulse"></div>
                <img src="https://horizons-cdn.hostinger.com/1683b8d2-7bb3-4624-aa4b-7fcad49ae444/gemini_generated_image_qnpbzrqnpbzrqnpb-hz4us.png" alt="Caminhão de entrega profissional para fretes e mudanças" className="w-full h-auto rounded-2xl shadow-2xl relative z-10" style={{ animation: 'float 6s ease-in-out infinite' }} />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 - PAIN POINTS */}
        <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 leading-tight">Cansado de esperar por orçamentos demorados?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div ref={painPoint1.ref} className={`bg-[hsl(var(--card))] border border-[hsl(var(--accent))] rounded-xl p-8 card-hover fade-in-up ${painPoint1.isVisible ? 'visible' : ''}`}>
                <AlertCircle className="w-12 h-12 text-[hsl(var(--accent))] mb-4" />
                <p className="text-lg leading-relaxed">Dificuldade de encontrar motoristas confiáveis</p>
              </div>
              <div ref={painPoint2.ref} className={`bg-[hsl(var(--card))] border border-[hsl(var(--accent))] rounded-xl p-8 card-hover fade-in-up ${painPoint2.isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.1s' }}>
                <Clock className="w-12 h-12 text-[hsl(var(--accent))] mb-4" />
                <p className="text-lg leading-relaxed">Falta de rastreamento em tempo real</p>
              </div>
              <div ref={painPoint3.ref} className={`bg-[hsl(var(--card))] border border-[hsl(var(--accent))] rounded-xl p-8 card-hover fade-in-up ${painPoint3.isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.2s' }}>
                <TrendingUp className="w-12 h-12 text-[hsl(var(--accent))] mb-4" />
                <p className="text-lg leading-relaxed">Preços abusivos de última hora</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 - VEÍCULOS */}
        <section ref={vehiclesAnim.ref} className={`py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-[hsl(var(--card))]/50 border-y border-[hsl(var(--border))] fade-in-up ${vehiclesAnim.isVisible ? 'visible' : ''}`}>
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">O Veículo Certo para Qualquer Carga</h2>
            <p className="text-center text-[hsl(var(--secondary))] text-lg mb-16 max-w-2xl mx-auto">De pequenas encomendas a logística pesada, nós temos o parceiro ideal conectado no radar.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[hsl(var(--background))] border border-[hsl(var(--accent))]/30 p-8 rounded-2xl hover:border-[hsl(var(--accent))] transition-all">
                <Zap className="w-12 h-12 text-[hsl(var(--accent))] mb-4 mx-auto" />
                <h3 className="text-2xl font-bold mb-2">Cargas Leves</h3>
                <p className="text-[hsl(var(--secondary))] font-medium">Moto, Fiorino e Utilitários</p>
              </div>
              <div className="bg-[hsl(var(--background))] border border-[hsl(var(--accent))]/30 p-8 rounded-2xl hover:border-[hsl(var(--accent))] transition-all">
                <Truck className="w-12 h-12 text-[hsl(var(--accent))] mb-4 mx-auto" />
                <h3 className="text-2xl font-bold mb-2">Cargas Médias</h3>
                <p className="text-[hsl(var(--secondary))] font-medium">Vans, HR e Caminhão Toco</p>
              </div>
              <div className="bg-[hsl(var(--background))] border border-[hsl(var(--accent))]/30 p-8 rounded-2xl hover:border-[hsl(var(--accent))] transition-all">
                <Navigation className="w-12 h-12 text-[hsl(var(--accent))] mb-4 mx-auto" />
                <h3 className="text-2xl font-bold mb-2">Cargas Pesadas</h3>
                <p className="text-[hsl(var(--secondary))] font-medium">Caminhão Truck, Carreta e Bi-trem</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4 - SOCIAL PROOF */}
        <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-[hsl(var(--card))]">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 leading-tight">Mais de 1.200 motoristas prontos para te atender</h2>
            <p className="text-center text-[hsl(var(--secondary))] text-lg mb-16">em São Paulo e região</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div ref={testimonial1.ref} className={`bg-[hsl(var(--background))] border border-[hsl(var(--accent))] rounded-xl p-6 fade-in-up ${testimonial1.isVisible ? 'visible' : ''}`}>
                <div className="flex gap-1 mb-3">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[hsl(var(--accent))] text-[hsl(var(--accent))]" />)}</div>
                <p className="text-sm leading-relaxed mb-4">Contratei um frete urgente e em 15 minutos o motorista já estava aqui. Muito rápido!</p>
                <div className="flex items-center justify-between"><span className="font-semibold text-sm">Marina Silva</span><span className="text-xs px-2 py-1 rounded bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]">Frete</span></div>
              </div>
              <div ref={testimonial2.ref} className={`bg-[hsl(var(--background))] border border-[hsl(var(--accent))] rounded-xl p-6 fade-in-up ${testimonial2.isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.1s' }}>
                <div className="flex gap-1 mb-3">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[hsl(var(--accent))] text-[hsl(var(--accent))]" />)}</div>
                <p className="text-sm leading-relaxed mb-4">Rastreamento perfeito, chegou antes do prazo. Recomendo!</p>
                <div className="flex items-center justify-between"><span className="font-semibold text-sm">Carlos Mendes</span><span className="text-xs px-2 py-1 rounded bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]">Carreto</span></div>
              </div>
              <div ref={testimonial3.ref} className={`bg-[hsl(var(--background))] border border-[hsl(var(--accent))] rounded-xl p-6 fade-in-up ${testimonial3.isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.2s' }}>
                <div className="flex gap-1 mb-3">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[hsl(var(--accent))] text-[hsl(var(--accent))]" />)}</div>
                <p className="text-sm leading-relaxed mb-4">Preço justo e motorista profissional. Voltarei a usar.</p>
                <div className="flex items-center justify-between"><span className="font-semibold text-sm">Beatriz Costa</span><span className="text-xs px-2 py-1 rounded bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]">Mudança</span></div>
              </div>
              <div ref={testimonial4.ref} className={`bg-[hsl(var(--background))] border border-[hsl(var(--accent))] rounded-xl p-6 fade-in-up ${testimonial4.isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
                <div className="flex gap-1 mb-3">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[hsl(var(--accent))] text-[hsl(var(--accent))]" />)}</div>
                <p className="text-sm leading-relaxed mb-4">Mudança completa em um dia. Equipe atenciosa e rápida.</p>
                <div className="flex items-center justify-between"><span className="font-semibold text-sm">Roberto Alves</span><span className="text-xs px-2 py-1 rounded bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]">Mudança</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5 - HOW IT WORKS */}
        <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 leading-tight">Como Funciona</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-[hsl(var(--accent))]/30" style={{ top: '4rem' }}></div>
              <div ref={step1.ref} className={`relative fade-in-up ${step1.isVisible ? 'visible' : ''}`}>
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--accent))] rounded-xl p-6 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-2xl font-bold mb-4 mx-auto text-black">1</div>
                  <MapPin className="w-10 h-10 text-[hsl(var(--accent))] mb-3 mx-auto" />
                  <h3 className="text-xl font-semibold mb-2 text-center">Informe a coleta</h3>
                  <p className="text-sm text-[hsl(var(--secondary))] text-center leading-relaxed">Digite o endereço de origem e destino da sua carga</p>
                </div>
              </div>
              <div ref={step2.ref} className={`relative fade-in-up ${step2.isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.1s' }}>
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--accent))] rounded-xl p-6 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-2xl font-bold mb-4 mx-auto text-black">2</div>
                  <Truck className="w-10 h-10 text-[hsl(var(--accent))] mb-3 mx-auto" />
                  <h3 className="text-xl font-semibold mb-2 text-center">Escolha o veículo</h3>
                  <p className="text-sm text-[hsl(var(--secondary))] text-center leading-relaxed">Selecione o tipo de caminhão ideal para sua necessidade</p>
                </div>
              </div>
              <div ref={step3.ref} className={`relative fade-in-up ${step3.isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.2s' }}>
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--accent))] rounded-xl p-6 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-2xl font-bold mb-4 mx-auto text-black">3</div>
                  <CreditCard className="w-10 h-10 text-[hsl(var(--accent))] mb-3 mx-auto" />
                  <h3 className="text-xl font-semibold mb-2 text-center">Pague com segurança</h3>
                  <p className="text-sm text-[hsl(var(--secondary))] text-center leading-relaxed">Confirme o valor e efetue o pagamento de forma segura</p>
                </div>
              </div>
              <div ref={step4.ref} className={`relative fade-in-up ${step4.isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--accent))] rounded-xl p-6 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-2xl font-bold mb-4 mx-auto text-black">4</div>
                  <Navigation className="w-10 h-10 text-[hsl(var(--accent))] mb-3 mx-auto" />
                  <h3 className="text-xl font-semibold mb-2 text-center">Acompanhe no mapa</h3>
                  <p className="text-sm text-[hsl(var(--secondary))] text-center leading-relaxed">Rastreie sua carga em tempo real até a entrega</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6 - FINAL CTA */}
        <section className="py-24 relative overflow-hidden bg-[hsl(var(--card))] border-y border-[hsl(var(--border))] text-center">
          <div className="absolute inset-0 bg-[hsl(var(--accent))]/5" />
          <div className="max-w-4xl mx-auto px-4 relative z-10">
            <h2 className="text-4xl md:text-6xl font-black uppercase italic mb-8 leading-tight">
              Sua carga não pode esperar
            </h2>
            <p className="text-xl text-[hsl(var(--secondary))] mb-10 font-bold">
              Simule seu frete agora e encontre um motorista na sua região em poucos minutos.
            </p>
            <a href={CLIENTE_URL} className="inline-flex justify-center items-center bg-[hsl(var(--accent))] text-[hsl(var(--background))] font-black uppercase px-12 py-5 rounded-xl glow-accent hover:brightness-110 active:scale-[0.98] transition-all duration-200 text-xl shadow-[0_0_40px_rgba(0,245,255,0.4)]">
              Simular Frete Agora
            </a>
          </div>
        </section>

        {/* SECTION 7 - FOOTER */}
        <footer className="bg-[hsl(var(--background))] py-16 px-4 sm:px-6 lg:px-8 border-t border-[hsl(var(--border))]">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-[hsl(var(--secondary))] font-bold">CNPJ: 64.172.243/0001-90</p>
              <p className="text-sm">
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--accent))] hover:underline transition-all duration-200 font-bold flex items-center justify-center gap-2">
                  <MessageCircle size={16} /> Suporte Oficial: 11 94609-9840
                </a>
              </p>
            </div>
            <div className="flex justify-center gap-6 text-sm">
              <a href="#" className="text-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-all duration-200">Política de Privacidade</a>
              <span className="text-[hsl(var(--border))]">|</span>
              <a href="#" className="text-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-all duration-200">Termos de Uso</a>
            </div>
            <p className="text-sm text-[hsl(var(--secondary))]">© 2026 FRETOGO. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingCliente;
