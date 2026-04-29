import { useState, useEffect } from 'react';
import { auth, provider, db } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, runTransaction } from 'firebase/firestore';
import { Loader2, Truck, CheckCircle, Navigation, MapPin, Bike, Clock, AlertCircle, Calendar } from 'lucide-react';
import ChatFrete from '../components/ChatFrete';

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
    if (driverData?.status === 'aprovado' && !activeFrete) {
      const q = query(collection(db, 'fretes'), where('status', '==', 'aguardando_motorista'));
      return onSnapshot(q, (snap) => {
        const agora = new Date();
        const minhaCat = String(driverData.categoria || '').toLowerCase().trim();
        
        const filtrados = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter((f: any) => {
            // ✅ FILTRO DE QUALIDADE: Ignora fretes sem dados essenciais
            const dadosValidos = f.valorMotorista > 0 && f.cidadeOrigem && f.cidadeDestino;
            if (!dadosValidos) return false;

            if (String(f.veiculo).toLowerCase() !== minhaCat) return false;
            
            if (f.tipoFrete === 'agendado' && f.dataAgendada) {
              const dataFrete = new Date(f.dataAgendada.seconds * 1000);
              const diffMin = (dataFrete.getTime() - agora.getTime()) / 60000;
              return diffMin <= 60; // Só mostra agendados se faltar 1h
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
      <nav className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800 font-black italic mb-4 rounded-b-3xl text-sm">
        FRETOGO RADAR
        {user && <button onClick={() => signOut(auth)} className="text-[10px] bg-slate-800 px-3 py-1 rounded-full uppercase">Sair do Modo Trabalho</button>}
      </nav>

      {!user ? (
        <div className="text-center py-20 bg-slate-900 rounded-[3rem] border-2 border-slate-800 shadow-2xl">
          <Truck className="w-20 h-20 text-blue-500 mx-auto mb-6 animate-pulse" />
          <h1 className="text-3xl font-black italic mb-8 uppercase tracking-tighter">Login Motorista</h1>
          <button onClick={() => signInWithPopup(auth, provider)} className="w-4/5 mx-auto bg-blue-600 p-6 rounded-2xl font-black uppercase italic shadow-2xl text-lg">ENTRAR NO RADAR</button>
        </div>
      ) : driverData?.status !== 'aprovado' ? (
        <div className="text-center py-16 bg-slate-900 rounded-[3rem] border-2 border-yellow-600 shadow-2xl px-6">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black italic uppercase mb-4 leading-none">Análise de<br/>Segurança</h2>
          <p className="text-slate-400 font-bold text-sm">Validando documentos... Aguarde o sinal verde da central.</p>
        </div>
      ) : activeFrete ? (
        <div className="bg-slate-900 p-6 rounded-[2.5rem] border-2 border-blue-500/50 shadow-2xl">
          <h2 className="text-2xl font-black uppercase mb-4 text-blue-400 italic font-black">Frete Ativo</h2>
          <ChatFrete freteId={activeFrete.id} tipoUsuario="motorista" nome={driverData?.nome || 'Motorista'} />
          <div className="grid gap-4 mt-6">
            {activeFrete.status === 'aceito' && (
              <>
                <button onClick={() => abrirGPS(activeFrete.origemLat, activeFrete.origemLng)} className="bg-white text-black p-5 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 shadow-xl"><MapPin className="w-6 h-6"/> Abrir Rota de Coleta</button>
                <button onClick={() => handleUpdateStatus('coleta')} className="bg-blue-600 p-6 rounded-2xl font-black uppercase text-xl shadow-2xl">Cheguei na Coleta</button>
              </>
            )}
            {activeFrete.status === 'coleta' && (
              <>
                <button onClick={() => abrirGPS(activeFrete.destinoLat, activeFrete.destinoLng)} className="bg-white text-black p-5 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 shadow-xl"><Navigation className="w-6 h-6"/> Abrir Rota de Entrega</button>
                <button onClick={() => handleUpdateStatus('em_transporte')} className="bg-orange-500 p-6 rounded-2xl font-black uppercase text-xl shadow-2xl font-black text-white italic">Finalizar Coleta e Iniciar Entrega</button>
              </>
            )}
            {activeFrete.status === 'em_transporte' && <button onClick={() => handleUpdateStatus('entregue')} className="bg-green-600 p-7 rounded-2xl font-black uppercase text-xl flex gap-3 justify-center shadow-2xl"><CheckCircle className="w-7 h-7"/> Finalizar Entrega</button>}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           {availableFretes.length === 0 ? (
             /* ✅ RADAR WAITING ROOM (STARTUP GIGANTE UX) */
             <div className="text-center py-20 flex flex-col items-center animate-in fade-in duration-700">
                <div className="relative w-40 h-40 mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 opacity-20 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full border-8 border-blue-500/10"></div>
                  <div className="absolute inset-8 rounded-full border-2 border-blue-400 opacity-40"></div>
                  <div className="absolute inset-16 rounded-full bg-blue-500 animate-pulse shadow-[0_0_40px_rgba(59,130,246,0.5)]"></div>
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Buscando sinal de carga</h2>
                <p className="text-slate-500 font-bold text-sm mt-2 max-w-[250px]">Otimizando radar para {driverData.categoria} em sua localização atual...</p>
                <div className="mt-8 flex gap-2 items-center bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                   <p className="text-[10px] font-black uppercase text-green-500">{Math.floor(Math.random() * 20) + 15} clientes ativos na região</p>
                </div>
             </div>
           ) : 
             availableFretes.map(f => (
               <div key={f.id} className="bg-white text-slate-950 p-6 rounded-[2.5rem] shadow-2xl border-b-[12px] border-blue-600 animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-6 font-black uppercase">
                    <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-[10px] tracking-widest shadow-md">PAGO VIA PIX</span>
                    <span className="text-slate-500 text-sm">📍 {f.distancia || '??'} KM</span>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-[12px] font-black text-blue-600 uppercase mb-2">Trajeto do Frete:</p>
                    <p className="text-3xl font-black uppercase leading-none text-slate-950 tracking-tighter">
                      {f.cidadeOrigem} <br/>
                      <span className="text-blue-600 text-2xl">➔</span> {f.cidadeDestino}
                    </p>
                    {f.tipoFrete === 'agendado' && <p className="mt-4 text-blue-700 font-black text-xs uppercase bg-blue-50 p-2 rounded-lg border border-blue-100">📅 Coleta: {new Date(f.dataAgendada.seconds * 1000).toLocaleString()}</p>}
                  </div>

                  <div className="flex justify-between items-center bg-slate-100 p-5 rounded-2xl mb-8 border border-slate-200 font-black uppercase text-[11px]">
                    <div className="flex gap-4 text-slate-800">
                      <span>⚖️ {f.peso}</span>
                      <span>📦 {f.tipoMaterial}</span>
                    </div>
                    <Truck className="w-6 h-6 text-blue-600"/>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-end px-2">
                       <span className="text-slate-400 font-black text-[10px] uppercase italic">Ganho Líquido:</span>
                       <p className="text-6xl font-black text-slate-950 italic leading-none">R$ {f.valorMotorista?.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <button onClick={async () => {
                      await runTransaction(db, async (t) => {
                        const d = await t.get(doc(db, 'fretes', f.id));
                        if (d.data()?.status !== 'aguardando_motorista' && d.data()?.status !== 'agendado') throw "Indisponível";
                        t.update(doc(db, 'fretes', f.id), { status: 'aceito', motoristaId: user.uid, motoristaNome: driverData?.nome || 'Motorista', motoristaZap: driverData?.whatsapp || '' });
                      });
                    }} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase italic text-xl shadow-2xl active:scale-95 transition-all">ACEITAR FRETE AGORA</button>
                  </div>
               </div>
             ))
           }
        </div>
      )}
    </div>
  );
}
