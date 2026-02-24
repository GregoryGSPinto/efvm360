// ============================================================================
// EFVM360 — Team & Performance Service
// Teams, performance scoring, rankings, projections
// ============================================================================

import type { YardCode } from '../domain/aggregates/YardRegistry';

const STORAGE = {
  TEAMS: 'efvm360-teams',
  PERFORMANCE: 'efvm360-performance',
  USUARIOS: 'efvm360-usuarios',
};

// ══════════════════════════════════════════════════════════════════════════
// TEAM AGGREGATE (P07)
// ══════════════════════════════════════════════════════════════════════════

export interface Team {
  id: string;
  name: string;
  yardCode: YardCode;
  leaderId: string;        // Inspetor matrícula
  memberIds: string[];     // Operador matrículas
  teamScore: number;
  createdAt: string;
  createdBy: string;
  status: 'active' | 'dissolved';
}

function loadTeams(): Team[] {
  try { return JSON.parse(localStorage.getItem(STORAGE.TEAMS) || '[]'); }
  catch { return []; }
}

function saveTeams(teams: Team[]): void {
  localStorage.setItem(STORAGE.TEAMS, JSON.stringify(teams));
}

export function createTeam(name: string, yardCode: YardCode, leaderId: string, createdBy: string): Team {
  const team: Team = {
    id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    yardCode,
    leaderId,
    memberIds: [],
    teamScore: 0,
    createdAt: new Date().toISOString(),
    createdBy,
    status: 'active',
  };
  const teams = loadTeams();
  teams.push(team);
  saveTeams(teams);
  return team;
}

export function addTeamMember(teamId: string, memberMatricula: string): boolean {
  const teams = loadTeams();
  // Remove from any existing team first
  for (const t of teams) {
    t.memberIds = t.memberIds.filter(m => m !== memberMatricula);
  }
  const team = teams.find(t => t.id === teamId);
  if (!team || team.status !== 'active') return false;
  if (!team.memberIds.includes(memberMatricula)) {
    team.memberIds.push(memberMatricula);
  }
  saveTeams(teams);
  return true;
}

export function removeTeamMember(teamId: string, memberMatricula: string): boolean {
  const teams = loadTeams();
  const team = teams.find(t => t.id === teamId);
  if (!team) return false;
  team.memberIds = team.memberIds.filter(m => m !== memberMatricula);
  saveTeams(teams);
  return true;
}

export function transferMember(memberMatricula: string, fromTeamId: string, toTeamId: string): boolean {
  removeTeamMember(fromTeamId, memberMatricula);
  return addTeamMember(toTeamId, memberMatricula);
}

export function dissolveTeam(teamId: string): boolean {
  const teams = loadTeams();
  const team = teams.find(t => t.id === teamId);
  if (!team) return false;
  team.status = 'dissolved';
  team.memberIds = [];
  saveTeams(teams);
  return true;
}

export function getTeamsByYard(yardCode: YardCode): Team[] {
  return loadTeams().filter(t => t.yardCode === yardCode && t.status === 'active');
}

export function getTeamForUser(memberMatricula: string): Team | null {
  return loadTeams().find(t => t.memberIds.includes(memberMatricula) && t.status === 'active') || null;
}

export function getAllTeams(): Team[] {
  return loadTeams().filter(t => t.status === 'active');
}

// ══════════════════════════════════════════════════════════════════════════
// USER PERFORMANCE (P08)
// ══════════════════════════════════════════════════════════════════════════

export interface QuizResult {
  id: string;
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  completedAt: string;
  yardContext: YardCode;
}

export interface UserPerformance {
  matricula: string;
  yardCode: YardCode;
  teamId?: string;
  quizResults: QuizResult[];
  dssSubmitted: number;
  dssApproved: number;
  handoversCompleted: number;
  operationalErrors: number;
  overallScore: number;
  lastUpdated: string;
}

function loadPerformance(): UserPerformance[] {
  try { return JSON.parse(localStorage.getItem(STORAGE.PERFORMANCE) || '[]'); }
  catch { return []; }
}

