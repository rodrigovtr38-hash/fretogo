import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Truck,
  MapPin,
  Star,
  ChevronRight,
  Download,
} from 'lucide-react';

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  const benefits = [
    {
      icon: <Zap className="h-7 w-7 text-yellow-400" />,
      title: 'Agilidade',
      description: 'Match inteligente em menos de 1 minuto.',
    },
    {
      icon: <ShieldCheck className="h-7 w-7 text-green-400" />,
      title: 'Segurança',
      description: '100% dos motoristas com CNH validada.',
    },
    {
      icon: <MapPin className="h-7 w-7 text-cyan-400" />,
      title: 'Radar Vivo',
      description: 'Rastreamento ponta a ponta realtime.',
    },
    {
      icon: <Star className="h-7 w-7 text-orange-400" />,
      title: 'Zero Taxa',
      description: 'Plataforma sem mensalidades escondidas.',
    },
  ];

  return (
    // ESTRUTURA BLINDADA: Flex col e min-h-screen garantem que a tela ocupe 100% do espaço.
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">

      {/* BACKGROUNDS */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-[#020617]"></div>
        <div className="absolute left-[-15%] top-[-5%] h-[55rem] w-[55rem] rounded-full bg-cyan-600/20 blur-[160px] mix-blend-screen" />
        <div className="absolute right-[-10%] top-[15%] h-[45rem] w-[45rem] rounded-full bg-blue-600/20 blur-[180px] mix-blend-screen" />
      </div>

      {/* RADAR DE FUNDO - Animações simplificadas para não travar */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-60 mix-blend-screen">
        <div className="relative flex h-[1000px] w-[1000px] items-center justify-center overflow-hidden md:h-[1200px] md:w-[1200px]">
          <div className="absolute inset-0 animate-ping rounded-full border border-cyan-500/30 bg-cyan-500/5 shadow-[inset_0_0_40px_rgba(6,182,212,0.2)]" style={{ animationDuration: '4s' }} />
          <div className="absolute inset-[15%] animate-ping rounded-full border border-cyan-400/25 bg-cyan-400/5 shadow-[inset_0_0_30px_rgba(6,182,212,0.2)]" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        </div>
      </div>

      {/* MODAL PWA */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/20 bg-slate-900/90 p-10 text-center shadow-2xl">
            <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white to-transparent" />
            <Download className="mx-auto mb-6 h-16 w-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            <h3 className="mb-3 text-2xl font-black uppercase italic tracking-tight text-white">App Em Breve</h3>
            <p className="mb-8 text-sm font-medium leading-relaxed text-slate-300">O aplicativo oficial da FRETOGO está sendo publicado nas lojas. Se o seu navegador permitir, a opção de instalar já deve estar aparecendo na tela.</p>
            <button onClick={() => setShowModal(false)} className="w-full rounded-[1.25rem] bg-cyan-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-slate-950 transition-all hover:scale-[1.02] hover:bg-cyan-400 active:scale-95">Entendi</button>
          </div>
        </div>
      )}

      {/* WHATSAPP ICONE CORRIGIDO */}
      <a href="https://wa.me/5511946099840" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-[0_10px_35px_rgba(37,211,102,0.4)] transition-all duration-300 hover:scale-110 hover:bg-[#20bd5a] active:scale-95">
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487" />
        </svg>
      </a>

      {/* NAVBAR */}
      <header className="relative z-30 w-full">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
            <span className="text-2xl font-black italic tracking-tighter text-white">FRETOGO</span>
          </div>
          <div className="hidden items-center gap-10 md:flex">
            <Link to="/contratar" className="text-sm font-bold text-slate-300 transition-colors hover:text-cyan-400">Simular Frete</Link>
            <Link to="/parceiros" className="text-sm font-bold text-slate-300 transition-colors hover:text-white">Sou Motorista</Link>
          </div>
        </nav>
      </header>

      {/* HERO MAIN - Usando flex-1 e container mx-auto inquebráveis */}
      <main className="relative z-20 flex w-full flex-1 items-center">
        <section className="mx-auto w-full max-w-7xl px-6 py-10 lg:py-0">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            
            {/* TEXTOS E BOTÕES */}
            <div className="flex w-full flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-950/40 px-5 py-2.5 shadow-md backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">Radar ativo em sua região</span>
              </div>

              <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white md:text-6xl lg:text-[4.5rem]">
                SUA CARGA NO <span className="italic text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">RADAR</span>.<br />
                O MOTORISTA NA <span className="italic text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">PORTA</span>.
              </h1>

              <p className="mt-6 max-w-[560px] text-lg font-medium leading-relaxed text-slate-300 md:text-xl">
                A primeira plataforma de fretes autônoma com matching inteligente. Contrate em segundos e acompanhe tudo em tempo real.
                <span className="mt-3 block text-xl font-bold text-white">Sem mensalidade. Sem burocracia.</span>
              </p>

              {/* BOTÕES: Cliente (Ciano), Motorista (Ciano), PWA (Branco/Preto) */}
              <div className="mt-10 flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Link to="/contratar" className="group flex flex-1 items-center justify-center gap-2 rounded-[1.25rem] bg-cyan-500 px-6 py-5 text-[15px] font-black uppercase italic tracking-widest text-slate-950 shadow-[0_15px_30px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02] hover:bg-cyan-400 active:scale-95">
                  Contratar Frete
                  <ChevronRight size={20} className="transition-transform group-hover:translate-x-1.5" />
                </Link>

                <Link to="/parceiros" className="flex flex-1 items-center justify-center rounded-[1.25rem] bg-cyan-500 px-6 py-5 text-[15px] font-black uppercase italic tracking-widest text-slate-950 shadow-[0_15px_30px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02] hover:bg-cyan-400 active:scale-95">
                  Ser Motorista
                </Link>

                <button onClick={() => setShowModal(true)} className="flex flex-1 items-center justify-center gap-2 rounded-[1.25rem] bg-white px-6 py-5 text-[15px] font-black uppercase italic tracking-widest text-black shadow-[0_15px_30px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.02] hover:bg-slate-200 active:scale-95">
                  <Download size={20} className="text-black" />
                  Baixar App
                </button>
              </div>
            </div>

            {/* CELULAR GIGANTE */}
            <div className="relative mt-8 flex w-full items-center justify-center lg:mt-0 lg:justify-end">
              <div className="relative aspect-[9/16] w-full max-w-[320px] shrink-0 overflow-hidden rounded-[3rem] border-[6px] border-slate-800/80 bg-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.9)] backdrop-blur-sm lg:max-w-[340px]">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative h-48 w-48">
                    <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/15" style={{ animationDuration: '3s' }} />
                  </div>
                </div>
                <div className="absolute left-1/2 top-1/2 z-20 w-[85%] -translate-x-1/2 -translate-y-1/2">
                  <div className="animate-[bounce_4s_infinite] rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-yellow-400 p-2.5 shadow-inner">
                        <Truck className="h-5 w-5 text-slate-950" />
                      </div>
                      <div>
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Motorista Próximo</p>
                        <p className="text-sm font-black italic text-white">Ricardo S. • 2.4km</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-2 top-[30%] z-30 flex animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite] items-center gap-3 rounded-2xl border border-green-500/40 bg-slate-900/95 px-6 py-5 shadow-2xl backdrop-blur-xl md:-left-8">
                <ShieldCheck className="h-7 w-7 text-green-400" />
                <span className="text-sm font-black uppercase tracking-widest text-white">Verificado</span>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* FOOTER DOS CARDS - Preso no final (mt-auto) e não será cortado */}
      <section className="relative z-20 mt-auto w-full border-t border-white/10 bg-slate-900/20 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-7xl px-6 py-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {benefits.map((item, index) => (
              <div key={index} className="group flex w-full flex-col items-center gap-4 rounded-[2rem] border border-white/5 bg-slate-900/40 p-6 text-center shadow-lg backdrop-blur-md transition-all hover:border-cyan-500/40 hover:bg-slate-900/80 sm:items-start sm:text-left">
                <div className="shrink-0 rounded-2xl border border-white/10 bg-slate-950 p-4 transition-transform group-hover:scale-110">
                  {item.icon}
                </div>
                <div className="flex flex-col">
                  <h3 className="mb-1 text-lg font-black uppercase italic tracking-wide text-white transition-colors group-hover:text-cyan-50">{item.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-slate-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
