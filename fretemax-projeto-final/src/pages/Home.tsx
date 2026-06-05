// =========================================================
// NOME DO ARQUIVO: src/pages/Home.tsx (VERSÃO ESTÁVEL E CORRIGIDA)
// =========================================================
import { Zap, Truck, ShieldCheck, ArrowRight, Smartphone, CheckCircle } from 'lucide-react';

export default function Home() {
  const goToClient = () => {
    window.location.href = '/cliente';
  };

  const goToDriver = () => {
    window.location.href = '/motorista';
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/20">
      
      {/* BACKGROUND CORPORATIVO */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100"></div>
        <div className="absolute left-[-10%] top-[-5%] h-[40rem] w-[40rem] rounded-full bg-blue-100/40 blur-[100px]" />
        <div className="absolute right-[-10%] top-[20%] h-[35rem] w-[35rem] rounded-full bg-cyan-100/30 blur-[120px]" />
      </div>

      {/* NAVBAR */}
      <header className="relative z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 fill-blue-600 text-blue-600" />
            <span className="text-2xl font-black italic tracking-tighter text-slate-900">FRETOGO</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={goToDriver} className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
              Sou Motorista
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={goToClient} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-105 hover:bg-blue-700 active:scale-95">
              Cotar Frete <ArrowRight size={16} />
            </button>
          </div>
        </nav>
      </header>

      {/* HERO SECTION */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="max-w-2xl animate-in slide-in-from-bottom-8 duration-700">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-800">Plataforma Logística B2B & B2C</span>
            </div>
            
            <h1 className="text-5xl font-black tracking-tight text-slate-900 sm:text-6xl lg:text-7xl leading-[1.1]">
              A entrega rápida que o seu <span className="italic text-blue-600">negócio exige.</span>
            </h1>
            
            <p className="mt-6 text-lg leading-relaxed text-slate-600 max-w-xl">
              Conectamos sua carga a milhares de motoristas parceiros em tempo real. De pacotes pequenos a carretas, cote e acompanhe tudo na palma da mão, sem mensalidades escondidas.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button onClick={goToClient} className="flex h-16 w-full sm:w-auto items-center justify-center gap-3 rounded-[1.25rem] bg-blue-600 px-8 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-blue-600/30 transition-all hover:scale-105 hover:bg-blue-700 active:scale-95">
                <Truck size={20} /> Fazer Cotação Agora
              </button>
              <button onClick={goToDriver} className="flex h-16 w-full sm:w-auto items-center justify-center gap-3 rounded-[1.25rem] border-2 border-slate-900 bg-transparent px-8 text-sm font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-slate-900 hover:text-white active:scale-95">
                <Smartphone size={20} /> Quero ser Parceiro
              </button>
            </div>
            
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm font-bold text-slate-500">
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500"/> Zero Mensalidade</div>
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500"/> Rastreio Ao Vivo</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
