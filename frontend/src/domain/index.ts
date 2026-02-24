// ============================================================================
// EFVM PÁTIO 360 — Domain Layer Index
// Clean Architecture: Domain é o núcleo — ZERO dependências externas
// ============================================================================

// ── Contract types (the public API) ─────────────────────────────────────
export * from './contracts';

// ── Version control ─────────────────────────────────────────────────────
export { DOMAIN_CONTRACT_VERSION, DOMAIN_CONTRACT_DATE, isCompatible } from './version';

// ── Mapping (internal ↔ domain) ─────────────────────────────────────────
export { toServicePass, fromServicePass, enrichWithRisks } from './mapper';

// ── Aggregates ──────────────────────────────────────────────────────────
export { YARD_CONFIGS_PHASE1 } from './aggregates/YardConfiguration';
export { BOA_JORNADA_ITEMS, createBlankInspection, evaluateInspectionResult } from './aggregates/LocomotiveInspection';

// ── Value Objects ───────────────────────────────────────────────────────
export { RiskSeverity, RiskFrequency, RiskLevel, calculateRiskScore, classifyRiskLevel, createRiskEntry, RISK_SITUATIONS_CATALOG } from './value-objects/RiskMatrix';

// ── Domain Events ───────────────────────────────────────────────────────
export { EVENT_TYPES, createDomainEvent } from './events/ServicePassEvents';

// ── Domain Policies ─────────────────────────────────────────────────────
export { evaluateWeighingLimit, evaluateVMACompliance, evaluateAspirationRequirement, evaluateConditionalInspection, evaluateWedgeRequirement, evaluateInterleavedWagonPolicy, evaluateAtmosphericDischarge, evaluateMRAuthorization, evaluateSignatureImmutability, evaluateAllPolicies } from './policies/OperationalPolicies';
