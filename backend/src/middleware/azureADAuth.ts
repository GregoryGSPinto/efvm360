// ============================================================================
// EFVM360 v3.2 — Azure AD / Entra ID Authentication Middleware
// Validates Azure AD JWT tokens and maps group claims to EFVM360 roles
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// ── Types ───────────────────────────────────────────────────────────────

interface AzureADConfig {
  tenantId: string;
  clientId: string;
  issuer: string;
}

interface AzureADTokenPayload {
  aud: string;
  iss: string;
  sub: string;
  oid: string;
  preferred_username: string;
  name: string;
  groups?: string[];
  roles?: string[];
  exp: number;
  iat: number;
}

// ── Azure AD Group → EFVM360 Role Mapping ──────────────────────────────────

const GROUP_ROLE_MAP: Record<string, string> = {
  'EFVM360-Admins': 'administrador',
  'EFVM360-Gestores': 'gestor',
  'EFVM360-Inspetores': 'inspetor',
  'EFVM360-Oficiais': 'oficial',
  'EFVM360-Operadores': 'operador',
};

// ── JWKS Client (caches signing keys) ──────────────────────────────────

function getJwksClient(tenantId: string) {
  return jwksClient({
    jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 86400000, // 24h
  });
}

function getSigningKey(client: jwksClient.JwksClient, kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err: Error | null, key?: jwksClient.SigningKey) => {
      if (err) return reject(err);
      const signingKey = key?.getPublicKey();
      if (!signingKey) return reject(new Error('No signing key found'));
      resolve(signingKey);
    });
  });
}

// ── Configuration ──────────────────────────────────────────────────────

function getAzureADConfig(): AzureADConfig | null {
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;

  if (!tenantId || !clientId) return null;

  return {
    tenantId,
    clientId,
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
  };
}

// ── Map Azure AD groups to EFVM360 role ────────────────────────────────────

export function mapGroupsToRole(groups: string[]): string {
  // Return highest-privilege role found
  const roleHierarchy = ['administrador', 'gestor', 'inspetor', 'oficial', 'operador'];

  for (const role of roleHierarchy) {
    const matchGroup = Object.entries(GROUP_ROLE_MAP).find(([, r]) => r === role);
    if (matchGroup && groups.includes(matchGroup[0])) {
      return role;
    }
  }

  return 'operador'; // default
}

// ── Middleware ──────────────────────────────────────────────────────────

export function azureADAuth() {
  const config = getAzureADConfig();

  return async (req: Request, _res: Response, next: NextFunction) => {
    // If Azure AD not configured, skip (use local auth)
    if (!config) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(); // Let local auth handle it
    }

    const token = authHeader.split(' ')[1];

    try {
      // Decode header to get kid
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        return next(); // Not an Azure AD token, try local auth
      }

      const kid = decoded.header.kid;
      if (!kid) return next();

      // Check if it's from Azure AD (issuer check)
      const payload = decoded.payload as AzureADTokenPayload;
      if (!payload.iss?.includes('login.microsoftonline.com')) {
        return next(); // Not Azure AD, pass to local auth
      }

      // Verify with JWKS
      const client = getJwksClient(config.tenantId);
      const signingKey = await getSigningKey(client, kid);

      const verified = jwt.verify(token, signingKey, {
        audience: config.clientId,
        issuer: config.issuer,
        algorithms: ['RS256'],
      }) as AzureADTokenPayload;

      // Map to EFVM360 user
      const role = mapGroupsToRole(verified.groups || []);

      req.azureAdUser = {
        matricula: verified.preferred_username || verified.oid,
        nome: verified.name,
        funcao: role,
        azureOid: verified.oid,
        authMethod: 'azure-ad',
      };

      next();
    } catch (error) {
      console.error('[AzureAD] Token validation failed:', error);
      return next(); // Fall through to local auth
    }
  };
}

// ── Health Check ───────────────────────────────────────────────────────

export function isAzureADEnabled(): boolean {
  return getAzureADConfig() !== null;
}
