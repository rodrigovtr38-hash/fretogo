import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header
      className="
        fixed
        top-0
        left-0
        z-50
        w-full
        border-b
        border-white/5
        bg-slate-950/70
        backdrop-blur-xl
      "
    >
      <div
        className="
          mx-auto
          flex
          h-20
          w-full
          max-w-7xl
          items-center
          justify-between
          px-4
          sm:px-6
          lg:px-8
        "
      >
        {/* ===================================================
            LOGO
        =================================================== */}

        <Link
          to="/"
          className="
            flex
            items-center
            gap-3
          "
        >
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-2xl
              border
              border-cyan-400/30
              bg-cyan-500/10
              text-lg
              font-black
              text-cyan-300
              shadow-[0_0_30px_rgba(6,182,212,0.25)]
            "
          >
            F
          </div>

          <div className="flex flex-col">
            <span
              className="
                text-lg
                font-black
                uppercase
                tracking-[0.25em]
                text-white
              "
            >
              FRETOGO
            </span>

            <span
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.35em]
                text-cyan-400
              "
            >
              realtime logistics
            </span>
          </div>
        </Link>

        {/* ===================================================
            MENU
        =================================================== */}

        <nav
          className="
            hidden
            items-center
            gap-8
            md:flex
          "
        >
          <Link
            to="/cliente"
            className="
              text-sm
              font-semibold
              text-slate-300
              transition-colors
              hover:text-cyan-300
            "
          >
            Solicitar Frete
          </Link>

          <Link
            to="/motorista"
            className="
              text-sm
              font-semibold
              text-slate-300
              transition-colors
              hover:text-cyan-300
            "
          >
            Motoristas
          </Link>

          <Link
            to="/admin"
            className="
              text-sm
              font-semibold
              text-slate-300
              transition-colors
              hover:text-cyan-300
            "
          >
            Central
          </Link>
        </nav>

        {/* ===================================================
            CTA
        =================================================== */}

        <Link
          to="/cliente"
          className="
            inline-flex
            items-center
            justify-center
            rounded-2xl
            border
            border-cyan-400/20
            bg-cyan-500
            px-5
            py-3
            text-sm
            font-black
            uppercase
            tracking-wide
            text-slate-950
            shadow-[0_0_30px_rgba(6,182,212,0.35)]
            transition-all
            duration-300
            hover:scale-[1.03]
            hover:bg-cyan-400
          "
        >
          Pedir Frete
        </Link>
      </div>
    </header>
  );
}
