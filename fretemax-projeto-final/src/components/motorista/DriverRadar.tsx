import { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Radar,
  MapPin,
  CheckCircle2,
  RotateCcw,
  Power
} from 'lucide-react';

interface DriverRadarProps {
  isOnline: boolean;
  setIsOnline: (value: boolean) => void;
  user: any;
  driver: any;
}

export default function DriverRadar({
  isOnline,
  setIsOnline,
  user,
  driver,
}: DriverRadarProps) {
  const [isRetornoModalOpen, setIsRetornoModalOpen] = useState(false);
  const [destinoRetorno, setDestinoRetorno] = useState('');
  const [loadingRetorno, setLoadingRetorno] = useState(false);

  const retornosUsadosHoje = driver?.retornosUsados || 0;
  const retornosRestantes = Math.max(0, 2 - retornosUsadosHoje);
  const modoRetornoAtivo = driver?.modoRetorno || false;

  const ativarModoRetorno = async () => {
    if (!destinoRetorno.trim() || retornosRestantes <= 0 || loadingRetorno) return;
    setLoadingRetorno(true);
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'motoristas_online', user.uid), {
          modoRetorno: true,
          destinoRetorno: destinoRetorno.trim().toLowerCase(),
          retornosUsados: retornosUsadosHoje + 1,
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
        await updateDoc(doc(db, 'motoristas_online', user.uid), {
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

  return (
    <div className="mx-auto mt-4 w-full max-w-7xl px-4 pb-20 animate-in fade-in duration-300">

      {/* BOTÃO GIGANTE DE ONLINE/OFFLINE PADRÃO UBER */}
      <div className="flex flex-col items-center justify-center py-10">
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`relative flex h-48 w-48 items-center justify-center rounded-full transition-all duration-300 shadow-2xl active:scale-95 ${
            isOnline
              ? 'bg-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.4)] hover:bg-emerald-400'
              : 'bg-slate-900 border-4 border-slate-800 hover:border-slate-700'
          }`}
        >
          {isOnline ? (
            <>
              <div className="absolute inset-0 animate-ping rounded-full border-4 border-emerald-400/50" style={{ animationDuration: '2s' }}></div>
              <div className="absolute inset-[-30%] animate-ping rounded-full border-2 border-emerald-400/20" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
              <div className="flex flex-col items-center justify-center text-slate-950">
                <Radar size={48} className="animate-spin" style={{ animationDuration: '4s' }} />
                <span className="mt-2 text-lg font-black uppercase tracking-widest">Online</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <Power size={48} />
              <span className="mt-2 text-lg font-black uppercase tracking-widest">Iniciar</span>
            </div>
          )}
        </button>
        
        {!isOnline && (
          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-slate-500">
            Toque para receber fretes
          </p>
        )}
      </div>

      {/* MODO RETORNO (Só aparece online) */}
      {isOnline && (
        <div className="w-full rounded-3xl border border-blue-500/20 bg-slate-900/80 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shrink-0">
              <RotateCcw className={`w-6 h-6 ${modoRetornoAtivo ? 'text-emerald-400 animate-spin' : 'text-blue-400'}`} style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Filtro de Destino</h3>
              {modoRetornoAtivo ? (
                <p className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Voltando para: {driver?.destinoRetorno?.toUpperCase()}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  Ative para fretes sentido casa. Restam <span className="font-bold text-blue-400">{retornosRestantes} chances</span> hoje.
                </p>
              )}
            </div>
          </div>
          
          <div className="w-full md:w-auto shrink-0">
            {modoRetornoAtivo ? (
              <button 
                onClick={desativarModoRetorno}
                disabled={loadingRetorno}
                className="w-full md:w-auto px-6 py-3 bg-transparent border border-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors"
              >
                {loadingRetorno ? 'Desativando...' : 'Desativar Filtro'}
              </button>
            ) : (
              <button 
                onClick={() => setIsRetornoModalOpen(true)}
                disabled={retornosRestantes <= 0 || loadingRetorno}
                className={`w-full md:w-auto px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all ${retornosRestantes > 0 ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'}`}
              >
                Ativar Retorno
              </button>
            )}
          </div>
        </div>
      )}

      {/* TEXTO PADRÃO FRETOGO (Escondido quando ONLINE para focar no Radar) */}
      {!isOnline && (
        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 md:p-8 text-center">
          <h2 className="text-xl font-black text-white italic tracking-tighter mb-4">
            Padrão <span className="text-cyan-500">FretoGo</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
              <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-2">Repasse em 24h</h4>
              <p className="text-xs text-slate-400">Finalizou com PIN? O dinheiro é transferido em um dia útil.</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
              <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-2">Zero Mensalidade</h4>
              <p className="text-xs text-slate-400">Sem taxas escondidas. O valor do radar é o que cai no bolso.</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
              <h4 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-2">Contratos Fixos</h4>
              <p className="text-xs text-slate-400">Os melhores pontuados ganham rotas de grandes empresas.</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RETORNO */}
      {isRetornoModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-[2rem] border border-blue-500/30 bg-slate-900 p-8 shadow-2xl relative">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <MapPin className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-center text-xl font-black uppercase tracking-tighter text-white mb-2">Destino de Volta</h3>
            <p className="text-center text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest leading-relaxed">
              Para qual cidade você quer ir?
            </p>
            <input 
              type="text" 
              value={destinoRetorno}
              onChange={(e) => setDestinoRetorno(e.target.value)}
              placeholder="Ex: Guarulhos"
              className="w-full rounded-xl border border-white/10 bg-slate-950 p-4 text-center text-sm font-black uppercase text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setIsRetornoModalOpen(false)} className="flex-1 rounded-xl bg-transparent border border-white/10 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={ativarModoRetorno} disabled={!destinoRetorno.trim() || loadingRetorno} className="flex-[2] rounded-xl bg-blue-600 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50">
                Ativar Filtro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
