import { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Send } from 'lucide-react';

export default function ChatFrete({ freteId, tipoUsuario, nome }: any) {
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [texto, setTexto] = useState('');
  const bottomRef = useRef<any>(null);

  useEffect(() => {
    if (!freteId) return;
    const q = query(collection(db, 'fretes', freteId, 'mensagens'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMensagens(snap.docs.map(d => d.data()));
    });
    return () => unsub();
  }, [freteId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const enviarMensagem = async () => {
    if (!texto.trim()) return;
    await addDoc(collection(db, 'fretes', freteId, 'mensagens'), {
      texto, enviadoPor: tipoUsuario, nome, createdAt: serverTimestamp()
    });
    setTexto('');
  };

  return (
    <div className="flex flex-col h-[300px] bg-slate-50 rounded-2xl border-2 border-slate-200 overflow-hidden mt-4 shadow-inner">
      <div className="bg-slate-200 p-2 text-[10px] font-black uppercase text-center text-slate-500">Chat Interno Seguro</div>
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        {mensagens.map((m, i) => (
          <div key={i} className={`max-w-[85%] p-3 rounded-2xl text-sm font-bold ${m.enviadoPor === tipoUsuario ? 'bg-blue-600 text-white ml-auto' : 'bg-white text-slate-900 shadow-sm border border-slate-100'}`}>
            <p className="text-[9px] opacity-70 mb-1">{m.nome}</p>
            {m.texto}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 bg-white border-t flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Combinar detalhes..." className="flex-1 p-3 rounded-xl border-2 border-slate-100 text-slate-900 font-bold outline-none focus:border-blue-400" />
        <button onClick={enviarMensagem} className="bg-blue-600 text-white p-3 rounded-xl shadow-lg active:scale-90 transition-transform"><Send className="w-5 h-5"/></button>
      </div>
    </div>
  );
}
