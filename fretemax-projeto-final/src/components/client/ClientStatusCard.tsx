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
  // 🔥 CTO FIX: Tratando 'parado_operacional' apropriadamente
  else if (status === 'parado_operacional') { safeStatus = 'Parada Operacional / Doca'; statusColor = 'text-indigo-400'; bgColor = 'bg-indigo-500/10 border-indigo-500/30'; isPulsing = true; }
  else if (status === 'finalizando' || status === 'entregue' || status === 'finalizado') { safeStatus = 'Entrega Concluída'; statusColor = 'text-emerald-400'; bgColor = 'bg-emerald-500/10 border-emerald-500/30'; isPulsing = false; }
  // 🔥 CTO FIX: Fallback seguro para sub-estados da StateMachine que o App possa omitir
  else if (status) { safeStatus = 'Operação Ativa'; isPulsing = true; } 

  const isDataReady = typeof distancia === 'number' && typeof valorTotal === 'number' && valorTotal > 0;
  
  const displayDistance = isDataReady ? formatDistance(distancia) : 'Calculando...';
  const displayPrice = isDataReady ? `R$ ${valorTotal.toFixed(2).replace('.', ',')}` : '---';

  const etaMinutes = orderData?.etaMinutes 
    ? Number(orderData.etaMinutes) 
    : isDataReady ? Math.max(10, Math.round(distancia * 1.5)) : 0;

  // 🔥 CTO FIX: Construção de Timeline Dinâmica baseada no total de Paradas da Viagem (até 5 Drops + Coleta)
  const totalEntregas = orderData?.pinEntregas?.length || 1;
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
    else if (['em_transporte', 'parado_operacional'].includes(status)) {
        // Offset de +2 por conta do "A Caminho" e "Coletando"
        activeIndex = 2 + paradaAtualIndex;
    }
    else if (['finalizando', 'entregue', 'finalizado'].includes(status)) {
        activeIndex = etapasRoteiro.length; // Finalizado 
    }

    if (activeIndex === etapasRoteiro.length) return 'completed';
    if (stepIndex < activeIndex) return 'completed';
    if (stepIndex === activeIndex) return 'active';
    return 'pending';
  };

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
        {(pinColeta || (pinEntregas && pinEntregas.length > 0)) && (
          <div className="rounded-[1.5rem] border border-cyan-500/30 bg-cyan-950/30 p-5 mt-6 relative overflow-hidden shadow-inner">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2 mb-4">
              <Lock size={14} /> Cofre de PINs
            </p>
            <div className="flex flex-col gap-3">
              
              {pinColeta && (
                <div className="bg-slate-950 px-4 py-3 rounded-2xl border border-white/10 flex flex-col shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest block mb-1">Passo 1: PIN da Coleta</span>
                      {orderData?.fotosPod?.coleta ? (
                         <span className="font-mono font-black text-xl text-emerald-400 tracking-[0.2em] block">{pinColeta}</span>
                      ) : (
                         <span className="text-xs font-bold text-slate-500 italic flex items-center gap-1"><Lock size={12}/> Oculto até envio da foto</span>
                      )}
                    </div>
                    <CheckCircle2 size={24} className={status === 'coletando' ? 'text-amber-500 animate-pulse' : (status === 'indo_coleta' || status === 'chegou_coleta' || status === 'aceito' ? 'text-slate-700' : 'text-emerald-500')} />
                  </div>
                  
                  {orderData?.fotosPod?.coleta ? (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3">
                      <a href={orderData.fotosPod.coleta} target="_blank" rel="noreferrer" className="shrink-0 hover:opacity-80 transition-opacity">
                        <img src={orderData.fotosPod.coleta} alt="Comprovante de Coleta" className="w-14 h-14 rounded-lg object-cover border border-emerald-500/50" />
                      </a>
                      <div className="leading-tight">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Evidência Recebida</p>
                        <p className="text-xs text-slate-300 font-medium">Você já pode repassar o PIN ao motorista.</p>
                      </div>
                    </div>
                  ) : (
                    status === 'coletando' && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                         <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1"><Camera size={12}/> Aguardando motorista enviar a evidência visual...</p>
                      </div>
                    )
                  )}
                </div>
              )}
              
              {pinEntregas && pinEntregas.map((pin: string, index: number) => {
                 const isActiveDrop = paradaAtualIndex === index && status !== 'coletando';
                 const isCompletedDrop = paradaAtualIndex > index || status === 'entregue' || status === 'finalizando';
                 const isFotoDropEnviada = !!orderData?.fotosPod?.[`parada_${index}`];
                 
                 return (
                  <div key={index} className={`bg-slate-950 px-4 py-3 rounded-2xl border flex flex-col shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all ${isActiveDrop ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-white/5 opacity-70'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-[9px] uppercase font-bold tracking-widest block mb-1 ${isActiveDrop ? 'text-cyan-400' : 'text-slate-500'}`}>
                          Entrega {pinEntregas.length > 1 ? `- Parada ${index + 1}` : ''}
                        </span>
                        
                        {isCompletedDrop ? (
                          <span className="font-mono font-black text-xl tracking-[0.2em] block text-slate-600 line-through">{pin}</span>
                        ) : isFotoDropEnviada ? (
                          <span className="font-mono font-black text-xl tracking-[0.2em] block text-emerald-400">{pin}</span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 italic flex items-center gap-1"><Lock size={12}/> Oculto até envio da foto</span>
                        )}
                      </div>
                      {isCompletedDrop && <CheckCircle2 size={24} className="text-emerald-500" />}
                      {isActiveDrop && !isCompletedDrop && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>}
                    </div>

                    {isFotoDropEnviada && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3">
                        <a href={orderData.fotosPod[`parada_${index}`]} target="_blank" rel="noreferrer" className="shrink-0 hover:opacity-80 transition-opacity">
                          <img src={orderData.fotosPod[`parada_${index}`]} alt={`Comprovante Parada ${index + 1}`} className="w-14 h-14 rounded-lg object-cover border border-emerald-500/50" />
                        </a>
                        <div className="leading-tight">
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{isCompletedDrop ? 'Evidência Validada' : 'Evidência Recebida'}</p>
                          {!isCompletedDrop && <p className="text-xs text-slate-300 font-medium">Repasse o PIN para finalizar a etapa.</p>}
                        </div>
                      </div>
                    )}
                    
                    {isActiveDrop && !isFotoDropEnviada && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                         <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1"><Camera size={12}/> Aguardando foto na doca do cliente...</p>
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
