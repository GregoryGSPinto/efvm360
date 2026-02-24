// ============================================================================
// VFZ Backend — Utilitários de Criptografia
// ============================================================================

import crypto from 'crypto';

/**
 * SHA-256 hash (para integridade, audit trail chain, form hashing)
 */
export const sha256 = (input: string): string => {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
};

/**
 * Gera hash de integridade para um formulário de passagem
 * Usado na assinatura digital do formulário
 */
export const hashFormulario = (dados: Record<string, unknown>): string => {
  const payload = JSON.stringify(dados, Object.keys(dados).sort());
  return sha256(payload);
};

/**
 * Gera hash encadeado para audit trail (blockchain-like)
 * Cada registro contém o hash do registro anterior
 */
export const hashAuditEntry = (
  entry: { matricula: string; acao: string; recurso: string; detalhes?: string; timestamp: string },
  hashAnterior: string | null
): string => {
  const payload = `${hashAnterior || 'GENESIS'}:${entry.matricula}:${entry.acao}:${entry.recurso}:${entry.detalhes || ''}:${entry.timestamp}`;
  return sha256(payload);
};

/**
 * Gera token aleatório seguro (para refresh tokens)
 */
export const generateSecureToken = (bytes = 48): string => {
  return crypto.randomBytes(bytes).toString('base64url');
};

/**
 * Hash de token para armazenamento (nunca armazenar token raw no DB)
 */
export const hashToken = (token: string): string => {
  return sha256(token);
};
