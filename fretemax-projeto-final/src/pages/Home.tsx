// =========================================================
// NOME DO ARQUIVO: src/pages/Home.tsx
// =========================================================
import { Zap, Truck, ShieldCheck, ArrowRight, Smartphone, CheckCircle, Info, LockKeyhole, Map } from 'lucide-react';

export default function Home() {
  const goToClient = () => window.location.href = '/cliente';
  const goToDriver = () => window.location.href = '/motorista';

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
            <a href="#solucoes" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Soluções</a>
            <a href="#seguranca" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Segurança</a>
            <button onClick={goToDriver} className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Sou Motorista</button>
          </div>

          <button onClick={goToClient} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-black uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105 active:scale-95">
            Cotar Frete <ArrowRight size={16} />
          </button>
        </nav>
      </header>

      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-32 lg:px-8">
        {/* HERO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
          <div className="animate-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-5xl font-black tracking-tight text-slate-900 sm:text-6xl lg:text-7xl leading-[1.1]">
              A entrega rápida que o seu <span className="italic text-blue-600">negócio exige.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-xl">Conectamos sua carga a milhares de motoristas parceiros em tempo real. Sem mensalidades, com rastreio ao vivo e liberação segura.</p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button onClick={goToClient} className="flex h-16 items-center justify-center gap-3 rounded-[1.25rem] bg-blue-600 px-8 text-sm font-black uppercase text-white shadow-xl hover:bg-blue-700 transition-all">
                <Truck size={20} /> Fazer Cotação Agora
              </button>
            </div>
          </div>
        </div>

        {/* SEÇÃO SOLUÇÕES */}
        <section id="solucoes" className="py-20 border-t border-slate-200">
          <h2 className="text-3xl font-black text-center mb-16">Nossas Soluções</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <Truck className="text-blue-600 mb-4" size={32}/>
              <h3 className="text-xl font-black mb-2">Logística Multimodal</h3>
              <p className="text-slate-600">De pequenas entregas de moto a grandes cargas em carretas LS.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <Map className="text-blue-600 mb-4" size={32}/>
              <h3 className="text-xl font-black mb-2">Radar em Tempo Real</h3>
              <p className="text-slate-600">Acompanhe sua carga no mapa desde a coleta até a entrega final.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <Info className="text-blue-600 mb-4" size={32}/>
              <h3 className="text-xl font-black mb-2">Suporte 24/7</h3>
              <p className="text-slate-600">Equipe dedicada para garantir que seu frete não pare nunca.</p>
            </div>
          </div>
        </section>

        {/* SEÇÃO SEGURANÇA */}
        <section id="seguranca" className="py-20 border-t border-slate-200">
          <div className="bg-blue-900 rounded-[2.5rem] p-12 text-white grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <LockKeyhole className="text-blue-400 mb-6" size={48}/>
              <h2 className="text-4xl font-black mb-6">Segurança com PIN</h2>
              <p className="text-blue-100 leading-relaxed text-lg">O pagamento fica retido na plataforma. O motorista só recebe após você, cliente, informar a Senha Exclusiva (PIN) no descarregamento.</p>
            </div>
            <div className="bg-blue-800/50 p-8 rounded-2xl border border-blue-700">
               <CheckCircle className="text-emerald-400 mb-4" size={32} />
               <h4 className="font-bold text-xl mb-2">Anti-Fraude Fretogo</h4>
               <p className="text-blue-200">Total liberdade para verificar o comprovante de entrega antes de liberar o repasse.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
