// ============================================================================
// VFZ v3.2 — Azure Key Vault Integration
// Secrets management for production environment
// Uses @azure/identity + @azure/keyvault-secrets
// ============================================================================

import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

// ── Types ───────────────────────────────────────────────────────────────

interface VFZSecrets {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  DB_PASSWORD: string;
  DB_HOST: string;
  DB_USER: string;
  DB_NAME: string;
  APPINSIGHTS_KEY: string;
}

// ── Key Vault Client ────────────────────────────────────────────────────

let cachedSecrets: VFZSecrets | null = null;

const getKeyVaultClient = (): SecretClient | null => {
  const vaultUrl = process.env.AZURE_KEYVAULT_URL;
  if (!vaultUrl) return null;

  const credential = new DefaultAzureCredential();
  return new SecretClient(vaultUrl, credential);
};

// ── Load Secrets ────────────────────────────────────────────────────────

export async function loadSecrets(): Promise<VFZSecrets> {
  // Return cached if available
  if (cachedSecrets) return cachedSecrets;

  const client = getKeyVaultClient();

  // If no Key Vault configured, fall back to env vars (dev mode)
  if (!client) {
    console.info('[KeyVault] No AZURE_KEYVAULT_URL — using environment variables');
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('[KeyVault] FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
    }
    if (!process.env.DB_PASSWORD) {
      throw new Error('[KeyVault] FATAL: DB_PASSWORD must be set in environment variables');
    }
    cachedSecrets = {
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_USER: process.env.DB_USER || 'vfz_app',
      DB_NAME: process.env.DB_NAME || 'vfz_railway',
      APPINSIGHTS_KEY: process.env.APPINSIGHTS_INSTRUMENTATIONKEY || '',
    };
    return cachedSecrets;
  }

  // Load from Key Vault
  console.info('[KeyVault] Loading secrets from Azure Key Vault...');
  try {
    const [jwt, jwtRefresh, dbPass, dbHost, dbUser, dbName, aiKey] = await Promise.all([
      client.getSecret('vfz-jwt-secret'),
      client.getSecret('vfz-jwt-refresh-secret'),
      client.getSecret('vfz-db-password'),
      client.getSecret('vfz-db-host'),
      client.getSecret('vfz-db-user'),
      client.getSecret('vfz-db-name'),
      client.getSecret('vfz-appinsights-key').catch(() => ({ value: '' })),
    ]);

    cachedSecrets = {
      JWT_SECRET: jwt.value!,
      JWT_REFRESH_SECRET: jwtRefresh.value!,
      DB_PASSWORD: dbPass.value!,
      DB_HOST: dbHost.value!,
      DB_USER: dbUser.value!,
      DB_NAME: dbName.value!,
      APPINSIGHTS_KEY: (aiKey as { value?: string }).value || '',
    };

    console.info('[KeyVault] ✅ Secrets loaded successfully');
    return cachedSecrets;
  } catch (error) {
    console.error('[KeyVault] ❌ Failed to load secrets:', error);
    throw new Error('Failed to load secrets from Key Vault');
  }
}

// ── Get Individual Secret ───────────────────────────────────────────────

export function getSecret(key: keyof VFZSecrets): string {
  if (!cachedSecrets) {
    throw new Error('Secrets not loaded. Call loadSecrets() first.');
  }
  return cachedSecrets[key];
}

// ── Invalidate Cache (for rotation) ────────────────────────────────────

export function invalidateSecretCache(): void {
  cachedSecrets = null;
  console.info('[KeyVault] Secret cache invalidated');
}
