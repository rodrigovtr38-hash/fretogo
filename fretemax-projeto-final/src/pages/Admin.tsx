// src/pages/Admin.tsx
import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, query, orderBy, runTransaction, where, updateDoc, serverTimestamp, limit } from 'firebase/firestore';
import { 
  Loader2, CheckCircle, XCircle, Search, ShieldAlert, Truck, Users, 
  Calendar, DollarSign, Activity, Clock, AlertTriangle, Eye, 
  Map as MapIcon, Wallet, Zap, MessageCircle, ShieldCheck, RefreshCcw, Lock, Target
} from 'lucide-react';

const ADMIN_UIDS = ['uV1yeZoGfhZTRWDVL1CnMW6b6NY2']; 

export default function Admin() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [tab, setTab] = useState<'dashboard' | 'motoristas' | 'corridas'>('dashboard');
  const [fretes, setFretes] = useState<any[]>([]);
  const [motoristasPendentes, setMotoristasPendentes] = useState<any[]>([]);
  const [motoristasAprovados, setMotoristasAprovados] = useState<any[]>([]); // AJUSTE CTO: Estado para rastrear a base já homologada
  const [motoristasOnline, setMotoristasOnline] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [statusFilter, setStatusFilter] = useState('todos');
  const [timeFilter, setTimeFilter] = useState('hoje'); 
  const [loading, setLoading] = useState(true);

  // PASSO 1: Estado para Reembolsos Pendentes
  const [reembolsosPendentes, setReembolsosPendentes] = useState<any[]>([]);

  // Metas do Lançamento Estratégico (Guarulhos/SP)
  const METAS_LANCAMENTO = {
    utilitario: { meta: 300, label: 'Utilitário (Fiorino/Van)' },
    vuc: { meta: 150, label: 'VUC (HR/Delivery)' },
    toco: { meta: 100, label: 'Caminhão Toco' },
    truck: { meta: 50, label: 'Caminhão Truck' }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      setAuthUser(u);
      setLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) return;
    const q = query(collection(db, 'motoristas_online'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMotoristasOnline(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) return;
    // Puxa os pendentes
    const qPendentes = query(collection(db, 'motoristas_cadastros'), where('status', '==', 'pendente'));
    const unsubPendentes = onSnapshot(qPendentes, (snap) => {
      setMotoristasPendentes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
    // Puxa os aprovados para calcular as metas de lançamento
    const qAprovados = query(collection(db, 'motoristas_cadastros'), where('status', '==', 'aprovado'));
    const unsubAprovados = onSnapshot(qAprovados, (snap) => {
      setMotoristasAprovados(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubPendentes(); unsubAprovados(); };
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) return;
    const q = query(collection(db, 'fretes'), orderBy('createdAt', 'desc'), limit(500));
    const unsubscribe = onSnapshot(q, (snap) => {
      setFretes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [authUser]);

  // PASSO 2: Listener de Reembolsos Pendentes
  useEffect(() => {
    if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) return;
    const q = query(collection(db, 'fretes'), where('status', '==', 'cancelado'));
    const unsub = onSnapshot(q, (snap) => {
      setReembolsosPendentes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => !f.reembolsado));
    });
    return () => unsub();
  }, [authUser]);

  const filterByTime = (frete: any, filterType: string) => {
    if (filterType === 'todos') return true;
    if (!frete.createdAt) return false;
    
    const freteDate = frete.createdAt.toDate ? frete.createdAt.toDate() : new Date(frete.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - freteDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (filterType === 'hoje') return diffDays <= 1;
    if (filterType === '7dias') return diffDays <= 7;
    if (filterType === '30dias') return diffDays <= 30;
    if (filterType === 'ano') return diffDays <= 365;
    return true;
  };

  const fretesFiltrados = useMemo(() => {
    return fretes.filter(f => {
      const matchSearch = 
        f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.motoristaNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.cidadeOrigem?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'todos' || f.status === statusFilter;
      const matchTime = filterByTime(f, timeFilter);
      
      return matchSearch && matchStatus && matchTime;
    });
  }, [fretes, searchTerm, statusFilter, timeFilter]);

  // PASSO 3: Stats Financeiros Expandidos
  const stats = useMemo(() => {
    const fretesDoPeriodo = fretes.filter(f => filterByTime(f, timeFilter));
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    const faturado = fretesDoPeriodo.filter(f => ['aceito','indo_coleta','coletando','em_transporte','entregue','finalizado'].includes(f.status)).reduce((acc, f) => acc + (Number(f.valorBruto) || Number(f.valorTotal) || 0), 0);
    const lucro = fretesDoPeriodo.filter(f => ['aceito','indo_coleta','coletando','em_transporte','entregue','finalizado'].includes(f.status)).reduce((acc, f) => acc + (Number(f.valorComissao) || Number(f.lucroPlataforma) || 0), 0);
    const entregues = fretesDoPeriodo.filter(f => ['entregue', 'finalizado'].includes(f.status)).length;
    const ticketMedio = entregues > 0 ? (faturado / entregues) : 0;
    const ativos = fretes.filter(f => ['aceito', 'indo_coleta', 'coletando', 'em_transporte'].includes(f.status)).length;
    const aguardando = fretes.filter(f => f.status === 'disponivel').length;
    const repasses = fretes.filter(f => f.status === 'entregue').length;
    const cancelados = fretesDoPeriodo.filter(f => f.status === 'cancelado').length;

    // NOVOS CÁLCULOS FINANCEIROS
    const faturadoHoje = fretes.filter(f => {
      const data = f.createdAt?.toDate ? f.createdAt.toDate() : new Date(f.createdAt);
      return data >= hoje;
    }).reduce((acc, f) => acc + (Number(f.valorTotal) || 0), 0);

    const aPagarMotoristas = fretes.filter(f => f.status === 'entregue' && !f.repasseEfetuado).reduce((acc, f) => acc + (Number(f.valorLiquidoMotorista) || Number(f.valorMotorista) || 0), 0);

    const pagoHoje = fretes.filter(f => {
      const data = f.repasseData?.toDate ? f.repasseData.toDate() : null;
      return data && data >= hoje && f.repasseEfetuado;
    }).reduce((acc, f) => acc + (Number(f.valorLiquidoMotorista) || 0), 0);

    const motoristasRetorno = motoristasOnline.filter(m => m.modoRetorno === true).length;

    const now = Date.now();
    const timeoutAguardando = fretes.filter(f => f.status === 'disponivel' && (now - (f.createdAt?.toMillis ? f.createdAt.toMillis() : now)) > 600000).length;
    const semComprovante = fretes.filter(f => f.status === 'entregue' && !f.comprovanteUrl).length;
    const motoristasOcupados = motoristasOnline.filter(m => m.status === 'ocupado').length;
    
    const insucessos = fretes.filter(f => f.alertaInsucesso === true).length;

    return { 
      faturado, lucro, entregues, ticketMedio, ativos, aguardando, 
      repasses, cancelados, faturadoHoje, aPagarMotoristas, pagoHoje, 
      motoristasRetorno, timeoutAguardando, semComprovante, motoristasOcupados, insucessos 
    };
  }, [fretes, motoristasOnline, timeFilter]);

  // AJUSTE CTO: Cálculo das Metas de Lançamento por Categoria
  const metasProgresso = useMemo(() => {
    const contagem = { utilitario: 0, vuc: 0, toco: 0, truck: 0 };
    
    motoristasAprovados.forEach(m => {
      const cat = m.categoria ? m.categoria.toLowerCase() : '';
      if (cat.includes('utilitario') || cat.includes('fiorino') || cat.includes('van')) contagem.utilitario++;
      else if (cat.includes('vuc') || cat.includes('hr') || cat.includes('delivery')) contagem.vuc++;
      else if (cat.includes('toco')) contagem.toco++;
      else if (cat.includes('truck')) contagem.truck++;
    });

    return contagem;
  }, [motoristasAprovados]);

  // Indicador de PIX aptos (Motoristas com CNH e Foto aprovados)
  const aptosPix = useMemo(() => motoristasAprovados.filter(m => m.fotoCnh && m.fotoSelfie).length, [motoristasAprovados]);

  const handleAprovacaoMotorista = async (id: string, status: 'aprovado' | 'rejeitado') => {
    if (!window.confirm(`Deseja confirmar a ação: ${status.toUpperCase()}?`)) return;
    try {
      await updateDoc(doc(db, 'motoristas_cadastros', id), { status });
      alert(`Status atualizado para: ${status}`);
    } catch (e: any) { alert("Erro ao atualizar o banco de dados: " + e.message); }
  };

  const forceStatus = async (id: string, novoStatus: string) => {
    if (!window.confirm(`Atenção: Você tem certeza que deseja forçar o status para: ${novoStatus.toUpperCase()}?`)) return;
    try {
      await runTransaction(db, async (t) => {
        const ref = doc(db, 'fretes', id);
        const d = await t.get(ref);
        if (!d.exists()) throw new Error("Frete não encontrado no sistema.");
        
        const currentData = d.data();
        if (novoStatus === 'cancelado' && currentData.status === 'em_transporte') {
           throw new Error("O motorista já está em transporte com a carga. Cancelamento abortado.");
        }

        t.update(ref, { 
          status: novoStatus,
          adminAction: true,
          updatedAt: serverTimestamp()
        });
      });
    } catch (e: any) { alert(e.message); }
  };

  const forceClearInsucesso = async (id: string) => {
    try {
      await updateDoc(doc(db, 'fretes', id), { alertaInsucesso: false });
    } catch (e: any) { alert("Erro ao limpar alerta."); }
  };

  // PASSO 5: Função Reembolso Atualizada
  const handleReembolso = async (idPedido: string) => {
    if (!window.confirm("CRÍTICO: Estornar PIX no Mercado Pago?")) return;
    try {
      const res = await fetch('/api/reembolso', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ idPedido }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha API');
      
      await updateDoc(doc(db, 'fretes', idPedido), { 
        reembolsado: true, 
        reembolsoData: serverTimestamp(), 
        reembolsoPor: authUser.uid 
      });
      alert('SUCESSO! PIX estornado e registrado.');
    } catch (error: any) { 
      alert(`Erro: ${error.message}`); 
    }
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-cyan-500 w-12 h-12" />
      <p className="text-cyan-500 font-black animate-pulse uppercase tracking-widest text-xs">Descriptografando Terminal de Comando...</p>
    </div>
  );

  if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="text-red-500 w-12 h-12" />
        </div>
        <h2 className="text-white font-black text-4xl uppercase italic tracking-tighter">Acesso Negado</h2>
        <p className="text-slate-500 mt-3 max-w-sm font-medium leading-relaxed">Você está em uma área restrita. O seu UID não tem as credenciais da diretoria logística para visualizar o FRETOGO HQ.</p>
        <p className="text-slate-700 mt-8 text-[10px] uppercase tracking-widest">Sua credencial atual: {authUser?.uid || 'Não autenticado'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-24">
      
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(8,145,178,0.4)]">
                <Zap className="text-white fill-white w-7 h-7 animate-pulse" />
             </div>
             <div>
               <h1 className="text-2xl font-black text-white italic leading-none uppercase tracking-tighter">FRETOGO <span className="text-cyan-500">HQ</span></h1>
               <p className="text-[10px] font-bold text-cyan-500/70 uppercase tracking-[0.2em] flex items-center gap-1">
                 <Activity size={10}/> Central Logística
               </p>
             </div>
          </div>

          <nav className="flex flex-wrap bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 gap-1">
            {[
              { id: 'dashboard', label: 'Overview', icon: Activity },
              { id: 'motoristas', label: 'Frota & Metas', icon: Users, badge: motoristasPendentes.length },
              { id: 'corridas', label: 'Live Radar', icon: MapIcon }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${tab === item.id ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon size={16} />
                {item.label}
                {item.badge ? <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-bounce">{item.badge}</span> : null}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {tab === 'dashboard' && (
          <div className="flex justify-end mb-6 animate-in fade-in">
             <div className="bg-slate-900/50 border border-white/5 rounded-xl p-1 flex gap-1 backdrop-blur-sm">
                {[
                  { id: 'hoje', label: 'Hoje' },
                  { id: '7dias', label: '7 Dias' },
                  { id: '30dias', label: '30 Dias' },
                  { id: 'ano', label: 'Este Ano' },
                  { id: 'todos', label: 'Histórico Completo' }
                ].map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setTimeFilter(f.id)}
                    className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${timeFilter === f.id ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {f.label}
                  </button>
                ))}
             </div>
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* NOVO BLOCO: METAS DE LANÇAMENTO E DENSIDADE */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                  <Target className="text-cyan-500 w-5 h-5" /> Vagas da 1ª Turma <span className="text-cyan-500">(Densidade SP/GRU)</span>
                </h2>
                <div className="flex items-center gap-2 bg-slate-900/50 border border-white/10 px-4 py-2 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Homologados:</span>
                  <span className="text-sm font-black text-white">{motoristasAprovados.length}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(METAS_LANCAMENTO).map(([key, config]) => {
                  const current = metasProgresso[key as keyof typeof metasProgresso] || 0;
                  const percentage = Math.min(100, Math.round((current / config.meta) * 100));
                  const isCompleted = current >= config.meta;
                  
                  return (
                    <div key={key} className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl relative overflow-hidden backdrop-blur-md">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">{config.label}</span>
                        <span className={`text-sm font-black ${isCompleted ? 'text-green-400' : 'text-cyan-400'}`}>{current} / {config.meta}</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(8,145,178,0.5)]'}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      {isCompleted && <p className="text-[9px] font-bold text-green-500 uppercase mt-2 text-right">Meta Atingida ✓</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PASSO 4: CONTROLE FINANCEIRO EM TEMPO REAL */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-amber-950/40 border border-amber-500/30 p-5 rounded-2xl backdrop-blur-sm">
                <p className="text-[10px] font-black text-amber-400/70 uppercase tracking-widest mb-2 flex items-center gap-1"><Clock size={12}/> A Pagar (24h)</p>
                <h3 className="text-2xl font-black text-amber-400 tracking-tighter">R$ {stats.aPagarMotoristas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                <p className="text-[10px] text-amber-500/50 mt-1 font-bold">{fretes.filter(f => f.status === 'entregue').length} fretes pendentes</p>
              </div>
              <div className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl backdrop-blur-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Faturado Hoje</p>
                <h3 className="text-2xl font-black text-white tracking-tighter">R$ {stats.faturadoHoje.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
              </div>
              <div className="bg-green-950/40 border border-green-500/30 p-5 rounded-2xl backdrop-blur-sm">
                <p className="text-[10px] font-black text-green-400/70 uppercase tracking-widest mb-2">Pago Hoje</p>
                <h3 className="text-2xl font-black text-green-400 tracking-tighter">R$ {stats.pagoHoje.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
              </div>
              <div className="bg-red-950/40 border border-red-500/30 p-5 rounded-2xl backdrop-blur-sm">
                <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Reembolsos</p>
                <h3 className="text-2xl font-black text-red-400 tracking-tighter">{reembolsosPendentes.length}</h3>
                <p className="text-[10px] text-red-500/50 mt-1 font-bold">Pendentes</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
              <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/30 transition-all">
                 <DollarSign className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 group-hover:text-cyan-500/10 transition-colors" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity size={12}/> Faturamento (Período)</p>
                 <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter">R$ {stats.faturado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
              </div>
              <div className="bg-slate-900/60 border border-green-500/20 p-6 rounded-[2rem] backdrop-blur-md relative overflow-hidden group shadow-[0_0_30px_rgba(34,197,94,0.05)]">
                 <Wallet className="absolute -right-6 -bottom-6 w-32 h-32 text-green-500/5 group-hover:text-green-500/10 transition-colors" />
                 <p className="text-[10px] font-black text-green-500/70 uppercase tracking-widest mb-2">Lucro Líquido (Período)</p>
                 <h3 className="text-2xl md:text-3xl font-black text-green-400 tracking-tighter">R$ {stats.lucro.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
              </div>
              <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] backdrop-blur-md relative overflow-hidden group hover:border-blue-500/30 transition-all">
                 <Users className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 group-hover:text-blue-500/10 transition-colors" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MapIcon size={12}/> Radar de Frota</p>
                 <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter">{motoristasOnline.length} <span className="text-sm text-blue-400 italic font-bold uppercase tracking-normal">Online</span></h3>
                 {/* PASSO 6: Adicionado contador de retorno */}
                 <div className="mt-2 flex items-center gap-3 text-[10px]">
                   <span className="flex items-center gap-1 text-cyan-400"><Target size={10}/> {stats.motoristasRetorno} em retorno</span>
                 </div>
              </div>
              <div className={`p-6 rounded-[2rem] backdrop-blur-md relative overflow-hidden group transition-all border ${stats.repasses > 0 ? 'bg-amber-900/20 border-amber-500/30' : 'bg-slate-900/60 border-white/5'}`}>
                 <Truck className={`absolute -right-6 -bottom-6 w-32 h-32 transition-colors ${stats.repasses > 0 ? 'text-amber-500/10' : 'text-white/5'}`} />
                 <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${stats.repasses > 0 ? 'text-amber-500/70' : 'text-slate-400'}`}>Repasses Pendentes</p>
                 <h3 className={`text-2xl md:text-3xl font-black tracking-tighter ${stats.repasses > 0 ? 'text-amber-400' : 'text-white'}`}>{stats.repasses}</h3>
              </div>
            </div>
          </div>
        )}

        {tab === 'motoristas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
               <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Onboarding & <span className="text-cyan-500">Validação</span></h2>
               <div className="flex gap-2">
                 <span className="bg-slate-900 text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/10 tracking-widest shadow-inner flex items-center gap-2">
                   <Clock size={12} className="text-amber-500"/> {motoristasPendentes.length} Pendentes
                 </span>
                 <span className="bg-slate-900 text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/10 tracking-widest shadow-inner flex items-center gap-2">
                   <ShieldCheck size={12} className="text-green-500"/> {aptosPix} Aptos PIX
                 </span>
               </div>
            </div>

            {motoristasPendentes.length === 0 ? (
              <div className="text-center py-32 bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-white/10 backdrop-blur-sm">
                 <CheckCircle className="w-20 h-20 text-slate-700 mx-auto mb-6" />
                 <p className="text-slate-400 font-black uppercase italic tracking-widest text-lg">Muralha Limpa</p>
                 <p className="text-slate-500 text-sm mt-2">Não há novos cadastros aguardando verificação no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {motoristasPendentes.map(m => (
                  <div key={m.id} className="bg-slate-900/80 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative group overflow-hidden backdrop-blur-md hover:border-cyan-500/30 transition-all">
                    
                    <div className="flex justify-between items-start mb-8 relative z-10 border-b border-white/5 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
                           <ShieldAlert className="text-amber-500 w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{m.nome}</h3>
                          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">{m.whatsapp || m.telefone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                      <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Identidade Oficial</p>
                        <p className="text-sm font-black text-white tracking-wider mb-1">{m.cpf || '---'}</p>
                      </div>
                      <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Veículo Operacional</p>
                        <p className="text-sm font-black text-cyan-400 uppercase italic mb-1">{(m.categoria || '').replace('_',' ')}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase">{m.placa || 'Sem placa'}</p>
                      </div>
                    </div>

                    <div className="mb-8 grid grid-cols-3 gap-2">
                       <div className="flex flex-col gap-1">
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Doc CNH</p>
                          <a href={m.fotoCnh || m.cnhUrl} target="_blank" rel="noreferrer" className="block relative group/img overflow-hidden rounded-xl h-24 border border-white/10 bg-black cursor-pointer shadow-inner">
                            {m.fotoCnh || m.cnhUrl ? <img src={m.fotoCnh || m.cnhUrl} className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-all" alt="CNH" /> : <span className="text-red-500 text-[10px] flex items-center justify-center h-full">Falta</span>}
                          </a>
                       </div>
                       <div className="flex flex-col gap-1">
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Doc Veículo</p>
                          <a href={m.fotoDocumento || m.documentoUrl} target="_blank" rel="noreferrer" className="block relative group/img overflow-hidden rounded-xl h-24 border border-white/10 bg-black cursor-pointer shadow-inner">
                            {m.fotoDocumento || m.documentoUrl ? <img src={m.fotoDocumento || m.documentoUrl} className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-all" alt="DOC" /> : <span className="text-red-500 text-[10px] flex items-center justify-center h-full">Falta</span>}
                          </a>
                       </div>
                       <div className="flex flex-col gap-1">
                          <p className="text-[9px] text-cyan-500 font-black uppercase tracking-widest text-center">Selfie AntiFraude</p>
                          <a href={m.fotoSelfie} target="_blank" rel="noreferrer" className="block relative group/img overflow-hidden rounded-xl h-24 border border-cyan-500/30 bg-cyan-900/10 cursor-pointer shadow-inner">
                            {m.fotoSelfie ? <img src={m.fotoSelfie} className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-all" alt="Selfie" /> : <span className="text-red-500 text-[10px] flex items-center justify-center h-full">Falta</span>}
                          </a>
                       </div>
                    </div>

                    <div className="flex gap-4 relative z-10 pt-6 border-t border-white/5">
                      <button onClick={() => handleAprovacaoMotorista(m.id, 'rejeitado')} className="flex-1 bg-transparent border border-red-500/30 text-red-400 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 hover:text-white transition-all">Rejeitar</button>
                      <button onClick={() => handleAprovacaoMotorista(m.id, 'aprovado')} className="flex-[2] bg-cyan-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:bg-cyan-500 transition-all flex items-center justify-center gap-2"><ShieldCheck size={16}/> Aprovar Parceiro</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'corridas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row gap-4 mb-8 shadow-xl">
                <div className="flex-1 relative">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-cyan-500 w-5 h-5" />
                   <input 
                    placeholder="Buscar por ID ou Nome..." 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white font-bold focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600" 
                   />
                </div>
                <div className="flex gap-3">
                  <select 
                    onChange={e => setStatusFilter(e.target.value)} 
                    value={statusFilter}
                    className="bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-slate-300 font-black uppercase text-[10px] tracking-widest outline-none cursor-pointer hover:border-cyan-500 transition-all"
                  >
                    <option value="todos">Status Global</option>
                    <option value="disponivel">Radar Activo</option>
                    <option value="aceito">Motorista a Caminho</option>
                    <option value="indo_coleta">Indo p/ Coleta</option>
                    <option value="em_transporte">Em Transporte</option>
                    <option value="entregue">Aguardando Repasse</option>
                    <option value="finalizado">Finalizados</option>
                    <option value="cancelado">Cancelados</option>
                  </select>
                </div>
             </div>

             <div className="space-y-6">
                {fretesFiltrados.length === 0 ? (
                  <div className="text-center py-24 bg-slate-900/30 rounded-[3rem] border border-dashed border-white/5 backdrop-blur-sm">
                    <MapIcon size={48} className="mx-auto mb-6 text-slate-700" />
                    <p className="text-slate-400 font-black uppercase italic tracking-widest text-lg">Radar Limpo</p>
                    <p className="text-slate-600 text-sm mt-2">Nenhuma corrida encontrada para os filtros selecionados.</p>
                  </div>
                ) : (
                  fretesFiltrados.map(f => (
                    <div key={f.id} className="bg-slate-900/80 border rounded-[2.5rem] p-6 md:p-8 transition-all relative overflow-hidden group shadow-2xl backdrop-blur-md border-white/5 hover:border-cyan-500/30">
                      
                      <div className="flex flex-col lg:flex-row justify-between gap-8 pl-2">
                        
                        <div className="flex-[1.5]">
                          <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                            <span className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                              {f.status.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 font-bold">#{f.id.slice(0,8).toUpperCase()}</span>
                          </div>

                          <div className="flex items-start gap-5">
                             <div className="flex flex-col items-center gap-1 mt-1">
                               <div className="w-4 h-4 bg-slate-950 border-2 border-blue-500 rounded-full"></div>
                               <div className="w-0.5 h-12 bg-slate-800 rounded-full"></div>
                               <div className="w-4 h-4 bg-slate-950 border-2 border-green-500 rounded-full"></div>
                             </div>
                             <div className="space-y-6 flex-1">
                                <div>
                                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Retirada</p>
                                   <p className="text-sm font-bold text-white leading-tight">{f.origem?.endereco || f.cidadeOrigem || 'Endereço Indisponível'}</p>
                                </div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Destino</p>
                                   <p className="text-sm font-bold text-white leading-tight">{f.destino?.endereco || f.cidadeDestino || 'Endereço Indisponível'}</p>
                                </div>
                             </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px] border-l border-white/5 pl-4 justify-center">
                           
                           {/* AÇÕES DE REPASSE DE DINHEIRO E REEMBOLSO */}
                           {f.status === 'entregue' && (
                             <button onClick={() => forceStatus(f.id, 'finalizado')} className="bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex flex-col items-center justify-center gap-1 group">
                               <span className="flex items-center gap-1"><Wallet size={14} /> Liquidar Repasse</span>
                               <span className="text-[8px] opacity-70 group-hover:opacity-100 font-bold">R$ {Number(f.valorLiquidoMotorista || f.valorMotorista).toFixed(2)}</span>
                             </button>
                           )}

                           {f.status === 'cancelado' && !f.reembolsado && (
                             <button onClick={() => handleReembolso(f.id)} className="bg-amber-600 hover:bg-amber-500 text-slate-900 py-4 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex flex-col items-center justify-center gap-1">
                               <span className="flex items-center gap-1"><RefreshCcw size={14} /> Estornar PIX (MP)</span>
                             </button>
                           )}

                           {f.reembolsado && (
                             <div className="bg-slate-900 border border-amber-500/30 text-amber-400 py-3 rounded-xl font-black text-[9px] tracking-widest uppercase flex items-center justify-center gap-2">
                               <CheckCircle size={12} /> Reembolso Feito
                             </div>
                           )}
                           
                           {['aguardando_pagamento', 'disponivel', 'aceito', 'indo_coleta'].includes(f.status) && (
                             <button onClick={() => forceStatus(f.id, 'cancelado')} className="bg-transparent hover:bg-red-500/10 text-red-500 py-3 rounded-xl font-black text-[9px] tracking-widest uppercase border border-transparent hover:border-red-500/30 transition-all mt-auto">Abortar Operação</button>
                           )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}
      </main>

      {/* FOOTER FINANCEIRO / STATUS FIXO */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 p-3 z-40 hidden md:block shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
         <div className="max-w-7xl mx-auto flex justify-between items-center px-8">
            <div className="flex items-center gap-8">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]"></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Firestore Subsystem <span className="text-green-500">Live</span></span>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Terminal Logado:</p>
               <p className="text-[10px] font-black text-cyan-400 uppercase italic tracking-widest px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">{authUser?.email}</p>
            </div>
         </div>
      </div>
    </div>
  );
}
