// =========================================================
// NOME DO ARQUIVO: src/components/home/BenefitsSection.tsx
// CTO-Log: Quebra de Objeções (Trust Indicators). 
// Foca em agilidade, segurança e transparência comercial.
// =========================================================

import { ShieldCheck, Zap, MapPin, Star } from 'lucide-react';

const benefits = [
  {
    icon: <Zap className="h-7 w-7 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />,
    title: 'Match Instantâneo',
    description: 'Algoritmo proprietário conecta sua carga ao motorista ideal em menos de 60 segundos.',
  },
  {
    icon: <ShieldCheck className="h-7 w-7 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />,
    title: 'Frota Blindada',
    description: '100% dos parceiros passam por validação de CNH e histórico antes de entrar no radar.',
  },
  {
    icon: <MapPin className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />,
    title: 'Torre de Controle',
    description: 'Acompanhe cada curva do trajeto. Rastreamento ativo da coleta até a doca de entrega.',
  },
  {
    icon: <Star className="h-7 w-7 text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.5)]" />,
    title: 'Sem Taxas Ocultas',
    description: 'Precificação dinâmica e transparente. Você só paga pelo frete executado com sucesso.',
  },
];

export default function BenefitsSection() {
  return (
    <section className="relative z-20 w-full bg-slate-950">
      <div className="relative flex w-full flex-col items-center border-t border-white/5 px-4 py-20 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mb-16">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            A infraestrutura que o seu <span className="text-cyan-400 italic">negócio exige.</span>
          </h2>
        </div>

        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {benefits.map((item, index) => (
            <div
              key={index}
              className="group flex w-full flex-col gap-6 rounded-[2rem] border border-white/5 bg-slate-900/30 p-8 text-left shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-cyan-500/30 hover:bg-slate-900/80 hover:shadow-[0_20px_40px_rgba(6,182,212,0.1)]"
            >
              <div className="shrink-0 inline-flex rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:border-cyan-500/30">
                {item.icon}
              </div>

              <div className="flex flex-col">
                <h3 className="mb-3 text-xl font-black uppercase tracking-wide text-white transition-colors group-hover:text-cyan-400">
                  {item.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-slate-400">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
