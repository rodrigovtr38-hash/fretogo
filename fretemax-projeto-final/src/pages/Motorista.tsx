import { useEffect, useState } from 'react';

import {
  auth,
  db,
} from '../firebase';

import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  limit,
} from 'firebase/firestore';

import ChatFrete from '../components/ChatFrete';

import DriverHeader from '../components/motorista/DriverHeader';

import DriverAuth from '../components/motorista/DriverAuth';

import DriverCadastro from '../components/motorista/DriverCadastro';

import DriverDashboard from '../components/motorista/DriverDashboard';

import DriverRadar from '../components/motorista/DriverRadar';

import OfertaModal from '../components/motorista/OfertaModal';

interface OrderData {
  id?: string;

  status?: string;

  distancia?: number;

  valorMotorista?: number;

  enderecoColetaTexto?: string;

  enderecoEntregaTexto?: string;

  motoristaId?: string | null;

  motoristaNome?: string;

  motoristaZap?: string;

  filaMatching?: string[];
}

interface DriverData {
  id?: string;

  nome?: string;

  whatsapp?: string;

  categoria?: string;

  status?:
    | 'pendente'
    | 'aprovado'
    | 'rejeitado';
}

export default function Motorista() {

  /*
  =====================================================
  STATES
  =====================================================
  */

  const [user, setUser] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [checkingDriver, setCheckingDriver] =
    useState(true);

  const [driverData, setDriverData] =
    useState<DriverData | null>(null);

  const [activeFrete, setActiveFrete] =
    useState<OrderData | null>(null);

  const [ofertaFrete, setOfertaFrete] =
    useState<OrderData | null>(null);

  const [exibindoOferta, setExibindoOferta] =
    useState(false);

  const [isOnline, setIsOnline] =
    useState(false);

  /*
  =====================================================
  AUTH
  =====================================================
  */

  useEffect(() => {

    const unsubscribe =
      auth.onAuthStateChanged((u) => {

        if (!u) {

          setUser(null);

          setLoading(false);

          setCheckingDriver(false);

          return;
        }

        setUser(u);

        /*
        ============================================
        DRIVER CADASTRO
        ============================================
        */

        const unsubCad = onSnapshot(
          doc(
            db,
            'motoristas_cadastros',
            u.uid
          ),

          (snap) => {

            if (snap.exists()) {

              setDriverData({
                id: snap.id,
                ...snap.data(),
              } as DriverData);
            }

            setCheckingDriver(false);
          },

          (error) => {

            console.error(
              'ERRO CADASTRO:',
              error
            );

            setCheckingDriver(false);
          }
        );

        /*
        ============================================
        FRETE ATIVO
        ============================================
        */

        const unsubFrete = onSnapshot(

          query(
            collection(db, 'fretes'),

            where(
              'motoristaId',
              '==',
              u.uid
            ),

            limit(1)
          ),

          (snapshot) => {

            if (!snapshot.empty) {

              setActiveFrete({
                id: snapshot.docs[0].id,
                ...snapshot.docs[0].data(),
              });

            } else {

              setActiveFrete(null);
            }

            setLoading(false);
          },

          (error) => {

            console.error(
              'ERRO FRETE:',
              error
            );

            setLoading(false);
          }
        );

        /*
        ============================================
        OFERTAS
        ============================================
        */

        const unsubOferta = onSnapshot(

          query(
            collection(db, 'fretes'),

            limit(10)
          ),

          (snapshot) => {

            if (!isOnline) {

              setOfertaFrete(null);

              setExibindoOferta(false);

              return;
            }

            let found = false;

            snapshot.docs.forEach((docSnap) => {

              const data =
                docSnap.data() as OrderData;

              if (
                !found &&
                !data.motoristaId
              ) {

                setOfertaFrete({
                  id: docSnap.id,
                  ...data,
                });

                setExibindoOferta(true);

                found = true;
              }
            });

            if (!found) {

              setOfertaFrete(null);

              setExibindoOferta(false);
            }
          },

          (error) => {

            console.error(
              'ERRO OFERTA:',
              error
            );
          }
        );

        return () => {

          unsubCad();

          unsubFrete();

          unsubOferta();
        };
      });

    return () => {

      unsubscribe();
    };

  }, [isOnline]);

  /*
  =====================================================
  LOADING
  =====================================================
  */

  if (
    loading ||
    checkingDriver
  ) {

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">

        <div className="text-center">

          <h1 className="text-3xl font-black">
            FRETOGO
          </h1>

          <p className="mt-4 text-slate-400">
            Inicializando sistema operacional...
          </p>

        </div>

      </div>
    );
  }

  /*
  =====================================================
  LOGIN
  =====================================================
  */

  if (!user) {

    return (
      <DriverAuth />
    );
  }

  /*
  =====================================================
  CADASTRO
  =====================================================
  */

  if (!driverData) {

    return (
      <DriverCadastro
        onFinish={() => {
          window.location.reload();
        }}
      />
    );
  }

  /*
  =====================================================
  AGUARDANDO APROVAÇÃO
  =====================================================
  */

  if (
    driverData.status !== 'aprovado'
  ) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">

        <div className="w-full max-w-md rounded-3xl border border-cyan-500/20 bg-slate-900 p-10 text-center">

          <h1 className="mb-4 text-3xl font-black text-white">
            Cadastro em análise
          </h1>

          <p className="text-slate-400">
            Aguarde aprovação do administrador.
          </p>

        </div>

      </div>
    );
  }

  /*
  =====================================================
  MAIN
  =====================================================
  */

  return (

    <div className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <DriverHeader
        user={user}
      />

      {/* DASHBOARD */}
      <DriverDashboard
        driver={driverData}
      />

      {/* RADAR */}
      <DriverRadar
        isOnline={isOnline}
        setIsOnline={setIsOnline}
        user={user}
        driver={driverData}
      />

      {/* OFERTA */}
      <OfertaModal
        open={exibindoOferta}
        oferta={ofertaFrete}
        onClose={() => {
          setExibindoOferta(false);
        }}
      />

      {/* FRETE ATIVO */}
      {
        activeFrete && (

          <div className="mx-auto mt-10 max-w-6xl px-4">

            <div className="rounded-[2rem] border border-cyan-500/20 bg-slate-900/80 p-8">

              <h2 className="text-3xl font-black text-white">
                Frete ativo encontrado
              </h2>

              <p className="mt-4 text-slate-400">
                O sistema detectou uma entrega em andamento.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">

                <div className="rounded-2xl border border-white/5 bg-black/20 p-5">

                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                    Coleta
                  </p>

                  <h3 className="mt-3 text-xl font-black text-white">
                    {activeFrete.enderecoColetaTexto || 'Não informado'}
                  </h3>

                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 p-5">

                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                    Entrega
                  </p>

                  <h3 className="mt-3 text-xl font-black text-white">
                    {activeFrete.enderecoEntregaTexto || 'Não informado'}
                  </h3>

                </div>

              </div>

            </div>

          </div>
        )
      }

      {/* CHAT */}
      {
        activeFrete?.id && (

          <div className="mx-auto mt-10 max-w-4xl px-4 pb-20">

            <ChatFrete
              freteId={activeFrete.id}
              tipoUsuario="motorista"
              nome={driverData.nome || 'Motorista'}
            />

          </div>
        )
      }

    </div>
  );
}
