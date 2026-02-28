// ============================================================================
// EFVM360 — Organizational Restructuring Tests
// Tests for P01-P12: Yards, Users, RBAC, Teams, Performance
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';

// P01: YardRegistry
import {
  ALL_YARD_CODES, getYard, getYardTracks,
  getAllYardCodes, getYardName, getYardShortName,
} from '../aggregates/YardRegistry';

// P02: UserAggregate
import {
  createUserProfile, getHierarchyLevelForRole,
  canManageUser, canOperateInYard, canApproveRegistration, canApprovePasswordReset,
  type UserProfile,
} from '../aggregates/UserAggregate';

// P03: RBAC
import { hasPermission, canViewTeamPage, canManageTeam } from '../policies/RBACPolicy';
import { SystemAction, HierarchyLevel, UserStatus } from '../contracts';

// P08: Performance
import { calculateScore, type UserPerformance } from '../../services/teamPerformanceService';

// ═══════════════════════════════════════════════════════════════════════
// P01: YARD REGISTRY
// ═══════════════════════════════════════════════════════════════════════

describe('P01 — YardRegistry', () => {
  it('has exactly 5 yards', () => {
    expect(ALL_YARD_CODES).toHaveLength(5);
    expect(ALL_YARD_CODES).toEqual(['VFZ', 'VBR', 'VCS', 'P6', 'VTO']);
  });

  it('each yard has valid data with at least 4 tracks', () => {
    for (const code of ALL_YARD_CODES) {
      const yard = getYard(code);
      expect(yard).toBeDefined();
      expect(yard.id).toBe(code);
      expect(yard.name).toBeTruthy();
      expect(yard.tracks.length).toBeGreaterThanOrEqual(4);
      expect(yard.switches.length).toBeGreaterThanOrEqual(1);
      expect(yard.speedRules.vmaEngate).toBe(1);
    }
  });

  it('VFZ has cima/baixo zones', () => {
    const cima = getYardTracks('VFZ', 'cima');
    const baixo = getYardTracks('VFZ', 'baixo');
    expect(cima.length).toBeGreaterThan(0);
    expect(baixo.length).toBeGreaterThan(0);
  });

  it('VBR has unica zone (different from VFZ)', () => {
    const tracks = getYardTracks('VBR');
    expect(tracks.every(t => t.zone === 'unica')).toBe(true);
  });

  it('VBR ≠ VCS ≠ VFZ tracks', () => {
    const vfz = getYardTracks('VFZ').map(t => t.trackCode).sort();
    const vbr = getYardTracks('VBR').map(t => t.trackCode).sort();
    const vcs = getYardTracks('VCS').map(t => t.trackCode).sort();
    expect(vbr).not.toEqual(vfz);
    expect(vcs).not.toEqual(vfz);
  });

  it('getYardName returns proper names', () => {
    expect(getYardName('VFZ')).toContain('Fazendão');
    expect(getYardShortName('VBR')).toBe('Brucutu');
  });

  it('getAllYardCodes matches constant', () => {
    expect(getAllYardCodes()).toEqual(ALL_YARD_CODES);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P02: USER AGGREGATE
// ═══════════════════════════════════════════════════════════════════════

describe('P02 — UserAggregate', () => {
  let maqVBR: UserProfile;
  let inspVBR: UserProfile;
  let gestVBR: UserProfile;
  beforeEach(() => {
    maqVBR = createUserProfile({ matricula: 'VBR1001', nome: 'Op VBR', funcao: 'maquinista', primaryYard: 'VBR' });
    inspVBR = createUserProfile({ matricula: 'VBR2001', nome: 'Insp VBR', funcao: 'inspetor', primaryYard: 'VBR' });
    gestVBR = createUserProfile({ matricula: 'VBR3001', nome: 'Gest VBR', funcao: 'gestor', primaryYard: 'VBR' });
  });

  it('hierarchy levels map correctly', () => {
    expect(getHierarchyLevelForRole('maquinista')).toBe(HierarchyLevel.OPERATIVE);
    expect(getHierarchyLevelForRole('inspetor')).toBe(HierarchyLevel.INSPECTION);
    expect(getHierarchyLevelForRole('gestor')).toBe(HierarchyLevel.MANAGEMENT);
    expect(getHierarchyLevelForRole('supervisor')).toBe(HierarchyLevel.MANAGEMENT);
  });

  it('createUserProfile sets all fields', () => {
    expect(maqVBR.primaryYard).toBe('VBR');
    expect(maqVBR.hierarchyLevel).toBe(HierarchyLevel.OPERATIVE);
    expect(maqVBR.allowedYards).toEqual(ALL_YARD_CODES);
    expect(maqVBR.status).toBe(UserStatus.ACTIVE);
  });

  it('gestor VBR CAN manage operador VBR', () => {
    expect(canManageUser(gestVBR, maqVBR)).toBe(true);
  });

  it('gestor VBR CANNOT manage operador VCS', () => {
    const maqVCS = createUserProfile({ matricula: 'VCS1001', nome: 'Op VCS', funcao: 'maquinista', primaryYard: 'VCS' });
    expect(canManageUser(gestVBR, maqVCS)).toBe(false);
  });

  it('gestor CAN manage another gestor in same yard', () => {
    const gest2 = createUserProfile({ matricula: 'VBR3002', nome: 'G2', funcao: 'gestor', primaryYard: 'VBR' });
    expect(canManageUser(gestVBR, gest2)).toBe(true);
  });

  it('inspetor CANNOT manage gestor', () => {
    expect(canManageUser(inspVBR, gestVBR)).toBe(false);
  });

  it('any user can operate in any yard', () => {
    expect(canOperateInYard(maqVBR, 'VFZ')).toBe(true);
    expect(canOperateInYard(maqVBR, 'VCS')).toBe(true);
    expect(canOperateInYard(maqVBR, 'P6')).toBe(true);
  });

  it('canApproveRegistration respects yard', () => {
    expect(canApproveRegistration(gestVBR, 'VBR')).toBe(true);
    expect(canApproveRegistration(gestVBR, 'VCS')).toBe(false);
  });

  it('canApprovePasswordReset — supervisor can approve any', () => {
    const sup = createUserProfile({ matricula: 'SUP001', nome: 'Sup', funcao: 'supervisor', primaryYard: 'VFZ' });
    expect(canApprovePasswordReset(sup, 'VBR')).toBe(true);
    expect(canApprovePasswordReset(gestVBR, 'VBR')).toBe(true);
    expect(canApprovePasswordReset(gestVBR, 'VCS')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P03: RBAC POLICY
// ═══════════════════════════════════════════════════════════════════════

describe('P03 — RBACPolicy', () => {
  let maq: UserProfile;
  let insp: UserProfile;
  let gest: UserProfile;
  beforeEach(() => {
    maq = createUserProfile({ matricula: 'VFZ1001', nome: 'Maq', funcao: 'maquinista', primaryYard: 'VFZ' });
    insp = createUserProfile({ matricula: 'VFZ2001', nome: 'Insp', funcao: 'inspetor', primaryYard: 'VFZ' });
    gest = createUserProfile({ matricula: 'VFZ3001', nome: 'Gest', funcao: 'gestor', primaryYard: 'VFZ' });
  });

  it('maquinista CAN create/sign handover', () => {
    expect(hasPermission(maq, SystemAction.CREATE_HANDOVER)).toBe(true);
    expect(hasPermission(maq, SystemAction.SIGN_HANDOVER)).toBe(true);
  });

  it('maquinista CANNOT approve registration or manage team', () => {
    expect(hasPermission(maq, SystemAction.APPROVE_REGISTRATION)).toBe(false);
    expect(hasPermission(maq, SystemAction.MANAGE_TEAM)).toBe(false);
  });

  it('maquinista CANNOT see team page', () => {
    expect(canViewTeamPage(maq)).toBe(false);
  });

  it('inspetor CAN approve DSS and view team', () => {
    expect(hasPermission(insp, SystemAction.APPROVE_DSS)).toBe(true);
    expect(canViewTeamPage(insp)).toBe(true);
  });

  it('inspetor CANNOT manage team', () => {
    expect(hasPermission(insp, SystemAction.MANAGE_TEAM)).toBe(false);
  });

  it('gestor CAN manage team + approvals', () => {
    expect(hasPermission(gest, SystemAction.MANAGE_TEAM)).toBe(true);
    expect(hasPermission(gest, SystemAction.APPROVE_REGISTRATION)).toBe(true);
    expect(hasPermission(gest, SystemAction.TRANSFER_USER)).toBe(true);
    expect(hasPermission(gest, SystemAction.SUSPEND_USER)).toBe(true);
  });

  it('gestor CAN edit system config (v3.2 — inherits admin)', () => {
    expect(hasPermission(gest, SystemAction.EDIT_SYSTEM_CONFIG)).toBe(true);
  });

  it('gestor VFZ CANNOT manage VCS yard', () => {
    expect(canManageTeam(gest, 'VCS')).toBe(false);
  });

  it('gestor VFZ CAN manage own yard', () => {
    expect(canManageTeam(gest, 'VFZ')).toBe(true);
  });

  it('gestor with target user same yard → allowed', () => {
    const target = createUserProfile({ matricula: 'VFZ1002', nome: 'Op', funcao: 'maquinista', primaryYard: 'VFZ' });
    expect(hasPermission(gest, SystemAction.MANAGE_TEAM, { targetUser: target })).toBe(true);
  });

  it('gestor with target user different yard → denied', () => {
    const target = createUserProfile({ matricula: 'VCS1002', nome: 'Op VCS', funcao: 'maquinista', primaryYard: 'VCS' });
    expect(hasPermission(gest, SystemAction.MANAGE_TEAM, { targetUser: target })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P08: PERFORMANCE SCORING
// ═══════════════════════════════════════════════════════════════════════

describe('P08 — Performance Scoring', () => {
  it('perfect score = 100', () => {
    const perf: UserPerformance = {
      matricula: 'VFZ1001', yardCode: 'VFZ',
      quizResults: [{ id: 'q1', topic: 'S', totalQuestions: 10, correctAnswers: 10, percentage: 100, completedAt: '', yardContext: 'VFZ' }],
      dssSubmitted: 10, dssApproved: 10, handoversCompleted: 20,
      operationalErrors: 0, overallScore: 0, lastUpdated: '',
    };
    expect(calculateScore(perf)).toBe(100);
  });

  it('errors reduce score', () => {
    const perf: UserPerformance = {
      matricula: 'VFZ1001', yardCode: 'VFZ',
      quizResults: [], dssSubmitted: 0, dssApproved: 0,
      handoversCompleted: 0, operationalErrors: 5,
      overallScore: 0, lastUpdated: '',
    };
    const score = calculateScore(perf);
    expect(score).toBeLessThan(50);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('no negative scores', () => {
    const perf: UserPerformance = {
      matricula: 'VFZ1001', yardCode: 'VFZ',
      quizResults: [], dssSubmitted: 0, dssApproved: 0,
      handoversCompleted: 0, operationalErrors: 100,
      overallScore: 0, lastUpdated: '',
    };
    expect(calculateScore(perf)).toBeGreaterThanOrEqual(0);
  });
});
