import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Truck,
  MapPin,
  Star,
  ChevronRight,
  Download
} from 'lucide-react';

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="w-full min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative selection:bg-cyan-500/30 selection:text-cyan-50">

      {/* =====================================================
          FUNDO PREMIUM & GLOW CINEMATOGRÁFICO
      ===================================================== */}

      {/* Base Gradient - Dark mais aberto e vibrante */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-[#020617] pointer-events-none"></div>

      {/* Ambient Glow Superior - Stripe Style */}
      <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-cyan-600/15 blur-[140px] rounded-full pointer-events-none mix-blend-screen"></div>

      {/* Ambient Glow Lateral - Profundidade */}
      <div className="absolute top-[15%] right-[-10%] w-[45%] h-[65%] bg-blue-600/15 blur-[160px] rounded-full pointer-events-none mix-blend-screen"></div>

      {/* Micro Highlights Inferiores */}
      <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[30%] bg-cyan-500/10 blur-[120px] pointer-events-none mix-blend-screen"></div>

      {/* Radar Background Animado (Premium e Suave) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.35]">
        <div className="relative w-[1200px] h-[1200px]">
          <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_40px_rgba(6,182,212,0.15)]"></div>
          <div
            className="absolute inset-[15%] rounded-full border border-cyan-400/20 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]"
            style={{ animationDelay: '2s' }}
          ></div>
          <div
            className="absolute inset-[30%] rounded-full border border-cyan-300/10 animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]"
            style={{ animationDelay: '4s' }}
          ></div>
        </div>
      </div>

      {/* =====================================================
          MODAL APP (INTACTO)
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-[0_0_60px_rgba(6,182,212,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>
            <Download className="w-16 h-16 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]" />
            <h3 className="text-2xl font-black italic uppercase mb-4 text-white tracking-tight">
              App Em Breve
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 font-medium">
              O aplicativo oficial da FRETOGO está sendo publicado nas lojas.
              Enquanto isso, você já pode usar o sistema completo pelo navegador.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 hover:scale-[1.02] active:scale-95 transition-all duration-200 text-slate-950 font-black py-4 rounded-2xl uppercase text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] tracking-wide"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          WHATSAPP (INTACTO)
      ===================================================== */}

      <a
        href="https://wa.me/5511946099840"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20bd5a] hover:scale-110 active:scale-95 transition-all duration-300 p-4 rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.3)] group"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white group-hover:animate-pulse">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487" />
        </svg>
      </a>

      {/* =====================================================
          WRAPPER PRINCIPAL
      ===================================================== */}
      <div className="relative z-10 w-full flex flex-col min-h-screen">
      
        {/* =====================================================
            NAVBAR
        ===================================================== */}
        <header className="w-full">
          <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-cyan-400 fill-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
              <span className="font-black text-2xl italic tracking-tighter text-white">
                FRETOGO
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <Link
                to="/contratar"
                className="text-sm font-bold text-slate-300 hover:text-cyan-400 transition-colors"
              >
                Simular Frete
              </Link>
              <Link
                to="/parceiros"
                className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
              >
                Sou Motorista
              </Link>
            </div>
          </nav>
        </header>

        {/* =====================================================
            HERO GRID 
        ===================================================== */}
        <main className="flex-1 w-full flex items-center justify-center">
          <section className="max-w-7xl w-full mx-auto px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center justify-items-center">

            {/* COLUNA ESQUERDA: TEXTO */}
            <div className="w-full max-w-[600px] flex flex-col items-start justify-center lg:justify-self-start z-10">

              <div className="inline-flex items-center gap-3 bg-cyan-950/50 border border-cyan-500/30 px-5 py-2.5 rounded-full mb-8 backdrop-blur-md shadow-[0_4px_25px_rgba(6,182,212,0.2)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,1)]"></span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300 drop-shadow-sm">
                  Radar ativo em sua região
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] font-black mb-6 text-white tracking-tight">
                SUA CARGA NO{' '}
                <span className="text-cyan-400 italic drop-shadow-[0_0_35px_rgba(6,182,212,0.7)] relative inline-block">
                  RADAR
                </span>
                .<br />
                O MOTORISTA NA{' '}
                <span className="text-yellow-400 italic drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]">
                  PORTA
                </span>
                .
              </h1>

              <p className="text-slate-300 text-lg md:text-xl leading-relaxed max-w-[540px] mb-12 font-medium drop-shadow-md">
                A primeira plataforma de fretes autônoma com matching inteligente.
                Contrate em segundos e acompanhe tudo em tempo real.
                <span className="block mt-4 text-white font-bold text-xl drop-shadow-[0_2px_15px_rgba(0,0,0,0.6)]">
                  Sem mensalidade. Sem burocracia.
                </span>
              </p>

              {/* BOTÕES (AJUSTADO: Maior padding, mais altos, mais gap, visual premium SaaS) */}
              <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
                <Link
                  to="/contratar"
                  className="group bg-cyan-500 hover:bg-cyan-400 hover:scale-[1.02] active:scale-95 transition-all duration-300 text-slate-950 px-12 py-6 rounded-[1.25rem] font-black uppercase italic flex items-center justify-center gap-3 shadow-[0_15px_50px_rgba(6,182,212,0.45)] w-full sm:w-auto text-[15px] tracking-widest"
                >
                  Contratar Frete
                  <ChevronRight className="group-hover:translate-x-1.5 transition-transform" size={20} />
                </Link>

                <Link
                  to="/parceiros"
                  className="bg-slate-800/60 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300 px-12 py-6 rounded-[1.25rem] font-black uppercase italic flex items-center justify-center w-full sm:w-auto text-[15px] text-white backdrop-blur-md tracking-widest shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                >
                  Ser Motorista
                </Link>

                <button
                  onClick={() => setShowModal(true)}
                  className="bg-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] active:scale-95 transition-all duration-300 text-slate-950 px-12 py-6 rounded-[1.25rem] font-black uppercase italic flex items-center justify-center gap-3 shadow-[0_15px_45px_rgba(250,204,21,0.4)] w-full sm:w-auto text-[15px] tracking-widest"
                >
                  <Download size={20} />
                  Baixar App
                </button>
              </div>

            </div>

            {/* COLUNA DIREITA: CELULAR */}
            <div className="w-full flex justify-center lg:justify-self-end relative mt-12 lg:mt-0 z-10">
              <div className="relative w-full max-w-[320px] xl:max-w-[340px] aspect-[9/16] rounded-[3rem] border-[6px] border-slate-800/80 bg-slate-950 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.9),0_0_60px_rgba(6,182,212,0.25)] flex-shrink-0 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10"></div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 rounded-full bg-cyan-500/15 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                    <div
                      className="absolute inset-4 rounded-full bg-cyan-400/15 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"
                      style={{ animationDelay: '0.8s' }}
                    ></div>
                  </div>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] z-20">
                  <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] animate-[bounce_4s_infinite]">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-400 p-2.5 rounded-xl shadow-inner">
                        <Truck className="w-5 h-5 text-slate-950 drop-shadow-sm" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-0.5">
                          Motorista Próximo
                        </p>
                        <p className="font-black italic text-white text-sm">
                          Ricardo S. • 2.4km
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-4 md:-left-8 top-[30%] bg-slate-900/95 border border-green-500/40 backdrop-blur-xl px-6 py-5 rounded-2xl flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-pulse z-30">
                <ShieldCheck className="text-green-400 w-7 h-7 drop-shadow-[0_0_15px_rgba(74,222,128,0.7)]" />
                <span className="text-sm font-black uppercase text-white tracking-widest">
                  Verificado
                </span>
              </div>
            </div>

          </section>
        </main>

        {/* =====================================================
            CARDS (FOOTER SECTION - CORRIGIDO: Distribuição e Visual)
        ===================================================== */}
        <section className="w-full mt-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-none"></div>
          
          <div className="relative z-10 w-full px-6 py-16 border-t border-white/10 flex justify-center">
            
            {/* Adicionado justify-center e w-full para o container pai */}
            <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

              {[
                {
                  icon: <Zap className="text-yellow-400 w-7 h-7 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />,
                  t: 'Agilidade',
                  d: 'Match em menos de 1 minuto'
                },
                {
                  icon: <ShieldCheck className="text-green-400 w-7 h-7 drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]" />,
                  t: 'Segurança',
                  d: 'Motoristas verificados'
                },
                {
                  icon: <MapPin className="text-cyan-400 w-7 h-7 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />,
                  t: 'Radar Vivo',
                  d: 'Rastreamento em tempo real'
                },
                {
                  icon: <Star className="text-orange-400 w-7 h-7 drop-shadow-[0_0_15px_rgba(251,146,60,0.8)]" />,
                  t: 'Zero Taxa',
                  d: 'Sem mensalidades escondidas'
                }
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center sm:items-start gap-6 p-10 rounded-[2rem] bg-slate-900/50 border border-white/10 hover:bg-slate-900/80 hover:border-cyan-500/40 transition-all duration-300 backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_50px_rgba(6,182,212,0.15)] group w-full text-center sm:text-left"
                >
                  <div className="bg-slate-950 border border-white/10 p-4 rounded-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <div className="flex flex-col">
                    <p className="font-black uppercase italic text-lg text-white tracking-wide mb-2 group-hover:text-cyan-50 transition-colors">
                      {item.t}
                    </p>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                      {item.d}
                    </p>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
