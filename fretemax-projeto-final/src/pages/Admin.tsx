import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, query, orderBy, runTransaction, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Loader2, CheckCircle, XCircle, Search, ShieldAlert, Truck, Users, 
  Calendar, DollarSign, Activity, Clock, AlertTriangle, Eye, 
  Map as MapIcon, ArrowRight, Wallet, Filter, Zap, MessageCircle, ShieldCheck
} from 'lucide-react';

// 🔥 SEGURANÇA: Painel trancado! Apenas a conta principal tem acesso.
const ADMIN_UIDS = ['uV1yeZoGfhZTRWDVL1CnMW6b6NY2']; 

export default function Admin() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [tab, setTab] = useState<'dashboard' | 'motoristas' | 'corridas'>('dashboard');
  const [fretes, setFretes] = useState<any[]>([]);
  const [motoristasPendentes, setMotoristasPendentes] = useState<any[]>([]);
  const [motoristasOnline, setMotoristasOnline] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState('todos');
  const [timeFilter, setTimeFilter] = useState('hoje'); // hoje, 7dias, 30dias, ano, todos
  
  const [loading, setLoading] = useState(true);

  // Verificação de Identidade
  useEffect(() => {
    return auth.onAuthStateChanged(u => {
      setAuthUser(u);
      if (!u && ADMIN_UIDS[0] !== '') setLoading(false);
    });
  }, []);

  // Monitoramento: Motoristas Online (Radar Realtime)
  useEffect(() => {
    if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) return;
    const q = query(collection(db, 'motoristas_online'));
    return onSnapshot(q, (snap) => {
      setMotoristasOnline(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [authUser]);

  // Monitoramento: Motoristas Pendentes (Aprovação)
  useEffect(() => {
    if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) return;
    const q = query(collection(db, 'motoristas_cadastros'), where('status', '==', 'pendente'));
    return onSnapshot(q, (snap) => {
      setMotoristasPendentes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [authUser]);

  // Monitoramento: Corridas (Fluxo Logístico) - REMOVIDO LIMIT(100) PARA ANALYTICS REAL
  useEffect(() => {
    if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) return;
    const q = query(collection(db, 'fretes'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setFretes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [authUser]);

  // Lógica de Filtragem de Tempo
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

  // Inteligência de Filtro Combinada
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

  // Cálculo de Métricas Operacionais (Baseado nos dados FILTRADOS pelo tempo, independentemente do status da busca textual)
  const stats = useMemo(() => {
    const fretesDoPeriodo = fretes.filter(f => filterByTime(f, timeFilter));

    const faturado = fretesDoPeriodo
      .filter(f => ['aceito','coleta','em_transporte','entregue','finalizado'].includes(f.status))
      .reduce((acc, f) => acc + (Number(f.valorTotal) || 0), 0);
    
    const lucro = fretesDoPeriodo
      .filter(f => ['aceito','coleta','em_transporte','entregue','finalizado'].includes(f.status))
      .reduce((acc, f) => acc + (Number(f.lucroPlataforma) || 0), 0);

    const entregues = fretesDoPeriodo.filter(f => ['entregue', 'finalizado'].includes(f.status)).length;
    const ticketMedio = entregues > 0 ? (faturado / entregues) : 0;
    
    const ativos = fretes.filter(f => ['aceito', 'coleta', 'em_transporte'].includes(f.status)).length;
    const aguardando = fretes.filter(f => f.status === 'disponivel').length;
    const repasses = fretes.filter(f => f.status === 'entregue').length;
    const cancelados = fretesDoPeriodo.filter(f => f.status === 'cancelado').length;

    // Alertas Críticos
    const now = Date.now();
    const timeoutAguardando = fretes.filter(f => f.status === 'disponivel' && (now - (f.createdAt?.toMillis ? f.createdAt.toMillis() : now)) > 600000).length;
    const semComprovante = fretes.filter(f => f.status === 'entregue' && !f.comprovanteUrl).length;

    const motoristasOcupados = motoristasOnline.filter(m => m.status === 'ocupado').length;

    return { 
      faturado, lucro, entregues, ticketMedio, ativos, aguardando, 
      repasses, cancelados, timeoutAguardando, semComprovante, motoristasOcupados 
    };
  }, [fretes, motoristasOnline, timeFilter]);

  const handleAprovacaoMotorista = async (id: string, status: 'aprovado' | 'rejeitado') => {
    if (!window.confirm(`Deseja confirmar a ação: ${status.toUpperCase()}?`)) return;
    try {
      await updateDoc(doc(db, 'motoristas_cadastros', id), { status });
      alert(`Status atualizado: ${status}`);
    } catch (e: any) { alert("Erro: " + e.message); }
  };

  const forceStatus = async (id: string, novoStatus: string) => {
    if (!window.confirm(`Alterar status para: ${novoStatus.toUpperCase()}?`)) return;
    try {
      await runTransaction(db, async (t) => {
        const ref = doc(db, 'fretes', id);
        const d = await t.get(ref);
        if (!d.exists()) throw new Error("Não encontrado");
        t.update(ref, { 
          status: novoStatus,
          adminAction: true,
          updatedAt: serverTimestamp()
        });
      });
    } catch (e: any) { alert(e.message); }
  };

  const formatarData = (ts: any) => {
    if (!ts) return '--:--';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-cyan-500 w-12 h-12" />
      <p className="text-cyan-500 font-black animate-pulse uppercase tracking-widest text-xs">Iniciando Torre de Controle...</p>
    </div>
  );

  if (ADMIN_UIDS[0] !== '' && (!authUser || !ADMIN_UIDS.includes(authUser.uid))) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <ShieldAlert className="text-red-500 w-12 h-12" />
        </div>
        <h2 className="text-white font-black text-3xl uppercase italic tracking-tighter">Acesso Negado</h2>
        <p className="text-slate-500 mt-2 max-w-xs font-medium">Este terminal é restrito à diretoria operacional do FRETOGO.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-24">
      
      {/* HEADER / TOPBAR */}
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
              { id: 'motoristas', label: 'Frota', icon: Users, badge: motoristasPendentes.length },
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
        
        {/* FILTRO GLOBAL DE TEMPO */}
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

        {/* VIEW: DASHBOARD OVERVIEW */}
        {tab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* ALERTAS CRÍTICOS OPERACIONAIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {stats.timeoutAguardando > 0 && (
                <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                       <Clock className="text-red-500 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Alerta de Ociosidade</p>
                      <p className="text-sm font-bold text-red-200">{stats.timeoutAguardando} fretes aguardando motorista (+10min)</p>
                    </div>
                  </div>
                  <button onClick={() => {setTab('corridas'); setStatusFilter('disponivel'); setTimeFilter('todos');}} className="text-[10px] font-black bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-lg uppercase transition-all">Ver Cargas</button>
                </div>
              )}
              {stats.semComprovante > 0 && (
                <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center animate-pulse">
                       <AlertTriangle className="text-amber-500 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Alerta Operacional</p>
                      <p className="text-sm font-bold text-amber-200">{stats.semComprovante} entregas concluídas SEM comprovante</p>
                    </div>
                  </div>
                  <button onClick={() => {setTab('corridas'); setStatusFilter('entregue'); setTimeFilter('todos');}} className="text-[10px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-lg uppercase transition-all">Verificar</button>
                </div>
              )}
            </div>

            {/* DASHBOARD FINANCEIRO E LOGÍSTICO VIVO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
              
              <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/30 transition-all">
                 <DollarSign className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 group-hover:text-cyan-500/10 transition-colors" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity size={12}/> Faturamento (Bruto)</p>
                 <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter">R$ {stats.faturado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                 <p className="mt-4 text-[10px] font-bold text-cyan-400 flex justify-between">
                   <span>Ticket Médio</span> <span>R$ {stats.ticketMedio.toFixed(2)}</span>
                 </p>
              </div>

              <div className="bg-slate-900/60 border border-green-500/20 p-6 rounded-[2rem] backdrop-blur-md relative overflow-hidden group shadow-[0_0_30px_rgba(34,197,94,0.05)]">
                 <Wallet className="absolute -right-6 -bottom-6 w-32 h-32 text-green-500/5 group-hover:text-green-500/10 transition-colors" />
                 <p className="text-[10px] font-black text-green-500/70 uppercase tracking-widest mb-2">Lucro Líquido Platform</p>
                 <h3 className="text-2xl md:text-3xl font-black text-green-400 tracking-tighter">R$ {stats.lucro.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                 <p className="mt-4 text-[10px] font-bold text-green-500 flex justify-between">
                   <span>Margem Média</span> <span>20%</span>
                 </p>
              </div>

              <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] backdrop-blur-md relative overflow-hidden group hover:border-blue-500/30 transition-all">
                 <Users className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 group-hover:text-blue-500/10 transition-colors" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MapIcon size={12}/> Radar de Frota</p>
                 <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter">{motoristasOnline.length} <span className="text-sm text-blue-400 italic font-bold uppercase tracking-normal">Online</span></h3>
                 <p className="mt-4 text-[10px] font-bold text-slate-400 flex justify-between">
                   <span>Ocupados (Em Rota)</span> <span className="text-blue-400">{stats.motoristasOcupados}</span>
                 </p>
              </div>

              <div className={`p-6 rounded-[2rem] backdrop-blur-md relative overflow-hidden group transition-all border ${stats.repasses > 0 ? 'bg-amber-900/20 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'bg-slate-900/60 border-white/5'}`}>
                 <Truck className={`absolute -right-6 -bottom-6 w-32 h-32 transition-colors ${stats.repasses > 0 ? 'text-amber-500/10' : 'text-white/5'}`} />
                 <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${stats.repasses > 0 ? 'text-amber-500/70' : 'text-slate-400'}`}>Repasses Pendentes</p>
                 <h3 className={`text-2xl md:text-3xl font-black tracking-tighter ${stats.repasses > 0 ? 'text-amber-400' : 'text-white'}`}>{stats.repasses} <span className="text-sm italic font-bold uppercase tracking-normal opacity-50">Entregas</span></h3>
                 <p className={`mt-4 text-[10px] font-bold flex justify-between ${stats.repasses > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                   <span>Cancelamentos</span> <span className="text-red-400">{stats.cancelados}</span>
                 </p>
              </div>

            </div>

            {/* GRÁFICO / TABELA DE RESUMO RÁPIDO */}
            <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-md">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-sm font-black uppercase italic text-white flex items-center gap-2"><Activity size={18} className="text-cyan-500"/> Feed Operacional Recente</h2>
                 <button onClick={() => setTab('corridas')} className="text-[10px] font-black text-cyan-400 uppercase hover:underline">Ver Tabela Completa</button>
               </div>
               
               <div className="space-y-4">
                 {fretes.filter(f => filterByTime(f, timeFilter)).slice(0, 5).map(f => (
                   <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-950/80 rounded-2xl border border-white/5 hover:border-cyan-500/20 transition-all gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                          f.status === 'cancelado' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                          f.status === 'disponivel' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' :
                          'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}>
                          {f.status === 'cancelado' ? <XCircle size={20}/> : f.status === 'disponivel' ? <Search size={20}/> : <Truck size={20}/>}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase line-clamp-1">{f.cidadeOrigem} → {f.cidadeDestino}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">ID: {f.id.slice(0,8)}... • {formatarData(f.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                        <p className="text-sm font-black text-white">R$ {Number(f.valorTotal).toFixed(2)}</p>
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md mt-1 border ${
                          f.status === 'entregue' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          f.status === 'finalizado' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          'bg-slate-900 text-slate-400 border-white/10'
                        }`}>{f.status.replace('_', ' ')}</span>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* VIEW: MOTORISTAS (APROVAÇÃO ANTIFRAUDE UX) */}
        {tab === 'motoristas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Onboarding & <span className="text-cyan-500">Validação</span></h2>
               <span className="bg-slate-900 text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/10 tracking-widest shadow-inner">{motoristasPendentes.length} Perfis em Análise</span>
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
                          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">{m.email}</p>
                        </div>
                      </div>
                      <a href={`https://wa.me/55${m.whatsapp?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="bg-green-500/10 text-green-500 p-3 rounded-xl hover:bg-green-500 hover:text-slate-950 transition-all flex items-center gap-2 text-[10px] font-black uppercase border border-green-500/20">
                        <MessageCircle size={16} /> Contatar
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                      <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Identidade Oficial</p>
                        <p className="text-sm font-black text-white tracking-wider mb-1">{m.cpf || '---'}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase">CNH: <span className="text-white">{m.cnh}</span></p>
                      </div>
                      <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Veículo Operacional</p>
                        <p className="text-sm font-black text-cyan-400 uppercase italic mb-1">{m.categoria.replace('_',' ')}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase">{m.placa} • {m.renavam || '---'}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">{m.cidadeEstado}</p>
                      </div>
                    </div>

                    <div className="mb-8">
                       <p className="text-[9px] text-slate-500 font-black uppercase mb-3 tracking-widest flex items-center gap-2"><Eye size={12}/> Verificação Visual (Selfie + CNH)</p>
                       <div className="relative group/img overflow-hidden rounded-2xl h-48 border border-white/10 bg-black cursor-pointer shadow-inner">
                          <img src={m.documentoUrl || m.cnhUrl} className="w-full h-full object-contain opacity-80 group-hover/img:scale-105 group-hover/img:opacity-100 transition-all" alt="Selfie de Verificação" />
                          <div className="absolute inset-0 bg-blue-900/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                             <span className="bg-slate-900/80 text-white text-xs font-black uppercase px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">Clique p/ Ampliar</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex gap-4 relative z-10 pt-6 border-t border-white/5">
                      <button onClick={() => handleAprovacaoMotorista(m.id, 'rejeitado')} className="flex-1 bg-transparent border border-red-500/30 text-red-400 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all">Rejeitar</button>
                      <button onClick={() => handleAprovacaoMotorista(m.id, 'aprovado')} className="flex-[2] bg-cyan-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:bg-cyan-500 transition-all flex items-center justify-center gap-2"><ShieldCheck size={16}/> Aprovar Parceiro</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: RADAR DE CORRIDAS (TIMELINE OPERACIONAL) */}
        {tab === 'corridas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* FERRAMENTAS DE PESQUISA & FILTROS */}
             <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row gap-4 mb-8 shadow-xl">
                <div className="flex-1 relative">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-cyan-500 w-5 h-5" />
                   <input 
                    placeholder="Buscar por ID, Motorista, Cliente ou Região..." 
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
                    <option value="em_transporte">Em Transporte</option>
                    <option value="entregue">Aguardando Repasse</option>
                    <option value="finalizado">Finalizados</option>
                    <option value="cancelado">Cancelados</option>
                  </select>
                </div>
             </div>

             {/* LISTA DE FRETE (TORRE DE CONTROLE VISUAL) */}
             <div className="space-y-6">
                {fretesFiltrados.length === 0 ? (
                  <div className="text-center py-24 bg-slate-900/30 rounded-[3rem] border border-dashed border-white/5 backdrop-blur-sm">
                    <MapIcon size={48} className="mx-auto mb-6 text-slate-700" />
                    <p className="text-slate-400 font-black uppercase italic tracking-widest text-lg">Radar Limpo</p>
                    <p className="text-slate-600 text-sm mt-2">Nenhuma corrida encontrada para os filtros selecionados.</p>
                  </div>
                ) : (
                  fretesFiltrados.map(f => (
                    <div key={f.id} className="bg-slate-900/80 border border-white/5 rounded-[2.5rem] p-6 md:p-8 hover:border-cyan-500/30 transition-all relative overflow-hidden group shadow-2xl backdrop-blur-md">
                      
                      {/* Status Lateral Indicator (Led Profile) */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 transition-all ${
                        ['disponivel'].includes(f.status) ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]' :
                        ['aceito', 'coleta'].includes(f.status) ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]' :
                        ['em_transporte'].includes(f.status) ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]' :
                        ['entregue'].includes(f.status) ? 'bg-purple-500 animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.8)]' :
                        ['finalizado'].includes(f.status) ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>

                      <div className="flex flex-col lg:flex-row justify-between gap-8 pl-2">
                        
                        {/* COLUNA 1: Rota e Timeline Básica */}
                        <div className="flex-[1.5]">
                          <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                            <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                              ['disponivel'].includes(f.status) ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                              ['entregue'].includes(f.status) ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 animate-pulse' :
                              ['finalizado'].includes(f.status) ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              ['cancelado'].includes(f.status) ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {f.status.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 font-bold">#{f.id.toUpperCase()}</span>
                            <span className="text-[10px] font-bold text-slate-500 ml-auto flex items-center gap-1"><Calendar size={12}/> {formatarData(f.createdAt)}</span>
                          </div>

                          <div className="flex items-start gap-5">
                             <div className="flex flex-col items-center gap-1 mt-1">
                               <div className="w-4 h-4 bg-slate-950 border-2 border-blue-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>
                               <div className="w-0.5 h-12 bg-slate-800 rounded-full"></div>
                               <div className="w-4 h-4 bg-slate-950 border-2 border-green-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.3)]"></div>
                             </div>
                             <div className="space-y-6 flex-1">
                                <div>
                                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Local de Retirada</p>
                                   <p className="text-sm font-bold text-white leading-tight">{f.enderecoColetaTexto || f.cidadeOrigem}</p>
                                </div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Destino Final</p>
                                   <p className="text-sm font-bold text-white leading-tight">{f.enderecoEntregaTexto || f.cidadeDestino}</p>
                                </div>
                             </div>
                          </div>
                        </div>

                        {/* COLUNA 2: Entidades e Valores */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                              <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Users size={10}/> Solicitante</p>
                                <h4 className="text-xs font-black text-white uppercase truncate">{f.clienteNome || 'Registrado'}</h4>
                              </div>
                              <div className="mt-4">
                                {f.clienteZap && <a href={`https://wa.me/55${f.clienteZap?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 font-bold hover:underline flex items-center gap-1"><MessageCircle size={12}/> Chamar no WhatsApp</a>}
                              </div>
                           </div>
                           <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/5 flex flex-col justify-between relative overflow-hidden">
                              {f.status === 'disponivel' && <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>}
                              <div className="relative z-10">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Truck size={10}/> Parceiro Operacional</p>
                                <h4 className={`text-xs font-black uppercase truncate ${f.motoristaNome ? 'text-white' : 'text-blue-400 italic animate-pulse'}`}>{f.motoristaNome || 'Buscando Motorista...'}</h4>
                              </div>
                              <div className="mt-4 relative z-10">
                                {f.motoristaZap && <a href={`https://wa.me/55${f.motoristaZap?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 font-bold hover:underline flex items-center gap-1"><MessageCircle size={12}/> Chamar Motorista</a>}
                              </div>
                           </div>
                           
                           <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/5 col-span-1 sm:col-span-2 flex justify-between items-center">
                              <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Especificações</p>
                                <p className="text-[10px] font-black text-white uppercase italic">{f.veiculo.replace('_',' ')} • {f.peso} • {f.qtdVolumes}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor Bruto</p>
                                <p className="text-lg font-black text-green-400">R$ {Number(f.valorTotal).toFixed(2)}</p>
                              </div>
                           </div>
                        </div>

                        {/* COLUNA 3: Ações do Terminal */}
                        <div className="flex flex-col gap-3 min-w-[200px] border-l border-white/5 pl-4 lg:pl-8 justify-center">
                           <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-2 text-center flex items-center justify-center gap-2"><Zap size={10}/> Operações</p>
                           
                           {/* Fluxo de Repasse Premium */}
                           {f.status === 'entregue' && (
                             <button onClick={() => forceStatus(f.id, 'finalizado')} className="bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex flex-col items-center justify-center gap-1 group">
                               <span className="flex items-center gap-1"><Wallet size={14} /> Liquidar Repasse</span>
                               <span className="text-[8px] opacity-70 group-hover:opacity-100 font-bold">R$ {Number(f.valorMotorista).toFixed(2)}</span>
                             </button>
                           )}
                           
                           {f.comprovanteUrl && (
                             <a href={f.comprovanteUrl} target="_blank" rel="noreferrer" className="bg-slate-950 border border-slate-700 text-slate-300 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-slate-800 hover:text-white transition-all shadow-inner">
                               <Eye size={14}/> Comprovante (NF)
                             </a>
                           )}
                           
                           {['aguardando_pagamento', 'disponivel', 'aceito'].includes(f.status) && (
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
               <div className="flex items-center gap-2">
                  <Activity size={14} className="text-cyan-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Radar Latency: <span className="text-white">8ms</span></span>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Terminal:</p>
               <p className="text-[10px] font-black text-cyan-400 uppercase italic tracking-widest px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">{authUser?.email}</p>
            </div>
         </div>
      </div>
    </div>
  );
}
