export default function RadarBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* ===================================================
          RADAR CENTRAL
      =================================================== */}

      <div
        className="
          absolute
          left-1/2
          top-1/2
          h-[38rem]
          w-[38rem]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          border
          border-cyan-400/10
        "
      />

      <div
        className="
          absolute
          left-1/2
          top-1/2
          h-[28rem]
          w-[28rem]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          border
          border-cyan-400/10
        "
      />

      <div
        className="
          absolute
          left-1/2
          top-1/2
          h-[18rem]
          w-[18rem]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          border
          border-cyan-400/10
        "
      />

      {/* ===================================================
          PULSE
      =================================================== */}

      <div
        className="
          radar-pulse
          absolute
          left-1/2
          top-1/2
          h-[14rem]
          w-[14rem]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          border
          border-cyan-400/20
          bg-cyan-400/5
        "
      />

      {/* ===================================================
          GLOW
      =================================================== */}

      <div
        className="
          absolute
          left-1/2
          top-1/2
          h-[12rem]
          w-[12rem]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-cyan-400/10
          blur-[100px]
        "
      />

      {/* ===================================================
          DOTS
      =================================================== */}

      <div className="absolute left-[18%] top-[28%] h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.9)]" />

      <div className="absolute right-[20%] top-[32%] h-2 w-2 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.9)]" />

      <div className="absolute bottom-[25%] left-[28%] h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.9)]" />

      <div className="absolute bottom-[18%] right-[30%] h-3 w-3 rounded-full bg-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.9)]" />

      {/* ===================================================
          GRID OVERLAY
      =================================================== */}

      <div
        className="
          absolute
          inset-0
          opacity-[0.03]
          [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]
          [background-size:60px_60px]
        "
      />
    </div>
  );
}
