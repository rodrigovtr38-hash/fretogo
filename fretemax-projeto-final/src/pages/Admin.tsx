// =========================================================
// NOME DO ARQUIVO: src/pages/Admin.tsx
// CTO-Log: Auditoria Concluída - FASE 5 (Lote 2 Validado)
// Status: Sincronizado com nova arquitetura B2B e Categorias Oficiais.
// Recursos Críticos: Trava de senha e UID ativada. Lógica de repasse manual PIX preservada.
// =========================================================

import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, query, orderBy, runTransaction, where, updateDoc, serverTimestamp, limit } from 'firebase/firestore';
import { NotificationService } from '../services/notificationService';
import { AppTripState } from '../state/tripStateMachine'; 
import { 
  Loader2, CheckCircle, XCircle, Search, ShieldAlert, Truck, Users, 
  Calendar, DollarSign, Activity, Clock, AlertTriangle, Eye, 
  Map as MapIcon, Wallet, Zap, MessageCircle, ShieldCheck, RefreshCcw, Lock, Target, Key, Radio
} from 'lucide-react';

const ADMIN_UIDS = ['uV1yeZoGfhZTRWDVL1CnMW6b6NY2']; 

// 🔥 INJEÇÃO CTO 1: Configuração das 7 Categorias Oficiais
const CATEGORIAS_FROTA = [
  { id: 'moto', label: 'Moto / Courier', icon: '🏍️' },
  { id: 'carro_pequeno', label: 'Carro / Hatch', icon: '🚗' },
  { id: 'utilitario', label: 'Utilitário / Van', icon: '🚐' },
  { id: 'toco', label: 'Caminhão Toco', icon: '🚚' },
  { id: 'truck', label: 'Caminhão Truck', icon: '🚛' },
  { id: 'carreta_ls', label: 'Carreta LS', icon: '🛣️' },
  { id: 'bi_trem_cegonha', label: 'Bi-trem / Cegonha', icon: '🏭' }
];

