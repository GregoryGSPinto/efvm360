// ============================================================================
// EFVM360 Backend — Azure AD / Entra ID Middleware
// Valida token Azure AD e provisiona usuário local
// ============================================================================
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { v4 as uuidv4 } from 'uuid';
import { Usuario } from '../models';
import { generateSecureToken } from '../utils/crypto';

const TENANT_ID = process.env.AZURE_AD_TENANT_ID || '';
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID || '';
const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;

const client = jwksClient({ jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys` });

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err: Error | null, key?: jwksClient.SigningKey) => {
    callback(err, key?.getPublicKey());
  });
}

const GROUP_TO_PROFILE: Record<string, string> = {
  'EFVM360-Operadores': 'operador',
  'EFVM360-Oficiais': 'oficial',
  'EFVM360-Inspetores': 'inspetor',
  'EFVM360-Gestores': 'gestor',
  'EFVM360-Admins': 'administrador',
};

export const validateAzureToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { azureToken } = req.body;
  if (!azureToken) { res.status(400).json({ error: 'Azure token required' }); return; }

  try {
    const decoded = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(azureToken, getKey, { audience: CLIENT_ID, issuer: ISSUER, algorithms: ['RS256'] },
        (err, payload) => err ? reject(err) : resolve(payload as jwt.JwtPayload));
    });

    // Extract claims
    const oid = decoded.oid;
    const email = decoded.preferred_username || decoded.email || '';
    const name = decoded.name || email.split('@')[0];
    const groups: string[] = decoded.groups || [];

    // Map group → profile
    let funcao = 'operador';
    for (const [group, profile] of Object.entries(GROUP_TO_PROFILE)) {
      if (groups.includes(group)) { funcao = profile; break; }
    }

    // Provision user if not exists
    let usuario = await Usuario.findOne({ where: { azure_ad_oid: oid } });
    if (!usuario) {
      usuario = await Usuario.create({
        uuid: uuidv4(), nome: name, matricula: email.split('@')[0].toUpperCase(),
        funcao, senha_hash: await bcrypt.hash(generateSecureToken(32), 4),
        azure_ad_oid: oid,
      });
    } else {
      await usuario.update({ nome: name, funcao });
    }

    req.azureUser = usuario;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Azure AD token inválido', details: (err as Error).message });
  }
};
