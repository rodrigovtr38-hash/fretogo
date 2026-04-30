import { useState, useEffect } from 'react';
import { auth, provider, db } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Loader2, Truck, CheckCircle, Navigation, MapPin, AlertCircle, ShieldCheck, UserPlus } from 'lucide-react';
import ChatFrete from '../components/ChatFrete';

export default function Motorista() {
  const [user, setUser] = useState<any>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [availableFretes, setAvailableFretes] = useState<any[]>([]);
  const [activeFrete, setActiveFrete] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados para o Formulário de Cadastro
  const [form, setForm] = useState({ nome: '', whatsapp: '', placa: '', categoria: 'carro_pequeno' });
  const [formStep, setFormStep] = useState(false);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        onSnapshot(query(collection(db, 'motoristas_cadastros'), where('email', '==', u.email)), (s) => {
          if (!s.empty) {
            setDriverData(s.docs[0].data());
            setFormStep(false);
          } else {
            setFormStep(true); // Se não achou dados, obriga o cadastro
          }
        });
        onSnapshot(query(collection(db, 'fretes'), where('motoristaId', '==', u.uid)), (s) => {
          const ativo = s.docs.map(d => ({id: d.id, ...d.data()})).find((f: any) => ['aceito', 'coleta', 'em_transporte'].includes(f.status));
          setActiveFrete(ativo);
          setLoading(false);
        });
      } else { setUser(null); setLoading(false); }
    });
  }, []);

  // Lógica de Validação de Placa (Mercosul e Antiga)
  const validarPlaca = (p: string) => {
    const regex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
    return regex.test(p.toUpperCase().replace('-', ''));
  };

  const handleCadastro = async () => {
    if (!form.nome || !form.whatsapp || !validarPlaca(form.placa)) {
      alert("Por favor, preencha todos os campos corretamente. Verifique a placa (Ex: ABC1D23).");
      return;
    }
    await setDoc(doc(db, 'motoristas_cadastros', user.uid), {
      ...form,
      email: user.email,
      status: 'pendente',
      createdAt: serverTimestamp()
    });
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center animate-pulse shadow-[0_0_50px_rgba(37,99,235,0.4)]">
        <Truck className="text-white w-12 h-12" />
      </div>
      <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4">
      {/* LOGO CENTRALIZADA E NITIDA */}
      <nav className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800 font-black italic mb-4 rounded-b-3xl text-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
             <Truck className="text-white w-5 h-5" /> 
          </div>
          FRETOGO RADAR
        </div>
        {user && <button onClick={() => signOut(auth)} className="text-[10px] bg-slate-800 px-3 py-1 rounded-full uppercase">Sair</button>}
      </nav>

      {/* 1. LOGIN */}
      {!user ? (
        <div className="text-center py-20 bg-slate-900 rounded-[3rem] border-2 border-slate-800 shadow-2xl">
          <Truck className="w-20 h-20 text-blue-500 mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl font-black italic mb-8 uppercase tracking-tighter leading-none">Login<br/>Motorista</h1>
          <button onClick={() => signInWithPopup(auth, provider)} className="w-4/5 mx-auto bg-blue-600 p-6 rounded-2xl font-black uppercase italic shadow-2xl text-xl">ENTRAR NO RADAR</button>
        </div>
      ) : 
      
      /* 2. OBRIGAR CADASTRO (Ajuste onde seu tio travou) */
      formStep ? (
        <div className="bg-white text-slate-950 p-8 rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus className="text-blue-600 w-8 h-8" />
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Finalizar Cadastro</h2>
          </div>
          <div className="space-y-4">
            <input className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-2 border-transparent focus:border-blue-600 outline-none" placeholder="Nome Completo" onChange={e => setForm({...form, nome: e.target.value})} />
            <input className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-2 border-transparent focus:border-blue-600 outline-none" placeholder="WhatsApp (DDD)" onChange={e => setForm({...form, whatsapp: e.target.value})} />
            <input className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-2 border-transparent focus:border-blue-600 outline-none uppercase" placeholder="Placa do Veículo (ABC1D23)" onChange={e => setForm({...form, placa: e.target.value})} />
            <select className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-2 border-transparent focus:border-blue-600 outline-none" onChange={e => setForm({...form, categoria: e.target.value})}>
              <option value="carro_pequeno">Carro Pequeno</option>
              <option value="utilitario">Utilitário</option>
              <option value="truck">Caminhão Truck</option>
              <option value="bi_trem_cegonha">Bi-trem / Cegonha</option>
            </select>
            <button onClick={handleCadastro} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase italic text-lg shadow-xl mt-4">Enviar para Análise</button>
          </div>
        </div>
      ) :

      /* 3. ANÁLISE DE SEGURANÇA */
      driverData?.status !== 'aprovado' ? (
        <div className="text-center py-16 bg-slate-900 rounded-[3rem] border-2 border-yellow-600 shadow-2xl px-6 animate-in zoom-in">
          <AlertCircle className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black italic uppercase mb-4 leading-none text-yellow-500">Análise de Segurança</h2>
          <p className="text-slate-200 font-black text-lg">Olá, {driverData?.nome}. Seus dados estão em validação. Verificaremos sua placa: <span className="text-blue-400 uppercase">{driverData?.placa}</span>.</p>
        </div>
      ) : 

      /* 4. FRETE ATIVO OU RADAR */
      activeFrete ? (
        <div className="bg-slate-900 p-6 rounded-[2.5rem] border-2 border-blue-500/50 shadow-2xl">
          <h2 className="text-3xl font-black uppercase mb-4 text-blue-400 italic">Frete Ativo</h2>
          <ChatFrete freteId={activeFrete.id} tipoUsuario="motorista" nome={driverData?.nome || 'Motorista'} />
        </div>
      ) : (
        /* RADAR (WAITING ROOM) COM LOGO ANIMADA */
        <div className="text-center py-20 flex flex-col items-center">
            <div className="relative w-48 h-48 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 opacity-20 animate-ping"></div>
              <div className="absolute inset-8 rounded-3xl bg-blue-600 flex items-center justify-center shadow-[0_0_60px_rgba(37,99,235,0.6)]">
                 <Truck className="text-white w-20 h-20 animate-bounce" />
              </div>
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Buscando Carga...</h2>
            <p className="text-slate-400 font-bold text-lg mt-2">Radar otimizado para {driverData?.categoria}</p>
        </div>
      )}
    </div>
  );
}
