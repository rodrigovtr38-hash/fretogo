// =========================================================
// NOME DO ARQUIVO: src/pages/Home.tsx
// CTO-Log: HOME-4.0 — Elevação de Copy e Funil de Conversão.
// Comunicação tangível (SaaS, 25 entregas, 7 categorias, PIN, foto).
// Foco em oportunidade para motoristas. CTAs de conversão ajustados.
// UX Mobile alinhada com jornada de educação do Desktop.
// =========================================================
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLATFORM_LINKS, openExternalLink } from '../config/platformLinks';
import {
  ArrowRight,
  Camera,
  ChevronRight,
  CreditCard,
  LockKeyhole,
  Menu,
  MessageCircle,
  Package,
  ShieldCheck,
  Truck,
  Users,
  X,
  Zap,
} from 'lucide-react';

/**
 * Home FretoGo — conexão entre quem precisa transportar e quem transporta.
 *
 * Escopo preservado:
 * - Rotas /cliente e /motorista
 * - PLATFORM_LINKS.SUPPORT_WHATSAPP
 * - Grupo de motoristas (URL atual)
 * - Sem novas regras de negócio
 */
const HERO_IMG = 'https://images.hostinger.com/f09fbe30-dd15-4b3b-aede-622f9534802d.png';
const DRIVER_GROUP_URL = 'https://chat.whatsapp.com/IGylgsZPYhsDfMZDKzVjHT';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

// =========================================================
// NAVBAR
// =========================================================
interface NavHandlers {
  onCompanyPath: () => void;
  onDriverPath: () => void;
  onSupport: () => void;
  onConnection: () => void;
}

