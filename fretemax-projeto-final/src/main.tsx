import {
  StrictMode,
  Suspense,
} from 'react';

import {
  createRoot,
} from 'react-dom/client';

import App from './App.tsx';

import './index.css';

import {
  AlertTriangle,
  Loader2,
} from 'lucide-react';

/* =========================================================
   ERROR BOUNDARY
========================================================= */

import {
  Component,
  type ReactNode,
} from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(
    props: ErrorBoundaryProps,
  ) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error: Error,
    info: any,
  ) {
    /* futura integração:
       Sentry / LogRocket
    */

    console.error(
      'FRETOGO_RUNTIME_ERROR',
      error,
      info,
    );
  }

  render() {
    if (
      this.state.hasError
    ) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 text-center">

          {/* ambient */}

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.08),transparent_55%)]" />

          <div className="relative z-10 max-w-md">

            <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] border border-red-500/20 bg-red-500/10">

              <div className="absolute inset-0 rounded-[2rem] border border-red-400/10 radar-pulse" />

              <AlertTriangle className="h-12 w-12 text-red-400" />

            </div>

            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.35em] text-red-300">
              Sistema indisponível
            </p>

            <h1 className="mt-5 text-4xl font-black italic tracking-tight text-white">
              Falha operacional
            </h1>

            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              O radar encontrou uma inconsistência
              inesperada.
            </p>

            <button
              onClick={() =>
                window.location.reload()
              }
              className="mt-10 rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500 px-8 py-5 text-sm font-black uppercase italic tracking-[0.22em] text-slate-950 shadow-[0_10px_40px_rgba(6,182,212,0.25)] transition-all duration-200 hover:scale-[1.02]"
            >
              Reiniciar sistema
            </button>

          </div>

        </div>
      );
    }

    return this.props.children;
  }
}

/* =========================================================
   GLOBAL LOADER
========================================================= */

function GlobalLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950">

      {/* ambient */}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.08),transparent_55%)]" />

      <div className="relative z-10 flex flex-col items-center">

        <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-cyan-500/20 bg-cyan-500/10">

          <div className="absolute inset-0 rounded-[2rem] border border-cyan-400/20 radar-pulse" />

          <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />

        </div>

        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
          Inicializando infraestrutura
        </p>

        <h1 className="mt-4 text-3xl font-black italic tracking-tight text-white">
          FRETOGO
        </h1>

      </div>

    </div>
  );
}

/* =========================================================
   PWA REGISTER
========================================================= */

async function registerSW() {
  if (
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  try {
    const registration =
      await navigator.serviceWorker.register(
        '/sw.js',
      );

    /* =====================================================
       UPDATE DETECTION
    ===================================================== */

    registration.addEventListener(
      'updatefound',
      () => {
        const newWorker =
          registration.installing;

        if (!newWorker)
          return;

        newWorker.addEventListener(
          'statechange',
          () => {
            if (
              newWorker.state ===
                'installed' &&
              navigator.serviceWorker
                .controller
            ) {
              console.log(
                '🚀 Nova versão FRETOGO disponível',
              );
            }
          },
        );
      },
    );

    console.log(
      '✅ FRETOGO PWA ativo',
    );
  } catch (error) {
    console.error(
      '❌ Erro ao registrar PWA:',
      error,
    );
  }
}

/* =========================================================
   STARTUP
========================================================= */

window.addEventListener(
  'load',
  () => {
    registerSW();
  },
);

/* =========================================================
   ROOT
========================================================= */

createRoot(
  document.getElementById(
    'root',
  )!,
).render(
  <StrictMode>

    <ErrorBoundary>

      <Suspense
        fallback={
          <GlobalLoader />
        }
      >

        <App />

      </Suspense>

    </ErrorBoundary>

  </StrictMode>,
);
