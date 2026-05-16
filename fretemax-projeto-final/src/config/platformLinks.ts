export const PLATFORM_LINKS = {
  CLIENT_LANDING:
    'https://cliente.fretogo.com.br',

  DRIVER_LANDING:
    'https://motorista.fretogo.com.br',

  CLIENT_WHATSAPP:
    'https://wa.me/5511946099840',

  DRIVER_WHATSAPP:
    'https://wa.me/5511946099840',

  DRIVER_VIP_GROUP:
    'https://chat.whatsapp.com/IGylgsZPYhsDfMZDKzVjHT',

  DOWNLOAD_APP:
    'https://fretogo.com.br/app',

  MAIN_SITE:
    'https://fretogo.com.br',
};

export const openExternalLink = (
  url: string,
  newTab: boolean = true
) => {
  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  window.location.href = url;
};
