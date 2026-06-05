import { Zap, Truck, ShieldCheck, ArrowRight, Smartphone, CheckCircle } from 'lucide-react';

export default function Home() {
  const goToClient = () => {
    window.location.href = '/cliente';
  };

  const goToDriver = () => {
    window.location.href = '/motorista';
  };

  const openWhatsAppSupport = () => {
    window.open('https://wa.me/5511946099840', '_blank');
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
            <a href="#solucoes" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Soluções</a>
            <a href="#seguranca" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Segurança</a>
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
          
          {/* LADO ESQUERDO: TEXTO E CTA */}
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
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500"/> Liberação por PIN Seguro</div>
            </div>
          </div>

          {/* LADO DIREITO: DASHBOARD MOCKUP */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none animate-in fade-in zoom-in duration-1000 delay-200">
            <div className="relative rounded-[2.5rem] border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/50">
              <div className="rounded-[2rem] overflow-hidden border border-slate-100 bg-slate-50">
                <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400"></div>
                    <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                    <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Garantia Fretogo</span>
                </div>
                
                <div className="p-6 md:p-10 text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4">Você no controle total</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    O pagamento que você realiza fica retido de forma segura na plataforma. O motorista só recebe o valor após você informar a sua <strong>Senha Exclusiva (PIN)</strong> no momento do descarregamento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER BÁSICO */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-10 mt-auto">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 fill-blue-600 text-blue-600" />
            <span className="text-lg font-black italic text-slate-900">FRETOGO</span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">© 2026 Fretogo Logística. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* BOTÃO FIXO DE WHATSAPP ORIGINAL (SVG OFICIAL) */}
      <button 
        onClick={openWhatsAppSupport}
        title="Suporte Fretogo"
        className="fixed bottom-6 right-6 z-[100] flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.4)] transition-all hover:scale-110 hover:bg-[#1ebe57] active:scale-95"
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.482-1.46-1.656-1.758-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.41C7.314 7.518 6.5 8.275 6.5 9.81c0 1.536 1.341 3.02 1.528 3.268.188.249 2.23 3.407 5.4 4.704 3.17 1.298 3.17.868 3.765.818.594-.05 1.93-.792 2.203-1.558.273-.766.273-1.423.198-1.558-.075-.135-.272-.224-.569-.373zM12.015 22.42c-1.725 0-3.414-.464-4.896-1.34l-.35-.207-3.642.954.97-3.552-.227-.361C2.868 16.326 2.33 14.218 2.33 12c0-5.513 4.49-10 10.007-10 5.514 0 10 4.486 10 10s-4.486 10-10 10zm0-21.724C5.556.696.284 5.968.284 12c0 2.07.54 4.093 1.564 5.877L.284 23.504l5.772-1.513A9.68 9.68 0 0 0 12.015 24c6.458 0 11.716-5.27 11.716-11.716 0-6.457-5.258-11.588-11.716-11.588z"/>
        </svg>
      </button>

    </div>
  );
}
