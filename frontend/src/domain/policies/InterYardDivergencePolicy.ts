// ============================================================================
// EFVM360 — Policy: InterYardDivergencePolicy
// Auto-escalation rules for inter-yard handover divergences
// ============================================================================

import type { InterYardHandover } from '../aggregates/InterYardHandover';
import { getDivergenceCount, hasSafetyCriticalDivergence } from '../aggregates/InterYardHandover';

export interface DivergenceEscalation {
  shouldEscalate: boolean;
  reason: string;
  targetRole: 'supervisor' | 'coordenador';
  yards: string[];
  severity: 'high' | 'critical';
}

/**
 * Evaluates whether a handover's divergences require escalation.
 *
 * Rules:
 * 1. >3 divergences → escalate to supervisors of both yards (high)
 * 2. Any safety-critical divergence → block and escalate (critical)
 */
export function evaluateDivergenceEscalation(
  handover: InterYardHandover,
): DivergenceEscalation | null {
  const pendingCount = getDivergenceCount(handover);
  const hasSafety = hasSafetyCriticalDivergence(handover);

  // Rule 2: Safety-critical divergence → critical escalation
  if (hasSafety) {
    return {
      shouldEscalate: true,
      reason: `Divergencia em item safety-critical na passagem ${handover.compositionCode}`,
      targetRole: 'supervisor',
      yards: [handover.originYard, handover.destinationYard],
      severity: 'critical',
    };
  }

  // Rule 1: >3 divergences → high escalation
  if (pendingCount > 3) {
    return {
      shouldEscalate: true,
      reason: `${pendingCount} divergencias detectadas na passagem ${handover.compositionCode}`,
      targetRole: 'supervisor',
      yards: [handover.originYard, handover.destinationYard],
      severity: 'high',
    };
  }

  return null;
}

/**
 * Checks if the handover should be blocked due to unresolved safety-critical divergences.
 */
export function isHandoverBlocked(handover: InterYardHandover): boolean {
  return hasSafetyCriticalDivergence(handover);
}
