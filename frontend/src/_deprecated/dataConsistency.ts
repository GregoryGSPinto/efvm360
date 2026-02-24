// ============================================================================
// EFVM360 v3.2 — Data Consistency Validator
// Pre-action validation: ensures data integrity before critical operations
// Prevents actions based solely on visual/UI state
// ============================================================================

import type { DadosFormulario } from '../types';

// ── Types ───────────────────────────────────────────────────────────────

export interface ConsistencyResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ── Pre-Signature Validation ────────────────────────────────────────────

export function validarConsistenciaPreAssinatura(dados: DadosFormulario): ConsistencyResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Cabeçalho must exist and have mandatory fields
  if (!dados.cabecalho) {
    errors.push('Cabeçalho ausente no formulário');
    return { isValid: false, errors, warnings };
  }

  if (!dados.cabecalho.turno) errors.push('Turno não selecionado');
  if (!dados.cabecalho.data) errors.push('Data não informada');

  // 2. Pátio arrays must exist
  if (!Array.isArray(dados.patioCima)) errors.push('Dados do pátio (cima) corrompidos');
  if (!Array.isArray(dados.patioBaixo)) errors.push('Dados do pátio (baixo) corrompidos');

  // 3. Interditada lines must have reason
  const todasLinhas = [...(dados.patioCima || []), ...(dados.patioBaixo || [])];
  todasLinhas.forEach((linha, i) => {
    if (linha.status === 'interditada' && !linha.motivo?.trim()) {
      errors.push(`Linha ${i + 1} interditada sem motivo`);
    }
    if (linha.status === 'ocupada' && !linha.trem?.trim()) {
      warnings.push(`Linha ${i + 1} ocupada sem prefixo de trem`);
    }
  });

  // 4. Equipamentos structure check
  if (dados.equipamentos && Array.isArray(dados.equipamentos)) {
    dados.equipamentos.forEach((eq, i) => {
      if (!eq.nome) warnings.push(`Equipamento ${i + 1} sem nome`);
    });
  }

  // 5. Data type validation (prevent tampered values)
  if (dados.cabecalho.turno && typeof dados.cabecalho.turno !== 'string') {
    errors.push('Tipo de dado inválido no campo turno');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ── Session Consistency ─────────────────────────────────────────────────

export function validarConsistenciaSessao(usuario: unknown): ConsistencyResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!usuario || typeof usuario !== 'object') {
    errors.push('Dados de sessão inválidos');
    return { isValid: false, errors, warnings };
  }

  const u = usuario as Record<string, unknown>;

  if (!u.matricula || typeof u.matricula !== 'string') errors.push('Matrícula ausente na sessão');
  if (!u.nome || typeof u.nome !== 'string') errors.push('Nome ausente na sessão');
  if (!u.funcao || typeof u.funcao !== 'string') warnings.push('Função não definida');

  // Ensure no sensitive data leaked
  if ('senha' in u) errors.push('Dado sensível presente na sessão (senha plaintext)');
  if ('senhaHash' in u) warnings.push('Hash de senha presente na sessão — remover');

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ── Storage Health Check ────────────────────────────────────────────────

export function verificarSaudeStorage(): ConsistencyResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Test write/read/delete
    const testKey = '__vfz_health_check__';
    const testValue = Date.now().toString();
    localStorage.setItem(testKey, testValue);
    const read = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    if (read !== testValue) {
      errors.push('localStorage read/write inconsistente');
    }
  } catch (e) {
    errors.push(`localStorage indisponível: ${(e as Error).message}`);
  }

  // Check quota
  try {
    const used = new Blob(Object.values(localStorage)).size;
    const MB = used / (1024 * 1024);
    if (MB > 4) warnings.push(`localStorage com ${MB.toFixed(1)}MB — próximo do limite`);
  } catch {
    warnings.push('Não foi possível verificar quota do localStorage');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
