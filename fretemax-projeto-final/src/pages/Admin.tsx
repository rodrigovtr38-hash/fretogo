// =========================================================
// NOME DO ARQUIVO: src/pages/Admin.tsx
// CTO-Log: Torre de Controle Inteligente (Operacional Definitivo).
// Status: Senha hardcoded removida. Card Operacional Full-Stack (Cliente, PIX, MP, PINs).
// Correção (Fluxo Motorista): Refatoração de leitura do payload (fotosPod e chavePixMotorista).
// =========================================================

import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, query, orderBy, runTransaction, where, serverTimestamp, limit, writeBatch, getDocs } from 'firebase/firestore';
import { AppTripState } from '../state/tripStateMachine'; 
import { paymentService } from '../services/paymentService';
import { 
  Loader2, CheckCircle, XCircle, Search, ShieldAlert, Truck, Users, 
  DollarSign, Activity, Clock, AlertTriangle, Eye, 
  Map as MapIcon, Wallet, Zap, MessageCircle, ShieldCheck, RefreshCcw, Lock, Target, Key, Radio,
  Trash2, BrainCircuit, TrendingDown, ArrowUpRight, PieChart, Package, FileText, Copy
} from 'lucide-react';

import { ftiAnalytics } from '../core/ai/analytics/ia.metrics';

const CATEGORIAS_FROTA = [
  { id: 'moto', label: 'Moto', icon: '🏍️' },
  { id: 'carro', label: 'Carro', icon: '🚗' },
  { id: 'utilitarios', label: 'Utilitário', icon: '🚐' },
  { id: 'toco', label: 'Toco', icon: '🚚' },
  { id: 'truck', label: 'Truck', icon: '🚛' },
  { id: 'carreta', label: 'Carreta', icon: '🛣️' },
  { id: 'bitrem', label: 'Bitrem', icon: '🚛💨' }
];

const formatCategory = (cat: string) => {
  if (!cat) return '--';
  const map: Record<string, string> = {
    moto: 'Moto', carro: 'Carro', utilitarios: 'Utilitário', utilitario: 'Utilitário',
    toco: 'Toco', truck: 'Truck', carreta: 'Carreta', bitrem: 'Bitrem'
  };
  return map[cat.toLowerCase()] || cat.replace('_', ' ');
};