function savePerformance(data: UserPerformance[]): void {
  localStorage.setItem(STORAGE.PERFORMANCE, JSON.stringify(data));
}

export function getOrCreatePerformance(matricula: string, yardCode: YardCode): UserPerformance {
  const all = loadPerformance();
  let perf = all.find(p => p.matricula === matricula);
  if (!perf) {
    perf = {
      matricula,
      yardCode,
      quizResults: [],
      dssSubmitted: 0,
      dssApproved: 0,
      handoversCompleted: 0,
      operationalErrors: 0,
      overallScore: 0,
      lastUpdated: new Date().toISOString(),
    };
    all.push(perf);
    savePerformance(all);
  }
  return perf;
}

export function recordQuizResult(matricula: string, result: Omit<QuizResult, 'id'>): void {
  const all = loadPerformance();
  const perf = all.find(p => p.matricula === matricula);
  if (!perf) return;
  perf.quizResults.push({
    ...result,
    id: `quiz-${Date.now()}`,
  });
  perf.overallScore = calculateScore(perf);
  perf.lastUpdated = new Date().toISOString();
  savePerformance(all);
}

export function incrementHandover(matricula: string): void {
  const all = loadPerformance();
  const perf = all.find(p => p.matricula === matricula);
  if (!perf) return;
  perf.handoversCompleted++;
  perf.overallScore = calculateScore(perf);
  perf.lastUpdated = new Date().toISOString();
  savePerformance(all);
}

export function incrementDSS(matricula: string, approved: boolean): void {
  const all = loadPerformance();
  const perf = all.find(p => p.matricula === matricula);
  if (!perf) return;
  perf.dssSubmitted++;
  if (approved) perf.dssApproved++;
  perf.overallScore = calculateScore(perf);
  perf.lastUpdated = new Date().toISOString();
  savePerformance(all);
}

export function calculateScore(perf: UserPerformance): number {
  // Quiz (40%)
  const quizAvg = perf.quizResults.length > 0
    ? perf.quizResults.reduce((sum, q) => sum + q.percentage, 0) / perf.quizResults.length
    : 50; // Default baseline
  const quizScore = quizAvg * 0.4;

  // DSS Approved (30%)
  const dssRate = perf.dssSubmitted > 0 ? (perf.dssApproved / perf.dssSubmitted) * 100 : 50;
  const dssScore = dssRate * 0.3;

  // Handovers (20%) — capped at 100 for max score
  const handoverScore = Math.min(100, perf.handoversCompleted * 5) * 0.2;

  // Errors (10% inverted) — fewer errors = higher score
  const errorPenalty = Math.max(0, 100 - perf.operationalErrors * 10) * 0.1;

  return Math.round(Math.min(100, quizScore + dssScore + handoverScore + errorPenalty));
}

// ══════════════════════════════════════════════════════════════════════════
// PROJECTIONS (P09)
// ══════════════════════════════════════════════════════════════════════════

export interface TeamPerformanceView {
  team: Team;
  avgScore: number;
  memberCount: number;
  topPerformer?: { matricula: string; nome: string; score: number };
}

export interface YardPerformanceView {
  yardCode: YardCode;
  totalUsers: number;
  totalTeams: number;
  avgScore: number;
  handoverCount: number;
  dssCount: number;
}

export function getTeamPerformance(yardCode: YardCode): TeamPerformanceView[] {
  const teams = getTeamsByYard(yardCode);
  const allPerf = loadPerformance();
  const users: Array<{ matricula: string; nome: string }> = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE.USUARIOS) || '[]'); }
    catch { return []; }
  })();

  return teams.map(team => {
    const memberPerfs = allPerf.filter(p => team.memberIds.includes(p.matricula));
    const avgScore = memberPerfs.length > 0
      ? Math.round(memberPerfs.reduce((s, p) => s + p.overallScore, 0) / memberPerfs.length)
      : 0;
    const top = memberPerfs.sort((a, b) => b.overallScore - a.overallScore)[0];
    const topUser = top ? users.find((u) => u.matricula === top.matricula) : null;

    return {
      team,
      avgScore,
      memberCount: team.memberIds.length,
      topPerformer: top ? { matricula: top.matricula, nome: topUser?.nome || top.matricula, score: top.overallScore } : undefined,
    };
  });
}