export default function Admin() {
  const [authUser, setAuthUser] = useState<any>(null);
  
  // 🔥 INJEÇÃO CTO 2: Estados da Fechadura Digital
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

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
    const qPendentes = query(collection(db, 'motoristas_cadastros'), where('status', '==', 'pendente'));
    const unsubPendentes = onSnapshot(qPendentes, (snap) => {
      setMotoristasPendentes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
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

  useEffect(() => {
    if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) return;
    const q = query(collection(db, 'fretes'), where('status', '==', AppTripState.CANCELADO));
    const unsub = onSnapshot(q, (snap) => {
      setReembolsosPendentes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => !f.reembolsado));
    });
    return () => unsub();
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) return;
    const q = query(collection(db, 'fretes'), where('repasseEfetuado', '==', true), orderBy('repasseData', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setHistoricoPagamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const stats = useMemo(() => {
    const fretesDoPeriodo = fretes.filter(f => filterByTime(f, timeFilter));
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    const faturado = fretesDoPeriodo.filter(f => [AppTripState.ACEITO, AppTripState.INDO_COLETA, AppTripState.COLETANDO, AppTripState.EM_TRANSPORTE, AppTripState.ENTREGUE, 'finalizado'].includes(f.status)).reduce((acc, f) => acc + (Number(f.valorBruto) || Number(f.valorTotal) || 0), 0);
    const lucro = fretesDoPeriodo.filter(f => [AppTripState.ACEITO, AppTripState.INDO_COLETA, AppTripState.COLETANDO, AppTripState.EM_TRANSPORTE, AppTripState.ENTREGUE, 'finalizado'].includes(f.status)).reduce((acc, f) => acc + (Number(f.valorComissao) || Number(f.lucroPlataforma) || 0), 0);
    const entregues = fretesDoPeriodo.filter(f => [AppTripState.ENTREGUE, 'finalizado'].includes(f.status)).length;
    const ticketMedio = entregues > 0 ? (faturado / entregues) : 0;
    const ativos = fretes.filter(f => [AppTripState.ACEITO, AppTripState.INDO_COLETA, AppTripState.COLETANDO, AppTripState.EM_TRANSPORTE].includes(f.status)).length;
    const aguardando = fretes.filter(f => f.status === AppTripState.DISPONIVEL).length;
    const repasses = fretes.filter(f => f.status === AppTripState.ENTREGUE).length;
    const cancelados = fretesDoPeriodo.filter(f => f.status === AppTripState.CANCELADO).length;

    const faturadoHoje = fretes.filter(f => {
      const data = f.createdAt?.toDate ? f.createdAt.toDate() : new Date(f.createdAt);
      return data >= hoje;
    }).reduce((acc, f) => acc + (Number(f.valorTotal) || 0), 0);

    const aPagarMotoristas = fretes.filter(f => f.status === AppTripState.ENTREGUE && !f.repasseEfetuado).reduce((acc, f) => acc + (Number(f.valorLiquidoMotorista) || Number(f.valorMotorista) || 0), 0);

    const pagoHoje = fretes.filter(f => {
      const data = f.repasseData?.toDate ? f.repasseData.toDate() : null;
      return data && data >= hoje && f.repasseEfetuado;
    }).reduce((acc, f) => acc + (Number(f.valorLiquidoMotorista) || 0), 0);

    const motoristasRetorno = motoristasOnline.filter(m => m.modoRetorno === true).length;

    const now = Date.now();
    const timeoutAguardando = fretes.filter(f => f.status === AppTripState.DISPONIVEL && (now - (f.createdAt?.toMillis ? f.createdAt.toMillis() : now)) > 600000).length;
    const semComprovante = fretes.filter(f => f.status === AppTripState.ENTREGUE && !f.comprovanteUrl).length;
    const motoristasOcupados = motoristasOnline.filter(m => m.status === 'ocupado').length;
    
    const insucessos = fretes.filter(f => f.alertaInsucesso === true).length;

    const alertas24h = fretes.filter(f => {
      if (f.status !== AppTripState.ENTREGUE || f.repasseEfetuado) return false;
      const entregaData = f.updatedAt?.toDate ? f.updatedAt.toDate() : new Date();
      const horasDesdeEntrega = (Date.now() - entregaData.getTime()) / (1000 * 60 * 60);
      return horasDesdeEntrega >= 20 && horasDesdeEntrega < 24;
    }).length;

    return { 
      faturado, lucro, entregues, ticketMedio, ativos, aguardando, 
      repasses, cancelados, faturadoHoje, aPagarMotoristas, pagoHoje, 
      motoristasRetorno, timeoutAguardando, semComprovante, motoristasOcupados, insucessos, alertas24h 
    };
  }, [fretes, motoristasOnline, timeFilter]);

  // 🔥 INJEÇÃO CTO 3: Contagem Dinâmica de Categorias
  const contagemFrota = useMemo(() => {
    const contagem: Record<string, number> = {
      moto: 0, carro_pequeno: 0, utilitario: 0, 
      toco: 0, truck: 0, carreta_ls: 0, bi_trem_cegonha: 0
    };
    
    motoristasAprovados.forEach(m => {
      const cat = m.categoria ? m.categoria.toLowerCase() : '';
      if (contagem[cat] !== undefined) {
        contagem[cat]++;
      }
    });

    return contagem;
  }, [motoristasAprovados]);

  const aptosPix = useMemo(() => motoristasAprovados.filter(m => m.fotoCnh && m.fotoSelfie).length, [motoristasAprovados]);

  const handleAprovacaoMotorista = async (id: string, status: 'aprovado' | 'rejeitado') => {
    if (!window.confirm(`Deseja confirmar a ação: ${status.toUpperCase()}?`)) return;
    try {
      await updateDoc(doc(db, 'motoristas_cadastros', id), { status });
      alert(`Status atualizado para: ${status}`);

      const motorista = motoristasPendentes.find(m => m.id === id);
      if (motorista) {
        NotificationService.enviarWhatsAppAprovacao(
          motorista.whatsapp || motorista.telefone || '',
          motorista.nome,
          status
        );
      }
    } catch (e: any) { alert("Erro ao atualizar o banco de dados: " + e.message); }
  };

  const forceStatus = async (id: string, novoStatus: string) => {
    if (!window.confirm(`Forçar status para: ${novoStatus.toUpperCase()}?`)) return;
    try {
      await runTransaction(db, async (t) => {
        const ref = doc(db, 'fretes', id);
        const d = await t.get(ref);
        if (!d.exists()) throw new Error("Frete não encontrado.");

        const currentData = d.data();
        if (novoStatus === AppTripState.CANCELADO && currentData.status === AppTripState.EM_TRANSPORTE) {
           throw new Error("Motorista em transporte. Cancelamento abortado.");
        }

        const updateData: any = {
          status: novoStatus,
          adminAction: true,
          updatedAt: serverTimestamp()
        };

        if (novoStatus === 'finalizado' && currentData.status === AppTripState.ENTREGUE) {
          updateData.repasseEfetuado = true;
          updateData.repasseData = serverTimestamp();
          updateData.repassePor = authUser.uid;
          updateData.repasseValor = Number(currentData.valorLiquidoMotorista || currentData.valorMotorista || 0);
        }

        t.update(ref, updateData);
      });
      if (novoStatus === 'finalizado') {
        alert('✅ Repasse registrado no histórico!');
      }
    } catch (e: any) { alert(e.message); }
  };

  const forceClearInsucesso = async (id: string) => {
    try {
      await updateDoc(doc(db, 'fretes', id), { alertaInsucesso: false });
    } catch (e: any) { alert("Erro ao limpar alerta."); }
  };

  const handleReembolso = async (idPedido: string) => {
    if (!window.confirm("CRÍTICO: Estornar PIX no Mercado Pago?")) return;
    try {
      const res = await fetch('/api/reembolso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idPedido }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha API');
      await updateDoc(doc(db, 'fretes', idPedido), { reembolsado: true, reembolsoData: serverTimestamp(), reembolsoPor: authUser.uid });
      alert('SUCESSO! PIX estornado e registrado.');
    } catch (error: any) { alert(`Erro: ${error.message}`); }
  };

  // 🔥 INJEÇÃO CTO 4: Função para abrir WhatsApp e pedir o PIX
  const handlePedirChavePix = (frete: any) => {
    const telefone = frete.motoristaZap || frete.telefoneMotorista;
    if (!telefone) {
      alert("Número do motorista não encontrado no sistema.");
      return;
    }
    const numeroLimpo = telefone.replace(/\D/g, '');
    const valor = Number(frete.valorLiquidoMotorista || frete.valorMotorista || 0).toFixed(2).replace('.', ',');
    const msg = `Olá *${frete.motoristaNome}*, aqui é a central operacional do *FretoGo*.\n\nVimos que você finalizou a corrida #${frete.id.slice(0,8).toUpperCase()}.\n\nPor favor, envie sua *Chave PIX* para realizarmos o seu repasse no valor de *R$ ${valor}*.`;
    
    window.open(`https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-cyan-500 w-12 h-12" />
      <p className="text-cyan-500 font-black animate-pulse uppercase tracking-widest text-xs">Sincronizando satélites e telemetria da malha...</p>
    </div>
  );

  // 🛡️ TRAVA ORIGINAL MANTIDA (Acesso Negado se não for o e-mail do dono)
  if (!authUser || !ADMIN_UIDS.includes(authUser.uid)) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="text-red-500 w-12 h-12" />
        </div>
        <h2 className="text-white font-black text-4xl uppercase italic tracking-tighter">Acesso Negado</h2>
        <p className="text-slate-500 mt-3 max-w-sm font-medium leading-relaxed">Você está em uma área restrita. O seu UID não possui as credenciais da diretoria logística para visualizar a Central Operacional FRETOGO.</p>
        <p className="text-slate-700 mt-8 text-[10px] uppercase tracking-widest">Sua credencial atual: {authUser?.uid || 'Não autenticado'}</p>
      </div>
    );
  }

  // 🔒 TELA DE SENHA DE PROTEÇÃO (Só aparece depois que o e-mail passou na verificação acima)
  if (!isUnlocked) {
    return (
      <div className="h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1),transparent_50%)]" />
        <div className="bg-slate-900/80 border border-white/10 p-10 rounded-[2rem] backdrop-blur-xl shadow-2xl flex flex-col items-center w-full max-w-sm relative z-10">
          <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 border border-cyan-500/20">
            <Lock className="w-10 h-10 text-cyan-500" />
          </div>
          <h2 className="text-white font-black text-2xl uppercase tracking-widest mb-2 text-center">Acesso à Torre de Controle</h2>
          <p className="text-slate-400 text-xs text-center mb-8">Insira a chave criptográfica para liberar a central de operações.</p>
          
          <div className="w-full relative mb-6">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500 w-5 h-5" />
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (passwordInput === '152085') setIsUnlocked(true);
                  else { alert("Senha incorreta"); setPasswordInput(''); }
                }
              }}
              placeholder="Código de Acesso"
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-center font-black tracking-[0.5em] focus:border-cyan-500 outline-none transition-all"
            />
          </div>

          <button 
            onClick={() => {
              if (passwordInput === '152085') setIsUnlocked(true);
              else { alert("Senha incorreta"); setPasswordInput(''); }
            }}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(8,145,178,0.4)] transition-all"
          >
            Desbloquear Terminal
          </button>
        </div>
      </div>
    );
  }

  // 👇 PAINEL ADMINISTRATIVO LIBERADO
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-24">
      
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(8,145,178,0.4)]">
                <Radio className="text-white w-7 h-7 animate-pulse" />
             </div>
             <div>
               <h1 className="text-2xl font-black text-white italic leading-none uppercase tracking-tighter">TORRE DE CONTROLE <span className="text-cyan-500">FRETOGO</span></h1>
               <p className="text-[10px] font-bold text-cyan-500/70 uppercase tracking-[0.2em] flex items-center gap-1">
                 <Activity size={10}/> Central Operacional B2B
               </p>
             </div>
          </div>

          <nav className="flex flex-wrap bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 gap-1">
            {[
              { id: 'dashboard', label: 'Visão Operacional', icon: Activity },
              { id: 'motoristas', label: 'Homologação de Frota', icon: Users, badge: motoristasPendentes.length },
              { id: 'corridas', label: 'Malha Logística Live', icon: MapIcon }
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
            
            {stats.alertas24h > 0 && (
              <div className="mb-6 bg-amber-950/60 border-amber-500/50 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-500" size={20} />
                  <div>
                    <p className="text-sm font-black text-amber-400 uppercase">Atenção Operacional: {stats.alertas24h} pagamento(s) vencendo em 24h</p>
                    <p className="text-[10px] text-amber-300/70">Fretes entregues aguardando repasse ao motorista parceiro</p>
                  </div>
                </div>
              </div>
            )}

            {/* 🔥 INJEÇÃO CTO (Visual das categorias dinâmicas sem limite) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                  <Target className="text-cyan-500 w-5 h-5" /> Base de Operadores <span className="text-cyan-500">(Nacional)</span>
                </h2>
                <div className="flex items-center gap-2 bg-slate-900/50 border border-white/10 px-4 py-2 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Homologados:</span>
                  <span className="text-sm font-black text-white">{motoristasAprovados.length}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {CATEGORIAS_FROTA.map(cat => {
                  const qtd = contagemFrota[cat.id] || 0;
                  return (
                    <div key={cat.id} className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center hover:border-cyan-500/30 transition-all backdrop-blur-md">
                      <span className="text-2xl mb-2">{cat.icon}</span>
                      <h3 className="text-2xl font-black text-white">{qtd}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{cat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-amber-950/40 border border-amber-500/30 p-5 rounded-2xl backdrop-blur-sm">
                <p className="text-[10px] font-black text-amber-400/70 uppercase tracking-widest mb-2 flex items-center gap-1"><Clock size={12}/> A Pagar (24h)</p>
                <h3 className="text-2xl font-black text-amber-400 tracking-tighter">R$ {stats.aPagarMotoristas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                <p className="text-[10px] text-amber-500/50 mt-1 font-bold">{fretes.filter(f => f.status === AppTripState.ENTREGUE).length} fretes pendentes</p>
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

            <div className="flex justify-end mb-6">
              <button
                onClick={() => setShowHistorico(!showHistorico)}
                className="bg-slate-800 hover:bg-slate-700 border-cyan-500/30 text-cyan-400 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <Wallet size={14} /> {showHistorico ? 'Ocultar' : 'Ver'} Histórico de Pagamentos ({historicoPagamentos.length})
              </button>
            </div>

            {showHistorico && (
              <div className="mb-8 bg-slate-900/60 border-white/5 rounded-2xl p-6 backdrop-blur-md">
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={20} /> Últimos Pagamentos Realizados
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-slate-500">Data</th>
                        <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-slate-500">ID da Operação</th>
                        <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-slate-500">Motorista Parceiro</th>
                        <th className="text-right py-3 px-4 text-[10px] font-black uppercase text-slate-500">Valor Liquidado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicoPagamentos.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-8 text-slate-600">Nenhum pagamento registrado na base de dados</td></tr>
                      ) : historicoPagamentos.slice(0, 10).map(p => (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-slate-300">
                            {p.repasseData?.toDate ? p.repasseData.toDate().toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-cyan-400">#{p.id.slice(0,8).toUpperCase()}</td>
                          <td className="py-3 px-4 text-white font-bold">{p.motoristaNome || 'N/A'}</td>
                          <td className="py-3 px-4 text-right text-green-400 font-black">
                            R$ {Number(p.repasseValor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {tab === 'motoristas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
               <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Homologação & <span className="text-cyan-500">Auditoria de Frota</span></h2>
               <div className="flex gap-2">
                 <span className="bg-slate-900 text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/10 tracking-widest shadow-inner flex items-center gap-2">
                   <Clock size={12} className="text-amber-500"/> {motoristasPendentes.length} Na Fila
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
                 <p className="text-slate-500 text-sm mt-2">Não há novos cadastros aguardando auditoria na Torre de Controle.</p>
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
                    placeholder="Buscar por ID ou Nome na malha..." 
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
                    <option value={AppTripState.DISPONIVEL}>Radar Ativo</option>
                    <option value={AppTripState.ACEITO}>Motorista Acionado</option>
                    <option value={AppTripState.INDO_COLETA}>Em Deslocamento</option>
                    <option value={AppTripState.EM_TRANSPORTE}>Em Rota Escolta</option>
                    <option value={AppTripState.ENTREGUE}>Aguardando Liquidação</option>
                    <option value="finalizado">Concluídos</option>
                    <option value={AppTripState.CANCELADO}>Operação Abortada</option>
                  </select>
                </div>
             </div>

             <div className="space-y-6">
                {fretesFiltrados.length === 0 ? (
                  <div className="text-center py-24 bg-slate-900/30 rounded-[3rem] border border-dashed border-white/5 backdrop-blur-sm">
                    <MapIcon size={48} className="mx-auto mb-6 text-slate-700" />
                    <p className="text-slate-400 font-black uppercase italic tracking-widest text-lg">Malha Logística Estável</p>
                    <p className="text-slate-600 text-sm mt-2">Nenhuma carga transitando nos filtros selecionados.</p>
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
                            <span className="text-[10px] font-mono text-slate-500 font-bold">OP_ID: #{f.id.slice(0,8).toUpperCase()}</span>
                          </div>

                          <div className="flex items-start gap-5">
                             <div className="flex flex-col items-center gap-1 mt-1">
                               <div className="w-4 h-4 bg-slate-950 border-2 border-blue-500 rounded-full"></div>
                               <div className="w-0.5 h-12 bg-slate-800 rounded-full"></div>
                               <div className="w-4 h-4 bg-slate-950 border-2 border-green-500 rounded-full"></div>
                             </div>
                             <div className="space-y-6 flex-1">
                                <div>
                                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Origem / Coleta</p>
                                   <p className="text-sm font-bold text-white leading-tight">{f.origem?.endereco || f.cidadeOrigem || 'Endereço Indisponível'}</p>
                                </div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Destino Final</p>
                                   <p className="text-sm font-bold text-white leading-tight">{f.destino?.endereco || f.cidadeDestino || 'Endereço Indisponível'}</p>
                                </div>
                             </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px] border-l border-white/5 pl-4 justify-center">
                           
                           {/* AÇÕES DE REPASSE DE DINHEIRO E REEMBOLSO */}
                           {f.status === AppTripState.ENTREGUE && (
                             <div className="flex flex-col gap-2">
                               {/* 🔥 INJEÇÃO CTO 4: Botão de cobrar a chave PIX no ZAP */}
                               <button onClick={() => handlePedirChavePix(f)} className="bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all flex items-center justify-center gap-2">
                                 <MessageCircle size={14} /> Cobrar Chave PIX
                               </button>

                               <button onClick={() => forceStatus(f.id, 'finalizado')} className="bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex flex-col items-center justify-center gap-1 group">
                                 <span className="flex items-center gap-1"><Wallet size={14} /> Liquidar Repasse</span>
                                 <span className="text-[8px] opacity-70 group-hover:opacity-100 font-bold">R$ {Number(f.valorLiquidoMotorista || f.valorMotorista).toFixed(2)}</span>
                               </button>
                             </div>
                           )}

                           {f.status === AppTripState.CANCELADO && !f.reembolsado && (
                             <button onClick={() => handleReembolso(f.id)} className="bg-amber-600 hover:bg-amber-500 text-slate-900 py-4 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex flex-col items-center justify-center gap-1">
                               <span className="flex items-center gap-1"><RefreshCcw size={14} /> Estornar PIX (MP)</span>
                             </button>
                           )}

                           {f.reembolsado && (
                             <div className="bg-slate-900 border border-amber-500/30 text-amber-400 py-3 rounded-xl font-black text-[9px] tracking-widest uppercase flex items-center justify-center gap-2">
                               <CheckCircle size={12} /> Reembolso Feito
                             </div>
                           )}
                           
                           {[AppTripState.AGUARDANDO_PAGAMENTO, AppTripState.DISPONIVEL, AppTripState.ACEITO, AppTripState.INDO_COLETA].includes(f.status) && (
                             <button onClick={() => forceStatus(f.id, AppTripState.CANCELADO)} className="bg-transparent hover:bg-red-500/10 text-red-500 py-3 rounded-xl font-black text-[9px] tracking-widest uppercase border border-transparent hover:border-red-500/30 transition-all mt-auto">Abortar Operação</button>
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

      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 p-3 z-40 hidden md:block shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
         <div className="max-w-7xl mx-auto flex justify-between items-center px-8">
            <div className="flex items-center gap-8">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]"></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Conexão Firebase <span className="text-green-500">Live</span></span>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Credencial Operacional:</p>
               <p className="text-[10px] font-black text-cyan-400 uppercase italic tracking-widest px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">{authUser?.email}</p>
            </div>
         </div>
      </div>
    </div>
  );
}
