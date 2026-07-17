// =========================================================
// NOME DO ARQUIVO: src/components/ErrorBoundary.tsx
// CTO-Log: Sistema de Contingência Front-end (Paraquedas).
// Status: Interceptação de falhas com UX corporativa e recuperação forçada.
// =========================================================

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
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FRETOGO CRASH]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#020617] p-6 font-sans">
          <div className="w-full max-w-2xl rounded-[2.5rem] border border-red-500/20 bg-slate-900 shadow-[0_20px_80px_rgba(239,68,68,0.15)] relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
            
            <div className="p-8 md:p-10 flex flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-red-500/20 bg-red-500/10 shadow-inner relative">
                <div className="absolute inset-0 bg-red-500/20 blur-xl animate-pulse"></div>
                <AlertTriangle className="h-10 w-10 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] relative z-10" />
              </div>
              
              <h1 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
                Sistema Interrompido
              </h1>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-400">
                A plataforma encontrou uma falha de memória ao processar esta tela. Nossa equipe foi notificada no log.
              </p>
            </div>

            <div className="bg-slate-950/50 p-8 border-t border-white/5 space-y-4">
              <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-4 overflow-hidden">
                <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1.5">Diagnóstico Técnico</p>
                <code className="text-xs font-bold text-red-300 font-mono break-words">
                  {this.state.error?.toString() || 'Unknown Runtime Error'}
                </code>
              </div>

              <button
                onClick={this.handleReset}
                className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-cyan-500 px-6 py-5 text-sm font-black uppercase tracking-widest text-slate-950 shadow-[0_10px_30px_rgba(6,182,212,0.2)] transition-all hover:bg-cyan-400 hover:scale-[1.02] active:scale-95"
              >
                <RefreshCcw size={18} /> Reiniciar Painel
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
