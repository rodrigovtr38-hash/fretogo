import {
  MessageCircle,
  Phone,
  Truck,
  User,
} from 'lucide-react';

type ClientDriverCardProps = {
  motoristaNome?: string | null;

  motoristaFoto?: string | null;

  motoristaVeiculo?: string | null;

  motoristaPlaca?: string | null;

  motoristaZap?: string | null;

  motoristaTelefone?: string | null;
};

export default function ClientDriverCard({
  motoristaNome,
  motoristaFoto,
  motoristaVeiculo,
  motoristaPlaca,
  motoristaZap,
  motoristaTelefone,
}: ClientDriverCardProps) {
  if (!motoristaNome) {
    return null;
  }

  const whatsappLink =
    motoristaZap
      ? `https://wa.me/${motoristaZap.replace(
          /\D/g,
          ''
        )}`
      : null;

  const phoneLink =
    motoristaTelefone
      ? `tel:${motoristaTelefone}`
      : null;

  return (
    <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6 backdrop-blur-xl">
      <div className="flex items-start gap-5">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-cyan-500/20 bg-zinc-900">
          {motoristaFoto ? (
            <img
              src={motoristaFoto}
              alt={motoristaNome}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-10 w-10 text-cyan-400" />
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-black uppercase tracking-wide text-white">
            {motoristaNome}
          </h2>

          <div className="mt-4 space-y-2">
            {motoristaVeiculo && (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Truck className="h-4 w-4 text-cyan-400" />

                <span>
                  {motoristaVeiculo}
                </span>
              </div>
            )}

            {motoristaPlaca && (
              <div className="text-sm font-bold uppercase tracking-widest text-cyan-300">
                {motoristaPlaca}
              </div>
            )}
          </div>
        </div>
      </div>

      {(whatsappLink ||
        phoneLink) && (
        <div className="mt-6 flex gap-4">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="
                flex flex-1 items-center justify-center gap-2
                rounded-2xl
                bg-green-600
                px-5
                py-4
                text-sm
                font-black
                uppercase
                tracking-wider
                text-white
                transition-all
                hover:bg-green-500
              "
            >
              <MessageCircle className="h-4 w-4" />

              WhatsApp
            </a>
          )}

          {phoneLink && (
            <a
              href={phoneLink}
              className="
                flex flex-1 items-center justify-center gap-2
                rounded-2xl
                border
                border-cyan-500/20
                bg-zinc-900
                px-5
                py-4
                text-sm
                font-black
                uppercase
                tracking-wider
                text-cyan-300
                transition-all
                hover:bg-zinc-800
              "
            >
              <Phone className="h-4 w-4" />

              Ligar
            </a>
          )}
        </div>
      )}
    </div>
  );
}
