// ============================================================================
// EFVM360 — Route Constants
// Single source of truth for URL paths ↔ navigation IDs
// ============================================================================

/** All application route paths */
export const ROUTES = {
  LOGIN: '/login',
  CADASTRO: '/cadastro',
  HOME: '/',
  PASSAGEM: '/passagem',
  DSS: '/dss',
  ANALYTICS: '/analytics',
  HISTORICO: '/historico',
  LAYOUT: '/layout',
  GRAUS_RISCO: '/graus-risco',
  GESTAO: '/gestao',
  PERFIL: '/perfil',
  CONFIGURACOES: '/configuracoes',
  SUPORTE: '/suporte',
} as const;

/** Map legacy nav IDs (from sidebar/nav items) → URL paths */
export const NAV_ID_TO_PATH: Record<string, string> = {
  inicial: ROUTES.HOME,
  passagem: ROUTES.PASSAGEM,
  dss: ROUTES.DSS,
  analytics: ROUTES.ANALYTICS,
  historico: ROUTES.HISTORICO,
  layout: ROUTES.LAYOUT,
  'graus-risco': ROUTES.GRAUS_RISCO,
  gestao: ROUTES.GESTAO,
  perfil: ROUTES.PERFIL,
  configuracoes: ROUTES.CONFIGURACOES,
  suporte: ROUTES.SUPORTE,
};

/** Map URL paths → legacy nav IDs (for AdamBoot sync, badges, etc.) */
export const PATH_TO_NAV_ID: Record<string, string> = Object.fromEntries(
  Object.entries(NAV_ID_TO_PATH).map(([id, path]) => [path, id]),
);

/** Public routes that don't require authentication */
export const PUBLIC_PATHS = new Set<string>([ROUTES.LOGIN, ROUTES.CADASTRO]);
