// ============================================================================
// EFVM360 — useI18n Hook (wraps react-i18next for backward compat)
// ============================================================================

import { useTranslation } from 'react-i18next';

export type Locale = 'pt-BR' | 'en';

export function useI18n() {
  const { t, i18n } = useTranslation();
  return {
    t,
    locale: i18n.language as Locale,
    setIdioma: (locale: Locale) => i18n.changeLanguage(locale),
  };
}
