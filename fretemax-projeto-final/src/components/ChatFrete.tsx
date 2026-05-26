// src/components/ChatFrete.tsx

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

import {
  Loader2,
  Send,
} from 'lucide-react';

import { db } from '../firebase';

interface ChatFreteProps {
  freteId: string;

  nome: string;

  tipoUsuario:
    | 'cliente'
    | 'motorista'
    | 'admin';
}

interface ChatMessage {
  id: string;

  texto: string;

  nome: string;

  tipoUsuario:
    | 'cliente'
    | 'motorista'
    | 'admin';

  createdAt?: any;
}

export default function ChatFrete({
  freteId,
  nome,
  tipoUsuario,
}: ChatFreteProps) {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    mensagem,
    setMensagem,
  ] = useState('');

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    messages,
    setMessages,
  ] = useState<
    ChatMessage[]
  >([]);

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /*
  =========================================================
  REALTIME
  =========================================================
  */

  useEffect(() => {
    if (!freteId) {
      return;
    }

    const messagesRef =
      collection(
        db,
        'fretes',
        freteId,
        'chat',
      );

    const q = query(
      messagesRef,
      orderBy(
        'createdAt',
        'asc',
      ),
      limit(100),
    );

    const unsubscribe =
      onSnapshot(
        q,

        snapshot => {
          const next: ChatMessage[] =
            [];

          snapshot.forEach(
            docSnap => {
              next.push({
                id: docSnap.id,
                ...(docSnap.data() as any),
              });
            },
          );

          setMessages(next);

          setLoading(false);
        },

        error => {
          console.error(
            'CHAT REALTIME ERROR:',
            error,
          );

          setLoading(false);
        },
      );

    return () => {
      unsubscribe();
    };
  }, [freteId]);

  /*
  =========================================================
  AUTO SCROLL
  =========================================================
  */

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior: 'smooth',
      },
    );
  }, [messages]);

  /*
  =========================================================
  SEND MESSAGE
  =========================================================
  */

  const sendMessage =
    useCallback(async () => {
      if (
        !mensagem.trim() ||
        sending
      ) {
        return;
      }

      try {
        setSending(true);

        await addDoc(
          collection(
            db,
            'fretes',
            freteId,
            'chat',
          ),
          {
            texto:
              mensagem.trim(),

            nome,

            tipoUsuario,

            createdAt:
              serverTimestamp(),
          },
        );

        setMensagem('');
      } catch (error) {
        console.error(
          'SEND CHAT ERROR:',
          error,
        );
      } finally {
        setSending(false);
      }
    }, [
      freteId,
      mensagem,
      nome,
      sending,
      tipoUsuario,
    ]);

  /*
  =========================================================
  UI
  =========================================================
  */

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl">

      <div className="border-b border-white/5 px-6 py-5">

        <h2 className="text-lg font-black text-white">
          Chat Operacional
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Comunicação realtime da operação.
        </p>

      </div>

      <div className="h-[360px] overflow-y-auto px-5 py-5">

        {loading ? (
          <div className="flex h-full items-center justify-center">

            <Loader2 className="animate-spin text-cyan-400" />

          </div>
        ) : messages.length ===
          0 ? (
          <div className="flex h-full items-center justify-center">

            <p className="text-sm text-slate-500">
              Nenhuma mensagem operacional.
            </p>

          </div>
        ) : (
          <div className="space-y-4">

            {messages.map(
              message => {
                const isOwn =
                  message.tipoUsuario ===
                  tipoUsuario;

                return (
                  <div
                    key={
                      message.id
                    }
                    className={`flex ${
                      isOwn
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        isOwn
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-950 text-white'
                      }`}
                    >

                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                        {
                          message.nome
                        }
                      </p>

                      <p className="text-sm font-semibold leading-relaxed">
                        {
                          message.texto
                        }
                      </p>

                    </div>

                  </div>
                );
              },
            )}

            <div ref={bottomRef} />

          </div>
        )}

      </div>

      <div className="border-t border-white/5 p-5">

        <div className="flex gap-3">

          <input
            value={mensagem}
            onChange={e =>
              setMensagem(
                e.target.value,
              )
            }
            onKeyDown={e => {
              if (
                e.key ===
                'Enter'
              ) {
                sendMessage();
              }
            }}
            placeholder="Mensagem operacional..."
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold text-white outline-none"
          />

          <button
            type="button"
            onClick={
              sendMessage
            }
            disabled={sending}
            className="flex h-[56px] w-[56px] items-center justify-center rounded-2xl bg-cyan-500 text-slate-950 transition-all duration-300 hover:bg-cyan-400 disabled:opacity-40"
          >

            {sending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send size={18} />
            )}

          </button>

        </div>

      </div>

    </div>
  );
}
