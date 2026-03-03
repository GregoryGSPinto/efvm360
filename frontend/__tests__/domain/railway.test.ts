// ============================================================================
// EFVM360 — Tests: Railway (Multi-Tenancy)
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  getRailwayById,
  getRailwayBranding,
  getAllRailways,
  isValidRailway,
  RAILWAYS,
} from '../../src/domain/aggregates/Railway';

describe('Railway (Multi-Tenancy)', () => {
  describe('RAILWAYS constant', () => {
    it('contains 3 railways', () => {
      expect(RAILWAYS).toHaveLength(3);
    });

    it('has EFVM, EFC, FCA', () => {
      const ids = RAILWAYS.map(r => r.id);
      expect(ids).toContain('EFVM');
      expect(ids).toContain('EFC');
      expect(ids).toContain('FCA');
    });
  });

  describe('getRailwayById', () => {
    it('returns EFVM railway', () => {
      const r = getRailwayById('EFVM');
      expect(r).toBeDefined();
      expect(r!.name).toBe('Estrada de Ferro Vitória-Minas');
      expect(r!.region).toBe('ES/MG');
    });

    it('returns EFC railway', () => {
      const r = getRailwayById('EFC');
      expect(r!.branding.primaryColor).toBe('#1a5276');
    });

    it('returns undefined for unknown id', () => {
      expect(getRailwayById('UNKNOWN')).toBeUndefined();
    });
  });

  describe('getRailwayBranding', () => {
    it('returns correct branding for EFVM', () => {
      const b = getRailwayBranding('EFVM');
      expect(b.primaryColor).toBe('#007e7a');
      expect(b.secondaryColor).toBe('#d4a017');
    });

    it('returns correct branding for EFC', () => {
      const b = getRailwayBranding('EFC');
      expect(b.primaryColor).toBe('#1a5276');
      expect(b.secondaryColor).toBe('#f39c12');
    });

    it('returns correct branding for FCA', () => {
      const b = getRailwayBranding('FCA');
      expect(b.primaryColor).toBe('#2e86c1');
      expect(b.secondaryColor).toBe('#e74c3c');
    });

    it('falls back to EFVM branding for unknown railway', () => {
      const b = getRailwayBranding('UNKNOWN');
      expect(b.primaryColor).toBe('#007e7a');
    });
  });

  describe('getAllRailways', () => {
    it('returns all railways', () => {
      expect(getAllRailways()).toHaveLength(3);
    });
  });

  describe('isValidRailway', () => {
    it('returns true for valid railways', () => {
      expect(isValidRailway('EFVM')).toBe(true);
      expect(isValidRailway('EFC')).toBe(true);
      expect(isValidRailway('FCA')).toBe(true);
    });

    it('returns false for invalid railway', () => {
      expect(isValidRailway('UNKNOWN')).toBe(false);
      expect(isValidRailway('')).toBe(false);
    });
  });

  describe('tenant isolation principle', () => {
    it('each railway has distinct branding', () => {
      const colors = RAILWAYS.map(r => r.branding.primaryColor);
      const unique = new Set(colors);
      expect(unique.size).toBe(3);
    });

    it('each railway has unique id', () => {
      const ids = RAILWAYS.map(r => r.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(3);
    });
  });
});
