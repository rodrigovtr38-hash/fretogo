import { useState, useEffect } from 'react';
import { auth, provider, db } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, runTransaction } from 'firebase/firestore';
import { Loader2, Truck, CheckCircle, Navigation, MapPin, Bike, Clock, AlertCircle, Calendar } from 'lucide-react';
import ChatFrete from '../components/ChatFrete'; // ✅ Importado

export default function Motorista() {
  const [user, setUser] = useState<any>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [availableFretes, setAvailableFretes] = useState<any[]>([]);
  const [activeFrete, setActiveFrete] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        onSnapshot(query(collection(db, 'motoristas_cadastros'), where('email', '==', u.email)), (s) => {
          if (!s.empty) setDriverData(s.docs[0].data());
        });
        onSnapshot(query(collection(db, 'fretes'), where('motoristaId', '==', u.uid)), (s) => {
          const ativo = s.docs.map(d => ({id: d.id, ...d.data()})).find((f: any) => ['aceito', 'coleta', 'em_transporte'].includes(f.status));
          setActiveFrete(ativo);
          setLoading(false);
        });
      } else { setUser(null); setLoading(false); }
    });
  }, []);

  useEffect(() => {
    // ✅ RADAR INTELIGENTE (FILTRO DE TEMPO PARA AGENDADOS)
    if (driverData?.status === 'aprovado' && !activeFrete) {
      const q = query(collection(db, 'fretes'), where('status', '==', 'aguardando_motorista'));
      return onSnapshot(q, (snap) => {
        const agora = new Date();
        const minhaCat = String(driverData.categoria || '').toLowerCase().trim();
        
        const filtrados = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter((f: any) => {
            // 1. Categoria deve bater
            if (String(f.veiculo).toLowerCase() !== minhaCat) return false;
            
            // 2. Se for agendado, só mostra se faltar menos de 60 minutos
            if (f.tipoFrete === 'agendado' && f.dataAgendada) {
              const dataFrete = new Date(f.dataAgendada.seconds * 1000);
              const diffMin = (dataFrete.getTime() - agora.getTime()) / 60000;
              return diffMin <= 60;
            }
            return true;
          });
        setAvailableFretes(filtrados);
      });
    }
  }, [driverData, activeFrete]);

  const handleUpdateStatus = async (s: string) => {
    if (activeFrete) await setDoc(doc(db, 'fretes', activeFrete.id), { status: s }, { merge: true });
  };

  const abrirGPS = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-12 h-12" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4">
      <nav className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800 font-black italic mb-4 rounded-b-3xl">
        FRETOGO 
        {user && <button onClick={() => signOut(auth)} className="text-[10px] bg-slate-800 px-3 py-1 rounded-full">SAIR</button>}
      </nav>

      {!user ? (
        <div className="text-center py-20 bg-slate-900 rounded-[3rem] border-2 border-slate-800 shadow-2xl">
          <Truck className="w-20 h-20 text-blue-500 mx-auto mb-6 animate-pulse" />
          <h1 className="text-3xl font-black italic mb-8 uppercase tracking-tighter">Painel de Cargas</h1>
          <button onClick={() => signInWithPopup(auth, provider)} className="w-4/5 mx-auto bg-blue-600 p-6 rounded-2xl font-black uppercase italic shadow-2xl text-lg">ENTRAR NO RADAR</button>
        </div>
      ) : driverData?.status !== 'aprovado' ? (
        <div className="text-center py-16 bg-slate-900 rounded-[3rem] border-2 border-yellow-600 shadow-2xl px-6">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black italic uppercase mb-4">Cadastro em Análise</h2>
          <p className="text-slate-400 font-bold text-sm">Validando documentos... Você será notificado para aceitar fretes.</p>
        </div>
      ) : activeFrete ? (
        <div className="bg-slate-900 p-6 rounded-[2.5rem] border-2 border-blue-500/50 shadow-2xl animate-in zoom-in">
          <h2 className="text-2xl font-black uppercase mb-6 text-blue-400 italic font-black">Carga Ativa</h2>
          
          {/* ✅ CHAT NO MOTORISTA */}
          <ChatFrete freteId={activeFrete.id} tipoUsuario="motorista" nome={driverData?.nome || 'Motorista'} />

          <div className="grid gap-4 mt-6">
            {activeFrete.status === 'aceito' && (
              <>
                <button onClick={() => abrirGPS(activeFrete.origemLat, activeFrete.origemLng)} className="bg-white text-black p-5 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 shadow-xl"><MapPin className="w-6 h-6"/> Rota de Coleta</button>
                <button onClick={() => handleUpdateStatus('coleta')} className="bg-blue-600 p-6 rounded-2xl font-black uppercase text-xl shadow-2xl">Cheguei na Coleta</button>
              </>
            )}
            {activeFrete.status === 'coleta' && (
              <>
                <button onClick={() => abrirGPS(activeFrete.destinoLat, activeFrete.destinoLng)} className="bg-white text-black p-5 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 shadow-xl"><Navigation className="w-6 h-6"/> Rota de Entrega</button>
                <button onClick={() => handleUpdateStatus('em_transporte')} className="bg-orange-500 p-6 rounded-2xl font-black uppercase text-xl shadow-2xl font-black text-white">Finalizar Coleta e Iniciar Entrega</button>
              </>
            )}
            {activeFrete.status === 'em_transporte' && <button onClick={() => handleUpdateStatus('entregue')} className="bg-green-600 p-7 rounded-2xl font-black uppercase text-xl flex gap-3 justify-center shadow-2xl"><CheckCircle className="w-7 h-7"/> Finalizar Entrega</button>}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           {availableFretes.length === 0 ? <p className="text-center text-slate-600 italic mt-20 font-black uppercase text-xs tracking-widest animate-pulse">Radar buscando fretes de {driverData.categoria}...</p> : 
             availableFretes.map(f => (
               <div key={f.id} className="bg-white text-slate-950 p-6 rounded-[2.5rem] shadow-2xl border-b-[12px] border-blue-600 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-6 font-black uppercase">
                    <span className="bg-green-600 text-white px-4 py-1 rounded-lg text-xs tracking-widest shadow-md">PAGO VIA PIX</span>
                    {f.tipoFrete === 'agendado' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px]">AGENDADO</span>}
                    <span className="text-slate-500 text-sm">📍 {f.distancia || '??'} KM</span>
                  </div>
                  
                  <div className="mb-8">
                    <p className="text-[12px] font-black text-blue-600 uppercase mb-2 tracking-widest">Trajeto do Frete:</p>
                    <p className="text-4xl font-black uppercase leading-none text-slate-950 tracking-tighter">
                      {f.coleta?.bairro || 'ORIGEM'} <br/>
                      <span className="text-blue-600">➔</span> {f.entrega?.bairro || 'DESTINO'}
                    </p>
                    {f.tipoFrete === 'agendado' && <p className="mt-3 text-blue-600 font-black text-xs uppercase">📅 Coleta em: {new Date(f.dataAgendada.seconds * 1000).toLocaleString()}</p>}
                  </div>

                  <div className="flex justify-between items-center bg-slate-100 p-5 rounded-2xl mb-8 border border-slate-200 font-black uppercase text-sm">
                    <div className="flex gap-6 text-slate-800">
                      <span>⚖️ {f.peso || 'N/A'}</span>
                      <span>📦 {f.tipoMaterial || 'CARGA'}</span>
                    </div>
                    {f.veiculo === 'bi_trem_cegonha' || f.veiculo === 'carreta_ls' ? <Truck className="w-7 h-7 text-blue-600"/> : f.veiculo === 'moto' ? <Bike className="w-7 h-7 text-blue-600"/> : <Truck className="w-7 h-7 text-blue-600"/>}
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-end px-2">
                       <span className="text-slate-400 font-black text-xs uppercase italic">Seu ganho:</span>
                       <p className="text-6xl font-black text-slate-950 italic leading-none">R$ {f.valorMotorista?.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <button onClick={async () => {
                      await runTransaction(db, async (t) => {
                        const d = await t.get(doc(db, 'fretes', f.id));
                        if (d.data()?.status !== 'aguardando_motorista' && d.data()?.status !== 'agendado') throw "Carga indisponível";
                        t.update(doc(db, 'fretes', f.id), { status: 'aceito', motoristaId: user.uid, motoristaNome: driverData?.nome || 'Motorista', motoristaZap: driverData?.whatsapp || '' });
                      });
                    }} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase italic text-xl shadow-2xl active:scale-95 transition-all">ACEITAR AGORA</button>
                  </div>
               </div>
             ))
           }
        </div>
      )}
    </div>
  );
}
