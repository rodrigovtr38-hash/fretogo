import { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Radar,
  Truck,
  MapPin,
  ShieldCheck,
  Star,
  Map,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
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
  // Controle do Modo Retorno
  const [isRetornoModalOpen, setIsRetornoModalOpen] = useState(false);
  const [destinoRetorno, setDestinoRetorno] = useState('');
  const [loadingRetorno, setLoadingRetorno] = useState(false);

  // Calcula se o motorista é Elite com base no banco
  const isElite = (driver?.score && Number(driver.score) >= 4.8) || driver?.categoria?.includes('carreta');
  
  // Limite diário (simulado visualmente, o controle real ficará no backend)
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
    <div className="mx-auto mt-8 w-full max-w-7xl px-4 pb-20 animate-in fade-in duration-300">

      {/* HEADER CENTRAL */}
      <div className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              <Radar size={14} className={isOnline ? "animate-spin" : ""} style={{ animationDuration: '3s' }} /> RADAR FRETOGO
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white italic tracking-tighter">
              Sistema <span className="text-cyan-400">Realtime</span> Ativo
            </h2>
            <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-slate-400">
              O radar inteligente monitora fretes próximos, disponibilidade operacional e garante a sincronização brutal entre você e a plataforma de clientes.
            </p>
          </div>

          {/* ONLINE BUTTON */}
          <div className="w-full lg:max-w-sm rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur-xl shadow-inner">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  STATUS DA CONTA
                </p>
                <h3 className={`mt-1 text-2xl md:text-3xl font-black tracking-tight ${isOnline ? 'text-white' : 'text-slate-500'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </h3>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isOnline ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className={`h-4 w-4 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_20px_rgba(74,222,128,0.9)] animate-pulse' : 'bg-red-500'}`} />
              </div>
            </div>

            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`w-full rounded-2xl px-6 py-5 text-sm font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                isOnline
                  ? 'bg-emerald-500 text-slate-900 shadow-[0_10px_20px_rgba(16,185,129,0.2)] hover:bg-emerald-400 hover:scale-[1.02] active:scale-95'
                  : 'bg-red-500 text-white shadow-[0_10px_20px_rgba(239,68,68,0.2)] hover:bg-red-400 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isOnline ? 'Ficar Offline' : 'Ligar Radar'}
            </button>
          </div>
        </div>
      </div>

      {/* FIRE: MODO RETORNO INJETADO (Só aparece se estiver online) */}
      {isOnline && (
        <div className="mt-6 w-full rounded-[2rem] border border-blue-500/20 bg-blue-500/5 p-6 md:p-8 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_rgba(59,130,246,0.05)]">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 shrink-0">
              <RotateCcw className={`w-8 h-8 ${modoRetornoAtivo ? 'text-cyan-400 animate-spin' : 'text-blue-400'}`} style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Rotas de Retorno</h3>
              {modoRetornoAtivo ? (
                <p className="text-sm font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Prioridade para: {driver?.destinoRetorno?.toUpperCase() || 'SUA CIDADE'}
                </p>
              ) : (
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Vai voltar vazio? Ganhe prioridade máxima em cargas para a sua cidade. Restam <span className="font-bold text-blue-400">{retornosRestantes} chances</span> hoje.
                </p>
              )}
            </div>
          </div>
          
          <div className="w-full md:w-auto shrink-0">
            {modoRetornoAtivo ? (
              <button 
                onClick={desativarModoRetorno}
                disabled={loadingRetorno}
                className="w-full md:w-auto px-6 py-4 bg-transparent border border-red-500/50 text-red-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-500/10 transition-colors"
              >
                {loadingRetorno ? 'Desativando...' : 'Cancelar Retorno'}
              </button>
            ) : (
              <button 
                onClick={() => setIsRetornoModalOpen(true)}
                disabled={retornosRestantes <= 0 || loadingRetorno}
                className={`w-full md:w-auto px-8 py-4 font-black text-xs md:text-sm uppercase tracking-widest rounded-2xl transition-all shadow-lg ${retornosRestantes > 0 ? 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] shadow-blue-600/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'}`}
              >
                Ativar Retorno
              </button>
            )}
          </div>
        </div>
      )}

      {/* GRID DE ESTATÍSTICAS E CONTA */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-900/80 p-6 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
            <Map size={14} /> Matching
          </p>
          <div>
            <h3 className="mt-4 text-2xl font-black text-white italic tracking-tighter">GPS LIVE</h3>
            <p className="mt-1 text-xs text-slate-500 font-bold">Monitoramento por raio e proximidade.</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald-500/10 bg-slate-900/80 p-6 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
            <Truck size={14} /> Distribuição
          </p>
          <div>
            <h3 className="mt-4 text-2xl font-black text-white italic tracking-tighter">AUTO DISPATCH</h3>
            <p className="mt-1 text-xs text-slate-500 font-bold">Roleta 30s cravados.</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-yellow-500/10 bg-slate-900/80 p-6 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 flex items-center gap-2">
            <ShieldCheck size={14} /> Conta Fretogo
          </p>
          <div>
            <h3 className="mt-4 text-xl font-black text-white truncate">{driver?.nome || 'Motorista'}</h3>
            <p className="mt-1 text-xs text-slate-500 font-bold uppercase tracking-widest">{driver?.categoria?.replace('_', ' ') || 'Categoria indefinida'}</p>
          </div>
        </div>

        {/* NÍVEL DO MOTORISTA (GAMIFICAÇÃO) */}
        <div className={`rounded-[2rem] border p-6 flex flex-col justify-between ${isElite ? 'bg-purple-900/20 border-purple-500/30' : 'bg-slate-900/80 border-slate-500/10'}`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isElite ? 'text-purple-400' : 'text-slate-400'}`}>
            <Star size={14} /> Nível Operacional
          </p>
          <div>
            <h3 className="mt-4 text-3xl font-black text-white italic tracking-tighter uppercase drop-shadow-md">
              {isElite ? 'ELITE' : 'PIONEIRO'}
            </h3>
            <p className="mt-1 text-[10px] uppercase font-bold tracking-widest text-slate-500">
              {isElite ? 'Prioridade Máxima na Roleta' : 'Complete fretes para subir'}
            </p>
          </div>
        </div>

      </div>

      {/* OPERATION CENTER */}
      <div className="mt-6 rounded-[2rem] border border-white/5 bg-slate-900/50 p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tighter">
          Inteligência Central
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-black/40 p-5">
            <h3 className="font-black text-cyan-400 text-sm uppercase tracking-widest mb-2">GPS Realtime</h3>
            <p className="text-[11px] leading-relaxed text-slate-400 font-medium">Você será notificado instantaneamente caso entre na zona de calor de um cliente solicitando frete.</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/40 p-5">
            <h3 className="font-black text-cyan-400 text-sm uppercase tracking-widest mb-2">Match Compatível</h3>
            <p className="text-[11px] leading-relaxed text-slate-400 font-medium">A distribuição ignora quem está longe e manda a carga baseada no tipo do seu veículo e proximidade física.</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/40 p-5">
            <h3 className="font-black text-cyan-400 text-sm uppercase tracking-widest mb-2">Segurança (PIN)</h3>
            <p className="text-[11px] leading-relaxed text-slate-400 font-medium">O dinheiro só é liberado mediante a verificação do PIN antifraude do embarcador/recebedor.</p>
          </div>
        </div>
      </div>

      {/* MODAL PARA DIGITAR O DESTINO DE RETORNO */}
      {isRetornoModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-blue-500/30 bg-slate-900 p-8 shadow-2xl relative">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <MapPin className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-center text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Destino de Volta</h3>
            <p className="text-center text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest leading-relaxed">
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
              <button onClick={() => setIsRetornoModalOpen(false)} className="flex-1 rounded-xl bg-transparent border border-white/10 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button 
                onClick={ativarModoRetorno} 
                disabled={!destinoRetorno.trim() || loadingRetorno}
                className="flex-[2] rounded-xl bg-blue-600 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50"
              >
                {loadingRetorno ? 'Buscando...' : 'Ativar Retorno'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
