// =========================================================
// NOME DO ARQUIVO: src/config/platformLinks.ts
// CTO-Log: Fonte Única da Verdade (Single Source of Truth) para roteamento externo.
// Status: Links mortos removidos. Rotas oficiais do subdomínio 'app' mapeadas.
// =========================================================

export const PLATFORM_LINKS = {
  // 🌍 1. LANDING PAGES (Marketing na Hostinger)
  MAIN_SITE: 'https://fretogo.com.br',
  DRIVER_LANDING: 'https://motorista.fretogo.com.br',
  
  // ⚙️ 2. NÚCLEO DO APLICATIVO (Software SaaS)
  APP_HUB: 'https://app.fretogo.com.br',
  CLIENT_DASHBOARD: 'https://app.fretogo.com.br/cliente',     // Formulário de Publicação de Carga
  DRIVER_DASHBOARD: 'https://app.fretogo.com.br/motorista',   // Painel e Radar do Motorista
  
  // 📞 3. CONTATOS E COMUNIDADE
  SUPPORT_WHATSAPP: 'https://wa.me/5511946099840',            // Central de Apoio Oficial
  DRIVER_VIP_GROUP: '',                                       // 🔴 ATENÇÃO: Link anterior (404) removido. Cole o novo link do grupo aqui.
} as const;

export type PlatformLinkKeys = keyof typeof PLATFORM_LINKS;

/**
 * Função global e segura para redirecionamento externo e interno.
 * Blinda a aplicação contra ataques de Tabnabbing (noopener, noreferrer).
 */
export const openExternalLink = (url: string, newTab: boolean = true) => {
  if (!url) {
    console.warn("Rota não definida no platformLinks.ts");
    return;
  }
  
  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  window.location.href = url;
};
