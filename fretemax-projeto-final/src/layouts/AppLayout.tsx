import { ReactNode, useState, useEffect } from 'react';
import { Cookie, Bell } from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [showCookie, setShowCookie] = useState(false);
  const [hookMessage, setHookMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. VERIFICAÇÃO DE COOKIES (LGPD / PIXEL)
    const consent = localStorage.getItem('fretogo_cookie_consent');
    if (!consent) {
      // Delay de 1.5s para não assustar o usuário assim que a tela abre
      setTimeout(() => setShowCookie(true), 1500);
    }

    // 2. SISTEMA DE GATILHOS DE MARKETING (URGÊNCIA E PROVA SOCIAL)
    const hooks = [
      "🔥 3 motoristas acabaram de ficar online na sua região.",
      "⚡ Marcos (Utilitário) acabou de finalizar uma entrega e está livre.",
      "🚀 Alta demanda por Carretas hoje. Garanta seu frete agora.",
      "⭐ 98% dos fretes hoje foram aceitos em menos de 3 minutos.",
      "🛡️ Mais de 500 motoristas validados na nossa base operacional."
    ];

    // Dispara o primeiro gatilho após 12 segundos na página
    const initialHookTimer = setTimeout(() => {
      const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
      setHookMessage(randomHook);
      
      // Esconde a notificação após 6 segundos
      setTimeout(() => setHookMessage(null), 6000);
    }, 12000);

    // Fica disparando gatilhos esporádicos a cada 45 segundos para manter a tela "viva"
    const intervalHookTimer = setInterval(() => {
      const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
      setHookMessage(randomHook);
      setTimeout(() => setHookMessage(null), 6000);
    }, 45000);

    return () => {
      clearTimeout(initialHookTimer);
      clearInterval(intervalHookTimer);
    };
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('fretogo_cookie_consent', 'accepted');
    setShowCookie(false);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#020617] text-slate-200 overflow-x-hidden">
      
      {/* BACKGROUND GLOBAL CORPORATIVO */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.12),transparent_45%)]" />
        <div className="absolute left-[-10%] top-[-5%] h-[40rem] w-[40rem] rounded-full bg-cyan-600/10 blur-[140px]" />
        <div className="absolute right-[-10%] top-[10%] h-[35rem] w-[35rem] rounded-full bg-blue-600/10 blur-[160px]" />
      </div>

      {/* CONTEÚDO PRINCIPAL (As Páginas do App) */}
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>

      {/* GATILHO DE MARKETING (NOTIFICAÇÃO FLUTUANTE) */}
      {hookMessage && (
        <div className="fixed top-24 right-4 md:right-8 z-[150] animate-in slide-in-from-right-8 fade-in duration-500 max-w-sm pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 p-4 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)] flex items-start gap-3">
            <div className="bg-cyan-500/10 p-2 rounded-full shrink-0">
              <Bell className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200 leading-relaxed pr-2">{hookMessage}</p>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Radar Fretogo Live</p>
            </div>
          </div>
        </div>
      )}

      {/* BANNER DE COOKIES E LGPD */}
      {showCookie && (
        <div className="fixed bottom-0 left-0 right-0 z-[200] animate-in slide-in-from-bottom-full duration-700 p-4 md:p-6 pointer-events-auto">
          <div className="max-w-7xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500/10 p-3 rounded-2xl shrink-0 hidden md:block border border-blue-500/20">
                <Cookie className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white mb-2 tracking-tight">Sua privacidade e segurança</h3>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-3xl">
                  Utilizamos cookies e tecnologias de rastreamento para garantir o funcionamento do radar de fretes, otimizar rotas e direcionar as melhores ofertas operacionais para você. Ao continuar, você concorda com nossa política de privacidade.
                </p>
              </div>
            </div>
            <div className="flex w-full md:w-auto gap-3 shrink-0">
              <button 
                onClick={() => setShowCookie(false)}
                className="flex-1 md:flex-none px-6 py-4 rounded-xl border border-slate-700 text-slate-300 text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Recusar
              </button>
              <button 
                onClick={acceptCookies}
                className="flex-1 md:flex-none px-8 py-4 rounded-xl bg-blue-600 text-white text-[10px] md:text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:scale-105 transition-all"
              >
                Concordar e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