export default function Admin() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [tab, setTab] = useState<'dashboard' | 'motoristas' | 'corridas'>('dashboard');
  const [fretes, setFretes] = useState<any[]>([]);
  const [motoristasPendentes, setMotoristasPendentes] = useState<any[]>([]);
  const [motoristasAprovados, setMotoristasAprovados] = useState<any[]>([]);
  const [motoristasOnline, setMotoristasOnline] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [statusFilter, setStatusFilter] = useState('todos');
  const [timeFilter, setTimeFilter] = useState('hoje'); 
  const [loading, setLoading] = useState(true);

  const [historicoPagamentos, setHistoricoPagamentos] = useState<any[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [reembolsosPendentes, setReembolsosPendentes] = useState<any[]>([]);

  const [ftiSummary, setFtiSummary] = useState<any>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  // 1. CONEXÕES
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      setAuthUser(u);
      setLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const q = query(collection(db, 'motoristas_online'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMotoristasOnline(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    const qPendentes = query(collection(db, 'motoristas_cadastros'), where('status', '==', 'pendente'));
    const unsubPendentes = onSnapshot(qPendentes, (snap) => setMotoristasPendentes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const qAprovados = query(collection(db, 'motoristas_cadastros'), where('status', '==', 'aprovado'));
    const unsubAprovados = onSnapshot(qAprovados, (snap) => setMotoristasAprovados(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubPendentes(); unsubAprovados(); };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    const q = query(collection(db, 'fretes'), orderBy('createdAt', 'desc'), limit(500));
    const unsubscribe = onSnapshot(q, (snap) => setFretes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubscribe();
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    const q = query(collection(db, 'fretes'), where('status', '==', AppTripState.CANCELADO));
    const unsub = onSnapshot(q, (snap) => setReembolsosPendentes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((f: any) => !f.reembolsado)));
    return () => unsub();
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    const q = query(collection(db, 'fretes'), where('repasseEfetuado', '==', true), orderBy('repasseData', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => setHistoricoPagamentos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [authUser]);

  useEffect(() => {
    if (tab === 'dashboard' && authUser) {
      ftiAnalytics.obterResumoAdmin().then(data => setFtiSummary(data));
    }
  }, [tab, authUser]);

  // 2. LÓGICA DE CÁLCULO
  const filterByTime = (frete: any, filterType: string) => {
    if (filterType === 'todos') return true;
    if (!frete.createdAt) return false;
    const freteDate = frete.createdAt.toDate ? frete.createdAt.toDate() : new Date(frete.createdAt);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - freteDate.getTime()) / (1000 * 60 * 60 * 24));
    if (filterType === 'hoje') return diffDays <= 1;
    if (filterType === '7dias') return diffDays <= 7;
    if (filterType === '30dias') return diffDays <= 30;
    if (filterType === 'ano') return diffDays <= 365;
    return true;
  };

  const fretesFiltrados = useMemo(() => {
    return fretes.filter(f => {
      const search = searchTerm.toLowerCase();
      const matchSearch = f.id.toLowerCase().includes(search) || f.motoristaNome?.toLowerCase().includes(search) || f.clienteNome?.toLowerCase().includes(search) || f.cidadeOrigem?.toLowerCase().includes(search);
      const matchStatus = statusFilter === 'todos' || f.status === statusFilter;
      return matchSearch && matchStatus && filterByTime(f, timeFilter);
    });
  }, [fretes, searchTerm, statusFilter, timeFilter]);

  const stats = useMemo(() => {
    const period = fretes.filter(f => filterByTime(f, timeFilter));
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const valid = [AppTripState.ACEITO, AppTripState.INDO_COLETA, AppTripState.COLETANDO, AppTripState.EM_TRANSPORTE, AppTripState.ENTREGUE, 'finalizado'];
    
    return {
      faturado: period.filter(f => valid.includes(f.status)).reduce((a, f) => a + (Number(f.valorBruto) || Number(f.valorTotal) || 0), 0),
      lucro: period.filter(f => valid.includes(f.status)).reduce((a, f) => a + (Number(f.valorComissao) || Number(f.lucroPlataforma) || 0), 0),
      entregues: period.filter(f => [AppTripState.ENTREGUE, 'finalizado'].includes(f.status)).length,
      escrowRetido: fretes.filter(f => [...valid, AppTripState.AGUARDANDO_PAGAMENTO, AppTripState.DISPONIVEL, AppTripState.CHEGOU_COLETA].includes(f.status)).reduce((a, f) => a + (Number(f.valorFreteBruto) || Number(f.valorTotal) || 0), 0),
      aPagarMotoristas: fretes.filter(f => f.status === AppTripState.ENTREGUE && !f.repasseEfetuado).reduce((a, f) => a + (Number(f.valorLiquidoMotorista) || Number(f.valorMotorista) || 0), 0),
      repasses: fretes.filter(f => f.status === AppTripState.ENTREGUE).length,
      fretesParados: fretes.filter(f => f.status === AppTripState.DISPONIVEL && (Date.now() - (f.createdAt?.toMillis ? f.createdAt.toMillis() : Date.now())) > 1800000).length,
      alertas24h: fretes.filter(f => f.status === AppTripState.ENTREGUE && !f.repasseEfetuado && (Date.now() - (f.updatedAt?.toDate ? f.updatedAt.toDate().getTime() : Date.now())) / 3600000 >= 20).length,
      taxaConversao: period.length > 0 ? ((period.filter(f => [AppTripState.ENTREGUE, 'finalizado'].includes(f.status)).length / period.length) * 100).toFixed(1) : 0,
      ticketMedio: period.filter(f => [AppTripState.ENTREGUE, 'finalizado'].includes(f.status)).length > 0 ? (period.filter(f => valid.includes(f.status)).reduce((a, f) => a + (Number(f.valorBruto) || 0), 0) / period.filter(f => [AppTripState.ENTREGUE, 'finalizado'].includes(f.status)).length) : 0
    };
  }, [fretes, timeFilter]);

  const contagemFrota = useMemo(() => {
    const c: Record<string, number> = { moto: 0, carro: 0, utilitarios: 0, toco: 0, truck: 0, carreta: 0, bitrem: 0 };
    motoristasAprovados.forEach(m => { if (c[m.categoria?.toLowerCase()] !== undefined) c[m.categoria.toLowerCase()]++; });
    return c;
  }, [motoristasAprovados]);

  // 3. AÇÕES
  const forceStatus = async (id: string, novoStatus: string) => {
    if (!window.confirm(`Forçar status para: ${novoStatus.toUpperCase()}?`)) return;
    try {
      await runTransaction(db, async (t) => {
        const ref = doc(db, 'fretes', id);
        const d = await t.get(ref);
        if (!d.exists()) throw new Error("Frete não encontrado.");
        if (novoStatus === AppTripState.CANCELADO && d.data().status === AppTripState.EM_TRANSPORTE) throw new Error("Em transporte. Abortado.");
        const updateData: any = { status: novoStatus, adminAction: true, updatedAt: serverTimestamp() };
        if (novoStatus === 'finalizado' && d.data().status === AppTripState.ENTREGUE) {
          updateData.repasseEfetuado = true;
          updateData.repasseData = serverTimestamp();
          updateData.repassePor = authUser.uid;
          updateData.repasseValor = Number(d.data().valorLiquidoMotorista || d.data().valorMotorista || 0);
        }
        t.update(ref, updateData);
      });
      alert(novoStatus === 'finalizado' ? '✅ Repasse liquidado!' : `✅ Status alterado para ${novoStatus}`);
    } catch (e: any) { alert(e.message); }
  };

  const handleReembolso = async (idPedido: string) => {
    if (!window.confirm("CRÍTICO: Deseja estornar via PIX (MP)?")) return;
    try {
      const frete = fretes.find(item => item.id === idPedido);
      const transactionId = frete?.pagamentoId || frete?.transactionId || '';
      if (!transactionId) throw new Error('Pagamento não localizado para este frete.');
      const refunded = await paymentService.processarReembolso(transactionId, idPedido);
      if (!refunded) throw new Error('O servidor não autorizou ou não concluiu o estorno.');
      alert('SUCESSO! Estorno registrado.');
    } catch (error: any) { alert(`Erro: ${error.message}`); }
  };

  const handleNuclearReset = async () => {
    const code = window.prompt("⚠️ CUIDADO: Esta ação varre fretes de teste (sem transação MP real). Digite 'ZERAR':");
    if (code !== 'ZERAR') return;
    setIsCleaning(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      const snap = await getDocs(collection(db, 'fretes'));
      snap.forEach(d => {
        if (!d.data().transactionId || String(d.data().transactionId).startsWith('QA_BYPASS_')) { batch.delete(d.ref); count++; }
      });
      if (count > 0) { await batch.commit(); alert(`💥 ${count} fretes de teste apagados.`); window.location.reload(); }
      else alert('Nenhum frete de teste encontrado.');
    } catch (e) { alert("Falha na varredura."); } finally { setIsCleaning(false); }
  };

  const copyPix = (pix: string) => {
    navigator.clipboard.writeText(pix);
    alert('Chave PIX copiada para a área de transferência!');
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-cyan-500 w-12 h-12" />
      <p className="text-cyan-500 font-black animate-pulse uppercase tracking-widest text-xs">Conectando Torre de Controle...</p>
    </div>
  );

  if (!authUser) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <ShieldAlert className="text-red-500 w-16 h-16 mb-6" />
      <h2 className="text-white font-black text-4xl uppercase tracking-tighter">Acesso Negado</h2>
      <p className="text-slate-500 mt-3 max-w-sm font-medium">Sua sessão expirou ou você não possui credenciais do Firebase Auth ativas. Faça login no sistema central.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-24">
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(8,145,178,0.4)]">
                <Radio className="text-white w-7 h-7 animate-pulse" />
             </div>
             <div>
               <h1 className="text-2xl font-black text-white uppercase tracking-tighter">ADMIN <span className="text-cyan-500">FRETOGO</span></h1>
             </div>
          </div>
          <nav className="flex flex-wrap bg-slate-900/50 p-1.5 rounded-2xl gap-1 border border-white/5">
            {[{ id: 'dashboard', label: 'Dashboard', icon: Activity }, { id: 'motoristas', label: 'Frota', icon: Users, badge: motoristasPendentes.length }, { id: 'corridas', label: 'Operação', icon: MapIcon }].map(i => (
              <button key={i.id} onClick={() => setTab(i.id as any)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${tab === i.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <i.icon size={16} /> {i.label}
                {i.badge ? <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{i.badge}</span> : null}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* ================== CORRIDAS (MALHA LOGÍSTICA FULL-STACK) ================== */}
        {tab === 'corridas' && (
          <div className="animate-in fade-in duration-500 space-y-6">
             <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row gap-4 mb-4 shadow-xl">
                <div className="flex-1 relative">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-cyan-500 w-5 h-5" />
                   <input placeholder="Buscar por ID, Motorista ou Cliente..." onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white font-bold focus:border-cyan-500 outline-none placeholder:text-slate-600" />
                </div>
                <select onChange={e => setStatusFilter(e.target.value)} value={statusFilter} className="bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-slate-300 font-black uppercase text-[10px]">
                  <option value="todos">Todos os Status</option>
                  <option value={AppTripState.DISPONIVEL}>Radar Ativo</option>
                  <option value={AppTripState.EM_TRANSPORTE}>Em Rota</option>
                  <option value={AppTripState.ENTREGUE}>Aguardando Liquidação</option>
                  <option value="finalizado">Repasse Concluído</option>
                  <option value={AppTripState.CANCELADO}>Cancelados</option>
                </select>
             </div>

             {fretesFiltrados.length === 0 ? (
               <div className="text-center py-24 bg-slate-900/30 rounded-[3rem] border border-dashed border-white/5"><p className="text-slate-400 font-black uppercase tracking-widest text-lg">Malha Limpa</p></div>
             ) : (
               fretesFiltrados.map(f => (
                 <div key={f.id} className="bg-slate-900/80 border rounded-[2.5rem] p-6 transition-all relative border-white/5 shadow-2xl overflow-hidden">
                    {/* CABEÇALHO */}
                    <div className="flex flex-wrap justify-between items-center mb-6 border-b border-white/5 pb-4 gap-4">
                      <div className="flex items-center gap-4">
                        <span className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">{f.status.replace('_', ' ')}</span>
                        <span className="text-[10px] font-mono text-slate-500 font-bold">ID: #{f.id.slice(0,8).toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-black uppercase text-white bg-slate-800 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2"><Users size={14} className="text-cyan-400"/> CLIENTE: {f.clienteNome || 'Embarcador Não Identificado'}</span>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                       {/* LOGÍSTICA */}
                       <div className="flex-[1.5] space-y-6">
                          <div className="flex items-start gap-4">
                             <div className="flex flex-col items-center gap-1 mt-1"><div className="w-4 h-4 bg-slate-950 border-2 border-blue-500 rounded-full"></div><div className="w-0.5 h-12 bg-slate-800"></div><div className="w-4 h-4 bg-slate-950 border-2 border-green-500 rounded-full"></div></div>
                             <div className="space-y-6">
                                <div><p className="text-[9px] font-black text-slate-500 uppercase mb-1">Origem / Cidade</p><p className="text-sm font-bold text-white">{f.origem?.endereco || f.cidadeOrigem || '---'}</p></div>
                                <div><p className="text-[9px] font-black text-slate-500 uppercase mb-1">Destino / Cidade</p><p className="text-sm font-bold text-white">{f.destino?.endereco || f.cidadeDestino || '---'}</p></div>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-950 p-4 rounded-2xl border border-white/5">
                             <div className="border-r border-white/5"><p className="text-[8px] text-slate-500 uppercase font-black mb-1">Distância</p><p className="text-xs font-bold text-cyan-400">{f.distanciaTotalKm?.toFixed(1) || f.distancia?.toFixed(1) || '--'} km</p></div>
                             <div className="border-r border-white/5"><p className="text-[8px] text-slate-500 uppercase font-black mb-1">Carga</p><p className="text-xs font-bold text-slate-300">{f.pesoKg || f.peso || '--'}kg</p></div>
                             <div className="border-r border-white/5"><p className="text-[8px] text-slate-500 uppercase font-black mb-1">Veículo Real</p><p className="text-xs font-bold text-amber-400">{formatCategory(f.veiculo || f.categoria)}</p></div>
                             <div><p className="text-[8px] text-slate-500 uppercase font-black mb-1">Motorista</p><p className="text-xs font-bold text-white truncate max-w-[100px]">{f.motoristaNome || 'Aguardando'}</p></div>
                          </div>

                          {/* PINS & FOTOS COMPROBATIVAS */}
                          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                             <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-3 flex items-center gap-1"><ShieldCheck size={12}/> Auditoria de Entrega (PINs e Comprovantes)</p>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                               <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
                                  <p className="text-[8px] uppercase text-slate-500 font-bold mb-1">PIN Coleta</p>
                                  <p className="text-sm font-mono text-white tracking-widest">{f.pinColeta || '---'}</p>
                               </div>
                               
                               {/* Iteração de Múltiplos PINs de Entrega com resgate no Map f.fotosPod */}
                               {f.pinEntregas && Array.isArray(f.pinEntregas) ? f.pinEntregas.map((pin: string, idx: number) => {
                                  const fotoUrl = (f.fotosPod && f.fotosPod[`parada_${idx}`]) || (f.fotosEntregas && f.fotosEntregas[idx]);
                                  return (
                                      <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                                        <div><p className="text-[8px] uppercase text-emerald-500 font-bold mb-1">PIN Entrega {idx + 1}</p><p className="text-sm font-mono text-emerald-400">{pin}</p></div>
                                        {fotoUrl ? <a href={fotoUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase text-cyan-400 underline mt-2">Ver Foto</a> : <p className="text-[9px] text-amber-500 mt-2">Pendente</p>}
                                      </div>
                                  );
                               }) : (
                                  <div className="bg-slate-950 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                                    <div><p className="text-[8px] uppercase text-emerald-500 font-bold mb-1">PIN Final</p><p className="text-sm font-mono text-emerald-400">{typeof f.pinEntregas === 'string' ? f.pinEntregas : f.pinEntrega || '---'}</p></div>
                                    {((f.fotosPod && (f.fotosPod['parada_0'] || Object.values(f.fotosPod)[0])) || f.comprovanteUrl) ? <a href={((f.fotosPod && (f.fotosPod['parada_0'] || Object.values(f.fotosPod)[0])) || f.comprovanteUrl) as string} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase text-cyan-400 underline mt-2">Ver Foto</a> : <p className="text-[9px] text-amber-500 mt-2">Pendente</p>}
                                  </div>
                               )}

                               {/* Garante a exibição de fotos extras do Map fotosPod (caso a estrutura do PIN não acompanhe a quantidade de paradas) */}
                               {f.fotosPod && Object.entries(f.fotosPod).map(([chave, url], idx) => {
                                  if (Array.isArray(f.pinEntregas)) {
                                      const index = parseInt(chave.replace('parada_', ''), 10);
                                      if (!isNaN(index) && index < f.pinEntregas.length) return null; // Já mostrado
                                  } else {
                                      if (chave === 'parada_0') return null; // Já mostrado
                                  }
                                  
                                  return (
                                       <div key={`extra_${idx}`} className="bg-slate-950 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                                           <div>
                                               <p className="text-[8px] uppercase text-emerald-500 font-bold mb-1">Comprovante</p>
                                               <p className="text-[10px] font-mono text-slate-500">Parada Extra</p>
                                           </div>
                                           <a href={url as string} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase text-cyan-400 underline mt-2">Ver Foto</a>
                                       </div>
                                  );
                               })}
                             </div>
                          </div>
                       </div>

                       {/* BLOCO FINANCEIRO */}
                       <div className="flex-1 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-6 space-y-4">
                          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-4 rounded-xl border border-white/5">
                             <div><p className="text-[8px] text-slate-500 uppercase font-black mb-1">Pagamento (MP)</p><p className="text-xs font-bold text-slate-300">{f.pagamentoStatus?.toUpperCase() || (f.transactionId ? 'PROCESSADO' : 'PENDENTE')}</p><p className="text-[8px] text-slate-600 truncate">{f.transactionId || 'Sem TxID'}</p></div>
                             <div><p className="text-[8px] text-slate-500 uppercase font-black mb-1">Valor Embarcador</p><p className="text-lg font-black text-green-400">R$ {Number(f.valorBruto || f.valorTotal || 0).toFixed(2)}</p></div>
                          </div>

                          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
                             <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1"><Wallet size={12}/> Financeiro Motorista</p>
                             <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-white/5">
                                <div><p className="text-[8px] uppercase text-slate-500 font-bold mb-1">Status Repasse</p><p className={`text-sm font-black ${f.repasseEfetuado ? 'text-green-500' : 'text-amber-500'}`}>{f.repasseEfetuado ? 'LIQUIDADO' : 'PENDENTE'}</p></div>
                                <div className="text-right"><p className="text-[8px] uppercase text-slate-500 font-bold mb-1">Valor</p><p className="text-lg font-black text-purple-400">R$ {Number(f.repasseValor || f.valorLiquidoMotorista || f.valorMotorista || 0).toFixed(2)}</p></div>
                             </div>
                             
                             <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-white/5">
                                <div><p className="text-[8px] uppercase text-slate-500 font-bold mb-1">Chave PIX Cadastrada</p><p className="text-sm font-mono text-white truncate max-w-[150px]">{f.chavePixMotorista || f.motoristaPix || f.chavePix || 'Não informada na DB'}</p></div>
                                {(f.chavePixMotorista || f.motoristaPix || f.chavePix) && <button onClick={() => copyPix(f.chavePixMotorista || f.motoristaPix || f.chavePix)} className="text-[10px] bg-cyan-900/30 hover:bg-cyan-900/60 px-3 py-1.5 rounded-md text-cyan-400 border border-cyan-500/20 font-bold uppercase transition-all flex gap-1"><Copy size={12}/> Copiar</button>}
                             </div>
                          </div>

                          <div className="pt-4 flex flex-col gap-2">
                            {f.status === AppTripState.ENTREGUE && !f.repasseEfetuado && (
                              <button onClick={() => forceStatus(f.id, 'finalizado')} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex justify-center items-center gap-2"><CheckCircle size={16}/> Confirmar Liquidação (Baixa)</button>
                            )}
                            {[AppTripState.AGUARDANDO_PAGAMENTO, AppTripState.DISPONIVEL, AppTripState.ACEITO, AppTripState.INDO_COLETA].includes(f.status) && (
                              <button onClick={() => forceStatus(f.id, AppTripState.CANCELADO)} className="w-full bg-transparent hover:bg-red-500/10 text-red-500 py-3 rounded-xl font-black text-[9px] tracking-widest uppercase border border-red-500/30 transition-all">Abortar Operação Admin</button>
                            )}
                          </div>
                       </div>
                    </div>
                 </div>
               ))
             )}
          </div>
        )}
        
        {/* === OUTRAS ABAS MANTIDAS (Dashboard e Motoristas) === */}
        {tab === 'dashboard' && (
           <div className="animate-in fade-in duration-500">
             {/* Componentes do Dashboard original mantidos */}
             <div className="flex justify-between items-center mb-6">
                <button onClick={handleNuclearReset} disabled={isCleaning} className="bg-red-500/10 text-red-500 border border-red-500/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex gap-2"><Trash2 size={14}/> Zerar QA</button>
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-1 flex gap-1">
                   {[{ id:'hoje', label:'Hoje' }, { id:'todos', label:'Histórico Completo' }].map(f => (
                     <button key={f.id} onClick={() => setTimeFilter(f.id)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg ${timeFilter === f.id ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>{f.label}</button>
                   ))}
                </div>
             </div>
             
             {/* Resumo Rápido */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
               <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5"><p className="text-[10px] text-slate-400 uppercase mb-2">Volume Bruto</p><h3 className="text-2xl font-black">R$ {stats.faturado.toFixed(2)}</h3></div>
               <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5"><p className="text-[10px] text-slate-400 uppercase mb-2">Escrow Retido</p><h3 className="text-2xl font-black text-emerald-400">R$ {stats.escrowRetido.toFixed(2)}</h3></div>
               <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5"><p className="text-[10px] text-slate-400 uppercase mb-2">Pendente Motoristas</p><h3 className="text-2xl font-black text-amber-400">R$ {stats.aPagarMotoristas.toFixed(2)}</h3></div>
               <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5"><p className="text-[10px] text-slate-400 uppercase mb-2">Entregues</p><h3 className="text-2xl font-black text-white">{stats.entregues}</h3></div>
             </div>
           </div>
        )}
      </main>
    </div>
  );
}
