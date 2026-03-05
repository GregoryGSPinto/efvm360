// ============================================================================
// EFVM360 — Legacy re-export (kept for backward compatibility)
// All translations now live in ./locales/pt-BR.json
// ============================================================================

import ptBR from './locales/pt-BR.json';

export { ptBR };
export type TranslationMap = { [key: string]: string | TranslationMap };
export type TranslationKeys = typeof ptBR;
