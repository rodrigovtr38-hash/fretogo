import { useState, useEffect } from 'react';
import { Radar, Truck, User, Package, Lock, AlertTriangle, TrendingUp, Timer, Navigation, Star, CheckCircle2, DollarSign, Plus, RefreshCw, XCircle, Activity, FileText, Camera } from 'lucide-react';

interface ClientStatusCardProps {
  orderData: any;
  onSmartPricing: (valorAdicional: number) => void;
  onRepublicar: () => void;
  onCancelar: () => void;
}

const formatDistance = (km: number | undefined | null) => {
  if (!km || isNaN(km)) return '0 km';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export default function ClientStatusCard({ orderData, onSmartPricing, onRepublicar, onCancelar }: ClientStatusCardProps) {
  const status = orderData?.status;
  const motoristaNome = orderData?.motoristaNome;
  const veiculo = orderData?.veiculo;
  const valorTotal = orderData?.valorTotal;
  const pinColeta = orderData?.pinColeta;
  const pinEntregas = orderData?.pinEntregas;
  const paradaAtualIndex = orderData?.paradaAtualIndex || 0;
  const multiplasEntregas = orderData?.multiplasEntregas || false;

  const distancia = orderData?.distanciaRealKm || orderData?.distanciaTotalKm || orderData?.distancia;

  const TEMPO_FEED_SEGUNDOS = 30 * 60; 
  const [timeLeft, setTimeLeft] = useState(TEMPO_FEED_SEGUNDOS);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'disponivel' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (status !== 'disponivel') {
      setTimeLeft(TEMPO_FEED_SEGUNDOS);
    }
    return () => clearInterval(interval);
  }, [status, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isTimeExpired = (status === 'disponivel' && timeLeft === 0) || status === 'sem_motorista' || status === 'expirado';

  let safeStatus = 'Sincronizando operação...';
  let statusColor = 'text-cyan-400';
  let bgColor = 'bg-cyan-500/10 border-cyan-500/30';
  let isPulsing = true; 

  if (isTimeExpired) { safeStatus = 'Baixa Procura (Mural)'; statusColor = 'text-amber-400'; bgColor = 'bg-amber-500/10 border-amber-500/30'; isPulsing = false; }
  else if (status === 'aguardando_pagamento') { safeStatus = 'Aguardando Escrow'; isPulsing = true; }
  else if (status === 'reservado_aguardando_pagamento') { safeStatus = 'Aguardando Seu Pagamento'; statusColor = 'text-emerald-400'; bgColor = 'bg-emerald-500/10 border-emerald-500/30'; isPulsing = true; }
  else if (status === 'disponivel' || status === 'buscando_motorista') { safeStatus = 'Radar Ativo no Feed'; isPulsing = true; }
  else if (status === 'cancelado') { safeStatus = 'Operação Abortada'; statusColor = 'text-red-400'; bgColor = 'bg-red-500/10 border-red-500/30'; isPulsing = false; }
  else if (status === 'aceito') { safeStatus = 'Motorista a Caminho'; statusColor = 'text-blue-400'; bgColor = 'bg-blue-500/10 border-blue-500/30'; }
  else if (status === 'indo_coleta') { safeStatus = 'Indo para Coleta'; statusColor = 'text-blue-400'; bgColor = 'bg-blue-500/10 border-blue-500/30'; }
  else if (status === 'chegou_coleta') { safeStatus = 'Aguardando no Local'; statusColor = 'text-indigo-400'; bgColor = 'bg-indigo-500/10 border-indigo-500/30'; isPulsing = false; }
  else if (status === 'coletando') { safeStatus = 'Carregando Veículo'; statusColor = 'text-amber-400'; bgColor = 'bg-amber-500/10 border-amber-500/30'; }
  else if (status === 'em_transporte') { safeStatus = 'Carga em Trânsito'; statusColor = 'text-emerald-400'; bgColor = 'bg-emerald-500/10 border-emerald-500/30'; }
  else if (status === 'parado_operacional') { safeStatus = 'Parada Operacional / Doca'; statusColor = 'text-indigo-400'; bgColor = 'bg-indigo-500/10 border-indigo-500/30'; isPulsing = true; }
  else if (status === 'finalizando' || status === 'entregue' || status === 'finalizado') { safeStatus = 'Entrega Concluída'; statusColor = 'text-emerald-400'; bgColor = 'bg-emerald-500/10 border-emerald-500/30'; isPulsing = false; }
  else if (status) { safeStatus = 'Operação Ativa'; isPulsing = true; } 

  const isDataReady = typeof distancia === 'number' && typeof valorTotal === 'number' && valorTotal > 0;
  
  const displayDistance = isDataReady ? formatDistance(distancia) : 'Calculando...';
  const displayPrice = isDataReady ? `R$ ${valorTotal.toFixed(2).replace('.', ',')}` : '---';

  const etaMinutes = orderData?.etaMinutes 
    ? Number(orderData.etaMinutes) 
    : isDataReady ? Math.max(10, Math.round(distancia * 1.5)) : 0;

  // Prevenção estrita contra strings passadas como array de entregas
  const entregasArray = Array.isArray(pinEntregas) ? pinEntregas : (pinEntregas ? [pinEntregas] : []);
  const totalEntregas = entregasArray.length || 1;

  const etapasRoteiro = [
    { title: 'A Caminho', icon: <Navigation size={14} /> },
    { title: 'Coletando', icon: <Package size={14} /> }
  ];

  for (let i = 0; i < totalEntregas; i++) {
     etapasRoteiro.push({
        title: totalEntregas > 1 ? `Entrega ${i + 1}` : 'Entregue',
        icon: i === totalEntregas - 1 ? <CheckCircle2 size={14} /> : <Truck size={14} />
     });
  }

  const getTimelineStepStatus = (stepIndex: number) => {
    let activeIndex = 0;
    if (['aceito', 'indo_coleta', 'chegou_coleta'].includes(status)) activeIndex = 0;
    else if (status === 'coletando') activeIndex = 1;
    else if (['em_transporte', 'parado_operacional', 'chegou_entrega', 'entregando'].includes(status)) {
        activeIndex = 2 + paradaAtualIndex;
    }
    else if (['finalizando', 'entregue', 'finalizado'].includes(status)) {
        activeIndex = etapasRoteiro.length; 
    }

    if (activeIndex === etapasRoteiro.length) return 'completed';
    if (stepIndex < activeIndex) return 'completed';
    if (stepIndex === activeIndex) return 'active';
    return 'pending';
  };

  // State calculations for Escrow
  const isColetaCompleted = ['em_transporte', 'parado_operacional', 'chegou_entrega', 'entregando', 'entregue', 'finalizando', 'finalizado'].includes(status);
  const isColetaActive = !isColetaCompleted && !['disponivel', 'buscando_motorista', 'sem_motorista', 'expirado', 'aguardando_pagamento', 'reservado_aguardando_pagamento', 'cancelado'].includes(status);
  const fotoColeta = orderData?.fotosPod?.coleta;

  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
      
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-[1.5rem] border relative ${bgColor}`}>
             {isPulsing && <div className="absolute inset-0 rounded-[1.5rem] border-2 border-cyan-500 opacity-20 animate-ping"></div>}
            {isTimeExpired ? (
              <AlertTriangle className="h-7 w-7 text-amber-400" />
            ) : (
              <Activity className={`h-7 w-7 ${statusColor} ${isPulsing ? 'animate-pulse' : ''}`} />
            )}
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${statusColor}`}>
              Torre de Monitoramento
            </p>
            <h2 className={`text-xl md:text-2xl font-black uppercase italic tracking-tight mt-0.5 ${statusColor}`}>
              {safeStatus}
            </h2>
          </div>
        </div>

        {status === 'disponivel' && !isTimeExpired && (
          <div className="flex items-center gap-3 bg-slate-950/80 border border-cyan-500/20 px-4 py-2.5 rounded-2xl">
            <Timer className="text-cyan-400 animate-pulse" size={20} />
            <div>
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Tempo de Exposição</p>
              <p className="text-lg font-mono font-black text-cyan-400 leading-none">{formatTime(timeLeft)}</p>
            </div>
          </div>
        )}
      </div>

      {isTimeExpired && (
        <div className="mb-6 rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-6 animate-in slide-in-from-bottom-4 shadow-xl">
           <div className="flex items-start gap-4 mb-6">
              <TrendingUp className="text-amber-400 shrink-0 mt-1" size={24} />
              <div>
                 <p className="text-sm font-black text-amber-400 uppercase tracking-widest mb-1">Carga parada no mural</p>
                 <p className="text-xs font-medium text-amber-100/90 leading-relaxed">
                   O tempo limite de 30 minutos foi atingido e a carga não recebeu aceites nesse valor. 
                   Utilize a ferramenta de Auto-Bid abaixo para injetar um valor extra e chamar a atenção imediata da frota.
                 </p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <button onClick={() => { onSmartPricing(20); setTimeLeft(TEMPO_FEED_SEGUNDOS); }} className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 border border-amber-500/30 rounded-xl hover:bg-slate-800 transition-colors">
                 <span className="text-xs font-black text-slate-300 uppercase">Injetar Oferta</span>
                 <span className="text-sm font-black text-emerald-400 flex items-center gap-1"><Plus size={14}/> R$ 20,00</span>
              </button>
              <button onClick={() => { onSmartPricing(50); setTimeLeft(TEMPO_FEED_SEGUNDOS); }} className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 border border-amber-500/30 rounded-xl hover:bg-slate-800 transition-colors">
                 <span className="text-xs font-black text-slate-300 uppercase">Injetar Oferta</span>
                 <span className="text-sm font-black text-emerald-400 flex items-center gap-1"><Plus size={14}/> R$ 50,00</span>
              </button>
           </div>
           
           <div className="grid grid-cols-2 gap-3 pt-3 border-t border-amber-500/20">
              <button onClick={() => { onRepublicar(); setTimeLeft(TEMPO_FEED_SEGUNDOS); }} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900/50 text-slate-400 border border-slate-700/50 rounded-xl font-black uppercase text-[10px] hover:text-white transition-all">
                <RefreshCw size={14} /> Manter valor e Republicar
              </button>
              <button onClick={onCancelar} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-black uppercase text-[10px] hover:bg-red-500/20 transition-all">
                <XCircle size={14} /> Cancelar e Estornar
              </button>
           </div>
        </div>
      )}

      <div className="space-y-4">
        
        {/* Timeline Viva (Multi-Drop Dinâmica) */}
        {motoristaNome && !isTimeExpired && (
          <div className="mb-6 py-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 z-0"></div>
              {etapasRoteiro.map((step, idx) => {
                const stepStatus = getTimelineStepStatus(idx);
                return (
                  <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      stepStatus === 'completed' ? 'bg-emerald-500 border-emerald-400 text-slate-900' :
                      stepStatus === 'active' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-bounce' :
                      'bg-slate-900 border-slate-700 text-slate-600'
                    }`}>
                      {step.icon}
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest absolute -bottom-5 whitespace-nowrap ${
                      stepStatus === 'completed' ? 'text-emerald-500' :
                      stepStatus === 'active' ? 'text-blue-400' :
                      'text-slate-600'
                    }`}>{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {motoristaNome && (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-slate-800 overflow-hidden border-2 border-blue-500/50 flex items-center justify-center">
                  <User size={24} className="text-blue-400" />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-slate-900 shadow-md">
                  5.0 <Star size={8} fill="currentColor"/>
                </div>
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 block mb-0.5">Parceiro Verificado</span>
                <p className="text-lg font-black truncate text-white leading-tight">
                  {motoristaNome}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-bold text-slate-300 uppercase bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    {veiculo?.replace('_', ' ') || 'Veículo'}
                  </span>
                </div>
              </div>
            </div>
            
            {['aceito', 'indo_coleta', 'em_transporte'].includes(status) && (
              <div className="w-full md:w-auto bg-slate-950/80 rounded-xl p-3 border border-white/10 flex items-center gap-3 shrink-0 shadow-inner">
                <Navigation size={18} className="text-cyan-400 animate-pulse" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Estimativa (ETA)</p>
                  <p className="text-sm font-black text-white">{etaMinutes} min restantes</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!motoristaNome && !isTimeExpired && (
          <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 flex items-center justify-between transition-colors hover:bg-slate-950/80">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
                <User size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Profissional Designado</span>
                <p className="text-sm font-bold truncate mt-0.5 text-white animate-pulse">
                  Buscando parceiros no raio...
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 flex flex-col gap-3 transition-colors hover:bg-slate-950/80">
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
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/5">
             <div>
               <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5 flex items-center gap-1"><FileText size={10}/> Tipo Carga</p>
               <p className="text-xs font-bold text-slate-300">{orderData?.tipoMaterial || '--'}</p>
             </div>
             <div>
               <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Volumes / Peso</p>
               <p className="text-xs font-bold text-slate-300">{orderData?.qtdVolumes ? `${orderData.qtdVolumes} un - ` : ''}{orderData?.pesoKg || orderData?.peso || '--'}kg</p>
             </div>
          </div>
        </div>

        {/* =======================================================
            COFRE ZERO TRUST: Revelação Baseada em Evidência
            ======================================================= */}
        {(pinColeta || entregasArray.length > 0) && motoristaNome && (
          <div className="rounded-[1.5rem] border border-cyan-500/30 bg-cyan-950/30 p-5 mt-6 relative overflow-hidden shadow-inner">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2 mb-4">
              <Lock size={14} /> Escrow de Segurança
            </p>
            <div className="flex flex-col gap-3">
              
              {/* BLOCO: COLETA */}
              {pinColeta && (
                <div className={`p-4 rounded-2xl border flex flex-col shadow-lg transition-all ${isColetaActive ? 'bg-slate-900 border-cyan-500/50' : isColetaCompleted ? 'bg-slate-900/50 border-emerald-500/20' : 'bg-slate-900/30 border-white/5 opacity-50'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                           <span className={`text-[10px] uppercase font-black tracking-widest block ${isColetaActive ? 'text-cyan-400' : isColetaCompleted ? 'text-emerald-500' : 'text-slate-500'}`}>
                               Passo 1: Coleta
                           </span>
                        </div>
                        {isColetaCompleted ? <CheckCircle2 size={20} className="text-emerald-500" /> : isColetaActive ? <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> : <Lock size={16} className="text-slate-600" />}
                    </div>
                    
                    {isColetaCompleted ? (
                       <div className="flex items-center gap-3">
                           {fotoColeta && <img src={fotoColeta} alt="Coleta Concluída" className="w-12 h-12 rounded object-cover border border-emerald-500/30" />}
                           <div>
                               <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                               <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Concluída</p>
                           </div>
                       </div>
                    ) : isColetaActive ? (
                       fotoColeta ? (
                           <div className="flex flex-col gap-3">
                               <div className="flex items-center gap-3 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                                   <img src={fotoColeta} alt="Evidência Recebida" className="w-12 h-12 rounded object-cover border border-emerald-500/50" />
                                   <div>
                                       <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Evidência Recebida</p>
                                       <p className="text-[10px] text-emerald-100/70 font-medium">Repasse o PIN ao motorista para liberar a coleta.</p>
                                   </div>
                               </div>
                               <div className="bg-slate-950 p-3 rounded-xl border border-white/10 text-center">
                                   <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">PIN DE LIBERAÇÃO</p>
                                   <p className="text-2xl font-mono font-black text-white tracking-[0.2em]">{pinColeta}</p>
                               </div>
                           </div>
                       ) : (
                           <div className="flex flex-col items-center justify-center gap-2 bg-slate-950/50 p-4 rounded-xl border border-white/5 border-dashed">
                               <Camera size={20} className="text-amber-500 animate-pulse" />
                               <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Aguardando Evidência</p>
                               <p className="text-[9px] text-slate-400 text-center max-w-[200px]">O motorista precisa enviar a foto da carga para liberar o PIN.</p>
                           </div>
                       )
                    ) : (
                       <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5 text-center flex flex-col items-center gap-1">
                           <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1"><Lock size={10}/> Oculto</p>
                       </div>
                    )}
                </div>
              )}

              {/* BLOCO: ENTREGAS MULTI-STOP */}
              {entregasArray.map((pin: string, index: number) => {
                 const isLast = index === entregasArray.length - 1;
                 let dropState = 'future';
                 
                 if (['finalizando', 'entregue', 'finalizado'].includes(status)) {
                    dropState = 'completed';
                 } else if (['em_transporte', 'parado_operacional', 'chegou_entrega', 'entregando'].includes(status)) {
                    if (index < paradaAtualIndex) dropState = 'completed';
                    else if (index === paradaAtualIndex) dropState = 'active';
                 }
                 
                 // Fallback que blinda falhas de padronização entre APIs e Clients (parada_X vs entrega_X)
                 const fotoDrop = orderData?.fotosPod?.[`parada_${index}`] || orderData?.fotosPod?.[`entrega_${index}`];

                 return (
                     <div key={index} className={`p-4 rounded-2xl border flex flex-col shadow-lg transition-all ${dropState === 'active' ? 'bg-slate-900 border-cyan-500/50' : dropState === 'completed' ? 'bg-slate-900/50 border-emerald-500/20' : 'bg-slate-900/30 border-white/5 opacity-50'}`}>
                         <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-black tracking-widest block ${dropState === 'active' ? 'text-cyan-400' : dropState === 'completed' ? 'text-emerald-500' : 'text-slate-500'}`}>
                                    {isLast ? 'Última Entrega / Finalização' : `Entrega ${index + 1}`}
                                </span>
                             </div>
                             {dropState === 'completed' ? <CheckCircle2 size={20} className="text-emerald-500" /> : dropState === 'active' ? <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> : <Lock size={16} className="text-slate-600" />}
                         </div>
                         
                         {dropState === 'completed' ? (
                            <div className="flex items-center gap-3">
                                {fotoDrop && <img src={fotoDrop} alt={`Entrega ${index + 1} Concluída`} className="w-12 h-12 rounded object-cover border border-emerald-500/30" />}
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                                    <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Concluída</p>
                                </div>
                            </div>
                         ) : dropState === 'active' ? (
                            fotoDrop ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                                        <img src={fotoDrop} alt={`Evidência Parada ${index + 1}`} className="w-12 h-12 rounded object-cover border border-emerald-500/50" />
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Evidência Recebida</p>
                                            <p className="text-[10px] text-emerald-100/70 font-medium">Repasse o PIN para {isLast ? 'finalizar' : 'liberar'} a etapa.</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-3 rounded-xl border border-white/10 text-center">
                                        <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">PIN DE LIBERAÇÃO</p>
                                        <p className="text-2xl font-mono font-black text-white tracking-[0.2em]">{pin}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 bg-slate-950/50 p-4 rounded-xl border border-white/5 border-dashed">
                                    <Camera size={20} className="text-amber-500 animate-pulse" />
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Aguardando Evidência</p>
                                    <p className="text-[9px] text-slate-400 text-center max-w-[200px]">O motorista precisa enviar a foto no local para liberar o PIN.</p>
                                </div>
                            )
                         ) : (
                            <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5 text-center flex flex-col items-center gap-1">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Lock size={10}/> Bloqueada</p>
                                <p className="text-[8px] text-slate-600 uppercase font-bold">Aguardando etapa anterior</p>
                            </div>
                         )}
                     </div>
                 );
              })}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
