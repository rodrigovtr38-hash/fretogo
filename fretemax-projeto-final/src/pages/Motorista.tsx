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
            const dadosValidos = f.valorMotorista > 0 && f.cidadeOrigem && f.cidadeDestino;
            if (!dadosValidos) return false;
            if (String(f.veiculo).toLowerCase() !== minhaCat) return false;
            
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
      {/* BANNER DE INSTALAÇÃO (Desejo e Segurança) */}
      <div className="bg-blue-600 p-3 rounded-2xl mb-4 text-center shadow-lg animate-bounce">
         <p className="text-[10px] font-black uppercase tracking-tighter">📲 Instale o App para não perder fretes!</p>
      </div>

      <nav className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800 font-black italic mb-4 rounded-b-3xl text-sm">
        FRETOGO RADAR
        {user && <button onClick={() => signOut(auth)} className="text-[10px] bg-slate-800 px-3 py-1 rounded-full uppercase">Sair</button>}
      </nav>

      {!user ? (
        <div className="text-center py-20 bg-slate-900 rounded-[3rem] border-2 border-slate-800 shadow-2xl">
          <Truck className="w-20 h-20 text-blue-500 mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl font-black italic mb-8 uppercase tracking-tighter leading-none">Login<br/>Motorista</h1>
          <button onClick={() => signInWithPopup(auth, provider)} className="w-4/5 mx-auto bg-blue-600 p-6 rounded-2xl font-black uppercase italic shadow-2xl text-xl">ENTRAR NO RADAR</button>
        </div>
      ) : driverData?.status !== 'aprovado' ? (
        <div className="text-center py-16 bg-slate-900 rounded-[3rem] border-2 border-yellow-600 shadow-2xl px-6">
          <AlertCircle className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black italic uppercase mb-4 leading-none text-yellow-500">Análise de Segurança</h2>
          <p className="text-slate-200 font-black text-lg">Seus documentos estão sendo validados. Aguarde o sinal verde da central.</p>
        </div>
      ) : activeFrete ? (
        <div className="bg-slate-900 p-6 rounded-[2.5rem] border-2 border-blue-500/50 shadow-2xl">
          <h2 className="text-3xl font-black uppercase mb-4 text-blue-400 italic">Frete Ativo</h2>
          <ChatFrete freteId={activeFrete.id} tipoUsuario="motorista" nome={driverData?.nome || 'Motorista'} />
          <div className="grid gap-4 mt-6">
            {activeFrete.status === 'aceito' && (
              <>
                <button onClick={() => abrirGPS(activeFrete.origemLat, activeFrete.origemLng)} className="bg-white text-black p-6 rounded-2xl font-black uppercase text-lg flex items-center justify-center gap-3 shadow-xl"><MapPin className="w-8 h-8"/> GPS Coleta</button>
                <button onClick={() => handleUpdateStatus('coleta')} className="bg-blue-600 p-8 rounded-2xl font-black uppercase text-2xl shadow-2xl">Cheguei na Coleta</button>
              </>
            )}
            {activeFrete.status === 'coleta' && (
              <>
                <button onClick={() => abrirGPS(activeFrete.destinoLat, activeFrete.destinoLng)} className="bg-white text-black p-6 rounded-2xl font-black uppercase text-lg flex items-center justify-center gap-3 shadow-xl"><Navigation className="w-8 h-8"/> GPS Destino</button>
                <button onClick={() => handleUpdateStatus('em_transporte')} className="bg-orange-500 p-8 rounded-2xl font-black uppercase text-2xl shadow-2xl italic">Carga Embarcada</button>
              </>
            )}
            {activeFrete.status === 'em_transporte' && <button onClick={() => handleUpdateStatus('entregue')} className="bg-green-600 p-10 rounded-2xl font-black uppercase text-3xl flex gap-4 justify-center shadow-2xl"><CheckCircle className="w-10 h-10"/> Finalizar Entrega</button>}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           {availableFretes.length === 0 ? (
             <div className="text-center py-20 flex flex-col items-center">
                <div className="relative w-48 h-48 mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 opacity-20 animate-ping"></div>
                  <div className="absolute inset-16 rounded-full bg-blue-500 animate-pulse"></div>
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Buscando Carga...</h2>
                <p className="text-slate-400 font-bold text-lg mt-2">Radar otimizado para {driverData.categoria}</p>
             </div>
           ) : 
             availableFretes.map(f => (
               <div key={f.id} className="bg-white text-slate-950 p-6 rounded-[2.5rem] shadow-2xl border-b-[16px] border-blue-600">
                  <div className="flex justify-between items-center mb-6 font-black uppercase">
                    <span className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs tracking-widest">PAGO VIA PIX</span>
                    <span className="text-slate-500 text-lg">📍 {f.distancia} KM</span>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-sm font-black text-blue-600 uppercase mb-2">Trajeto:</p>
                    <p className="text-5xl font-black uppercase leading-none tracking-tighter">
                      {f.cidadeOrigem} <br/>
                      <span className="text-blue-600 text-3xl">➔</span> {f.cidadeDestino}
                    </p>
                  </div>

                  <div className="bg-slate-100 p-6 rounded-2xl mb-8 border border-slate-200 font-black uppercase text-lg">
                    <div className="flex gap-8 text-slate-800">
                      <span>⚖️ {f.peso}</span>
                      <span>📦 {f.tipoMaterial}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <p className="text-slate-400 font-black text-sm uppercase italic">Seu ganho líquido:</p>
                    <p className="text-8xl font-black text-slate-950 italic leading-none mb-4">R$ {f.valorMotorista?.toFixed(2).replace('.', ',')}</p>
                    <button onClick={async () => {
                      await runTransaction(db, async (t) => {
                        const d = await t.get(doc(db, 'fretes', f.id));
                        if (d.data()?.status !== 'aguardando_motorista' && d.data()?.status !== 'agendado') throw "Indisponível";
                        t.update(doc(db, 'fretes', f.id), { status: 'aceito', motoristaId: user.uid, motoristaNome: driverData?.nome || 'Motorista', motoristaZap: driverData?.whatsapp || '' });
                      });
                    }} className="w-full bg-slate-900 text-white py-8 rounded-3xl font-black uppercase italic text-2xl shadow-2xl">ACEITAR CARGA AGORA</button>
                  </div>
               </div>
             ))
           }
        </div>
      )}
    </div>
  );
}
