import {
  useEffect,
  useState,
  useRef,
  useCallback,
  memo,
} from 'react';

import { db } from '../firebase';

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  limit,
} from 'firebase/firestore';

import {
  Send,
  ShieldCheck,
  Loader2,
  Radio,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

interface ChatMessage {
  texto: string;
  enviadoPor: string;
  nome: string;
  createdAt?: any;
}

interface ChatFreteProps {
  freteId: string;
  tipoUsuario: string;
  nome: string;
}

/* =========================================================
   COMPONENT
========================================================= */

function ChatFrete({
  freteId,
  tipoUsuario,
  nome,
}: ChatFreteProps) {
  const [mensagens, setMensagens] =
    useState<ChatMessage[]>([]);

  const [texto, setTexto] =
    useState('');

  const [sending, setSending] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  /* =========================================================
     REALTIME
  ========================================================= */

  useEffect(() => {
    if (!freteId) return;

    const q = query(
      collection(
        db,
        'fretes',
        freteId,
        'mensagens',
      ),

      orderBy(
        'createdAt',
        'asc',
      ),

      limit(80),
    );

    const unsub =
      onSnapshot(
        q,
        (snap) => {
          const data =
            snap.docs.map(
              (d) =>
                d.data() as ChatMessage,
            );

          setMensagens(data);

          setLoading(false);
        },

        () => {
          setLoading(false);
        },
      );

    return () => unsub();
  }, [freteId]);

  /* =========================================================
     AUTO SCROLL
  ========================================================= */

  useEffect(() => {
    const timeout =
      setTimeout(() => {
        bottomRef.current?.scrollIntoView(
          {
            behavior:
              'smooth',
          },
        );
      }, 80);

    return () =>
      clearTimeout(timeout);
  }, [mensagens]);

  /* =========================================================
     SEND
  ========================================================= */

  const enviarMensagem =
    useCallback(async () => {
      if (
        !texto.trim() ||
        sending
      ) {
        return;
      }

      const sanitized =
        texto
          .trim()
          .slice(0, 500);

      if (!sanitized)
        return;

      setSending(true);

      try {
        await addDoc(
          collection(
            db,
            'fretes',
            freteId,
            'mensagens',
          ),
          {
            texto:
              sanitized,

            enviadoPor:
              tipoUsuario,

            nome,

            createdAt:
              serverTimestamp(),
          },
        );

        setTexto('');

        inputRef.current?.focus();
      } catch (e) {
        console.error(
          'Erro chat:',
          e,
        );
      } finally {
        setSending(false);
      }
    }, [
      texto,
      sending,
      freteId,
      tipoUsuario,
      nome,
    ]);

  /* =========================================================
     ENTER SEND
  ========================================================= */

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      e.key === 'Enter'
    ) {
      e.preventDefault();

      enviarMensagem();
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="glass-card relative mt-6 flex h-[360px] flex-col overflow-hidden border border-white/10 bg-slate-950/95 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">

      {/* HEADER */}

      <div className="relative flex items-center justify-between border-b border-white/5 bg-slate-900/90 px-5 py-4 backdrop-blur-xl">

        <div className="flex items-center gap-3">

          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">

            <Radio className="h-4 w-4 text-cyan-300" />

            <div className="absolute inset-0 rounded-2xl border border-cyan-400/20 radar-pulse" />

          </div>

          <div>

            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
              Canal Operacional
            </p>

            <p className="mt-1 text-xs font-bold text-slate-400">
              Comunicação protegida em tempo real
            </p>

          </div>

        </div>

        <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 md:flex">

          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />

          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">
            Seguro
          </span>

        </div>

      </div>

      {/* MESSAGES */}

      <div className="relative flex-1 overflow-y-auto px-4 py-5">

        {/* ambient */}

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.05),transparent_60%)]" />

        {loading ? (
          <div className="flex h-full flex-col items-center justify-center">

            <div className="relative mb-5">

              <div className="absolute inset-0 rounded-full border border-cyan-400/20 radar-pulse" />

              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />

            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
              Sincronizando mensagens
            </p>

          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">

            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">

              <Radio className="h-6 w-6 text-cyan-400" />

            </div>

            <p className="text-sm font-bold text-slate-300">
              Nenhuma mensagem ainda
            </p>

            <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-slate-500">
              Utilize este canal para alinhar
              coleta, entrega e detalhes da carga.
            </p>

          </div>
        ) : (
          <div className="relative z-10 space-y-3">

            {mensagens.map(
              (
                m,
                index,
              ) => {
                const isMine =
                  m.enviadoPor ===
                  tipoUsuario;

                return (
                  <div
                    key={`${index}-${m.createdAt?.seconds || 'msg'}`}
                    className={`flex ${
                      isMine
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >

                    <div
                      className={`max-w-[86%] rounded-[1.4rem] px-4 py-3 shadow-lg transition-all duration-200 ${
                        isMine
                          ? 'border border-cyan-500/20 bg-cyan-500 text-slate-950'
                          : 'border border-white/10 bg-slate-900 text-slate-100'
                      }`}
                    >

                      <p
                        className={`mb-2 text-[9px] font-black uppercase tracking-[0.22em] ${
                          isMine
                            ? 'text-slate-950/70'
                            : 'text-slate-500'
                        }`}
                      >
                        {m.nome}
                      </p>

                      <p className="text-sm font-semibold leading-relaxed break-words">
                        {m.texto}
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

      {/* INPUT */}

      <div className="border-t border-white/5 bg-slate-900/90 p-4 backdrop-blur-xl">

        <div className="flex items-center gap-3">

          <input
            ref={inputRef}
            value={texto}
            maxLength={500}
            onChange={(e) =>
              setTexto(
                e.target.value,
              )
            }
            onKeyDown={
              handleKeyDown
            }
            placeholder="Digite uma mensagem operacional..."
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-semibold text-white outline-none transition-all duration-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:bg-slate-900"
          />

          <button
            onClick={
              enviarMensagem
            }
            disabled={
              sending ||
              !texto.trim()
            }
            className="group flex h-[56px] w-[56px] items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500 text-slate-950 shadow-[0_10px_30px_rgba(6,182,212,0.25)] transition-all duration-200 hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >

            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-[1px]" />
            )}

          </button>

        </div>

      </div>

    </div>
  );
}

export default memo(ChatFrete);
