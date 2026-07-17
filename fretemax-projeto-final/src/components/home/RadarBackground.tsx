// =========================================================
// NOME DO ARQUIVO: src/components/home/RadarBackground.tsx
// CTO-Log: Engenharia Visual. Animações nativas com Tailwind para leveza.
// =========================================================

export default function RadarBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      
      {/* ===================================================
          ANÉIS DO RADAR (Com pulsação contínua)
      =================================================== */}
      <div className="absolute left-1/2 top-1/2 h-[50rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/5 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />
      <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />
      <div className="absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/20" />

      {/* ===================================================
          LINHA DE VARREDURA (PULSE / SCANNER)
      =================================================== */}
      <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-transparent bg-gradient-to-tr from-cyan-500/5 to-transparent animate-spin" style={{ animationDuration: '8s' }} />

      {/* ===================================================
          NÚCLEO GLOW
      =================================================== */}
      <div className="absolute left-1/2 top-1/2 h-[14rem] w-[14rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[80px]" />

      {/* ===================================================
          PONTOS DE ATIVIDADE (DOTS)
      =================================================== */}
      <div className="absolute left-[18%] top-[28%] h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.9)] animate-pulse" />
      <div className="absolute right-[20%] top-[32%] h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.9)] animate-bounce" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-[25%] left-[28%] h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.9)] animate-pulse" />
      <div className="absolute bottom-[18%] right-[30%] h-3 w-3 rounded-full bg-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.9)]" />

      {/* ===================================================
          MALHA / GRID OVERLAY
      =================================================== */}
      <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:60px_60px]" />
      
    </div>
  );
}
