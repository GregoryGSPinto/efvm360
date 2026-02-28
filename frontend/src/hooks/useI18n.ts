// ============================================================================
// EFVM360 — useI18n Hook
// ============================================================================

import { useContext } from 'react';
import { I18nContext } from '../i18n';
import type { Locale } from '../i18n';

export function useI18n() {
  const ctx = useContext(I18nContext);
  return ctx;
}

export type { Locale };
