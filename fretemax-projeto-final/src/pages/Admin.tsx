import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, query, orderBy, runTransaction, where, updateDoc } from 'firebase/firestore';
import { Loader2, CheckCircle, XCircle, Search, ShieldAlert, Truck, Users, Calendar } from 'lucide-react';

// 🔥 SEGURANÇA: Painel trancado! Apenas a conta principal tem acesso.
const ADMIN_UIDS = ['uV1yeZoGfhZTRWDVL1CnMW6b6NY2']; 

export default function Admin() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [tab, setTab] = useState<'motoristas' | 'corridas'>('motoristas');
  const [fretes, setFretes] = useState<any[]>([]);
  const [motoristasPendentes, setMotoristasPendentes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('todos');
  const [loading, setLoading] = useState(true);

  // Verificação de Identidade
  useEffect(() => {
    return auth.onAuthStateChanged(u => {
      setAuthUser(u);
      if (!u && ADMIN_UIDS[0] !== '') setLoading(false);
    });
  }, []);

  // Busca Motoristas Pendentes
  useEffect(() => {
    if (!authUser && ADMIN_UIDS[0] !== '') return;
    const q = query(collection(db, 'motoristas_cadastros'), where('status', '==', 'pendente'));
    return onSnapshot(q, (snap) => {
      setMotoristasPendentes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [authUser]);

  // Busca Corridas
  useEffect(() => {
    if (!authUser && ADMIN_UIDS[0] !== '') return;
    const q = query(collection(db, 'fretes'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setFretes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [authUser]);

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
      </div>
    );
  }

  // Se a trava estiver ativada e não for você, bloqueia.
  if (ADMIN_UIDS[0] !== '' && (!authUser || !ADMIN_UIDS.includes(authUser.uid))) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <ShieldAlert className="text-red-500 w-24 h-24 mb-4" />
        <p className="text-white font-black text-2xl uppercase">Acesso Restrito</p>
        <p className="text-slate-400 mt-2">Área exclusiva da Diretoria.</p>
      </div>
    );
  }

  const fretesFiltrados = fretes.filter(f => {
    const matchSearch =
      f.id.includes(searchTerm) ||
      f.motoristaNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cidadeOrigem?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filter === 'todos' || f.status === filter;
    return matchSearch && matchFilter;
  });

  // Métricas do Dashboard
  const totalFaturado = fretes
    .filter(f => ['aceito','coleta','em_transporte','entregue','finalizado'].includes(f.status))
    .reduce((acc, f) => acc + (Number(f.valorTotal) || 0), 0);

  const totalLucro = fretes
    .filter(f => ['aceito','coleta','em_transporte','entregue','finalizado'].includes(f.status))
    .reduce((acc, f) => acc + (Number(f.lucroPlataforma) || 0), 0);

  const repassesPendentes = fretes.filter(f => f.status === 'entregue').length;

  const forceStatus = async (id: string, novoStatus: string) => {
    if (!window.confirm(`Forçar o status deste frete para: ${novoStatus.toUpperCase()}?`)) return;
    try {
      await runTransaction(db, async (t) => {
        const ref = doc(db, 'fretes', id);
        const d = await t.get(ref);
        const data = d.data();
        if (!d.exists()) throw new Error("Frete não encontrado");
        t.update(ref, {
          status: novoStatus,
          logs: [...(data?.logs || []), { tipo: `admin_forced_${novoStatus}`, data: new Date().toISOString() }]
        });
      });
      alert('Operação executada com sucesso.');
    } catch (e: any) { alert(e.message); }
  };

  const handleAprovacaoMotorista = async (id: string, status: 'aprovado' | 'rejeitado') => {
    if (!window.confirm(`Tem certeza que deseja ${status.toUpperCase()} este motorista?`)) return;
    try {
      await updateDoc(doc(db, 'motoristas_cadastros', id), { status });
      alert(`Motorista ${status} com sucesso!`);
    } catch (e: any) { alert("Erro ao processar: " + e.message); }
  };

  // 🔥 FUNÇÃO DE CONVERSÃO DE DATA E HORA
  const formatarData = (timestamp: any) => {
    if (!timestamp) return 'Data indisponível';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-200 pb-20">
      <h1 className="text-3xl font-black mb-8 text-white uppercase italic tracking-tight flex items-center gap-3">
        <ShieldAlert className="text-blue-500" /> Comando Central
      </h1>

      {/* DASHBOARD FINANCEIRO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-xs uppercase font-bold text-slate-500 mb-1">Vol. Transacionado</p>
          <p className="text-2xl font-black text-white">R$ {totalFaturado.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-blue-900/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
          <p className="text-xs uppercase font-bold text-blue-500 mb-1">Lucro Fretogo</p>
          <p className="text-2xl font-black text-blue-400">R$ {totalLucro.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-amber-900/50">
          <p className="text-xs uppercase font-bold text-amber-500 mb-1">Repasses Pendentes</p>
          <p className="text-2xl font-black text-amber-400">{repassesPendentes} Fretes</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <p className="text-xs uppercase font-bold text-slate-500 mb-1">Total Movimentado</p>
          <p className="text-2xl font-black text-white">{fretes.length} Fretes</p>
        </div>
      </div>

      {/* NAVEGAÇÃO DAS ABAS */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button onClick={() => setTab('motoristas')} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black uppercase text-sm transition-all ${tab === 'motoristas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'}`}>
          <Users size={18} /> Aprovação de Motoristas {motoristasPendentes.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{motoristasPendentes.length}</span>}
        </button>
        <button onClick={() => setTab('corridas')} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black uppercase text-sm transition-all ${tab === 'corridas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'}`}>
          <Truck size={18} /> Radar de Corridas
        </button>
      </div>

      {/* ABA: APROVAÇÃO DE MOTORISTAS */}
      {tab === 'motoristas' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          {motoristasPendentes.length === 0 ? (
            <div className="text-center py-20 bg-slate-900 rounded-[3rem] border border-slate-800">
              <CheckCircle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-xl font-bold text-slate-500">Nenhum motorista pendente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {motoristasPendentes.map((m) => (
                <div key={m.id} className="bg-slate-900 border border-slate-700 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase">{m.nome}</h2>
                      <p className="text-slate-400 font-bold">{m.email}</p>
                    </div>
                    <span className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-lg text-xs font-black uppercase border border-amber-500/30">Em Análise</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">CPF</p>
                      <p className="font-black text-slate-300">{m.cpf || 'Não info'}</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">WhatsApp</p>
                      <p className="font-black text-slate-300">{m.whatsapp}</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Veículo / Placa</p>
                      <p className="font-black text-slate-300 uppercase">{m.categoria} - {m.placa}</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">CNH / Renavam</p>
                      <p className="font-black text-slate-300">{m.cnh} / {m.renavam}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Imagens dos Documentos</p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {m.cnhUrl ? (
                       <a href={m.cnhUrl} target="_blank" rel="noreferrer" className="block relative group">
                          <div className="absolute inset-0 bg-blue-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"><Search className="text-white w-8 h-8"/></div>
                          <img src={m.cnhUrl} className="rounded-2xl h-32 w-full object-cover border border-slate-700" alt="CNH" />
                       </a>
                    ) : <div className="h-32 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-600 text-xs font-bold">Sem CNH</div>}
                    
                    {m.crlvUrl ? (
                       <a href={m.crlvUrl} target="_blank" rel="noreferrer" className="block relative group">
                          <div className="absolute inset-0 bg-blue-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"><Search className="text-white w-8 h-8"/></div>
                          <img src={m.crlvUrl} className="rounded-2xl h-32 w-full object-cover border border-slate-700" alt="CRLV" />
                       </a>
                    ) : <div className="h-32 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-600 text-xs font-bold">Sem CRLV</div>}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => handleAprovacaoMotorista(m.id, 'rejeitado')} className="flex-1 bg-slate-800 hover:bg-red-900/50 text-red-400 py-4 rounded-xl font-black uppercase text-sm border border-slate-700 transition-colors">Rejeitar</button>
                    <button onClick={() => handleAprovacaoMotorista(m.id, 'aprovado')} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black uppercase text-sm shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"><CheckCircle size={18}/> Aprovar Perfil</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: RADAR DE CORRIDAS */}
      {tab === 'corridas' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          
          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input placeholder="Buscar por ID, Motorista, Cliente ou Cidade..." onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none" />
            </div>
            <select onChange={e => setFilter(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none cursor-pointer">
              <option value="todos">Todos os Status</option>
              <option value="disponivel">Radar (Buscando)</option>
              <option value="aceito">Motorista a Caminho</option>
              <option value="em_transporte">Em Rota de Entrega</option>
              <option value="entregue">Aguardando Repasse</option>
              <option value="finalizado">Repasse Concluído</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>

          <div className="space-y-4">
            {fretesFiltrados.map(f => (
              <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-600 transition-colors">
                <div className="flex flex-col md:flex-row justify-between md:items-start mb-6 gap-4">
                  <div>
                    <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mb-2 ${
                      ['disponivel'].includes(f.status) ? 'bg-blue-900/50 text-blue-400 border border-blue-800' :
                      ['aceito', 'coleta'].includes(f.status) ? 'bg-purple-900/50 text-purple-400 border border-purple-800' :
                      ['em_transporte'].includes(f.status) ? 'bg-amber-900/50 text-amber-400 border border-amber-800' :
                      ['entregue', 'finalizado'].includes(f.status) ? 'bg-green-900/50 text-green-400 border border-green-800' :
                      'bg-red-900/50 text-red-400 border border-red-800'
                    }`}>
                      STATUS: {f.status.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-slate-500 font-mono mb-1">ID: {f.id}</p>
                    {/* 🔥 DATA E HORA INJETADAS AQUI */}
                    <p className="text-xs text-slate-400 font-bold flex items-center gap-1"><Calendar size={12}/> {formatarData(f.createdAt)}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Valor Total (Pago)</p>
                    <p className="text-xl font-black text-green-400">R$ {Number(f.valorTotal || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Cliente</p>
                    {/* 🔥 NOME REAL DO CLIENTE E WHATSAPP DESTACADO */}
                    <h2 className="text-white font-bold">{f.clienteNome || (f.clienteZap ? 'Cliente Registrado' : 'Anônimo')}</h2>
                    {f.clienteZap && (
                      <a href={`https://wa.me/55${f.clienteZap.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="inline-flex bg-green-900/30 border border-green-800 text-green-400 text-xs px-3 py-1 rounded-lg font-bold hover:bg-green-900/50 transition-colors mt-2">
                        WhatsApp: {f.clienteZap}
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Motorista Atribuído</p>
                    <h2 className="text-white font-bold">{f.motoristaNome || 'Aguardando Parceiro...'}</h2>
                    {f.motoristaZap && (
                      <a href={`https://wa.me/55${f.motoristaZap.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="inline-flex bg-blue-900/30 border border-blue-800 text-blue-400 text-xs px-3 py-1 rounded-lg font-bold hover:bg-blue-900/50 transition-colors mt-2">
                        WhatsApp: {f.motoristaZap}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {f.status === 'entregue' && (
                    <button onClick={() => forceStatus(f.id, 'finalizado')} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase transition-all">
                      Confirmar Repasse (Encerrar)
                    </button>
                  )}
                  {['aguardando_pagamento','erro_pagamento', 'disponivel'].includes(f.status) && (
                    <button onClick={() => forceStatus(f.id, 'cancelado')} className="bg-slate-800 hover:bg-red-900/50 text-red-400 border border-slate-700 px-6 py-3 rounded-xl font-black text-xs uppercase transition-all">
                      Forçar Cancelamento
                    </button>
                  )}
                  {f.comprovanteUrl && (
                    <a href={f.comprovanteUrl} target="_blank" rel="noreferrer" className="bg-slate-800 text-slate-300 hover:text-white border border-slate-700 px-6 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center gap-2">
                      <Search size={14}/> Ver Comprovante
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
