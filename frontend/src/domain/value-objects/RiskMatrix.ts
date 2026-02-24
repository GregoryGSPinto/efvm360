// ============================================================================
// EFVM PÁTIO 360 — RiskMatrix Value Object
// Matriz ART conforme NFN 001 — PRO-019150 / Anexo 20
// ============================================================================

// ── Enums ───────────────────────────────────────────────────────────────

export enum RiskSeverity {
  LIGHT = 2,           // Leve
  MODERATE = 4,        // Moderada
  SERIOUS = 8,         // Grave
  CRITICAL = 16,       // Crítica
  CATASTROPHIC = 32,   // Catastrófica
}

export enum RiskFrequency {
  RARE = 2,            // Raro
  UNLIKELY = 3,        // Pouco Provável
  OCCASIONAL = 5,      // Ocasional
  LIKELY = 9,          // Provável
  FREQUENT = 13,       // Frequente
}

export enum RiskLevel {
  LOW = 'Baixo',         // < 25
  MEDIUM = 'Médio',      // 25 - 70
  HIGH = 'Alto',         // 71 - 140
  VERY_HIGH = 'Muito Alto', // >= 140
}

// ── Value Object ────────────────────────────────────────────────────────

export interface RiskAssessmentEntry {
  /** ID da situação de risco (1-62) */
  riskId: number;
  /** Descrição da situação de risco */
  description: string;
  /** Categoria: Segurança, Saúde, Meio Ambiente */
  category: 'safety' | 'health' | 'environment';
  /** Severidade conforme NFN 001 */
  severity: RiskSeverity;
  /** Frequência conforme NFN 001 */
  frequency: RiskFrequency;
  /** Score calculado (Severidade x Frequência) */
  score: number;
  /** Nível de risco derivado */
  level: RiskLevel;
}

// ── Cálculo ─────────────────────────────────────────────────────────────

export function calculateRiskScore(severity: RiskSeverity, frequency: RiskFrequency): number {
  return severity * frequency;
}

export function classifyRiskLevel(score: number): RiskLevel {
  if (score >= 140) return RiskLevel.VERY_HIGH;
  if (score >= 71) return RiskLevel.HIGH;
  if (score >= 25) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

export function createRiskEntry(
  riskId: number,
  description: string,
  category: RiskAssessmentEntry['category'],
  severity: RiskSeverity,
  frequency: RiskFrequency,
): RiskAssessmentEntry {
  const score = calculateRiskScore(severity, frequency);
  return {
    riskId,
    description,
    category,
    severity,
    frequency,
    score,
    level: classifyRiskLevel(score),
  };
}

// ── Catálogo de Situações de Risco — PRO-019150 Anexo 20 ────────────────

export const RISK_SITUATIONS_CATALOG = {
  SAFETY: [
    { id: 1, description: 'Agressão Física' },
    { id: 2, description: 'Afogamento' },
    { id: 3, description: 'Ataque de animais (peçonhentos, selvagens, insetos etc.)' },
    { id: 4, description: 'Atingido por projeção de materiais e peças' },
    { id: 5, description: 'Atingido por descarga atmosférica' },
    { id: 6, description: 'Atropelamento' },
    { id: 7, description: 'Batida contra - Estrutura e equipamentos' },
    { id: 8, description: 'Colisão/Tombamento/Capotamento' },
    { id: 9, description: 'Contato com partes móveis ou rotativas' },
    { id: 10, description: 'Contato com superfície energizada' },
    { id: 11, description: 'Desmoronamento de taludes, cortes, aterros' },
    { id: 12, description: 'Contato/exposição a temperaturas extremas' },
    { id: 13, description: 'Contato/exposição a produtos químicos' },
    { id: 14, description: 'Contatos com superfícies cortantes/perfurantes' },
    { id: 15, description: 'Explosão' },
    { id: 16, description: 'Exposição a altas temperaturas' },
    { id: 17, description: 'Exposição a baixas temperaturas' },
    { id: 18, description: 'Exposição a pressões anormais' },
    { id: 19, description: 'Implosão' },
    { id: 20, description: 'Incêndio' },
    { id: 21, description: 'Liberação de substância tóxica' },
    { id: 22, description: 'Liberação de outras substâncias' },
    { id: 23, description: 'Prensamento do corpo ou partes' },
    { id: 24, description: 'Queda de pessoa de nível diferente' },
    { id: 25, description: 'Queda de veículo/equipamentos na água' },
    { id: 26, description: 'Queda/Escorregão/Tropeço (mesmo nível)' },
  ],
  HEALTH: [
    { id: 27, description: 'Contato/exposição a produtos químicos (Saúde)' },
    { id: 28, description: 'Exposição a fumos metálicos' },
    { id: 29, description: 'Exposição a radiação não ionizante' },
    { id: 30, description: 'Exposição a vapores/névoas/neblinas' },
    { id: 31, description: 'Exposição a agentes biológicos' },
    { id: 32, description: 'Exposição a altas temperaturas (saúde)' },
    { id: 33, description: 'Exposição a baixas temperaturas (saúde)' },
    { id: 34, description: 'Exposição a luminosidade elevada/reduzida' },
    { id: 35, description: 'Exposição a poeira/particulado' },
    { id: 36, description: 'Exposição a pressões anormais (saúde)' },
    { id: 37, description: 'Exposição a ruído' },
    { id: 38, description: 'Exposição a umidade' },
    { id: 39, description: 'Exposição a vibração' },
    { id: 40, description: 'Exposição a outros (saúde)' },
    { id: 41, description: 'Sobrecarga mental/cognitiva' },
    { id: 42, description: 'Sobrecarga muscular dinâmica' },
    { id: 43, description: 'Sobrecarga muscular estática' },
  ],
  ENVIRONMENT: [
    { id: 44, description: 'Explosão (Meio Ambiente)' },
    { id: 45, description: 'Incêndio (Meio Ambiente)' },
    { id: 46, description: 'Incêndio Florestal' },
    { id: 47, description: 'Vazamento/derramamento de água' },
    { id: 48, description: 'Vazamento de efluente sanitário' },
    { id: 49, description: 'Vazamento de efluente industrial' },
    { id: 50, description: 'Vazamento gases inflamáveis/tóxicos' },
    { id: 51, description: 'Vazamento de polpas ou rejeitos' },
    { id: 52, description: 'Rompimento de calhas de rejeito' },
    { id: 53, description: 'Desmoronamento de pilhas ou taludes' },
    { id: 54, description: 'Transbordamento de silos' },
    { id: 55, description: 'Falha no Sistema de Controle Ambiental' },
    { id: 56, description: 'Atropelamento de animais silvestres' },
    { id: 57, description: 'Carreamento de finos/sedimentos/sólidos' },
    { id: 58, description: 'Interferência na disponibilidade hídrica' },
    { id: 59, description: 'Queda de carga/minério' },
  ],
} as const;
