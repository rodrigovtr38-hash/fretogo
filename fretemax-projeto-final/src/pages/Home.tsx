import { Link } from 'react-router-dom';
import { Zap, Truck, Package, ShieldCheck, Download, ArrowRight, MapPin, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden flex flex-col">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-400 w-8 h-8 fill-yellow-400" />
          <span className="font-black text-2xl italic tracking-tighter">FRETOGO</span>
        </div>
        <div className="hidden md:flex gap-8">
          <Link to="/cliente" className="text-sm font-bold text-slate-300 hover:text-yellow-400 transition">Simular Frete</Link>
          <Link to="/motorista" className="text-sm font-bold text-slate-300 hover:text-blue-400 transition">Sou Motorista</Link>
        </div>
      </nav>

      {/* HERO SECTION DE ALTA CONVERSÃO */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 -mt-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

        <h1 className="text-5xl md:text-7xl font-black italic uppercase text-center tracking-tight leading-[1.1] mb-6 drop-shadow-xl">
          A Evolução da <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
            Logística Autônoma
          </span>
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl text-center max-w-2xl font-medium mb-12">
          Conectamos cargas a motoristas verificados em tempo real. Segurança, preço justo e rastreamento via satélite.
        </p>

        {/* CTA DUAL (Engenharia de Vendas) */}
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-4xl justify-center">
          
          {/* CARD CLIENTE */}
          <div className="flex-1 bg-white p-1 rounded-3xl shadow-2xl hover:scale-[1.02] transition-transform duration-300 max-w-sm">
            <div className="bg-slate-50 rounded-[1.3rem] p-8 h-full flex flex-col items-center text-center border border-slate-100">
              <Package className="text-blue-600 w-16 h-16 mb-4 drop-shadow-md" />
              <h2 className="text-2xl font-black text-slate-950 uppercase italic mb-2">Para sua Empresa</h2>
              <p className="text-slate-500 font-bold text-sm mb-8">Envie cargas de qualquer tamanho agora mesmo.</p>
              <button onClick={() => window.location.href = '/cliente'} className="w-full mt-auto bg-blue-600 text-white py-5 rounded-2xl font-black uppercase italic shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                Simular Frete <ArrowRight size={20} />
              </button>
            </div>
          </div>

          {/* CARD MOTORISTA (COM GATILHO PARA BAIXAR APP) */}
          <div className="flex-1 bg-slate-900 p-1 rounded-3xl shadow-2xl border border-slate-800 hover:scale-[1.02] transition-transform duration-300 max-w-sm">
            <div className="bg-slate-950 rounded-[1.3rem] p-8 h-full flex flex-col items-center text-center border border-slate-900">
              <Truck className="text-yellow-500 w-16 h-16 mb-4 drop-shadow-md" />
              <h2 className="text-2xl font-black text-white uppercase italic mb-2">Para Motoristas</h2>
              <p className="text-slate-400 font-bold text-sm mb-8">Seja seu chefe. Cadastre-se e entre no radar.</p>
              
              <div className="w-full mt-auto space-y-3">
                <button onClick={() => window.location.href = '/motorista'} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                  Acessar Painel Web
                </button>
                <button className="w-full bg-yellow-500 text-slate-950 py-4 rounded-2xl font-black uppercase italic shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2">
                  <Download size={20} /> Baixar App Driver
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* TRUST BADGES */}
        <div className="mt-16 flex flex-wrap justify-center gap-6 opacity-60">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><ShieldCheck className="text-green-400" /> Cargas Seguradas</div>
          <div className="hidden md:block w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><Zap className="text-yellow-400 fill-yellow-400" /> Matching Rápido</div>
          <div className="hidden md:block w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><Star className="text-blue-400" /> Motoristas Premium</div>
        </div>
      </main>
    </div>
  );
}
