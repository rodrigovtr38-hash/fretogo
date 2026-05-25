import { useEffect, useRef, useState } from 'react';

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

import {
  signOut,
} from 'firebase/auth';

import {
  AppTripState,
} from '../state/tripStateMachine';

import ChatFrete from '../components/ChatFrete';

import DriverHeader from '../components/motorista/DriverHeader';

import DriverAuth from '../components/motorista/DriverAuth';

import DriverCadastro from '../components/motorista/DriverCadastro';

import DriverDashboard from '../components/motorista/DriverDashboard';

import DriverActiveTrip from '../components/motorista/DriverActiveTrip';

import DriverRadar from '../components/motorista/DriverRadar';

import OfertaModal from '../components/motorista/OfertaModal';

interface OrderData {
  id?: string;
  status: string;

  distancia?: number;

  valorMotorista?: number;

  enderecoColetaTexto?: string;

  enderecoEntregaTexto?: string;

  origemLat?: number;
  origemLng?: number;

  destinoLat?: number;
  destinoLng?: number;

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

  const [toast, setToast] =
    useState<any>(null);

  /*
  =====================================================
  REFS
  =====================================================
  */

  const actionLock =
    useRef(false);

  /*
  =====================================================
  AUTH
  =====================================================
  */

  useEffect(() => {

    let unsubCad: any;

    let unsubFretes: any;

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

        unsubCad = onSnapshot(
          doc(db, 'motoristas_cadastros', u.uid),
          (snap) => {

            if (snap.exists()) {

              setDriverData({
                id: snap.id,
                ...snap.data(),
              } as DriverData);

            }

            setCheckingDriver(false);
          }
        );

        /*
        ============================================
        ACTIVE FRETE
        ============================================
        */

        unsubFretes = onSnapshot(

          query(
            collection(db, 'fretes'),

            where(
              'motoristaId',
              '==',
              u.uid
            ),

            where(
              'status',
              'in',
              [
                AppTripState.ACEITO,
                AppTripState.COLETANDO,
                AppTripState.EM_TRANSPORTE,
              ]
            ),

            limit(1)
          ),

          (snap) => {

            if (!snap.empty) {

              setActiveFrete({
                id: snap.docs[0].id,
                ...snap.docs[0].data(),
              } as OrderData);

            } else {

              setActiveFrete(null);
            }

            setLoading(false);
          }
        );

        /*
        ============================================
        OFERTAS
        ============================================
        */

        const q = query(
          collection(db, 'fretes'),

          where(
            'status',
            '==',
            AppTripState.DISPONIVEL
          ),

          where(
            'filaMatching',
            'array-contains',
            u.uid
          )
        );

        onSnapshot(q, (snapshot) => {

          if (!isOnline) return;

          let found = false;

          for (const docSnap of snapshot.docs) {

            const data =
              docSnap.data() as OrderData;

            if (
              !data.motoristaId &&
              data.filaMatching?.[0] === u.uid
            ) {

              setOfertaFrete({
                id: docSnap.id,
                ...data,
              });

              setExibindoOferta(true);

              found = true;

              break;
            }
          }

          if (!found) {

            setOfertaFrete(null);

            setExibindoOferta(false);
          }
        });

      });

    return () => {

      unsubscribe();

      unsubCad?.();

      unsubFretes?.();
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
        Carregando painel...
      </div>
    );
  }

  /*
  =====================================================
  AUTH SCREEN
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
        user={user}
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

      <DriverHeader
        user={user}
        onLogout={() => signOut(auth)}
      />

      <OfertaModal
        open={exibindoOferta}
        oferta={ofertaFrete}
        onClose={() => {
          setExibindoOferta(false);
        }}
      />

      {

        activeFrete ? (

          <DriverActiveTrip
            frete={activeFrete}
            driver={driverData}
          />

        ) : (

          <>

            <DriverDashboard
              driver={driverData}
            />

            <DriverRadar
              isOnline={isOnline}
              setIsOnline={setIsOnline}
              user={user}
              driver={driverData}
            />

          </>
        )
      }

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

      {

        toast && (

          <div className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-black px-6 py-4 text-sm font-bold text-white shadow-2xl">
            {toast.msg}
          </div>
        )
      }

    </div>
  );
}
