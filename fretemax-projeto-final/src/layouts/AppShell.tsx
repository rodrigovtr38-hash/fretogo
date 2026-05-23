import { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps) {
  return (
    <div
      className="
        relative
        min-h-dvh
        w-full
        overflow-x-hidden
        bg-[#020617]
        text-slate-100
      "
    >
      {/* =======================================================
          BACKGROUND GLOBAL
      ======================================================= */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* BASE */}
        <div className="absolute inset-0 bg-[#020617]" />

        {/* RADIAL TOP */}
        <div
          className="
            absolute
            inset-0
            bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.14),transparent_45%)]
          "
        />

        {/* LEFT GLOW */}
        <div
          className="
            absolute
            left-[-10rem]
            top-[-10rem]
            h-[28rem]
            w-[28rem]
            rounded-full
            bg-cyan-500/10
            blur-[120px]
          "
        />

        {/* RIGHT GLOW */}
        <div
          className="
            absolute
            right-[-10rem]
            top-[10%]
            h-[30rem]
            w-[30rem]
            rounded-full
            bg-blue-500/10
            blur-[140px]
          "
        />

        {/* GRID */}
        <div
          className="
            absolute
            inset-0
            opacity-[0.03]
            [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]
            [background-size:40px_40px]
          "
        />
      </div>

      {/* =======================================================
          SAFE AREA
      ======================================================= */}

      <div
        className="
          relative
          z-10
          flex
          min-h-dvh
          w-full
          flex-col
        "
      >
        {children}
      </div>
    </div>
  );
}
