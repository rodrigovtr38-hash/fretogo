// =========================================================
// NOME DO ARQUIVO: src/components/ChatFrete.tsx
// CTO-Log: Lote 06 - Remoção de Spoofing de Admin.
// Status: Frontend agora apenas lê mensagens sistêmicas. Autoridade revogada.
// =========================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp, DocumentData } from 'firebase/firestore';
import { Loader2, Send, ShieldAlert, Zap, Radio } from 'lucide-react';
import { db } from '../firebase';
import { useFTI } from '../core/ai/hooks/useFTI';

interface ChatFreteProps {
  freteId: string;
  nome: string;
  tipoUsuario: 'cliente' | 'motorista' | 'admin';
}

interface ChatMessage {
  id: string;
  texto: string;
  nome: string;
  tipoUsuario: 'cliente' | 'motorista' | 'admin';
  createdAt?: unknown; 
}

export default function ChatFrete({ freteId, nome, tipoUsuario }: ChatFreteProps) {
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { interactWithAI, isProcessing } = useFTI({
    userId: freteId,
    user: { uid: nome, role: tipoUsuario, name: nome },
    appState: { currentRoute: 'ChatOperacional' }
  });

  useEffect(() => {
    if (!freteId) return;

    const messagesRef = collection(db, 'fretes', freteId, 'chat');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DocumentData; 
          next.push({
            id: docSnap.id,
            texto: data.texto || '',
            nome: data.nome || 'Usuário',
            tipoUsuario: data.tipoUsuario || 'motorista',
            createdAt: data.createdAt,
          });
        });
        setMessages(next);
        setLoading(false);
      },
      (error) => {
        console.error('CHAT REALTIME ERROR:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [freteId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!mensagem.trim() || sending) return;

    try {
      setSending(true);
      const textoUsuario = mensagem.trim();

      // 1. Grava APENAS a mensagem humana legítima no banco (com o tipoUsuario real do app)
      await addDoc(collection(db, 'fretes', freteId, 'chat'), {
        texto: textoUsuario,
        nome,
        tipoUsuario,
        createdAt: serverTimestamp(),
      });
      
      setMensagem('');

      // 2. Dispara a requisição para a IA no backend.
      // A gravação da resposta da IA no Firestore agora é responsabilidade EXCLUSIVA da Cloud Function.
      // O app não forja mais mensagens com tipoUsuario: 'admin'.
      if (interactWithAI) {
        await interactWithAI(textoUsuario);
      }

    } catch (error) {
      console.error('SEND CHAT ERROR:', error);
    } finally {
      setSending(false);
    }
  }, [freteId, mensagem, nome, sending, tipoUsuario, interactWithAI]);

  return (
    <div className="flex flex-col h-full rounded-[2rem] border border-cyan-500/20 bg-slate-900 shadow-2xl backdrop-blur-xl overflow-hidden">
      
      {/* HEADER DO CHAT */}
      <div className="border-b border-white/5 bg-slate-950/50 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-cyan-400">
            Canal Operacional
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Monitorado pela Torre de Controle Fretogo.
          </p>
        </div>
        <ShieldAlert size={18} className="text-slate-600" />
      </div>

      {/* ÁREA DE MENSAGENS */}
      <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar min-h-[300px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-cyan-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center opacity-50">
            <ShieldAlert className="mb-2 h-8 w-8 text-slate-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Canal Livre
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              
              if (message.tipoUsuario === 'admin' || message.nome.includes('Torre')) {
                 return (
                   <div key={message.id} className="flex justify-center my-3 animate-in fade-in zoom-in duration-300">
                     <div className="bg-slate-950 border border-cyan-500/30 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center gap-2 max-w-[95%]">
                       <Radio size={14} className="text-amber-400 animate-pulse" />
                       <p className="text-[10px] font-black text-slate-300 tracking-wide text-center">
                         {message.texto}
                       </p>
                     </div>
                   </div>
                 );
              }

              const isOwn = message.tipoUsuario === tipoUsuario;
              return (
                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                      isOwn
                        ? 'bg-cyan-500 text-slate-950 rounded-br-sm'
                        : 'bg-slate-800 border border-white/5 text-white rounded-bl-sm'
                    }`}
                  >
                    <p className={`mb-1 text-[9px] font-black uppercase tracking-[0.15em] ${isOwn ? 'text-slate-800' : 'text-cyan-400'}`}>
                      {message.nome}
                    </p>
                    <p className="text-sm font-semibold leading-relaxed">
                      {message.texto}
                    </p>
                  </div>
                </div>
              );
            })}
            {isProcessing && (
               <div className="flex justify-center my-3">
                 <div className="bg-slate-950 border border-cyan-500/20 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                   <Loader2 size={12} className="text-cyan-400 animate-spin" />
                   <p className="text-[10px] font-bold text-cyan-300 tracking-wide">IA Avaliando...</p>
                 </div>
               </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="border-t border-white/5 bg-slate-950/30 p-4">
        <div className="flex gap-3">
          <input
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Mensagem para a operação..."
            className="flex-1 rounded-[1.2rem] border border-white/10 bg-slate-950 px-5 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || isProcessing || !mensagem.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300 hover:scale-105 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
}
