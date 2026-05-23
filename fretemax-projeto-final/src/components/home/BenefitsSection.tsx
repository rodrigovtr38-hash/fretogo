import {
  ShieldCheck,
  Zap,
  MapPin,
  Star,
} from 'lucide-react';

const benefits = [
  {
    icon: (
      <Zap className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" />
    ),
    title: 'Agilidade',
    description:
      'Match inteligente em menos de 1 minuto.',
  },

  {
    icon: (
      <ShieldCheck className="h-7 w-7 text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
    ),
    title: 'Segurança',
    description:
      '100% dos motoristas com CNH validada.',
  },

  {
    icon: (
      <MapPin className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
    ),
    title: 'Radar Vivo',
    description:
      'Rastreamento ponta a ponta realtime.',
  },

  {
    icon: (
      <Star className="h-7 w-7 text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.8)]" />
    ),
    title: 'Zero Taxa',
    description:
      'Plataforma sem mensalidades escondidas.',
  },
];

export default function BenefitsSection() {
  return (
    <section className="relative z-20 mt-auto w-full">
      <div className="pointer-events-none absolute inset-0 bg-slate-900/20 backdrop-blur-sm" />

      <div className="relative flex w-full flex-col items-center border-t border-white/10 px-6 py-16">
        <div
          className="
            mx-auto
            grid
            w-full
            max-w-7xl
            grid-cols-1
            gap-6
            sm:grid-cols-2
            lg:grid-cols-4
            lg:gap-8
          "
        >
          {benefits.map((item, index) => (
            <div
              key={index}
              className="
                group
                flex
                w-full
                flex-col
                gap-5
                rounded-[2rem]
                border
                border-white/5
                bg-slate-900/40
                p-8
                text-center
                shadow-[0_15px_40px_rgba(0,0,0,0.3)]
                backdrop-blur-md
                transition-all
                duration-300
                hover:border-cyan-500/40
                hover:bg-slate-900/80
                hover:shadow-[0_15px_50px_rgba(6,182,212,0.15)]
                sm:items-start
                sm:text-left
              "
            >
              <div
                className="
                  shrink-0
                  rounded-2xl
                  border
                  border-white/10
                  bg-slate-950
                  p-4
                  shadow-inner
                  transition-transform
                  duration-300
                  group-hover:scale-110
                "
              >
                {item.icon}
              </div>

              <div className="flex flex-col">
                <h3
                  className="
                    mb-2
                    text-lg
                    font-black
                    uppercase
                    italic
                    tracking-wide
                    text-white
                    transition-colors
                    group-hover:text-cyan-50
                  "
                >
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