export function getYardPerformance(yardCode: YardCode): YardPerformanceView {
  const allPerf = loadPerformance().filter(p => p.yardCode === yardCode);
  const teams = getTeamsByYard(yardCode);

  return {
    yardCode,
    totalUsers: allPerf.length,
    totalTeams: teams.length,
    avgScore: allPerf.length > 0
      ? Math.round(allPerf.reduce((s, p) => s + p.overallScore, 0) / allPerf.length)
      : 0,
    handoverCount: allPerf.reduce((s, p) => s + p.handoversCompleted, 0),
    dssCount: allPerf.reduce((s, p) => s + p.dssSubmitted, 0),
  };
}

export function getUserRanking(yardCode?: YardCode): UserPerformance[] {
  let all = loadPerformance();
  if (yardCode) all = all.filter(p => p.yardCode === yardCode);
  return all.sort((a, b) => b.overallScore - a.overallScore);
}

export function getTeamRanking(yardCode: YardCode): TeamPerformanceView[] {
  return getTeamPerformance(yardCode).sort((a, b) => b.avgScore - a.avgScore);
}

// ══════════════════════════════════════════════════════════════════════════
// SEED: Initial teams (1 per yard)
// ══════════════════════════════════════════════════════════════════════════

export function seedTeams(): void {
  const existing = loadTeams();
  if (existing.length > 0) return; // Already seeded

  const yards: { code: YardCode; name: string; leader: string; members: string[] }[] = [
    { code: 'VFZ', name: 'Equipe Alpha VFZ', leader: 'VFZ2001', members: ['VFZ1001', 'VFZ1002', 'VFZ1003', 'VFZ1004', 'VFZ1005'] },
    { code: 'VBR', name: 'Equipe Alpha VBR', leader: 'VBR2001', members: ['VBR1001', 'VBR1002', 'VBR1003', 'VBR1004', 'VBR1005'] },
    { code: 'VCS', name: 'Equipe Alpha VCS', leader: 'VCS2001', members: ['VCS1001', 'VCS1002', 'VCS1003', 'VCS1004', 'VCS1005'] },
    { code: 'P6',  name: 'Equipe Alpha P6',  leader: 'P62001',  members: ['P61001', 'P61002', 'P61003', 'P61004', 'P61005'] },
    { code: 'VTO', name: 'Equipe Alpha VTO', leader: 'VTO2001', members: ['VTO1001', 'VTO1002', 'VTO1003', 'VTO1004', 'VTO1005'] },
  ];

  const teams: Team[] = yards.map(y => ({
    id: `team-${y.code.toLowerCase()}-alpha`,
    name: y.name,
    yardCode: y.code,
    leaderId: y.leader,
    memberIds: y.members,
    teamScore: 0,
    createdAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
    status: 'active' as const,
  }));

  saveTeams(teams);

  // Seed initial performance for all members
  const allPerf: UserPerformance[] = [];

  for (const team of teams) {
    for (const memberId of team.memberIds) {
      allPerf.push({
        matricula: memberId,
        yardCode: team.yardCode,
        teamId: team.id,
        quizResults: [],
        dssSubmitted: Math.floor(Math.random() * 10) + 1,
        dssApproved: Math.floor(Math.random() * 8) + 1,
        handoversCompleted: Math.floor(Math.random() * 20) + 5,
        operationalErrors: Math.floor(Math.random() * 3),
        overallScore: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  // Calculate initial scores
  for (const p of allPerf) {
    p.overallScore = calculateScore(p);
  }

  savePerformance(allPerf);
  // [DEBUG] console.log(`[EFVM360] ✅ Seed teams: ${teams.length} equipes, ${allPerf.length} performances`);
}
