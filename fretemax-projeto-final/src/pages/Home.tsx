import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Truck, MapPin, Star, ChevronRight, Download, XCircle } from 'lucide-react';

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans overflow-x-hidden relative">
      
      {/* 🔥 EFEITO RADAR PULSANTE NO FUNDO (Identidade Visual Otimizada) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#09090b] via-[#18181b] to-cyan-900/10 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-40">
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-[ping_3s_ease-in-out_infinite]"></div>
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-[ping_3s_ease-in-out_infinite]" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-[ping_3s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* MODAL BAIXAR APP */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#18181b] rounded-[2rem] p-8 max-w-sm w-full text-center shadow-[0_0_40px_rgba(6,182,212,0.2)] border border-white/10">
            <Download className="w-12 h-12 text-yellow-500 mx-auto mb-4 drop-shadow-md" />
            <h3 className="text-xl font-black text-white mb-2 uppercase italic">App Em Breve</h3>
            <p className="text-gray-400 font-medium text-sm mb-6">O App Fretogo Driver está em fase final de publicação nas lojas! Por enquanto, clique em "Ser Motorista" para acessar o painel e receber corridas pelo navegador.</p>
            <button onClick={() => setShowModal(false)} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-xl transition-colors uppercase text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* 🔥 ÍCONE OFICIAL SVG DO WHATSAPP (Aprovações e Conversão) - INTOCÁVEL */}
      <a href="https://wa.me/5511946099840" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#128C7E] hover:scale-110 transition-all p-4 rounded-full shadow-2xl flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-8 h-8 animate-pulse fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      </a>

      {/* NAVBAR */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto relative z-10">
        <div className="flex items-center gap-2">
          <Zap className="text-cyan-400 w-8 h-8 fill-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          <span className="font-black text-2xl italic tracking-tighter text-white">FRETOGO</span>
        </div>
        <div className="hidden md:flex gap-8">
          <Link to="/cliente" className="text-sm font-bold text-gray-300 hover:text-cyan-400 transition">Simular Frete</Link>
          <Link to="/motorista" className="text-sm font-bold text-gray-300 hover:text-white transition">Sou Motorista</Link>
        </div>
      </nav>

      {/* HERO SECTION ORIGINAL RECUPERADA & OTIMIZADA */}
      <section className="relative grid md:grid-cols-2 gap-10 items-center max-w-7xl mx-auto px-6 py-12 md:py-24">
        <div className="z-10">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Radar Ativo em sua região</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black leading-[0.9] mb-6 text-white">
            SUA CARGA NO <span className="text-cyan-400 italic drop-shadow-[0_0_15px_rgba(6,182,2
