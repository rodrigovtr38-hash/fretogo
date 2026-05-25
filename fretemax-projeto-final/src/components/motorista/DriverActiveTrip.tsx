import { motion } from 'framer-motion';

import {
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react';

interface DriverActiveTripProps {
  active: boolean;
}

export default function DriverActiveTrip({
  active,
}: DriverActiveTripProps) {

  if (!active) {
    return (
      <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">

        <Truck
          size={60}
          className="mx-auto mb-5 text-slate-600"
        />

        <h2 className="text-2xl font-black text-white">
          Nenhuma corrida ativa
        </h2>

        <p className="mt-3 text-slate-400">
          Aceite um frete para iniciar
          uma nova rota operacional.
        </p>

      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 30,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="overflow-hidden rounded-[2rem] border border-cyan-500/10 bg-white/5"
    >

      {/* HEADER */}
      <div className="border-b border-white/5 px-6 py-5">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-2xl font-black text-white">
              Corrida Ativa
            </h2>

            <p className="text-sm text-slate-400">
              Entrega em andamento
            </p>

          </div>

          <div className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-black">

            EM ROTA

          </div>

        </div>

      </div>

      {/* BODY */}
      <div className="p-6">

        {/* CLIENT */}
        <div className="flex items-center gap-4 rounded-2xl bg-[#0f172a] p-5">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">

            <User className="text-cyan-400" />

          </div>

          <div>

            <h3 className="text-xl font-black text-white">
              Carlos Transportes
            </h3>

            <p className="text-slate-400">
              Cliente verificado
            </p>

          </div>

        </div>

        {/* ROUTE */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">

          <div className="rounded-2xl bg-[#0f172a] p-5">

            <div className="mb-4 flex items-center gap-3">

              <MapPin className="text-cyan-400" />

              <h3 className="font-black text-white">
                Coleta
              </h3>

            </div>

            <p className="text-slate-300">
              Avenida Paulista, 1500
            </p>

            <p className="mt-2 text-sm text-slate-500">
              São Paulo - SP
            </p>

          </div>

          <div className="rounded-2xl bg-[#0f172a] p-5">

            <div className="mb-4 flex items-center gap-3">

              <Navigation className="text-emerald-400" />

              <h3 className="font-black text-white">
                Entrega
              </h3>

            </div>

            <p className="text-slate-300">
              Rua das Indústrias, 500
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Campinas - SP
            </p>

          </div>

        </div>

        {/* INFO */}
        <div className="mt-6 grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl bg-[#0f172a] p-5">

            <div className="mb-3 flex items-center gap-3">

              <Truck className="text-cyan-400" />

              <h3 className="font-black text-white">
                Carga
              </h3>

            </div>

            <p className="text-slate-400">
              Eletrônicos
            </p>

          </div>

          <div className="rounded-2xl bg-[#0f172a] p-5">

            <div className="mb-3 flex items-center gap-3">

              <Clock3 className="text-yellow-400" />

              <h3 className="font-black text-white">
                Tempo
              </h3>

            </div>

            <p className="text-slate-400">
              1h 25min restantes
            </p>

          </div>

          <div className="rounded-2xl bg-[#0f172a] p-5">

            <div className="mb-3 flex items-center gap-3">

              <ShieldCheck className="text-emerald-400" />

              <h3 className="font-black text-white">
                Código
              </h3>

            </div>

            <p className="text-slate-400">
              #847291
            </p>

          </div>

        </div>

        {/* ACTIONS */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">

          <button className="rounded-2xl bg-cyan-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02]">

            Iniciar Coleta

          </button>

          <button className="rounded-2xl bg-yellow-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02]">

            Em Transporte

          </button>

          <button className="rounded-2xl bg-emerald-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02]">

            Finalizar Entrega

          </button>

        </div>

        {/* CONTACT */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/5 bg-[#0f172a] p-5">

          <div>

            <h3 className="font-black text-white">
              Contato do Cliente
            </h3>

            <p className="text-sm text-slate-400">
              +55 (11) 99999-9999
            </p>

          </div>

          <button className="flex items-center gap-3 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-black">

            <Phone size={18} />

            Ligar

          </button>

        </div>

        {/* FOOTER */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-5">

          <CheckCircle2 className="text-cyan-400" />

          <p className="text-sm text-slate-300">
            Todas atualizações dessa corrida
            estão sincronizadas em tempo real.
          </p>

        </div>

      </div>

    </motion.div>
  );
}
