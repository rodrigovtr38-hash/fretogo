import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Truck, MapPin, Star, ChevronRight, Download } from 'lucide-react';

export default function Home() {

  // ✅ Função estratégica para o Botão Baixar App (Mantém a autoridade)
  const handleDownloadClick = () => {
    alert('O App Fretogo Driver está em fase final de publicação nas lojas! Por enquanto, clique em "Ser Motorista" logo ao lado para acessar o painel e receber corridas pelo navegador.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto relative z-10">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-400 w-8 h-8 fill-yellow-400" />
          <span className="font-black text-2xl italic tracking-tighter">FRETOGO</span>
        </div>
        <div className="hidden md:flex gap-8">
          <Link to="/cliente" className="text-sm font-bold text-slate-300 hover:text-yellow-400 transition">Simular Frete</Link>
          <Link to="/motorista" className="text-sm font-bold text-slate-300 hover:text-blue-400 transition">Sou Motorista</Link>
        </div>
      </nav>

      {/* HERO SECTION ORIGINAL RECUPERADA */}
      <section className="relative grid md:grid-cols-2 gap-10 items-center max-w-7xl mx-auto px-6 py-12 md:py-24">
        <div className="z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Radar Ativo em sua região</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black leading-[0.9] mb-6">
            SUA CARGA NO <span className="text-yellow-400 italic">RADAR</span>.<br />
            O MOTORISTA NA <span className="text-blue-500 italic">PORTA</span>.
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
            A primeira plataforma de fretes autônoma com matching inteligente. 
            Contrate em segundos, acompanhe em tempo real. 
            <span className="text-white font-bold block mt-2">Sem mensalidade. Sem burocracia.</span>
          </p>

          {/* 🔥 SEUS BOTÕES ORIGINAIS + O NOVO BOTÃO DE DOWNLOAD */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <Link to="/cliente" className="group bg-blue-600 hover:bg-blue-500 px-8 py-5 rounded-2xl font-black uppercase italic shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)] transition-all flex items-center justify-center gap-2">
              Contratar Frete <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/motorista" className="bg-white text-slate-950 hover:bg-slate-100 px-8 py-5 rounded-2xl font-black uppercase italic transition-all text-center flex items-center justify-center">
              Ser Motorista
            </Link>
            
            {/* BOTÃO BAIXAR APP INJETADO SEM QUEBRAR SEU LAYOUT */}
            <button onClick={handleDownloadClick} className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-8 py-5 rounded-2xl font-black uppercase italic transition-all shadow-lg shadow-yellow-500/20 text-center flex items-center justify-center gap-2 sm:w-auto w-full">
              <Download size={20} /> Baixar App
            </button>
          </div>
        </div>

        {/* VISUAL LADO DIREITO (SIMULAÇÃO DE APP - O SEU DESIGN PREMIUM) */}
        <div className="relative flex justify-center mt-8 md:mt-0">
           <div className="w-full max-w-[340px] aspect-[9/16] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 w-full h-full bg-[url('https://www.google.com/maps/about/images/home/home-maps-icon.svg')] opacity-20 bg-center bg-cover"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-6">
                  <div className="bg-white text-slate-950 p-4 rounded-2xl shadow-xl animate-bounce">
                      <div className="flex items-center gap-3">
                        <div className="bg-yellow-400 p-2 rounded-lg"><Truck className="w-5 h-5"/></div>
                        <div>
                          <p className="text-[10px] font-black uppercase opacity-50">Motorista Próximo</p>
                          <p className="font-black italic">Ricardo S. - 2.4km</p>
                        </div>
                      </div>
                  </div>
              </div>
           </div>
           {/* Floating badges */}
           <div className="absolute -left-2 md:-left-6 top-1/4 bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-pulse">
              <ShieldCheck className="text-green-500 w-6 h-6" />
              <p className="text-xs font-bold uppercase">Verificado</p>
           </div>
        </div>
      </section>

      {/* PROVAS DE CONFIANÇA */}
      <section className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-900">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
           {[
             {icon: <Zap className="text-yellow-400"/>, t: "Agilidade", d: "Match em < 1 min"},
             {icon: <ShieldCheck className="text-green-500"/>, t: "Segurança", d: "Motoristas Rigorosos"},
             {icon: <MapPin className="text-blue-500"/>, t: "Radar", d: "Rastreio Real-Time"},
             {icon: <Star className="text-orange-400"/>, t: "Zero Taxa", d: "Sem Mensalidades"}
           ].map((item, i) => (
             <div key={i} className="flex flex-col md:flex-row gap-4 items-center md:items-start text-center md:text-left">
                <div className="bg-slate-900 p-3 rounded-xl h-fit w-fit">{item.icon}</div>
                <div>
                  <p className="font-black uppercase text-sm italic">{item.t}</p>
                  <p className="text-slate-500 text-xs mt-1">{item.d}</p>
                </div>
             </div>
           ))}
        </div>
      </section>
    </div>
  );
}
