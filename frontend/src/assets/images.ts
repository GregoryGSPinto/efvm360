// ============================================================================
// GESTÃO DE TROCA DE TURNO – EFVM360
// Assets e Imagens
// ============================================================================

// Referências de imagens
export const IMAGENS = {
  // Imagem de fundo - Locomotiva Vale 1182 EFVM
  locomotiva: '/system-background.jpg',
  // Avatar do assistente AdamBoot
  adamboot: '/adamboot.png',
} as const;

export type ImagemKey = keyof typeof IMAGENS;
