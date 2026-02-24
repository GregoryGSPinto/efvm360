// ============================================================================
// EFVM360 v3.2 — Environment Configuration
// Clear separation of dev/staging/production settings
// ============================================================================

export type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  env: Environment;
  apiBaseUrl: string;
  enableDevTools: boolean;
  enableConsoleProtection: boolean;
  enableAuditSync: boolean;
  sessionTimeoutMinutes: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sentryDsn: string;
  featureFlagsSource: 'env' | 'remote';
}

function detectEnvironment(): Environment {
  if (import.meta.env.MODE === 'production') return 'production';
  if (import.meta.env.VITE_ENV === 'staging') return 'staging';
  return 'development';
}

const ENV_CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    env: 'development',
    apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
    enableDevTools: true,
    enableConsoleProtection: false,
    enableAuditSync: false,
    sessionTimeoutMinutes: 120,    // Long timeout for dev
    logLevel: 'debug',
    sentryDsn: '',
    featureFlagsSource: 'env',
  },
  staging: {
    env: 'staging',
    apiBaseUrl: import.meta.env.VITE_API_URL || 'https://efvm360-api-staging.azurewebsites.net/api/v1',
    enableDevTools: true,
    enableConsoleProtection: false,
    enableAuditSync: true,
    sessionTimeoutMinutes: 60,
    logLevel: 'info',
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
    featureFlagsSource: 'env',
  },
  production: {
    env: 'production',
    apiBaseUrl: import.meta.env.VITE_API_URL || 'https://efvm360-api-production.azurewebsites.net/api/v1',
    enableDevTools: false,
    enableConsoleProtection: true,
    enableAuditSync: true,
    sessionTimeoutMinutes: 30,
    logLevel: 'warn',
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
    featureFlagsSource: 'remote',
  },
};

export const envConfig: EnvironmentConfig = ENV_CONFIGS[detectEnvironment()];

export function isDev(): boolean { return envConfig.env === 'development'; }
export function isProd(): boolean { return envConfig.env === 'production'; }
export function isStaging(): boolean { return envConfig.env === 'staging'; }

export default envConfig;
