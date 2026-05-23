import { useEffect, useState } from 'react';
import {
  Power,
  Radar,
  MapPinned,
  Truck,
  Search,
} from 'lucide-react';

export default function RadarStatus() {
  const [online, setOnline] = useState(false);

  const [statusText, setStatusText] = useState(
    'Você está invisível. Ligue o radar para receber fretes inteligentes.'
  );

  const searchingMessages = [
    'Analisando motoristas próximos...',
    'Escaneando cargas em tempo real...',
    'Detectando regiões com alta demanda...',
    'Buscando fretes compatíveis...',
    'Conectando com clientes próximos...',
  ];

  useEffect(() => {
    if (!online) return;

    let index = 0;

    const interval = setInterval(() => {
      setStatusText(searchingMessages[index]);

      index =
        (index + 1) %
        searchingMessages.length;
    }, 3000);

    return () => clearInterval(interval);
  }, [online]);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">

      {/* GRID */}
      <div
        className="
          absolute
          inset-0
          opacity-[0.03]
          [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)]
          [background-size:60px_60px]
        "
      />

      {/* GLOW */}
      <div className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[180px]" />

      {/* CONTAINER */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">

        {/* RADAR */}
        <div className="relative flex items-center justify-center">

          {/* PULSE */}
          {online && (
            <>
              <div className="absolute h-[260px] w-[260px] animate-ping rounded-full border border-cyan-400/20" />

              <div className="absolute h-[360px] w-[360px] animate-pulse rounded-full border border-cyan-400/10" />

              <div className="absolute h-[520px] w-[520px] rounded-full border border-cyan-400/5" />
            </>
          )}

          {/* BOTÃO CENTRAL */}
          <button
            onClick={() => setOnline(!online)}
            className={`
              relative
              flex
              h-40
              w-40
              items-center
              justify-center
              rounded-full
              border
              transition-all
              duration-500
              ${
                online
                  ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_80px_rgba(6,182,212,0.35)]'
                  : 'border-slate-700 bg-slate-900/80'
              }
            `}
          >
            <div className="flex flex-col items-center gap-2">

              <Power
                size={52}
                className={
                  online
                    ? 'text-cyan-300'
                    : 'text-slate-500'
                }
              />

              <span
                className={`
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.35em]
                  ${
                    online
                      ? 'text-cyan-300'
                      : 'text-slate-500'
                  }
                `}
              >
                {online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </button>
        </div>

        {/* STATUS */}
        <div className="mt-14 max-w-[520px]">

          <div className="flex items-center justify-center gap-2">
            <Radar className="text-cyan-400" size={18} />

            <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
              Radar operacional
            </span>
          </div>

          <h2 className="mt-5 text-4xl font-black uppercase italic text-white md:text-5xl">
            {online
              ? 'RADAR ATIVO'
              : 'RADAR DESLIGADO'}
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-slate-400 md:text-base">
            {online
              ? statusText
              : 'Ative o radar operacional para receber cargas inteligentes automaticamente na sua região.'}
          </p>
        </div>

        {/* STATS */}
        {online && (
          <div className="mt-12 grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">

            <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/70 p-5 backdrop-blur-xl">
              <MapPinned
                size={22}
                className="text-cyan-400"
              />

              <div className="mt-4 text-left">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Região
                </p>

                <h3 className="mt-1 text-xl font-black text-white">
                  Zona Sul
                </h3>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/70 p-5 backdrop-blur-xl">
              <Truck
                size={22}
                className="text-emerald-400"
              />

              <div className="mt-4 text-left">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Categoria
                </p>

                <h3 className="mt-1 text-xl font-black text-white">
                  Carro Pequeno
                </h3>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/70 p-5 backdrop-blur-xl">
              <Search
                size={22}
                className="text-yellow-400"
              />

              <div className="mt-4 text-left">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Sistema
                </p>

                <h3 className="mt-1 text-xl font-black text-white">
                  Buscando cargas...
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        {online && (
          <button
            className="
              mt-12
              rounded-full
              border
              border-cyan-500/30
              bg-cyan-500/10
              px-8
              py-4
              text-xs
              font-black
              uppercase
              tracking-[0.25em]
              text-cyan-300
              transition-all
              duration-300
              hover:scale-[1.03]
              hover:border-cyan-400
              hover:bg-cyan-500/20
            "
          >
            Definir rota de retorno
          </button>
        )}
      </div>
    </section>
  );
}
