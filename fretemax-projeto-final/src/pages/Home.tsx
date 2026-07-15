// =========================================================
// NOME DO ARQUIVO: src/pages/Home.tsx (PORTAL FRETOGO NETWORK B2B/B2C)
// CTO-Log: Refatoração Visual Sprint 1. Separação de funis (Embarcador vs Transportador).
// CTO-Log 2: Correção de importação do lucide-react (CheckCircle adicionado).
// =========================================================
import { Zap, Truck, ShieldCheck, ArrowRight, Smartphone, Building2, MapPin, UserCircle, CheckCircle } from 'lucide-react';

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
    <div className="relative min-h-[100dvh] w-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/20">
      
      {/* BACKGROUND CORPORATIVO B2B */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-white"></div>
        <div className="absolute left-[-10%] top-[-5%] h-[40rem] w-[40rem] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[35rem] w-[35rem] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      {/* NAVBAR UNIFICADA */}
      <header className="relative z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-xl shadow-sm">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
              <Zap className="h-6 w-6 fill-white text-white" />
            </div>
            <span className="text-2xl font-black italic tracking-tighter text-slate-900">FRETOGO <span className="text-sm font-bold text-blue-600 not-italic tracking-widest uppercase">Network</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => alert("Login Unificado em Construção (Sprint 2)")} 
              className="hidden sm:flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-transparent px-6 text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            >
              <UserCircle size={18} /> Entrar na Conta
            </button>
          </div>
        </nav>
      </header>

      {/* HERO SECTION - SPLIT FUNNEL */}
      <main className="relative z-10 w-full flex-grow flex flex-col items-center justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        
        <div className="text-center max-w-3xl mx-auto mb-16 animate-in slide-in-from-bottom-4 duration-700">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-800">O Novo Padrão de Logística Nacional</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
            Conectamos Cargas a Motoristas <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Validados.</span>
          </h1>
          
          <p className="mt-6 text-lg sm:text-xl leading-relaxed text-slate-600 font-medium">
            A rede digital definitiva. Sem mensalidades. Segurança de custódia total e liberação de pagamento por PIN antifraude no momento da entrega.
          </p>
        </div>

        {/* OS DOIS FUNIS DE ENTRADA (EMBARCADOR VS TRANSPORTADOR) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto animate-in fade-in zoom-in duration-1000 delay-150">
          
          {/* CARD EMPRESA (EMBARCADOR) */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl transition-all hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-600/10">
            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
              <Building2 size={120} />
            </div>
            
            <div className="relative z-10 mb-8">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <PackageIcon />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Sou Empresa / Embarcador</h2>
              <p className="mt-4 text-slate-600 font-medium">
                Poste suas cargas no mural da FretoGo. De fiorinos a carretas LS. Pague apenas quando o motorista aceitar, com dinheiro blindado até a entrega.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-700"><CheckCircle size={18} className="text-emerald-500" /> Acesso a +5.000 Motoristas</li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-700"><CheckCircle size={18} className="text-emerald-500" /> Postagem de Cargas Gratuita</li>
              </ul>
            </div>
            
            <button onClick={goToClient} className="relative z-10 flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 group-hover:scale-[1.02]">
              Painel de Cargas <ArrowRight size={18} />
            </button>
          </div>

          {/* CARD MOTORISTA (TRANSPORTADOR) */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-900 p-8 shadow-xl transition-all hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/20">
            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10 text-cyan-400">
              <Truck size={120} />
            </div>
            
            <div className="relative z-10 mb-8">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-cyan-400 border border-slate-700">
                <MapPin size={32} />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Sou Motorista / Agregado</h2>
              <p className="mt-4 text-slate-400 font-medium">
                Pare de bater lata. Acesse o mural nacional de fretes em tempo real. Escolha as cargas que pagam melhor para o seu veículo e garanta seu retorno.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-300"><CheckCircle size={18} className="text-cyan-500" /> Pagamento Garantido por Escrow</li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-300"><CheckCircle size={18} className="text-cyan-500" /> Sem Mensalidade Oculta</li>
              </ul>
            </div>
            
            <button onClick={goToDriver} className="relative z-10 flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-cyan-500 px-6 text-sm font-black uppercase tracking-widest text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 active:scale-95 group-hover:scale-[1.02]">
              Acessar Mural de Fretes <Truck size={18} />
            </button>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 fill-slate-400 text-slate-400" />
            <span className="text-lg font-black italic text-slate-400">FRETOGO</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tecnologia Logística © 2026. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* BOTÃO FIXO DE WHATSAPP */}
      <button 
        onClick={openWhatsAppSupport}
        title="Suporte FretoGo B2B"
        className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.3)] transition-all hover:scale-110 hover:bg-[#1ebe57] active:scale-95"
      >
        <Smartphone size={24} />
      </button>

    </div>
  );
}

// Ícone Customizado para o Card da Empresa
function PackageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.5 4.21"/>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
