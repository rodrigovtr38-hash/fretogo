import { useMemo, useState } from 'react';

import { motion } from 'framer-motion';

import {
  Bell,
  CheckCircle2,
  Clock3,
  DollarSign,
  MapPin,
  Navigation,
  Power,
  ShieldCheck,
  Truck,
  User,
  Wallet,
} from 'lucide-react';

interface Freight {
  id: number;
  origem: string;
  destino: string;
  valor: number;
  distancia: string;
  urgente: boolean;
}

export default function DriverDashboard() {

  const [online, setOnline] =
    useState(true);

  const [acceptedFreight, setAcceptedFreight] =
    useState<Freight | null>(null);

  const freights = useMemo<Freight[]>(
    () => [
      {
        id: 1,
        origem: 'São Paulo - SP',
        destino: 'Campinas - SP',
        valor: 850,
        distancia: '92km',
        urgente: true,
      },
      {
        id: 2,
        origem: 'Guarulhos - SP',
        destino: 'Santos - SP',
        valor: 1450,
        distancia: '108km',
        urgente: false,
      },
      {
        id: 3,
        origem: 'Osasco - SP',
        destino: 'Sorocaba - SP',
        valor: 690,
        distancia: '85km',
        urgente: true,
      },
    ],
    []
  );

  const acceptFreight = (
    freight: Freight
  ) => {
    setAcceptedFreight(freight);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">

      {/* HEADER */}
      <div className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/90 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">

              <Truck className="text-cyan-400" />

            </div>

            <div>

              <h1 className="text-2xl font-black">
                Painel do Motorista
              </h1>

              <p className="text-sm text-slate-400">
                Sistema operacional em tempo real
              </p>

            </div>

          </div>

          {/* ONLINE STATUS */}
          <button
            onClick={() =>
              setOnline(!online)
            }
            className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
              online
                ? 'bg-emerald-500 text-black'
                : 'bg-red-500 text-white'
            }`}
          >

            <Power size={18} />

            {online
              ? 'ONLINE'
              : 'OFFLINE'}

          </button>

        </div>

      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* STATS */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

          {/* CARD */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-[2rem] border border-white/5 bg-white/5 p-6"
          >

            <div className="mb-5 flex items-center justify-between">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">

                <DollarSign className="text-cyan-400" />

              </div>

              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400">
                HOJE
              </span>

            </div>

            <h2 className="text-4xl font-black">
              R$ 2.840
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Ganhos do dia
            </p>

          </motion.div>

          {/* CARD */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-[2rem] border border-white/5 bg-white/5 p-6"
          >

            <div className="mb-5 flex items-center justify-between">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">

                <CheckCircle2 className="text-emerald-400" />

              </div>

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                FINALIZADOS
              </span>

            </div>

            <h2 className="text-4xl font-black">
              18
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Fretes concluídos hoje
            </p>

          </motion.div>

          {/* CARD */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-[2rem] border border-white/5 bg-white/5 p-6"
          >

            <div className="mb-5 flex items-center justify-between">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10">

                <Clock3 className="text-yellow-400" />

              </div>

              <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-400">
                EM ROTA
              </span>

            </div>

            <h2 className="text-4xl font-black">
              3
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Corridas ativas
            </p>

          </motion.div>

          {/* CARD */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-[2rem] border border-white/5 bg-white/5 p-6"
          >

            <div className="mb-5 flex items-center justify-between">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">

                <Wallet className="text-purple-400" />

              </div>

              <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
                MÊS
              </span>

            </div>

            <h2 className="text-4xl font-black">
              R$ 28.950
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Faturamento mensal
            </p>

          </motion.div>

        </div>

        {/* GRID */}
        <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_400px]">

          {/* LEFT */}
          <div className="space-y-8">

            {/* MAP */}
            <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-white/5">

              <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">

                <div>

                  <h2 className="text-xl font-black">
                    Mapa Operacional
                  </h2>

                  <p className="text-sm text-slate-400">
                    Rastreamento em tempo real
                  </p>

                </div>

                <Navigation className="text-cyan-400" />

              </div>

              <div className="flex h-[420px] items-center justify-center bg-gradient-to-br from-cyan-500/10 to-blue-500/10">

                <div className="text-center">

                  <MapPin
                    size={70}
                    className="mx-auto mb-5 text-cyan-400"
                  />

                  <h3 className="text-2xl font-black">
                    Mapa em tempo real
                  </h3>

                  <p className="mt-2 text-slate-400">
                    Google Maps será integrado aqui
                  </p>

                </div>

              </div>

            </div>

            {/* FRETES */}
            <div className="rounded-[2rem] border border-white/5 bg-white/5 p-6">

              <div className="mb-6 flex items-center justify-between">

                <div>

                  <h2 className="text-2xl font-black">
                    Fretes Disponíveis
                  </h2>

                  <p className="text-sm text-slate-400">
                    Novas cargas em tempo real
                  </p>

                </div>

                <Bell className="text-cyan-400" />

              </div>

              <div className="space-y-5">

                {freights.map((freight) => (

                  <motion.div
                    key={freight.id}
                    whileHover={{ scale: 1.01 }}
                    className="rounded-[2rem] border border-white/5 bg-[#0f172a] p-5"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      <div>

                        <div className="flex items-center gap-3">

                          <h3 className="text-xl font-black">
                            {freight.origem}
                          </h3>

                          {freight.urgente && (
                            <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                              URGENTE
                            </span>
                          )}

                        </div>

                        <p className="mt-2 text-slate-400">
                          Destino:
                          {' '}
                          {freight.destino}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3 text-sm">

                          <span className="rounded-full bg-cyan-500/10 px-3 py-2 text-cyan-400">
                            {freight.distancia}
                          </span>

                          <span className="rounded-full bg-emerald-500/10 px-3 py-2 text-emerald-400">
                            R$
                            {' '}
                            {freight.valor}
                          </span>

                        </div>

                      </div>

                      <button
                        onClick={() =>
                          acceptFreight(
                            freight
                          )
                        }
                        className="rounded-2xl bg-cyan-500 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02]"
                      >

                        Aceitar Frete

                      </button>

                    </div>

                  </motion.div>

                ))}

              </div>

            </div>

          </div>

          {/* RIGHT */}
          <div className="space-y-8">

            {/* PROFILE */}
            <div className="rounded-[2rem] border border-white/5 bg-white/5 p-6">

              <div className="flex items-center gap-4">

                <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-cyan-500/10">

                  <User
                    size={40}
                    className="text-cyan-400"
                  />

                </div>

                <div>

                  <h2 className="text-2xl font-black">
                    Rodrigo Martins
                  </h2>

                  <p className="text-slate-400">
                    Motorista parceiro
                  </p>

                </div>

              </div>

              <div className="mt-6 space-y-4">

                <div className="flex items-center justify-between rounded-2xl bg-[#0f172a] px-4 py-4">

                  <span className="text-slate-400">
                    Veículo
                  </span>

                  <span className="font-bold">
                    HR Hyundai
                  </span>

                </div>

                <div className="flex items-center justify-between rounded-2xl bg-[#0f172a] px-4 py-4">

                  <span className="text-slate-400">
                    Placa
                  </span>

                  <span className="font-bold">
                    BRA2E19
                  </span>

                </div>

                <div className="flex items-center justify-between rounded-2xl bg-[#0f172a] px-4 py-4">

                  <span className="text-slate-400">
                    Status
                  </span>

                  <span className="font-bold text-emerald-400">
                    Verificado
                  </span>

                </div>

              </div>

            </div>

            {/* ACTIVE FREIGHT */}
            <div className="rounded-[2rem] border border-white/5 bg-white/5 p-6">

              <div className="mb-5 flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-black">
                    Frete Atual
                  </h2>

                  <p className="text-sm text-slate-400">
                    Corrida em andamento
                  </p>

                </div>

                <ShieldCheck className="text-cyan-400" />

              </div>

              {!acceptedFreight ? (

                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">

                  <Truck
                    size={50}
                    className="mx-auto mb-4 text-slate-600"
                  />

                  <p className="text-slate-400">
                    Nenhum frete aceito
                  </p>

                </div>

              ) : (

                <div className="rounded-2xl bg-[#0f172a] p-5">

                  <div className="mb-4 flex items-center justify-between">

                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400">
                      EM ROTA
                    </span>

                    <span className="font-black text-emerald-400">
                      R$
                      {' '}
                      {acceptedFreight.valor}
                    </span>

                  </div>

                  <h3 className="text-xl font-black">
                    {acceptedFreight.origem}
                  </h3>

                  <p className="mt-2 text-slate-400">
                    Destino:
                    {' '}
                    {acceptedFreight.destino}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">

                    <button className="rounded-2xl bg-cyan-500 py-4 text-sm font-black uppercase tracking-[0.2em] text-black">

                      Iniciar

                    </button>

                    <button className="rounded-2xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-[0.2em] text-black">

                      Finalizar

                    </button>

                  </div>

                </div>

              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
