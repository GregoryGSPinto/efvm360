// ============================================================================
// EFVM360 — Domain Contract Version
// ============================================================================
//
// Este número de versão é incluído em toda comunicação com a API.
// Se o server receber uma versão incompatível, rejeita com HTTP 409.
//
// Breaking changes (major):
//   - Remover campo obrigatório
//   - Mudar tipo de campo existente
//   - Remover valor de enum
//
// Non-breaking (minor):
//   - Adicionar campo opcional
//   - Adicionar valor a enum
//   - Adicionar novo endpoint
//
// Patch:
//   - Corrigir documentação
//   - Fix em validação que não muda o schema
//
// ============================================================================

export const DOMAIN_CONTRACT_VERSION = '1.0.0';

export const DOMAIN_CONTRACT_DATE = '2026-02-21';

/** Verifica compatibilidade entre versão do client e do server */
export function isCompatible(clientVersion: string, serverVersion: string): boolean {
  const [clientMajor] = clientVersion.split('.').map(Number);
  const [serverMajor] = serverVersion.split('.').map(Number);
  // Major version must match
  return clientMajor === serverMajor;
}
