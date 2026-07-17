// =========================================================
// NOME DO ARQUIVO: src/components/driver/dashboard/RadarStatus.tsx
// CTO-Log: Product Polish - UX Comportamental (Sunk Cost Fallacy).
// O cronômetro gera um sentimento de perda caso o usuário desligue o app.
// =========================================================

import { useEffect, useState } from 'react';
import { Power, Radar, Search, ShieldCheck, Clock } from 'lucide-react';

export default function RadarStatus() {
  const [online, setOnline] = useState(false);
  const [tempoOnline, setTempoOnline] = useState(0); 
  const [statusText, setStatusText] = useState('Sistema em repouso. Acione o botão de interceptação.');

  const searchingMessages = [
    'Analisando motoristas concorrentes no perímetro...',
    'Escaneando notas fiscais emitidas nas últimas horas...',
    'Aguardando disparo de embarcadores parceiros...',
    'Filtrando cargas compatíveis com seu implemento...',
    'Calculando rotas de alta lucratividade na região...',
    'Sincronizando com a Torre de Controle Fretogo...',
  ];

  useEffect(() => {
    if (!online) {
      setTempoOnline(0);
      setStatusText('Sistema em repouso. Acione o botão de interceptação.');
      return;
    }

    let index = 0;
    // Dispara a primeira mensagem imediatamente
    setStatusText(searchingMessages[0]);
    
    const textInterval = setInterval(() => {
      index = (index + 1) % searchingMessages.length;
      setStatusText(searchingMessages[index]);
    }, 4000);

    const timeInterval = setInterval(() => {
      setTempoOnline((prev) => prev + 1);
    }, 60000); // ++1 minuto

    return () => {
      clearInterval(textInterval);
      clearInterval(timeInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      
      {/* GRID DE FUNDO */}
      <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:60px_60px] pointer-events-none" />

      {/* GLOW CENTRAL */}
      <div className={`absolute left-1/2 top-1/2 h-[45rem] w-[45rem] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-1000 blur-[200px] pointer-events-none ${online ? 'bg-cyan-500/15' : 'bg-slate-800/20'}`} />

      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center w-full max-w-5xl">
        
        {/* NÚCLEO DO RADAR */}
        <div className="relative flex items-center justify-center mb-12">
          {online && (
            <>
              <div className="absolute h-[280px] w-[280px] animate-ping rounded-full border border-cyan-400/30" style={{ animationDuration: '3s' }} />
              <div className="absolute h-[400px] w-[400px] animate-pulse rounded-full border border-cyan-400/20" style={{ animationDuration: '4s' }} />
              <div className="absolute h-[550px] w-[550px] rounded-full border border-cyan-400/5 rotate-180" />
            </>
          )}

          {/* CHAVE DE IGNIÇÃO */}
          <button
            onClick={() => setOnline(!online)}
            className={`relative flex h-44 w-44 z-20 items-center justify-center rounded-full border-[6px] transition-all duration-500 ${
              online
                ? 'border-cyan-400 bg-[#061224] shadow-[0_0_100px_rgba(6,182,212,0.4)] scale-105'
                : 'border-slate-800 bg-slate-900/80 hover:border-slate-600'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <Power size={56} className={online ? 'text-cyan-400 animate-pulse' : 'text-slate-600'} />
              <span className={`text-[11px] font-black uppercase tracking-[0.4em] ${online ? 'text-cyan-400 drop-shadow-md' : 'text-slate-600'}`}>
                {online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </button>
        </div>

        {/* FEEDBACK DO SISTEMA */}
        <div className="mt-6 w-full max-w-lg animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <Radar className={online ? 'text-cyan-400 animate-spin-slow' : 'text-slate-600'} size={20} />
            <span className={`text-[10px] font-black uppercase tracking-[0.35em] ${online ? 'text-cyan-400' : 'text-slate-600'}`}>
              Radar Operacional
            </span>
          </div>

          <div className="h-[90px] flex items-center justify-center flex-col">
             <h2 className={`text-4xl font-black uppercase tracking-tighter transition-colors duration-500 ${online ? 'text-white drop-shadow-md' : 'text-slate-600'}`}>
               {online ? 'MALHA ATIVA' : 'SINAL CORTADO'}
             </h2>
             <p className={`mt-4 text-sm font-medium tracking-wide transition-opacity duration-300 ${online ? 'text-cyan-200/70' : 'text-slate-500'} h-6`}>
               {statusText}
             </p>
          </div>
        </div>

        {/* ESTATÍSTICAS / GATILHO DE SUNK COST (CUSTO IRRECUPERÁVEL) */}
        {online && (
          <div className="mt-16 grid w-full grid-cols-1 gap-5 md:grid-cols-3 animate-in zoom-in-95 duration-700">
            
            <div className="rounded-[2rem] border border-cyan-500/20 bg-slate-900/60 p-6 md:p-8 backdrop-blur-xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>
              <div className="flex items-center justify-between mb-5">
                 <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Posição na Fila</p>
                 <div className="bg-cyan-500/10 p-2 rounded-xl">
                    <Clock size={18} className="text-cyan-400" />
                 </div>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tighter text-left">
                {tempoOnline > 5 ? 'PRIORIDADE' : 'AGUARDANDO'}
              </h3>
              <p className="text-[10px] text-cyan-400 font-bold mt-2 uppercase tracking-widest text-left">
                {tempoOnline} MIN DE CONEXÃO
              </p>
            </div>

            <div className="rounded-[2rem] border border-emerald-500/20 bg-slate-900/60 p-6 md:p-8 backdrop-blur-xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
              <div className="flex items-center justify-between mb-5">
                 <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Escrow Fretogo</p>
                 <div className="bg-emerald-500/10 p-2 rounded-xl">
                    <ShieldCheck size={18} className="text-emerald-400" />
                 </div>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tighter text-left">
                FINANCEIRO OK
              </h3>
              <p className="text-[10px] text-emerald-400 font-bold mt-2 uppercase tracking-widest text-left">
                PAGAMENTOS BLINDADOS
              </p>
            </div>

            <div className="rounded-[2rem] border border-amber-500/20 bg-slate-900/60 p-6 md:p-8 backdrop-blur-xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
              <div className="flex items-center justify-between mb-5">
                 <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Status Local</p>
                 <div className="bg-amber-500/10 p-2 rounded-xl">
                    <Search size={18} className="text-amber-400 animate-pulse" />
                 </div>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tighter text-left">
                RASTREAMENTO
              </h3>
              <p className="text-[10px] text-amber-400 font-bold mt-2 uppercase tracking-widest text-left">
                MONITORANDO CARGAS
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
