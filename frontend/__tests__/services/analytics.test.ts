// ============================================================================
// EFVM360 — Tests: Analytics Service (KPI Calculations)
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  calculateAvgCompliance,
  calculateTotalHandovers,
  calculateTotalAnomalies,
  calculateAvgFiveS,
  getComplianceStatus,
  getComplianceTrend,
  generateMockDailyStats,
  generateMockYardSummaries,
} from '../../src/services/analyticsService';
import type { DailyStats } from '../../src/services/analyticsService';

function makeDailyStats(overrides: Partial<DailyStats>[] = []): DailyStats[] {
  const base: DailyStats[] = [
    { date: '2026-01-01', yard: 'VFZ', totalHandovers: 10, compliance: 90, fiveS: 4.0, anomalies: 1, interYardCount: 0 },
    { date: '2026-01-02', yard: 'VFZ', totalHandovers: 12, compliance: 92, fiveS: 4.2, anomalies: 0, interYardCount: 1 },
    { date: '2026-01-03', yard: 'VFZ', totalHandovers: 8, compliance: 88, fiveS: 3.8, anomalies: 2, interYardCount: 0 },
  ];
  for (let i = 0; i < overrides.length && i < base.length; i++) {
    base[i] = { ...base[i], ...overrides[i] };
  }
  return base;
}

describe('Analytics Service', () => {
  describe('calculateAvgCompliance', () => {
    it('calculates average compliance', () => {
      const stats = makeDailyStats();
      expect(calculateAvgCompliance(stats)).toBe(90);
    });

    it('returns 0 for empty array', () => {
      expect(calculateAvgCompliance([])).toBe(0);
    });
  });

  describe('calculateTotalHandovers', () => {
    it('sums all handovers', () => {
      const stats = makeDailyStats();
      expect(calculateTotalHandovers(stats)).toBe(30);
    });
  });

  describe('calculateTotalAnomalies', () => {
    it('sums all anomalies', () => {
      const stats = makeDailyStats();
      expect(calculateTotalAnomalies(stats)).toBe(3);
    });
  });

  describe('calculateAvgFiveS', () => {
    it('calculates average 5S score', () => {
      const stats = makeDailyStats();
      expect(calculateAvgFiveS(stats)).toBe(4);
    });

    it('returns 0 for empty array', () => {
      expect(calculateAvgFiveS([])).toBe(0);
    });
  });

  describe('getComplianceStatus', () => {
    it('returns green for >=90', () => {
      expect(getComplianceStatus(90)).toBe('green');
      expect(getComplianceStatus(95)).toBe('green');
    });

    it('returns yellow for 80-89', () => {
      expect(getComplianceStatus(80)).toBe('yellow');
      expect(getComplianceStatus(89)).toBe('yellow');
    });

    it('returns red for <80', () => {
      expect(getComplianceStatus(79)).toBe('red');
      expect(getComplianceStatus(50)).toBe('red');
    });
  });

  describe('getComplianceTrend', () => {
    it('returns stable for insufficient data', () => {
      const stats = makeDailyStats();
      expect(getComplianceTrend(stats)).toBe('stable');
    });

    it('detects improving trend', () => {
      const stats: DailyStats[] = [];
      for (let i = 0; i < 14; i++) {
        stats.push({
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
          yard: 'VFZ',
          totalHandovers: 10,
          compliance: i < 7 ? 80 : 90, // older=80, recent=90
          fiveS: 4.0,
          anomalies: 0,
          interYardCount: 0,
        });
      }
      expect(getComplianceTrend(stats)).toBe('improving');
    });

    it('detects declining trend', () => {
      const stats: DailyStats[] = [];
      for (let i = 0; i < 14; i++) {
        stats.push({
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
          yard: 'VFZ',
          totalHandovers: 10,
          compliance: i < 7 ? 95 : 85, // older=95, recent=85
          fiveS: 4.0,
          anomalies: 0,
          interYardCount: 0,
        });
      }
      expect(getComplianceTrend(stats)).toBe('declining');
    });
  });

  describe('generateMockDailyStats', () => {
    it('generates correct number of days', () => {
      const stats = generateMockDailyStats('VFZ', 30);
      expect(stats).toHaveLength(30);
      expect(stats[0].yard).toBe('VFZ');
    });

    it('generates realistic values', () => {
      const stats = generateMockDailyStats('VBR', 10);
      for (const s of stats) {
        expect(s.totalHandovers).toBeGreaterThanOrEqual(5);
        expect(s.totalHandovers).toBeLessThanOrEqual(15);
        expect(s.compliance).toBeGreaterThanOrEqual(75);
        expect(s.compliance).toBeLessThanOrEqual(98);
        expect(s.fiveS).toBeGreaterThanOrEqual(3.2);
        expect(s.fiveS).toBeLessThanOrEqual(4.8);
        expect(s.anomalies).toBeGreaterThanOrEqual(0);
        expect(s.anomalies).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('generateMockYardSummaries', () => {
    it('generates summaries for all 5 yards', () => {
      const summaries = generateMockYardSummaries();
      expect(summaries).toHaveLength(5);
      const yards = summaries.map(s => s.yard);
      expect(yards).toContain('VFZ');
      expect(yards).toContain('VBR');
      expect(yards).toContain('VCS');
      expect(yards).toContain('P6');
      expect(yards).toContain('VTO');
    });
  });
});
