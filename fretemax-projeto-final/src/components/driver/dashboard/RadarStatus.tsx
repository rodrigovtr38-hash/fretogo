// =========================================================
// NOME DO ARQUIVO: src/components/driver/dashboard/RadarStatus.tsx
// CTO-Log: Product Polish - UX Comportamental (Radar Vazio)
// Injeção de Gatilhos de Retenção:
// 1. Mensagens dinâmicas de escaneamento ativo (Caça-Níqueis).
// 2. Cronômetro de tempo de tela gerando "Status de Prioridade" (Sunk Cost Fallacy).
// =========================================================

import { useEffect, useState } from 'react';
import { Power, Radar, MapPinned, Truck, Search, ShieldCheck, Clock } from 'lucide-react';

export default function RadarStatus() {
  const [online, setOnline] = useState(false);
  const [tempoOnline, setTempoOnline] = useState(0); // Cronômetro de retenção

  const [statusText, setStatusText] = useState(
    'Você está invisível. Ligue o radar para interceptar fretes.'
  );

  // Mensagens agressivas de "Sistema Vivo"
  const searchingMessages = [
    'Analisando motoristas concorrentes próximos...',
    'Escaneando notas fiscais emitidas na região...',
    'Aguardando disparo de empresas parceiras...',
    'Filtrando cargas compatíveis com seu veículo...',
    'Calculando rotas de alta lucratividade...',
    'Sincronizando com a Torre de Controle Fretogo...',
  ];

  // Motor do Caça-Níqueis
  useEffect(() => {
    if (!online) {
      setTempoOnline(0);
      setStatusText('Você está invisível. Ligue o radar para interceptar fretes.');
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      setStatusText(searchingMessages[index]);
      index = (index + 1) % searchingMessages.length;
    }, 3500);

    // Motor do Sunk Cost (Tempo na Fila)
    const timeInterval = setInterval(() => {
      setTempoOnline((prev) => prev + 1);
    }, 60000); // Atualiza a cada 1 minuto

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [online]);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* GRID CORPORATIVO */}
      <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:60px_60px]" />

      {/* GLOW DE FUNDO */}
      <div className={`absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-1000 blur-[180px] ${online ? 'bg-cyan-500/10' : 'bg-slate-800/20'}`} />

      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center w-full max-w-5xl">
        
        {/* RADAR VISUAL */}
        <div className="relative flex items-center justify-center mb-10">
          {online && (
            <>
              <div className="absolute h-[260px] w-[260px] animate-ping rounded-full border border-cyan-400/30" style={{ animationDuration: '3s' }} />
              <div className="absolute h-[360px] w-[360px] animate-pulse rounded-full border border-cyan-400/20" style={{ animationDuration: '4s' }} />
              <div className="absolute h-[520px] w-[520px] rounded-full border border-cyan-400/5 rotate-180" />
            </>
          )}

          {/* BOTÃO POWER CENTRAL */}
          <button
            onClick={() => setOnline(!online)}
            className={`relative flex h-40 w-40 z-20 items-center justify-center rounded-full border-4 transition-all duration-500 ${
              online
                ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_80px_rgba(6,182,212,0.4)] scale-105'
                : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <Power size={52} className={online ? 'text-cyan-300 animate-pulse' : 'text-slate-500'} />
              <span className={`text-[10px] font-black uppercase tracking-[0.35em] ${online ? 'text-cyan-300' : 'text-slate-500'}`}>
                {online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </button>
        </div>

        {/* STATUS DINÂMICO DA TELA */}
        <div className="mt-8 w-full max-w-[520px] animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Radar className={online ? 'text-cyan-400 animate-spin-slow' : 'text-slate-600'} size={18} />
            <span className={`text-xs font-black uppercase tracking-[0.3em] ${online ? 'text-cyan-300' : 'text-slate-600'}`}>
              Radar Operacional
            </span>
          </div>

          <div className="h-[80px] flex items-center justify-center flex-col">
             <h2 className={`text-3xl font-black uppercase italic md:text-4xl transition-colors duration-500 ${online ? 'text-white' : 'text-slate-500'}`}>
               {online ? 'MALHA ATIVA' : 'SINAL DESLIGADO'}
             </h2>
             <p className={`mt-3 text-sm leading-relaxed transition-opacity duration-300 ${online ? 'text-cyan-100/70' : 'text-slate-500'} h-6`}>
               {statusText}
             </p>
          </div>
        </div>

        {/* ESTATÍSTICAS E GATILHOS DE FILA (SUNK COST) */}
        {online && (
          <div className="mt-12 grid w-full grid-cols-1 gap-4 md:grid-cols-3 animate-in zoom-in-95 duration-700">
            
            <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/80 p-6 backdrop-blur-xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
              <div className="flex items-center justify-between mb-4">
                 <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Status na Fila</p>
                 <Clock size={16} className="text-cyan-400" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tighter">
                {tempoOnline > 5 ? 'PRIORIDADE MÁXIMA' : 'NA FILA'}
              </h3>
              <p className="text-[10px] text-cyan-400/70 font-bold mt-2 uppercase tracking-widest">
                {tempoOnline} MINUTOS AGUARDANDO
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-slate-900/80 p-6 backdrop-blur-xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <div className="flex items-center justify-between mb-4">
                 <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Escrow Fretogo</p>
                 <ShieldCheck size={16} className="text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tighter">
                SISTEMA BLINDADO
              </h3>
              <p className="text-[10px] text-emerald-400/70 font-bold mt-2 uppercase tracking-widest">
                PAGAMENTO GARANTIDO
              </p>
            </div>

            <div className="rounded-3xl border border-amber-500/20 bg-slate-900/80 p-6 backdrop-blur-xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <div className="flex items-center justify-between mb-4">
                 <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Inteligência</p>
                 <Search size={16} className="text-amber-400 animate-pulse" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tighter">
                BUSCANDO...
              </h3>
              <p className="text-[10px] text-amber-400/70 font-bold mt-2 uppercase tracking-widest">
                NÃO FECHE O APLICATIVO
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
