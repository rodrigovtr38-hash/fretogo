import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Captura o erro detalhado (Stack Trace)
    console.error('CRASH DETECTADO PELO ERROR BOUNDARY:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    // Tenta limpar o cache e recarregar a página forçadamente
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 p-6 text-slate-200 selection:bg-red-500/30 font-sans">
          <div className="w-full max-w-4xl rounded-[2rem] border border-red-500/30 bg-slate-900/80 p-8 shadow-[0_20px_60px_rgba(239,68,68,0.15)] backdrop-blur-xl md:p-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80"></div>
            
            <div className="mb-8 flex flex-col items-center border-b border-white/5 pb-8 text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-red-500/20 bg-red-500/10 shadow-inner">
                <AlertTriangle className="h-12 w-12 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
                Falha Crítica de Renderização
              </h1>
              <p className="mt-4 text-sm font-medium text-slate-400">
                O React encontrou um erro fatal ao tentar carregar este módulo. O sistema interceptou a falha para evitar tela em branco.
              </p>
            </div>

            <div className="mb-8 space-y-4">
              <div className="rounded-2xl border border-red-500/20 bg-red-950/30 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2">Mensagem do Erro</p>
                <code className="text-sm font-bold text-red-200 font-mono break-words">
                  {this.state.error?.toString()}
                </code>
              </div>

              {this.state.errorInfo && (
                <div className="rounded-2xl border border-white/5 bg-slate-950 p-5 overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Stack Trace (Origem)</p>
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={this.handleReset}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-500 px-6 py-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_rgba(239,68,68,0.3)] transition-all hover:bg-red-400 hover:scale-[1.02] active:scale-95"
            >
              <RefreshCcw size={18} />
              Voltar para a Home Limpa
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