function HomeNavbar({ onCompanyPath, onDriverPath, onSupport, onConnection }: NavHandlers) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeAndRun = (action: () => void) => {
    setMobileMenuOpen(false);
    action();
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-200 ${
        scrolled
          ? 'border-slate-800/90 bg-slate-950/95 shadow-lg shadow-slate-950/20 backdrop-blur'
          : 'border-transparent bg-slate-950/75 backdrop-blur-sm'
      }`}
    >
      <nav
        className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Navegação principal"
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label="Voltar ao início"
        >
          <img
            src="/icon-192.png"
            alt="FretoGo"
            className="h-10 w-auto rounded-md object-contain sm:h-11"
          />
        </button>

        <div className="hidden items-center gap-7 md:flex">
          <button
            type="button"
            onClick={() => scrollToId('empresas')}
            className="text-sm font-bold text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Para empresas
          </button>
          <button
            type="button"
            onClick={() => scrollToId('motoristas')}
            className="text-sm font-bold text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Para motoristas
          </button>
          <button
            type="button"
            onClick={onSupport}
            className="text-sm font-bold text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Suporte
          </button>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={onDriverPath}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-slate-600 hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Ver meu lado
          </button>
          <button
            type="button"
            onClick={onConnection}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Ver como a conexão acontece
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="inline-flex rounded-lg p-2 text-slate-100 transition hover:bg-slate-800 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileMenuOpen ? <X size={25} aria-hidden="true" /> : <Menu size={25} aria-hidden="true" />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div id="mobile-navigation" className="border-t border-slate-800 bg-slate-950 px-4 py-5 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            <button
              type="button"
              onClick={() => closeAndRun(() => scrollToId('empresas'))}
              className="rounded-xl px-4 py-3 text-left text-base font-bold text-white transition hover:bg-slate-900"
            >
              Para empresas
            </button>
            <button
              type="button"
              onClick={() => closeAndRun(() => scrollToId('motoristas'))}
              className="rounded-xl px-4 py-3 text-left text-base font-bold text-white transition hover:bg-slate-900"
            >
              Para motoristas
            </button>
            <button
              type="button"
              onClick={() => closeAndRun(onSupport)}
              className="rounded-xl px-4 py-3 text-left text-base font-bold text-white transition hover:bg-slate-900"
            >
              Suporte WhatsApp
            </button>
            <div className="my-3 h-px bg-slate-800" />
            <button
              type="button"
              onClick={() => closeAndRun(onDriverPath)}
              className="inline-flex min-h-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-slate-800 active:scale-[0.97]"
            >
              Ver meu lado
            </button>
            <button
              type="button"
              onClick={() => closeAndRun(onConnection)}
              className="inline-flex min-h-14 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 active:scale-[0.97]"
            >
              Ver como a conexão acontece
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

// =========================================================
// HERO
// =========================================================
interface HeroProps {
  onCompanyPath: () => void;
  onDriverPath: () => void;
}

function Hero({ onCompanyPath, onDriverPath }: HeroProps) {
  return (
    <section className="relative isolate flex min-h-[720px] items-center overflow-hidden bg-slate-950 pt-24 sm:min-h-[680px] lg:min-h-[720px]">
      <img
        src={HERO_IMG}
        alt="Caminhões em uma rodovia, representando uma operação logística em movimento"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[62%_center] opacity-90 sm:object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/78 via-44% to-slate-950/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/20" />
      <div className="pointer-events-none absolute -right-40 top-10 -z-10 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
        <div className="max-w-2xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-slate-950/45 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" aria-hidden="true" />
            Uma conexão que move o Brasil
          </p>
          <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl">
            Carga e veículo.{' '}
            <span className="text-cyan-300">Conectados.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-slate-200 sm:text-xl">
            A FretoGo conecta empresas que precisam transportar a motoristas que buscam oportunidades de frete. Operações organizadas, fretes imediatos ou agendados, e acompanhamento prático até a entrega.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onCompanyPath}
              className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-black uppercase tracking-[0.13em] text-white shadow-xl shadow-blue-950/50 transition hover:bg-blue-500 active:scale-[0.97] sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Ver o lado da empresa <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDriverPath}
              className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-300/30 bg-slate-950/35 px-7 py-4 text-sm font-black uppercase tracking-[0.13em] text-white backdrop-blur-sm transition hover:border-cyan-300/60 hover:bg-slate-900/75 active:scale-[0.97] sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <Truck size={18} className="text-cyan-300" aria-hidden="true" />
              Ver o lado do motorista
            </button>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-400">
            Antes de decidir, entenda o seu caminho.
          </p>
        </div>
      </div>
    </section>
  );
}

// =========================================================
// ANTES DE CONECTAR
// =========================================================
function WhyContinueSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Antes de conectar</p>
        <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
          Todo transporte começa com uma necessidade.
        </h2>
        <p className="mt-6 text-lg font-medium leading-relaxed text-slate-600">
          Uma empresa precisa levar algo até alguém. Um motorista precisa encontrar uma oportunidade que faça sentido para sua rota e seu veículo. Quando as informações são claras, a operação acontece com menos imprevistos.
        </p>
        <p className="mt-5 text-lg font-bold leading-relaxed text-slate-800">
          A FretoGo existe para aproximar essas duas necessidades organizando e registrando toda a operação.
        </p>
      </div>
    </section>
  );
}

// =========================================================
// QUAL LADO
// =========================================================
interface AudienceProps {
  onCompanyPath: () => void;
  onDriverPath: () => void;
}

function AudienceChoice({ onCompanyPath, onDriverPath }: AudienceProps) {
  return (
    <section id="escolha" className="scroll-mt-24 border-b border-slate-200 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
            Qual lado você conhece melhor?
          </h2>
          <p className="mt-4 text-lg font-medium text-slate-600">
            Escolha um caminho e entenda as facilidades de cada ponta.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
          <article className="flex flex-col rounded-[1.75rem] border border-slate-200 bg-slate-50 p-7 shadow-sm sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-600">Para empresas</p>
            <h3 className="mt-3 text-2xl font-black text-slate-950">A operação estruturada antes do veículo sair.</h3>
            <p className="mt-4 flex-grow text-base font-medium leading-relaxed text-slate-600">
              Veja o que acontece do lado de quem precisa publicar uma carga, organizar múltiplas paradas e gerenciar as evidências até o destino.
            </p>
            <button
              type="button"
              onClick={onCompanyPath}
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-blue-500 active:scale-[0.97]"
            >
              Ver o lado da empresa <ChevronRight size={18} aria-hidden="true" />
            </button>
          </article>

          <article className="flex flex-col rounded-[1.75rem] border border-slate-800 bg-slate-900 p-7 text-white shadow-xl sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-300">Para motoristas</p>
            <h3 className="mt-3 text-2xl font-black text-white">Oportunidades de frete detalhadas para o seu veículo.</h3>
            <p className="mt-4 flex-grow text-base font-medium leading-relaxed text-slate-300">
              Veja como encontrar fretes, analisar valores e rotas, e comprovar o seu trabalho de maneira simples e digital.
            </p>
            <button
              type="button"
              onClick={onDriverPath}
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-300 active:scale-[0.97]"
            >
              Ver o lado do motorista <ChevronRight size={18} aria-hidden="true" />
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}

// =========================================================
// EMPRESA
// =========================================================
interface CompanySectionProps {
  onClient: () => void;
}

function CompanySection({ onClient }: CompanySectionProps) {
  const steps = [
    { title: 'Publique', desc: 'Pesquise o endereço, selecione a sugestão correta e defina até 25 entregas em uma operação.' },
    { title: 'Conecte', desc: 'Escolha a categoria do veículo (Moto a Bitrem) para fretes imediatos ou agendados.' },
    { title: 'Acompanhe', desc: 'Tenha visibilidade do status e localização da operação com a nossa Torre de Controle.' },
    { title: 'Confirme', desc: 'Registre a conclusão com evidência por foto e validação por código PIN.' },
  ];

  const benefits = [
    { title: 'Operação Centralizada', desc: 'Otimize rotas com múltiplas entregas em uma única publicação.' },
    { title: 'Menos Incerteza', desc: 'A empresa visualiza o status e as etapas cumpridas pelo motorista na plataforma.' },
    { title: 'Registro Fotográfico', desc: 'Receba a foto do canhoto ou da carga direto do local da entrega.' },
    { title: 'Confirmação Segura', desc: 'A etapa só é liberada mediante o código PIN fornecido ao recebedor.' },
  ];

  const objections = [
    {
      q: 'Quais veículos eu encontro?',
      a: 'Você escolhe entre 7 categorias: Moto, Carro, Utilitário, Toco, Truck, Carreta e Bitrem.',
    },
    {
      q: 'E se eu precisar do frete para agora?',
      a: 'Você pode solicitar fretes imediatos ou agendados, conforme a demanda de veículos disponível na região.',
    },
    {
      q: 'Vou perder o controle da carga?',
      a: 'Não. Você acompanha as etapas de entrega, os comprovantes anexados e conta com o suporte da Torre de Controle.',
    },
    {
      q: 'E se eu publicar e não aparecer uma opção compatível?',
      a: 'A FretoGo organiza e disponibiliza as oportunidades, mas a disponibilidade final depende dos motoristas ativos no momento.',
    },
  ];

  return (
    <section id="empresas" className="scroll-mt-24 border-b border-slate-200 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">O lado da empresa</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
            Publique seu frete e acompanhe a operação.
          </h2>
          <p className="mt-5 text-lg font-medium leading-relaxed text-slate-600">
            Quando uma empresa precisa transportar, ela precisa de organização. Da coleta ao último destino, a FretoGo estrutura a sua demanda para que os veículos adequados encontrem a sua carga.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h3 className="text-2xl font-black text-slate-950">O desafio é garantir que o combinado seja cumprido até o fim.</h3>
            <p className="mt-4 text-base font-medium leading-relaxed text-slate-600">
              Transportar bem exige planejamento. É encontrar um veículo compatível e registrar as entregas sem depender de negociações soltas e informais.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-7">
            <ol className="space-y-4">
              {['Carga precisa sair no veículo certo.', 'Veículo precisa chegar no prazo.', 'A entrega precisa ser comprovada.'].map((item, i) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-base font-bold text-slate-800">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-14 rounded-[1.75rem] border border-blue-100 bg-blue-50/60 p-7 sm:p-9">
          <h3 className="text-2xl font-black text-slate-950">Mais segurança no processo.</h3>
          <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-slate-700">
            Uma carga parada significa impacto nos negócios. Por isso, quem publica um frete tem a responsabilidade de detalhar endereços, orientações e exigências para que o motorista faça um bom trabalho. Em contrapartida, a plataforma entrega as ferramentas de evidência e confirmação.
          </p>
          <p className="mt-5 text-base font-black text-blue-800">
            A conexão se consolida através de processos concretos de registro.
          </p>
        </div>

        <div className="mt-14">
          <h3 className="text-2xl font-black text-slate-950 sm:text-3xl">A FretoGo organiza a jornada.</h3>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-600">
            As etapas da operação ficam estruturadas para dar previsibilidade antes, durante e no fechamento de cada frete.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                  {i + 1}
                </span>
                <h4 className="mt-3 text-sm font-black uppercase tracking-wide text-slate-950">{s.title}</h4>
                <p className="mt-1 text-sm font-medium text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h3 className="text-2xl font-black text-slate-950">Controle Operacional.</h3>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-black text-slate-950">{b.title}</h4>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h3 className="text-2xl font-black text-slate-950">
            “Mas será que isso realmente funciona para mim?”
          </h3>
          <div className="mt-7 space-y-4">
            {objections.map((o) => (
              <div key={o.q} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-black text-slate-900">“{o.q}”</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{o.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 text-center">
          <button
            type="button"
            onClick={onClient}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-sm font-black uppercase tracking-[0.13em] text-white shadow-xl shadow-blue-950/20 transition hover:bg-blue-500 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Quero publicar meu frete <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

// =========================================================
// MOTORISTA
// =========================================================
interface DriverSectionProps {
  onDriver: () => void;
}

function DriverSection({ onDriver }: DriverSectionProps) {
  const steps = [
    { title: 'Encontre', desc: 'Acesse oportunidades de fretes imediatos ou agendados na sua região.' },
    { title: 'Analise', desc: 'Veja a origem, os destinos e o repasse antes de aceitar.' },
    { title: 'Transporte', desc: 'Siga a rota detalhada, seja para um destino único ou até 25 entregas.' },
    { title: 'Receba', desc: 'Conclua a operação com foto e PIN, liberando o fluxo de repasse da plataforma.' },
  ];

  const benefits = [
    { title: 'Utilize melhor seu veículo', desc: 'Filtre oportunidades adequadas para a capacidade da sua categoria, de Moto a Bitrem.' },
    { title: 'Oportunidades de retorno', desc: 'Encontre fretes de retorno quando houver ofertas compatíveis publicadas na sua rota.' },
    { title: 'Clareza antes do aceite', desc: 'Saiba exatamente o valor do repasse e a complexidade do percurso antes do deslocamento.' },
    { title: 'Operação Registrada', desc: 'Comprove seu trabalho garantindo a evidência por foto e a assinatura (PIN) do cliente.' },
  ];

  const objections = [
    {
      q: 'Isso garante que sempre vou encontrar carga?',
      a: 'Não. A plataforma oferece oportunidades reais criadas pelas empresas conforme a demanda disponível a cada dia.',
    },
    {
      q: 'Preciso aceitar qualquer oportunidade?',
      a: 'A decisão é totalmente sua. Você visualiza a rota, distâncias e valores para analisar se faz sentido para o seu veículo.',
    },
    {
      q: 'Como funciona o recebimento?',
      a: 'O fluxo financeiro é organizado e acompanhado pela plataforma. O repasse é liberado dentro do sistema após a confirmação final da entrega.',
    },
  ];

  return (
    <section id="motoristas" className="scroll-mt-24 border-b border-slate-800 bg-slate-950 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">O lado do motorista</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-white sm:text-5xl">
            Seu veículo parado também tem um custo.
          </h2>
          <p className="mt-5 text-lg font-medium leading-relaxed text-slate-300">
            A FretoGo ajuda motoristas a encontrarem oportunidades. Você acessa fretes disponíveis, analisa os endereços e valores em detalhes e decide se a carga é vantajosa para o seu dia de trabalho.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h3 className="text-2xl font-black text-white">Rodar sem informações concretas custa caro.</h3>
            <p className="mt-4 text-base font-medium leading-relaxed text-slate-400">
              Aceitar uma carga no escuro muitas vezes gera imprevistos na rota e perdas financeiras. Na FretoGo, a operação fica detalhada no aplicativo antes do aceite, permitindo uma rotina com mais previsibilidade e aproveitamento real do caminhão ou utilitário.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900 p-7">
            <h3 className="text-xl font-black text-white">Você transporta, o sistema valida.</h3>
            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-300">
              Ao aceitar um frete e realizar as entregas, você se ampara pela tecnologia do aplicativo. As coordenadas, fotos do canhoto e o código fornecido pelo cliente documentam e protegem a prestação do serviço.
            </p>
            <p className="mt-5 text-sm font-black text-cyan-300">
              Trabalho comprovado é trabalho seguro.
            </p>
          </div>
        </div>

        <div className="mt-14">
          <h3 className="text-2xl font-black text-white sm:text-3xl">Encontre oportunidades com muito mais contexto.</h3>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-400">
            Você não viaja no escuro. É possível visualizar a origem, a distância e o que é esperado no final do processo, mantendo a autonomia da escolha em suas mãos.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-slate-950">
                  {i + 1}
                </span>
                <h4 className="mt-3 text-sm font-black uppercase tracking-wide text-white">{s.title}</h4>
                <p className="mt-1 text-sm font-medium text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h3 className="text-2xl font-black text-white">Benefícios na rotina do motorista.</h3>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h4 className="text-base font-black text-white">{b.title}</h4>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h3 className="text-2xl font-black text-white">
            “Mas será que essa oportunidade faz sentido para mim?”
          </h3>
          <div className="mt-7 space-y-4">
            {objections.map((o) => (
              <div key={o.q} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm font-black text-white">“{o.q}”</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">{o.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 text-center">
          <button
            type="button"
            onClick={onDriver}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-8 py-4 text-sm font-black uppercase tracking-[0.13em] text-slate-950 shadow-xl transition hover:bg-cyan-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Quero encontrar fretes <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

// =========================================================
// DIFERENCIAÇÃO + CONEXÃO
// =========================================================
function ConnectionSection() {
  return (
    <section id="conexao" className="scroll-mt-24 border-b border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">A conexão</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
            Não é só encontrar.
            <br />
            É entender o que está sendo combinado.
          </h2>
          <p className="mt-5 text-lg font-medium leading-relaxed text-slate-600">
            A FretoGo aproxima carga e veículo com mecanismos tecnológicos, permitindo que a operação inicie de forma consciente e chegue ao final devidamente documentada.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-600">Empresa</p>
            <ul className="mt-5 space-y-3 text-sm font-bold leading-relaxed text-slate-700">
              <li>Possui uma demanda de transporte.</li>
              <li>Publica endereços e veículo necessário.</li>
              <li>Acompanha o painel via Torre de Controle.</li>
              <li>Valida as entregas via PIN e comprovantes.</li>
            </ul>
          </article>
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <ArrowRight className="hidden text-slate-400 md:block" size={24} aria-hidden="true" />
            <span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
              FretoGo
            </span>
            <p className="max-w-[8rem] text-xs font-bold text-slate-500">Organiza a conexão</p>
            <span className="text-slate-400 md:hidden">↕</span>
          </div>
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-700">Motorista</p>
            <ul className="mt-5 space-y-3 text-sm font-bold leading-relaxed text-slate-700">
              <li>Disponibiliza seu veículo.</li>
              <li>Analisa previamente rotas e o repasse.</li>
              <li>Aceita fretes imediatos ou agendados.</li>
              <li>Confirma a entrega diretamente no aplicativo.</li>
            </ul>
          </article>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-lg font-black leading-relaxed text-slate-800">
          Uma empresa precisa de um bom transporte.
          <br />
          Um bom transporte precisa de uma empresa que saiba informar.
          <br />
          Um depende do outro.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-center text-base font-medium text-slate-600">
          Quando a plataforma organiza os processos, a operação escala com facilidade.
        </p>
      </div>
    </section>
  );
}

// =========================================================
// TODOS SOMOS CLIENTES
// =========================================================
function HumanPrincipleSection() {
  return (
    <section className="bg-slate-950 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-5xl">
          No fim, todos nós somos clientes.
        </h2>
        <p className="mt-6 text-lg font-medium leading-relaxed text-slate-300">
          Hoje você pode estar enviando uma carga. Amanhã pode estar aguardando uma entrega, ou pode ser você atrás do volante transportando algo até alguém.
        </p>
        <p className="mt-5 text-lg font-medium leading-relaxed text-slate-300">
          A economia funciona quando a ponta logística é bem estruturada.
        </p>
        <blockquote className="mt-10 border-l-2 border-cyan-300 pl-5 text-left text-xl font-black leading-relaxed text-cyan-100 sm:text-2xl">
          Por isso, operar utilizando ferramentas de tecnologia não é burocracia. É garantia para o trabalho de todos.
        </blockquote>
        <p className="mt-8 text-lg font-bold text-white">
          Quando as duas pontas utilizam a FretoGo, os problemas operacionais diminuem.
        </p>
      </div>
    </section>
  );
}

// =========================================================
// FUTURO
// =========================================================
function FutureSection() {
  return (
    <section className="border-b border-slate-200 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
          Uma logística melhor conta com processos fortes.
        </h2>
        <p className="mt-5 text-lg font-medium leading-relaxed text-slate-600">
          Empresas e motoristas não estão em lados opostos. Eles compõem a força que resolve o deslocamento de produtos todos os dias em nossa região.
        </p>
        <p className="mt-8 text-xl font-black text-slate-900">
          Mais previsibilidade. Maior eficiência. Menos estresse na rota.
        </p>
      </div>
    </section>
  );
}

// =========================================================
// CATEGORIAS
// =========================================================
function CategoriesSection() {
  const categories = [
    { name: 'Moto', icon: <Zap size={24} aria-hidden="true" /> },
    { name: 'Carro', icon: <Package size={24} aria-hidden="true" /> },
    { name: 'Utilitário', icon: <Package size={24} aria-hidden="true" /> },
    { name: 'Toco', icon: <Truck size={24} aria-hidden="true" /> },
    { name: 'Truck', icon: <Truck size={24} aria-hidden="true" /> },
    { name: 'Carreta', icon: <Truck size={24} aria-hidden="true" /> },
    { name: 'Bitrem', icon: <Truck size={24} aria-hidden="true" /> },
  ];

  return (
    <section className="border-b border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Categorias de Veículos</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
            Atendemos do pequeno ao pesado
          </h2>
          <p className="mt-4 text-lg font-medium leading-relaxed text-slate-600">
            Da entrega imediata na região ao frete pesado e agendado. Escolha ou dirija a categoria exata para a necessidade da carga.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {categories.map((category) => (
            <div
              key={category.name}
              className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {category.icon}
              </span>
              <span className="text-sm font-black text-slate-900">{category.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =========================================================
// SEGURANÇA
// =========================================================
function TrustSection() {
  const points = [
    {
      icon: <CreditCard size={22} aria-hidden="true" />,
      title: 'Pagamento integrado',
      description: 'O pagamento é processado e acompanhado dentro do fluxo da plataforma, organizando os repasses devidos.',
    },
    {
      icon: <Camera size={22} aria-hidden="true" />,
      title: 'Evidência fotográfica',
      description: 'A operação exige o registro fotográfico do canhoto ou da carga posicionada no local final da entrega.',
    },
    {
      icon: <LockKeyhole size={22} aria-hidden="true" />,
      title: 'Confirmação por PIN',
      description: 'A entrega é validada exclusivamente por um código de segurança único e intransferível fornecido ao recebedor.',
    },
    {
      icon: <ShieldCheck size={22} aria-hidden="true" />,
      title: 'Torre de Controle',
      description: 'Estrutura que monitora as baixas da operação e os status logísticos, prestando suporte em eventuais exceções de rota.',
    },
  ];

  return (
    <section className="bg-slate-950 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Tecnologia, rastreabilidade e segurança</p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-white sm:text-4xl">
              Confiança através de mecanismos concretos.
            </h2>
            <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-slate-300">
              A FretoGo sistematiza o caminho do frete para que empresa e motorista operem respaldados por ferramentas reais de informação, geolocalização e confirmação (fotos e códigos únicos).
            </p>
            <blockquote className="mt-8 border-l-2 border-cyan-300 pl-4 text-base font-bold leading-relaxed text-cyan-100">
              Operar através de processos verificáveis é reduzir a margem de erros.
            </blockquote>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {points.map((point) => (
              <article key={point.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
                  {point.icon}
                </span>
                <h3 className="mt-5 text-lg font-black text-white">{point.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">{point.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// =========================================================
// CADA UM TEM UM PAPEL
// =========================================================
function RolesSection() {
  return (
    <section className="border-b border-slate-200 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
            Cada pilar desempenha um papel na entrega.
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-7">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-600">Empresa Embarcadora</p>
            <p className="mt-2 text-sm font-black text-slate-900">Demanda estruturada.</p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
              Publica a carga, cadastra os endereços corretos e escolhe qual categoria de veículo faz sentido.
            </p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-7">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-700">Motorista Parceiro</p>
            <p className="mt-2 text-sm font-black text-slate-900">Força de execução.</p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
              Filtra oportunidades na sua rota, cumpre o deslocamento físico e registra evidências via app.
            </p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-800 bg-slate-900 p-7 text-white">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-300">Plataforma FretoGo</p>
            <p className="mt-2 text-sm font-black text-white">O elo tecnológico.</p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-300">
              Processa o fluxo de publicação, pagamentos, rastreabilidade e ampara todos na Torre de Controle.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

// =========================================================
// FECHAMENTO
// =========================================================
function ClosingConsciousness() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-2xl font-black leading-relaxed text-slate-950 sm:text-3xl">
          A clareza nas etapas converte viagens avulsas em operações sólidas.
        </p>
        <p className="mt-5 text-base font-medium leading-relaxed text-slate-600">
          É dessa forma que a oportunidade do presente fomenta a escalabilidade logística do futuro.
        </p>
      </div>
    </section>
  );
}

// =========================================================
// CTA FINAL
// =========================================================
interface FinalCtaProps {
  onClient: () => void;
  onDriver: () => void;
}

function FinalCta({ onClient, onDriver }: FinalCtaProps) {
  return (
    <section id="conversao" className="scroll-mt-24 border-t border-slate-200 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
          Agora você conhece os recursos.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg font-medium leading-relaxed text-slate-600">
          Crie seu painel e inicie publicações, ou ative seu perfil e abra o mapa para achar a próxima oportunidade. 
        </p>
        <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={onClient}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-black uppercase tracking-[0.13em] text-white shadow-xl shadow-blue-950/15 transition hover:bg-blue-700 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Quero publicar meu frete <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDriver}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-slate-950 px-7 py-4 text-sm font-black uppercase tracking-[0.13em] text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2"
          >
            Quero encontrar fretes <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

// =========================================================
// GRUPO
// =========================================================
interface GroupProps {
  onDriverGroup: () => void;
}

function DriverGroupSection({ onDriverGroup }: GroupProps) {
  return (
    <section className="border-t border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-7 shadow-2xl shadow-slate-950/15 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-300">
                <Users size={28} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Para motoristas</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-white sm:text-3xl">
                  Quer continuar conectado?
                </h2>
                <p className="mt-2 text-base font-medium text-slate-300">
                  Entre no grupo oficial de motoristas parceiros e receba novidades e informações exclusivas.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDriverGroup}
              className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-cyan-400 px-7 py-4 text-sm font-black uppercase tracking-[0.13em] text-slate-950 transition hover:bg-cyan-300 active:scale-[0.97] lg:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Entrar no grupo <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// =========================================================
// FOOTER
// =========================================================
interface FooterProps {
  onClient: () => void;
  onDriver: () => void;
  onSupport: () => void;
  onDriverGroup: () => void;
}

function HomeFooter({ onClient, onDriver, onSupport, onDriverGroup }: FooterProps) {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-14 text-slate-400 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-11 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              aria-label="Voltar ao início"
            >
              <img src="/icon-192.png" alt="FretoGo" className="h-10 w-auto rounded-md" />
            </button>
            <p className="mt-5 max-w-xs text-sm font-medium leading-relaxed text-slate-500">
              A plataforma tecnológica oficial do mercado regional, conectando empresas a motoristas qualificados.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-white">Empresas</h2>
            <ul className="mt-5 space-y-3">
              <li>
                <button
                  type="button"
                  onClick={onClient}
                  className="text-sm font-bold transition hover:text-blue-300 focus-visible:outline-none focus-visible:text-blue-300"
                >
                  Criar conta de embarcador
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToId('empresas')}
                  className="text-sm font-bold transition hover:text-blue-300 focus-visible:outline-none focus-visible:text-blue-300"
                >
                  Como o envio funciona
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-white">Motoristas</h2>
            <ul className="mt-5 space-y-3">
              <li>
                <button
                  type="button"
                  onClick={onDriver}
                  className="text-sm font-bold transition hover:text-cyan-300 focus-visible:outline-none focus-visible:text-cyan-300"
                >
                  Acessar radar de fretes
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onDriverGroup}
                  className="text-sm font-bold transition hover:text-cyan-300 focus-visible:outline-none focus-visible:text-cyan-300"
                >
                  Grupo de motoristas parceiros
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-white">Suporte &amp; mais</h2>
            <ul className="mt-5 space-y-3">
              <li>
                <button
                  type="button"
                  onClick={onSupport}
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 transition hover:text-emerald-300 focus-visible:outline-none focus-visible:text-emerald-300"
                >
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp
                </button>
              </li>
              <li>
                <span className="text-sm font-bold text-slate-600" title="Preparado para uso futuro">
                  Blog Corporativo
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-900 pt-7 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:justify-start">
            <p className="text-xs font-bold text-slate-600">FretoGo Tecnologia</p>
            <p className="text-xs font-bold text-slate-600">CNPJ: 64.172.243/0001-90</p>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-700">
            © {new Date().getFullYear()} FretoGo — Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

// =========================================================
// WHATSAPP
// =========================================================
function FloatingWhatsApp({ onSupport }: { onSupport: () => void }) {
  return (
    <button
      type="button"
      onClick={onSupport}
      title="Fale com nosso suporte"
      aria-label="Falar com o suporte pelo WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.38)] transition hover:scale-105 hover:shadow-[0_15px_35px_rgba(37,211,102,0.48)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
      </svg>
    </button>
  );
}

// =========================================================
// PÁGINA PRINCIPAL
// =========================================================
export default function HomePage() {
  const navigate = useNavigate();

  // CONVERSÃO / CADASTRO — somente estes vão para as rotas e finalizam o funil
  const goToClient = () => navigate('/cliente');
  const goToDriver = () => navigate('/motorista');
  const handleWhatsAppSupport = () => openExternalLink(PLATFORM_LINKS.SUPPORT_WHATSAPP);
  const handleDriverGroup = () => openExternalLink(DRIVER_GROUP_URL);

  // NAVEGAÇÃO INTERNA — conscientização e caminho (NÃO abrem cadastro direto)
  const goToCompanyConsciousness = () => scrollToId('empresas');
  const goToDriverConsciousness = () => scrollToId('motoristas');
  const goToConnection = () => scrollToId('conexao');

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-white font-sans text-slate-900 selection:bg-cyan-200 selection:text-slate-950">
      <HomeNavbar
        onCompanyPath={goToCompanyConsciousness}
        onDriverPath={goToDriverConsciousness}
        onSupport={handleWhatsAppSupport}
        onConnection={goToConnection}
      />
      <main>
        <Hero
          onCompanyPath={goToCompanyConsciousness}
          onDriverPath={goToDriverConsciousness}
        />
        <WhyContinueSection />
        <AudienceChoice
          onCompanyPath={goToCompanyConsciousness}
          onDriverPath={goToDriverConsciousness}
        />
        <CompanySection onClient={goToClient} />
        <DriverSection onDriver={goToDriver} />
        <ConnectionSection />
        <HumanPrincipleSection />
        <FutureSection />
        <CategoriesSection />
        <TrustSection />
        <RolesSection />
        <ClosingConsciousness />
        <FinalCta onClient={goToClient} onDriver={goToDriver} />
        <DriverGroupSection onDriverGroup={handleDriverGroup} />
      </main>
      <HomeFooter
        onClient={goToClient}
        onDriver={goToDriver}
        onSupport={handleWhatsAppSupport}
        onDriverGroup={handleDriverGroup}
      />
      <FloatingWhatsApp onSupport={handleWhatsAppSupport} />
    </div>
  );
}
