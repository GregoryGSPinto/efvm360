// ============================================================================
// EFVM360 — i18n Barrel Export + Context Provider
// ============================================================================

import React, { createContext, useState, useCallback, useMemo } from 'react';
import { ptBR } from './pt-BR';
import { enUS } from './en-US';
import type { TranslationMap } from './pt-BR';

export { ptBR } from './pt-BR';
export { enUS } from './en-US';
export type { TranslationMap } from './pt-BR';

export type Locale = 'pt-BR' | 'en-US';

const translations: Record<Locale, TranslationMap> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

interface I18nContextValue {
  locale: Locale;
  setIdioma: (locale: Locale) => void;
  t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'pt-BR',
  setIdioma: () => {},
  t: (key: string) => key,
});

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem('efvm360-idioma');
    if (stored === 'pt-BR' || stored === 'en-US') return stored;
  } catch { /* ignore */ }
  return 'pt-BR';
}

function resolve(obj: unknown, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}

export function I18nProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [locale, setLocale] = useState<Locale>(getStoredLocale);

  const setIdioma = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    try { localStorage.setItem('efvm360-idioma', newLocale); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key: string): string => {
    return resolve(translations[locale], key);
  }, [locale]);

  const value = useMemo(() => ({ locale, setIdioma, t }), [locale, setIdioma, t]);

  return React.createElement(I18nContext.Provider, { value }, children);
}
