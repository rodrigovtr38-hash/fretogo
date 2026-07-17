// =========================================================
// NOME DO ARQUIVO: src/components/motorista/DriverRadar.tsx
// CTO-Log: Chave de Ignição e Modo Retorno.
// Status: Regra de negócios validada. UI do botão de Power Uber-style.
// =========================================================

import { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { RotateCcw, MapPin, CheckCircle2, MessageCircle, Clock, Zap, Truck, Power } from 'lucide-react';

interface DriverRadarProps {
  isOnline: boolean;
  setIsOnline: (value: boolean) => void;
  user: any;
  driver: any;
}

export default function DriverRadar({ isOnline, setIsOnline, user, driver }: DriverRadarProps) {
  const [isRetornoModalOpen, setIsRetornoModalOpen] = useState(false);
  const [destinoRetorno, setDestinoRetorno] = useState('');
  const [loadingRetorno, setLoadingRetorno] = useState(false);

  const retornosUsadosHoje = driver?.retornosUsadosHoje || 0;
  const retornosRestantes = Math.max(0, 2 - retornosUsadosHoje);
  const modoRetornoAtivo = driver?.modoRetorno || false;

  const ativarModoRetorno = async () => {
    if (!destinoRetorno.trim() || retornosRestantes <= 0 || loadingRetorno) return;
    setLoadingRetorno(true);
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'motoristas_cadastros', user.uid), {
          modoRetorno: true,
          destinoRetorno: destinoRetorno.trim().toLowerCase(),
          retornosUsadosHoje: retornosUsadosHoje + 1,
        });
        setIsRetornoModalOpen(false);
      }
    } catch (error) {
      console.error("Erro ao ativar retorno", error);
    } finally {
      setLoadingRetorno(false);
    }
  };

  const desativarModoRetorno = async () => {
    setLoadingRetorno(true);
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'motoristas_cadastros', user.uid), {
          modoRetorno: false,
          destinoRetorno: null,
        });
      }
    } catch (error) {
      console.error("Erro ao desativar retorno", error);
    } finally {
      setLoadingRetorno(false);
    }
  };

  const openWhatsAppSupport = () => {
    window.open('https://wa.me/5511946099840', '_blank');
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-7xl px-4 animate-in fade-in duration-500">

      {/* BOTÃO CENTRAL POWER (ESTILO UBER) */}
      <div className="flex flex-col items-center justify-center py-10 md:py-16">
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`relative group flex h-32 w-32 md:h-40 md:w-40 items-center justify-center rounded-full border-4 transition-all duration-500 ${
            isOnline
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.3)] scale-105'
              : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-red-500/50 hover:text-red-400'
          }`}
        >
          {isOnline && (
            <>
              <div className="absolute inset-0 animate-ping rounded-full border-4 border-emerald-500/30" style={{ animationDuration: '3s' }}></div>
              <div className="absolute inset-[-20%] animate-ping rounded-full border-2 border-emerald-500/10" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
            </>
          )}
          <div className="flex flex-col items-center gap-1 relative z-10">
            <Power size={isOnline ? 48 : 40} className={`${isOnline ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </button>

        <div className="mt-8 text-center">
          <h3 className={`text-xl md:text-2xl font-black uppercase italic tracking-tighter ${isOnline ? 'text-white' : 'text-slate-600'}`}>
            {isOnline ? 'Conectado à Torre de Controle' : 'Seu Radar está Desligado'}
          </h3>
          <p className="mt-2 text-xs md:text-sm font-medium text-slate-500 max-w-xs mx-auto leading-relaxed">
            {isOnline 
              ? `Seu radar de ${driver?.categoria ? driver.categoria.replace('_', ' ') : 'veículo'} está operando e interceptando novas postagens.` 
              : 'Entre Online para se conectar à malha e receber oportunidades.'}
          </p>
        </div>
      </div>

      {/* MODO RETORNO */}
      {isOnline && (
        <div className="mt-4 w-full rounded-[2rem] border border-blue-500/20 bg-blue-500/5 p-6 md:p-8 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_rgba(59,130,246,0.05)] border-dashed">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 shrink-0">
              <RotateCcw className={`w-7 h-7 ${modoRetornoAtivo ? 'text-cyan-400 animate-spin' : 'text-blue-400'}`} style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Fila de Retorno</h3>
              {modoRetornoAtivo ? (
                <p className="text-xs font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Destino Interceptado: {driver?.destinoRetorno?.toUpperCase()}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  A Inteligência Artificial filtrará apenas cargas para a sua cidade. <span className="font-bold text-blue-400">Resta(m) {retornosRestantes} uso(s) hoje.</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            {modoRetornoAtivo ? (
              <button 
                onClick={desativarModoRetorno}
                disabled={loadingRetorno}
                className="w-full md:w-auto px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-colors"
              >
                Cancelar Retorno
              </button>
            ) : (
              <button 
                onClick={() => setIsRetornoModalOpen(true)}
                disabled={retornosRestantes <= 0 || loadingRetorno}
                className={`w-full md:w-auto px-8 py-3 font-black text-[10px] md:text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg ${retornosRestantes > 0 ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'}`}
              >
                Ativar Retorno
              </button>
            )}
          </div>
        </div>
      )}

      {/* MURAL DE VALORES FRETOGO (APENAS QUANDO OFFLINE) */}
      {!isOnline && (
        <div className="mt-4 rounded-[2.5rem] border border-slate-800 bg-slate-950/50 p-6 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">
              Padrão <span className="text-blue-500">FretoGo</span>
            </h2>
            <button onClick={openWhatsAppSupport} className="hidden md:flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-slate-950 transition-colors border border-[#25D366]/30">
              <MessageCircle size={14} /> Suporte Operacional
            </button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-5 group hover:border-emerald-500/30 transition-colors">
              <div className="mb-3 inline-flex rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                <Clock size={20} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Pagamento em 24h</h3>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Finalizou com o PIN? O valor cai na sua conta em até 1 dia útil. Sem burocracia.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-5 group hover:border-blue-500/30 transition-colors">
              <div className="mb-3 inline-flex rounded-lg bg-blue-500/10 p-2 text-blue-400">
                <Zap size={20} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Zero Mensalidade</h3>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Não cobramos taxas fixas. Somos parceiros do seu lucro em cada operação.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-5 group hover:border-amber-500/30 transition-colors sm:col-span-2 lg:col-span-1">
              <div className="mb-3 inline-flex rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <Truck size={20} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Cargas Diretas</h3>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Conectamos você direto com frotistas e fabricantes que precisam de agilidade.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RETORNO */}
      {isRetornoModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-blue-500/30 bg-slate-900 p-8 shadow-2xl relative">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <MapPin className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-center text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Destino de Volta</h3>
            <p className="text-center text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest leading-relaxed">
              Para qual cidade você está voltando?
            </p>
            <input 
              type="text" 
              value={destinoRetorno}
              onChange={(e) => setDestinoRetorno(e.target.value)}
              placeholder="Ex: Guarulhos"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 p-5 text-center text-lg font-black uppercase text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 mb-6 placeholder:text-slate-600"
            />
            <div className="flex gap-3">
              <button onClick={() => setIsRetornoModalOpen(false)} className="flex-1 rounded-xl bg-transparent border border-white/10 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button 
                onClick={ativarModoRetorno} 
                disabled={!destinoRetorno.trim() || loadingRetorno} 
                className="flex-[2] rounded-xl bg-blue-600 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50"
              >
                {loadingRetorno ? 'Salvando...' : 'Ativar Retorno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
