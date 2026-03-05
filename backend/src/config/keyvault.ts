// ============================================================================
// VFZ Backend — Azure Key Vault Integration
// Fallback para process.env em dev local
// ============================================================================

interface SecretCache { value: string; expiresAt: number; }
const cache = new Map<string, SecretCache>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

let kvClient: { getSecret: (name: string) => Promise<{ value?: string }> } | null = null;
let initialized = false;

async function initKeyVault(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const vaultUrl = process.env.AZURE_KEYVAULT_URL;
  if (!vaultUrl) return; // Dev local — usa .env
  try {
    const { DefaultAzureCredential } = await import('@azure/identity');
    const { SecretClient } = await import('@azure/keyvault-secrets');
    kvClient = new SecretClient(vaultUrl, new DefaultAzureCredential());
    console.info('[VFZ-KV] Azure Key Vault conectado:', vaultUrl);
  } catch (err) {
    console.warn('[VFZ-KV] Key Vault indisponível, usando fallback .env:', (err as Error).message);
  }
}

export async function getSecret(name: string, fallbackEnvVar?: string): Promise<string> {
  // Check cache
  const cached = cache.get(name);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  await initKeyVault();

  if (kvClient) {
    try {
      const secret = await kvClient.getSecret(name);
      const value = secret.value || '';
      cache.set(name, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    } catch (err) {
      console.warn(`[VFZ-KV] Falha ao obter secret "${name}":`, (err as Error).message);
    }
  }

  // Fallback: process.env
  const envKey = fallbackEnvVar || name.replace(/-/g, '_').toUpperCase();
  return process.env[envKey] || '';
}

// Pre-configured secret getters
export const getJwtSecret = () => getSecret('jwt-secret', 'JWT_SECRET');
export const getJwtRefreshSecret = () => getSecret('jwt-refresh-secret', 'JWT_REFRESH_SECRET');
export const getDbPassword = () => getSecret('db-password', 'DB_PASSWORD');
