// =========================================================
// NOME DO ARQUIVO: src/components/client/ClientStatusCard.tsx
// CTO-Log: Blindagem de Status + Gatilho de Upsell (Aumentar Valor) em caso de Timeout.
// =========================================================

import { Radar, Truck, User, Package, Lock, AlertTriangle, TrendingUp } from 'lucide-react';

interface ClientStatusCardProps {
  orderData: any;
}

export default function ClientStatusCard({ orderData }: ClientStatusCardProps) {
  const status = orderData?.status;
  const motoristaNome = orderData?.motoristaNome;
  const veiculo = orderData?.veiculo;
  const distancia = orderData?.distancia;
  const valorTotal = orderData?.valorTotal;
  const pinColeta = orderData?.pinColeta;
  const pinEntregas = orderData?.pinEntregas;
  const paradaAtualIndex = orderData?.paradaAtualIndex || 0;
  const multiplasEntregas = orderData?.multiplasEntregas || false;

  let safeStatus = 'Sincronizando operação...';
  if (status === 'aguardando_pagamento') safeStatus = 'Aguardando Escrow';
  if (status === 'disponivel') safeStatus = 'Radar Ativo';
  if (status === 'sem_motorista' || status === 'expirado') safeStatus = 'Timeout Operacional';
  if (status === 'cancelado') safeStatus = 'Operação Abortada';
  if (['aceito', 'indo_coleta', 'chegou_coleta', 'coletando', 'em_transporte', 'finalizando', 'finalizado'].includes(status)) {
    safeStatus = status.replace('_', ' ');
  }

  const isDataReady = typeof distancia === 'number' && distancia > 0 && typeof valorTotal === 'number' && valorTotal > 0;
  const displayDistance = isDataReady ? `${distancia.toFixed(1)} km` : 'Calculando...';
  const displayPrice = isDataReady ? `R$ ${valorTotal.toFixed(2).replace('.', ',')}` : '---';

  const showWarning = status === 'sem_motorista' || status === 'expirado';

  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">

      {/* HEADER DE STATUS */}
      <div className="mb-8 flex items-center gap-4">
        <div className={`p-3.5 rounded-[1.5rem] border ${showWarning ? 'bg-amber-500/10 border-amber-500/30' : 'bg-cyan-500/10 border-cyan-500/30'}`}>
          {showWarning ? (
            <AlertTriangle className="h-7 w-7 text-amber-400" />
          ) : (
            <Radar className={`h-7 w-7 text-cyan-400 ${['disponivel', 'aguardando_pagamento'].includes(status) ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          )}
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${showWarning ? 'text-amber-400' : 'text-cyan-400'}`}>
            Torre de Monitoramento
          </p>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mt-0.5">
            {safeStatus}
          </h2>
        </div>
      </div>

      {/* UPSELL / RETENÇÃO: Explicar por que o motorista não pegou */}
      {showWarning && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 flex items-start gap-4">
           <TrendingUp className="text-amber-400 shrink-0 mt-0.5" size={20} />
           <div>
              <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">Dica de Mercado</p>
              <p className="text-xs font-bold text-amber-100/80 leading-relaxed">
                Nenhum parceiro aceitou a carga neste valor dentro do tempo limite. Feche este pedido e poste novamente com uma tarifa maior para atrair a frota rapidamente.
              </p>
           </div>
        </div>
      )}

      {/* DETALHES OPERACIONAIS */}
      <div className="space-y-4">

        {/* MOTORISTA */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 flex items-center justify-between transition-colors hover:bg-slate-950/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
              <User size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Profissional Designado</span>
              <p className={`text-sm font-bold truncate mt-0.5 ${showWarning ? 'text-amber-400/80' : 'text-white'}`}>
                {motoristaNome || (showWarning ? 'Aguardando republicação' : 'Buscando parceiro ideal...')}
              </p>
            </div>
          </div>
        </div>

        {/* VEÍCULO */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 flex items-center gap-3 transition-colors hover:bg-slate-950/80">
          <div className="p-2.5 bg-green-500/10 rounded-xl text-green-400 shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Especificação Exigida</span>
            <p className="text-sm font-bold text-white uppercase mt-0.5">
              {veiculo?.replace('_', ' ') || 'Analisando matriz...'}
            </p>
          </div>
        </div>

        {/* ROTA E FINANCEIRO */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 flex items-center justify-between transition-colors hover:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 rounded-xl text-yellow-400 shrink-0">
              <Package size={20} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                Resumo Logístico {multiplasEntregas && <span className="text-cyan-400 font-black ml-1 bg-cyan-500/10 px-1 py-0.5 rounded">MULTI-DROP</span>}
              </span>
              <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                {displayDistance} <span className="text-slate-600">|</span> <span className="text-green-400 font-black">{displayPrice}</span>
              </p>
            </div>
          </div>
        </div>

        {/* PINS DE SEGURANÇA BANCÁRIA */}
        {(pinColeta || (pinEntregas && pinEntregas.length > 0)) && (
          <div className="rounded-[1.5rem] border border-cyan-500/30 bg-cyan-950/30 p-5 mt-6 relative overflow-hidden shadow-inner">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2 mb-4">
              <Lock size={14} /> Chaves de Liberação (PIN)
            </p>
            <div className="flex flex-wrap gap-4">
              {pinColeta && (
                <div className="bg-slate-950 px-4 py-3 rounded-2xl border border-white/10 flex-1 min-w-[140px] shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest block mb-1">Liberação Coleta</span>
                  <span className="font-mono font-black text-xl text-white tracking-[0.2em] block">{pinColeta}</span>
                </div>
              )}
              {pinEntregas && pinEntregas.length > 0 && (
                <div className="bg-slate-950 px-4 py-3 rounded-2xl border border-emerald-500/20 flex-1 min-w-[140px] shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest block mb-1">
                    Liberação Escrow {multiplasEntregas ? `(Drop ${paradaAtualIndex + 1})` : ''}
                  </span>
                  <span className="font-mono font-black text-xl text-emerald-400 tracking-[0.2em] block">
                    {pinEntregas[paradaAtualIndex] || pinEntregas[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
