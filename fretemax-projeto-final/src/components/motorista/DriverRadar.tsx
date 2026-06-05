import { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Radar,
  Truck,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Banknote,
  Clock,
  MessageCircle,
  Zap
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

  const isElite = (driver?.score && Number(driver?.score) >= 4.8) || driver?.categoria?.includes('carreta');
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

  const openWhatsAppSupport = () => {
    window.open('https://wa.me/5511946099840', '_blank');
  };

  return (
    <div className="mx-auto mt-8 w-full max-w-7xl px-4 pb-20 animate-in fade-in duration-300">

      {/* HEADER: BOTÃO ONLINE E IDENTIFICAÇÃO */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          
          <div className="flex items-center gap-6">
            <div className={`flex h-20 w-20 items-center justify-center rounded-3xl border-2 ${isElite ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-blue-500 bg-blue-500/10 text-blue-400'}`}>
              <Truck size={36} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter truncate max-w-[250px]">
                {driver?.nome || 'Motorista'}
              </h2>
              <p className="mt-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                {driver?.categoria?.replace('_', ' ') || 'Veículo Padrão'}
                <span className={`rounded-md px-2 py-0.5 text-[9px] ${isElite ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {isElite ? 'ELITE' : 'PIONEIRO'}
                </span>
              </p>
            </div>
          </div>

          <div className="w-full lg:max-w-xs">
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex w-full items-center justify-between rounded-[1.5rem] p-6 transition-all duration-300 ${
                isOnline
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_10px_40px_rgba(16,185,129,0.3)] hover:bg-emerald-400 active:scale-95'
                  : 'bg-slate-900 border border-red-500/30 text-white shadow-lg hover:bg-slate-800 active:scale-95'
              }`}
            >
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                  Sistema de Rastreio
                </p>
                <h3 className="text-2xl font-black tracking-tight mt-1">
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </h3>
              </div>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm`}>
                <div className={`h-6 w-6 rounded-full ${isOnline ? 'bg-slate-950 shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-pulse' : 'bg-red-500'}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA VISUAL DO RADAR */}
      <div className={`mt-6 flex flex-col items-center justify-center rounded-[2.5rem] border border-slate-800 py-16 md:py-24 transition-colors duration-700 ${isOnline ? 'bg-slate-900/50' : 'bg-slate-950'}`}>
        <div className="relative flex h-32 w-32 items-center justify-center">
          {isOnline && (
            <>
              <div className="absolute inset-0 animate-ping rounded-full border-4 border-emerald-500/30" style={{ animationDuration: '3s' }}></div>
              <div className="absolute inset-[-50%] animate-ping rounded-full border-2 border-emerald-500/10" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
            </>
          )}
          <div className={`relative z-10 flex h-full w-full items-center justify-center rounded-full border-4 ${isOnline ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-slate-900 text-slate-700'}`}>
            <Radar className={`h-14 w-14 ${isOnline ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          </div>
        </div>
        <div className="mt-8 text-center px-4">
          <h3 className={`text-2xl md:text-3xl font-black uppercase italic tracking-tighter ${isOnline ? 'text-white' : 'text-slate-600'}`}>
            {isOnline ? 'Buscando Fretes...' : 'Radar Desligado'}
          </h3>
          <p className="mt-3 text-sm md:text-base font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
            {isOnline 
              ? 'Mantenha o aplicativo aberto. Assim que uma carga surgir na sua região para a sua categoria, ela aparecerá aqui instantaneamente.' 
              : 'Fique online para começar a receber as melhores cargas da sua região.'}
          </p>
        </div>
      </div>

      {/* MODO RETORNO */}
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
                <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-md">
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

      {/* MURAL DE VALORES FRETOGO (SUA COMUNICAÇÃO DE VALOR) */}
      <div className="mt-6 rounded-[2.5rem] border border-slate-800 bg-slate-950 p-6 md:p-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-white italic tracking-tighter">
            Padrão <span className="text-blue-500">Fretogo</span>
          </h2>
          <button onClick={openWhatsAppSupport} className="hidden md:flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-slate-950 transition-colors border border-[#25D366]/30">
            <MessageCircle size={16} /> Falar com Administração
          </button>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          
          <div className="rounded-3xl border border-white/5 bg-slate-900 p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
              <Banknote size={120} className="text-emerald-500 -mt-4 -mr-4" />
            </div>
            <div className="relative z-10">
              <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <Clock size={24} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Repasse em 24h</h3>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400">
                O seu pagamento é garantido. Após a finalização da entrega com o PIN do cliente, transferimos o valor para sua conta em até um dia útil. A meta da Fretogo é garantir que vocês sejam reconhecidos como merecem.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-slate-900 p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldCheck size={120} className="text-blue-500 -mt-4 -mr-4" />
            </div>
            <div className="relative z-10">
              <div className="mb-4 inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Zero Mensalidade</h3>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400">
                Nós somos parceiros do seu crescimento. Vocês não pagam nenhuma mensalidade ou taxa de entrada. Em breve fecharemos contratos exclusivos com empresas grandes para os motoristas da base.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-slate-900 p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors sm:col-span-2 lg:col-span-1">
            <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
              <Truck size={120} className="text-amber-500 -mt-4 -mr-4" />
            </div>
            <div className="relative z-10">
              <div className="mb-4 inline-flex rounded-xl bg-amber-500/10 p-3 text-amber-400">
                <MapPin size={24} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">As Melhores Cargas</h3>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400">
                Conectamos 7 categorias de veículos (da moto ao bitrem) direto com empresários que buscam frete todo dia. Indique seus amigos! Nossa missão é acabar com as dificuldades que vocês encontram hoje.
              </p>
            </div>
          </div>

        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
           <p className="text-xs text-slate-400 text-center font-medium italic">
             Problemas acontecem em qualquer operação. Vocês têm total liberdade de chamar a administração pelo botão abaixo para analisarmos melhorias que ajudem todos da plataforma.
           </p>
           <button onClick={openWhatsAppSupport} className="mt-4 md:hidden w-full flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform border border-[#25D366]/30">
             <MessageCircle size={18} /> Chamar Administração
           </button>
        </div>
      </div>

      {/* MODAL RETORNO */}
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
              <button onClick={ativarModoRetorno} disabled={!destinoRetorno.trim() || loadingRetorno} className="flex-[2] rounded-xl bg-blue-600 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50">
                {loadingRetorno ? 'Buscando...' : 'Ativar Retorno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
