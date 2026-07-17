// =========================================================
// NOME DO ARQUIVO: src/components/home/HeroSection.tsx
// CTO-Log: Impacto Imediato (Above the Fold). Copywriting voltado para redução de CAC.
// Demonstração visual do valor (Product-Led Growth).
// =========================================================

import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-cyan-500/10 min-h-screen pt-20">
      {/* LUZ DE FUNDO */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[85vh] flex-col items-center justify-center gap-14 py-12 lg:grid lg:grid-cols-2 lg:gap-20">

          {/* COLUNA 1: COPYWRITING E CONVERSÃO */}
          <div className="w-full max-w-2xl text-center lg:text-left mt-10 lg:mt-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Malha Logística Inteligente
            </div>

            <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4.5rem]">
              Sua carga no radar. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                O motorista na doca.
              </span>
            </h1>

            <p className="mt-8 max-w-xl text-base font-medium leading-relaxed text-slate-400 sm:text-lg">
              Elimine o gargalo logístico. Conectamos a sua empresa a frotas verificadas em tempo real com matching automático, rastreamento vivo e pagamentos blindados.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/cliente"
                className="inline-flex h-16 items-center justify-center rounded-[1.5rem] bg-cyan-500 px-10 text-sm font-black uppercase tracking-widest text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.3)] transition-all duration-300 hover:scale-[1.03] hover:bg-cyan-400 hover:shadow-[0_15px_40px_rgba(34,211,238,0.4)]"
              >
                Despachar Carga
              </Link>
              <Link
                to="/motorista"
                className="inline-flex h-16 items-center justify-center rounded-[1.5rem] border border-white/10 bg-slate-900/60 px-10 text-sm font-black uppercase tracking-widest text-white backdrop-blur-md transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-800"
              >
                Sou Caminhoneiro
              </Link>
            </div>

            {/* MINI MÉTRICAS DE AUTORIDADE */}
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-sm">
                <div className="text-2xl font-black text-cyan-400">24/7</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Realtime</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-sm">
                <div className="text-2xl font-black text-cyan-400">7</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Categorias</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-sm">
                <div className="text-2xl font-black text-cyan-400">GPS</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Radar Vivo</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-sm">
                <div className="text-2xl font-black text-cyan-400">A.I.</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Matching</div>
              </div>
            </div>
          </div>

          {/* COLUNA 2: VISUALIZAÇÃO DO PRODUTO (PLG) */}
          <div className="relative flex w-full items-center justify-center lg:justify-end">
            <div className="absolute h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

            {/* CELULAR MOCKUP */}
            <div className="relative flex h-[580px] w-[300px] flex-col overflow-hidden rounded-[2.5rem] border-[8px] border-slate-900 bg-[#061224] shadow-[0_20px_80px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
              
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.1),transparent_80%)]" />

              {/* DYNAMIC ISLAND / NOTCH */}
              <div className="absolute top-0 left-1/2 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-900 z-20"></div>

              <div className="relative z-10 flex h-full w-full flex-col gap-4 p-5 pt-12">
                
                {/* NOTIFICAÇÃO */}
                <div className="rounded-[1.5rem] border border-cyan-500/30 bg-slate-900/80 p-4 backdrop-blur-xl shadow-lg transform transition-transform hover:scale-105">
                  <div className="text-[9px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    Motorista a Caminho
                  </div>
                  <div className="text-lg font-black text-white">Antonio S.</div>
                  <div className="text-xs font-bold text-slate-400">Truck Sider • 2.4km de distância</div>
                </div>

                {/* ETA CARD */}
                <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 p-5 mt-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                    Chegada Estimada
                  </div>
                  <div className="mt-1 text-4xl font-black text-white tracking-tighter">
                    08 <span className="text-lg text-amber-200/50">min</span>
                  </div>
                </div>

                {/* PROGRESSO DA ROTA */}
                <div className="rounded-[1.5rem] border border-white/5 bg-slate-900/80 p-5 mt-auto mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Progresso</span>
                    <span className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-400">
                      Em Rota
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-[72%] rounded-full bg-cyan-500 relative">
                       <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/30 animate-pulse"></div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
