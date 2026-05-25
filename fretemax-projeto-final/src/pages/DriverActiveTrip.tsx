import {
  useEffect,
  useState,
} from 'react';

import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import {
  db,
} from '../firebase';

import {
  MapPin,
  CheckCircle,
  Camera,
  Truck,
  Package,
} from 'lucide-react';

import MapaCliente from '../components/MapaCliente';

interface Props {
  freteId: string;
}

export default function DriverActiveTrip({
  freteId,
}: Props) {

  const [frete, setFrete] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {

    if (!freteId) return;

    const unsub =
      onSnapshot(
        doc(db, 'fretes', freteId),
        (snap) => {

          if (!snap.exists())
            return;

          setFrete(snap.data());
        },
      );

    return () => unsub();

  }, [freteId]);

  const atualizarStatus =
    async (
      status: string,
    ) => {

      try {

        setLoading(true);

        await updateDoc(
          doc(db, 'fretes', freteId),
          {
            status,
            atualizadoEm:
              serverTimestamp(),
          },
        );

      } catch (error) {

        console.error(
          'ERRO STATUS:',
          error,
        );

      } finally {

        setLoading(false);

      }
    };

  if (!frete) {

    return (
      <div className="flex h-screen items-center justify-center bg-[#020617] text-white">
        Carregando operação...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white">

      <div className="mx-auto max-w-7xl">

        <div className="mb-6">

          <h1 className="text-3xl font-black uppercase">
            Operação ativa
          </h1>

          <p className="text-slate-400">
            Frete realtime sincronizado
          </p>

        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-4">

            <div className="h-[500px] overflow-hidden rounded-3xl">

              <MapaCliente
                motoristaId={
                  frete.motoristaId
                }
                origem={{
                  lat: frete.origemLat,
                  lng: frete.origemLng,
                }}
                destino={{
                  lat: frete.destinoLat,
                  lng: frete.destinoLng,
                }}
              />

            </div>

          </div>

          <div className="space-y-4">

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

              <div className="mb-4 flex items-center gap-3">

                <Truck className="text-cyan-400" />

                <h2 className="text-xl font-black uppercase">
                  Status operacional
                </h2>

              </div>

              <div className="space-y-3 text-sm">

                <div className="flex items-center justify-between">
                  <span>Status</span>

                  <strong className="uppercase text-cyan-400">
                    {frete.status}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span>Cliente</span>

                  <strong>
                    {frete.clienteNome}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span>Veículo</span>

                  <strong>
                    {frete.veiculo}
                  </strong>
                </div>

              </div>

            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

              <div className="mb-5 flex items-center gap-3">

                <Package className="text-yellow-400" />

                <h2 className="text-xl font-black uppercase">
                  Fluxo operacional
                </h2>

              </div>

              <div className="space-y-4">

                <button
                  disabled={loading}
                  onClick={() =>
                    atualizarStatus(
                      'chegou_coleta',
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-4 font-black uppercase text-slate-950"
                >

                  <MapPin size={18} />

                  Cheguei na coleta

                </button>

                <button
                  disabled={loading}
                  onClick={() =>
                    atualizarStatus(
                      'em_transporte',
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-500 px-5 py-4 font-black uppercase text-slate-950"
                >

                  <Truck size={18} />

                  Iniciar transporte

                </button>

                <button
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-500 px-5 py-4 font-black uppercase text-white"
                >

                  <Camera size={18} />

                  Foto comprovante

                </button>

                <button
                  disabled={loading}
                  onClick={() =>
                    atualizarStatus(
                      'entregue',
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-5 py-4 font-black uppercase text-slate-950"
                >

                  <CheckCircle size={18} />

                  Finalizar entrega

                </button>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
