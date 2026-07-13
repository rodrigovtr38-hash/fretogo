// src/components/client/ClientStatusCard.tsx
// CTO-Log: Blindagem de Status para suportar 'Tempo Esgotado' e Motoristas Offline graciosamente.

import { Radar, Truck, User, Package, Lock, AlertTriangle } from 'lucide-react';

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
  if (status === 'aguardando_pagamento') safeStatus = 'Aguardando Pagamento';
  if (status === 'disponivel') safeStatus = 'Buscando Parceiros';
  if (status === 'sem_motorista' || status === 'expirado') safeStatus = 'Tempo de Busca Esgotado';
  if (status === 'cancelado') safeStatus = 'Corrida Cancelada';
  if (['aceito', 'indo_coleta', 'chegou_coleta', 'coletando', 'em_transporte', 'finalizando', 'finalizado'].includes(status)) {
    safeStatus = status;
  }

  const isDataReady = typeof distancia === 'number' && distancia > 0 && typeof valorTotal === 'number' && valorTotal > 0;
  const displayDistance = isDataReady ? `${distancia.toFixed(1)} km` : 'Calculando...';
  const displayPrice = isDataReady ? `R$ ${valorTotal.toFixed(2).replace('.', ',')}` : '---';

  const showWarning = status === 'sem_motorista' || status === 'expirado';

  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">

      {/* HEADER DE STATUS */}
      <div className="mb-8 flex items-center gap-4">
        <div className={`p-3 rounded-2xl border ${showWarning ? 'bg-amber-500/10 border-amber-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
          {showWarning ? (
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          ) : (
            <Radar className={`h-6 w-6 text-cyan-400 ${['disponivel', 'aguardando_pagamento'].includes(status) ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          )}
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${showWarning ? 'text-amber-400' : 'text-cyan-400'}`}>
            Torre de Monitoramento
          </p>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mt-0.5">
            {safeStatus.replace('_', ' ')}
          </h2>
        </div>
      </div>

      {/* DETALHES OPERACIONAIS */}
      <div className="space-y-4">

        {/* MOTORISTA */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
              <User size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Profissional Designado</span>
              <p className={`text-sm font-bold truncate mt-0.5 ${showWarning ? 'text-amber-400/80' : 'text-white'}`}>
                {motoristaNome || (showWarning ? 'Sem motoristas online na região' : 'Buscando parceiro ideal...')}
              </p>
            </div>
          </div>
        </div>

        {/* VEÍCULO */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-xl text-green-400 shrink-0">
            <Truck size={18} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Categoria do Veículo</span>
            <p className="text-sm font-bold text-white uppercase mt-0.5">
              {veiculo?.replace('_', ' ') || 'Processando especificações...'}
            </p>
          </div>
        </div>

        {/* ROTA E FINANCEIRO */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-400 shrink-0">
              <Package size={18} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                Resumo da Carga {multiplasEntregas && <span className="text-cyan-400 font-black"> (Multi-Drop)</span>}
              </span>
              <p className="text-sm font-bold text-white mt-0.5">
                {displayDistance} · <span className="text-green-400 font-black">{displayPrice}</span>
              </p>
            </div>
          </div>
        </div>

        {/* PINS DE SEGURANÇA */}
        {(pinColeta || (pinEntregas && pinEntregas.length > 0)) && (
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 mb-3">
              <Lock size={12} /> Seus Códigos de Verificação (PIN)
            </p>
            <div className="flex flex-wrap gap-3">
              {pinColeta && (
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-white/5 flex-1 min-w-[120px]">
                  <span className="text-[8px] text-slate-500 uppercase font-bold block">PIN de Coleta</span>
                  <span className="font-mono font-black text-base text-white tracking-widest mt-0.5 block">{pinColeta}</span>
                </div>
              )}
              {pinEntregas && pinEntregas.length > 0 && (
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-white/5 flex-1 min-w-[120px]">
                  <span className="text-[8px] text-slate-500 uppercase font-bold block">
                    PIN Entrega {multiplasEntregas ? `(Parada ${paradaAtualIndex + 1})` : ''}
                  </span>
                  <span className="font-mono font-black text-base text-emerald-400 tracking-widest mt-0.5 block">
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
