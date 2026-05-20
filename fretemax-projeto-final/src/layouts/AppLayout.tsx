import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#020617] text-slate-200 overflow-x-hidden">

      {/* BACKGROUND GLOBAL */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* BASE */}
        <div className="absolute inset-0 bg-[#020617]" />
        {/* GLOW */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.12),transparent_45%)]" />
        {/* CYAN */}
        <div className="absolute left-[-10%] top-[-5%] h-[40rem] w-[40rem] rounded-full bg-cyan-600/10 blur-[140px]" />
        {/* BLUE */}
        <div className="absolute right-[-10%] top-[10%] h-[35rem] w-[35rem] rounded-full bg-blue-600/10 blur-[160px]" />
        {/* GRID */}
        <div
          className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:40px_40px]"
        />
      </div>

      {/* CONTEÚDO CENTRALIZADO E RESPONSIVO */}
      {/* Aqui está o segredo: flex-1 e mx-auto garantem que o conteúdo do Cliente/Motorista ocupe o centro */}
      <div className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
      
    </div>
  );
}
