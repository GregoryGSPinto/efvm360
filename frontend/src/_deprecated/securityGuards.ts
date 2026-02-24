// ============================================================================
// EFVM360 v3.2 — Security Guards
// Pre-action validation for critical operations
// Ensures no action depends solely on visual/UI state
// ============================================================================

import { sanitizar, sanitizarMatricula, sanitizarIdentificador } from './security';
import { validarConsistenciaPreAssinatura, validarConsistenciaSessao } from './dataConsistency';
import type { DadosFormulario, UsuarioCadastro } from '../types';

// ── Types ───────────────────────────────────────────────────────────────

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  sanitizedData?: Record<string, unknown>;
}

// ── Input Sanitization Guard ────────────────────────────────────────────

export function sanitizeFormInputs(dados: DadosFormulario): DadosFormulario {
  const sanitized = JSON.parse(JSON.stringify(dados)) as DadosFormulario;

  // Cabeçalho
  if (sanitized.cabecalho) {
    if (sanitized.cabecalho.observacaoGeral) {
      sanitized.cabecalho.observacaoGeral = sanitizar(sanitized.cabecalho.observacaoGeral);
    }
    if ((sanitized.cabecalho as Record<string, unknown>).matriculaEntra) {
      (sanitized.cabecalho as Record<string, unknown>).matriculaEntra =
        sanitizarMatricula((sanitized.cabecalho as Record<string, unknown>).matriculaEntra as string);
    }
    if ((sanitized.cabecalho as Record<string, unknown>).matriculaSai) {
      (sanitized.cabecalho as Record<string, unknown>).matriculaSai =
        sanitizarMatricula((sanitized.cabecalho as Record<string, unknown>).matriculaSai as string);
    }
  }

  // Linhas do pátio — observações e motivos
  const sanitizeLinhas = (linhas: Array<{ observacao?: string; motivo?: string; trem?: string }>) => {
    linhas.forEach((linha) => {
      if (linha.observacao) linha.observacao = sanitizar(linha.observacao);
      if (linha.motivo) linha.motivo = sanitizar(linha.motivo);
      if (linha.trem) linha.trem = sanitizar(linha.trem);
    });
  };

  if (Array.isArray(sanitized.patioCima)) sanitizeLinhas(sanitized.patioCima);
  if (Array.isArray(sanitized.patioBaixo)) sanitizeLinhas(sanitized.patioBaixo);

  return sanitized;
}

// ── Pre-Signature Guard ─────────────────────────────────────────────────

export function guardAssinatura(
  dados: DadosFormulario,
  usuario: UsuarioCadastro | null,
): GuardResult {
  // 1. Session must exist and be valid
  if (!usuario) {
    return { allowed: false, reason: 'Sessão inválida — faça login novamente' };
  }

  const sessaoCheck = validarConsistenciaSessao(usuario);
  if (!sessaoCheck.isValid) {
    return { allowed: false, reason: `Sessão corrompida: ${sessaoCheck.errors.join(', ')}` };
  }

  // 2. Form data must be consistent
  const formCheck = validarConsistenciaPreAssinatura(dados);
  if (!formCheck.isValid) {
    return { allowed: false, reason: `Formulário incompleto: ${formCheck.errors.join(', ')}` };
  }

  // 3. Sanitize all inputs before signing
  const sanitized = sanitizeFormInputs(dados);

  return { allowed: true, sanitizedData: sanitized as unknown as Record<string, unknown> };
}

// ── Pre-Login Guard ─────────────────────────────────────────────────────

export function guardLogin(matricula: string, senha: string): GuardResult {
  const cleanMatricula = sanitizarMatricula(matricula);

  if (!cleanMatricula || cleanMatricula.length < 3) {
    return { allowed: false, reason: 'Matrícula inválida' };
  }

  if (!senha || senha.length < 4) {
    return { allowed: false, reason: 'Senha muito curta' };
  }

  // Check for injection patterns
  const injectionPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /\beval\b/i, /\bunion\b.*\bselect\b/i];
  const combined = cleanMatricula + senha;
  for (const pattern of injectionPatterns) {
    if (pattern.test(combined)) {
      return { allowed: false, reason: 'Entrada contém caracteres não permitidos' };
    }
  }

  return { allowed: true, sanitizedData: { matricula: cleanMatricula } };
}

// ── Sensitive Data Guard ────────────────────────────────────────────────

export function stripSensitiveFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const sensitiveKeys = ['senha', 'senhaHash', 'password', 'passwordHash', 'token', 'accessToken', 'refreshToken', 'secret'];
  const cleaned = { ...obj };

  for (const key of sensitiveKeys) {
    if (key in cleaned) {
      delete cleaned[key];
    }
  }

  return cleaned;
}

// ── Export Guard ─────────────────────────────────────────────────────────

export function guardExportacao(usuario: UsuarioCadastro | null, nivel: number): GuardResult {
  if (!usuario) {
    return { allowed: false, reason: 'Sessão inválida' };
  }

  if (nivel < 3) { // Mínimo inspetor para exportar
    return { allowed: false, reason: 'Permissão insuficiente para exportação' };
  }

  return { allowed: true };
}
