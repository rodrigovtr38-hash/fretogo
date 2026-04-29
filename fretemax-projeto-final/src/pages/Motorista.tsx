// Substitua o conteúdo de Motorista.tsx
import { useState, useEffect } from 'react';
import { auth, provider, db } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, runTransaction } from 'firebase/firestore';
import { Loader2, Truck, CheckCircle, Navigation, MapPin, Bike, Clock } from 'lucide-react';

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
      } else { setLoading(false); }
    });
  }, []);

  useEffect(() => {
    if (driverData?.status === 'aprovado' && !activeFrete) {
      return onSnapshot(query(collection(db, 'fretes'), where('status', '==', 'aguardando_motorista')), (s) => {
        const minhaCat = String(driverData.categoria || '').toLowerCase().trim();
        setAvailableFretes(s.docs.map(d => ({id: d.id, ...d.data()})).filter((f: any) => String(f.veiculo).toLowerCase() === minhaCat));
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
      {!user ? (
        <div className="text-center py-20">
          <Truck className="w-16 h-16 text-blue-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black italic mb-6 uppercase">Operação Motorista</h1>
          <button onClick={() => signInWithPopup(auth, provider)} className="w-full bg-blue-600 p-5 rounded-2xl font-black uppercase italic shadow-xl">Entrar no Radar</button>
        </div>
      ) : activeFrete ? (
        <div className="bg-slate-900 p-6 rounded-[2rem] border border-blue-500/30 shadow-2xl">
          <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500"/> Carga Ativa</h2>
          <div className="grid gap-3">
            {activeFrete.status === 'aceito' && (
              <>
                <button onClick={() => abrirGPS(activeFrete.origemLat, activeFrete.origemLng)} className="bg-white text-black p-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2"><MapPin className="w-4 h-4"/> Rota até a Coleta</button>
                <button onClick={() => handleUpdateStatus('coleta')} className="bg-blue-600 p-5 rounded-xl font-black uppercase text-sm">Cheguei na Coleta</button>
              </>
            )}
            {activeFrete.status === 'coleta' && (
              <>
                <button onClick={() => abrirGPS(activeFrete.destinoLat, activeFrete.destinoLng)} className="bg-white text-black p-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2"><Navigation className="w-4 h-4"/> Rota até o Destino</button>
                <button onClick={() => handleUpdateStatus('em_transporte')} className="bg-orange-500 p-5 rounded-xl font-black uppercase text-sm">Iniciar Transporte</button>
              </>
            )}
            {activeFrete.status === 'em_transporte' && <button onClick={() => handleUpdateStatus('entregue')} className="bg-green-600 p-5 rounded-xl font-black uppercase text-sm flex gap-2 justify-center"><CheckCircle className="w-4 h-4"/> Finalizar Entrega</button>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
           {availableFretes.length === 0 ? <p className="text-center text-slate-500 italic mt-20">Buscando cargas para {driverData?.categoria}...</p> : 
             availableFretes.map(f => (
               <div key={f.id} className="bg-white text-black p-6 rounded-[2.5rem] shadow-xl border-b-[8px] border-blue-600">
                  <div className="flex justify-between items-center mb-4 text-[10px] font-black uppercase">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">PAGO</span>
                    <span className="text-slate-400">📍 {f.distancia}km</span>
                  </div>
                  <p className="text-lg font-black uppercase leading-tight mb-4">{f.coleta?.bairro} → {f.entrega?.bairro}</p>
                  <p className="text-4xl font-black italic mb-4">R$ {f.valorMotorista?.toFixed(2).replace('.', ',')}</p>
                  <button onClick={async () => {
                    await runTransaction(db, async (t) => {
                      const d = await t.get(doc(db, 'fretes', f.id));
                      if (d.data()?.status !== 'aguardando_motorista') throw "Indisponível";
                      t.update(doc(db, 'fretes', f.id), { status: 'aceito', motoristaId: user.uid, motoristaNome: driverData.nome, motoristaZap: driverData.whatsapp });
                    });
                  }} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black italic uppercase">Aceitar Frete</button>
               </div>
             ))
           }
        </div>
      )}
    </div>
  );
}
