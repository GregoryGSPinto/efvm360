// ============================================================================
// EFVM360 — Analytics Service (Frontend)
// KPI calculations and mock data for offline mode
// ============================================================================

export interface DailyStats {
  date: string;
  yard: string;
  totalHandovers: number;
  compliance: number;
  fiveS: number;
  anomalies: number;
  interYardCount: number;
}

export interface YardSummary {
  yard: string;
  compliance30d: number;
  trend: 'improving' | 'stable' | 'declining';
  handovers30d: number;
  anomalies30d: number;
  avgResolutionHours: number;
}

// ── Mock Data Generator ─────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function generateMockDailyStats(yard: string, days: number = 30): DailyStats[] {
  const stats: DailyStats[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    stats.push({
      date: date.toISOString().split('T')[0],
      yard,
      totalHandovers: Math.floor(randomBetween(5, 15)),
      compliance: parseFloat(randomBetween(75, 98).toFixed(2)),
      fiveS: parseFloat(randomBetween(3.2, 4.8).toFixed(2)),
      anomalies: Math.floor(randomBetween(0, 3)),
      interYardCount: Math.floor(randomBetween(0, 3)),
    });
  }
  return stats.reverse();
}

export function generateMockYardSummaries(): YardSummary[] {
  const yards = ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'];
  const trends: Array<'improving' | 'stable' | 'declining'> = ['improving', 'stable', 'declining'];
  return yards.map(yard => ({
    yard,
    compliance30d: parseFloat(randomBetween(80, 98).toFixed(2)),
    trend: trends[Math.floor(Math.random() * 3)],
    handovers30d: Math.floor(randomBetween(150, 350)),
    anomalies30d: Math.floor(randomBetween(0, 15)),
    avgResolutionHours: parseFloat(randomBetween(1, 10).toFixed(2)),
  }));
}

// ── KPI Calculations ────────────────────────────────────────────────────

export function calculateAvgCompliance(stats: DailyStats[]): number {
  if (stats.length === 0) return 0;
  return parseFloat((stats.reduce((sum, s) => sum + s.compliance, 0) / stats.length).toFixed(2));
}

export function calculateTotalHandovers(stats: DailyStats[]): number {
  return stats.reduce((sum, s) => sum + s.totalHandovers, 0);
}

export function calculateTotalAnomalies(stats: DailyStats[]): number {
  return stats.reduce((sum, s) => sum + s.anomalies, 0);
}

export function calculateAvgFiveS(stats: DailyStats[]): number {
  if (stats.length === 0) return 0;
  return parseFloat((stats.reduce((sum, s) => sum + s.fiveS, 0) / stats.length).toFixed(2));
}

export function getComplianceStatus(rate: number): 'green' | 'yellow' | 'red' {
  if (rate >= 90) return 'green';
  if (rate >= 80) return 'yellow';
  return 'red';
}

export function getComplianceTrend(stats: DailyStats[]): 'improving' | 'stable' | 'declining' {
  if (stats.length < 7) return 'stable';
  const recent = stats.slice(-7);
  const older = stats.slice(-14, -7);
  if (older.length === 0) return 'stable';
  const recentAvg = calculateAvgCompliance(recent);
  const olderAvg = calculateAvgCompliance(older);
  const diff = recentAvg - olderAvg;
  if (diff > 2) return 'improving';
  if (diff < -2) return 'declining';
  return 'stable';
}
