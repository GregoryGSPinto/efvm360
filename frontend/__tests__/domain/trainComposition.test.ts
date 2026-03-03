// ============================================================================
// EFVM360 — Tests: TrainComposition Aggregate
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  createTrainComposition,
  departComposition,
  arriveComposition,
  completeComposition,
  getJourneyProgress,
  getJourneyDurationMinutes,
} from '../../src/domain/aggregates/TrainComposition';

describe('TrainComposition Aggregate', () => {
  describe('createTrainComposition', () => {
    it('creates a loading composition', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
        cargoType: 'Minerio',
        wagonCount: 80,
      });

      expect(comp.id).toBeTruthy();
      expect(comp.compositionCode).toBe('COMP-001');
      expect(comp.originYard).toBe('VFZ');
      expect(comp.destinationYard).toBe('VBR');
      expect(comp.currentYard).toBe('VFZ');
      expect(comp.status).toBe('loading');
      expect(comp.cargoType).toBe('Minerio');
      expect(comp.wagonCount).toBe(80);
      expect(comp.journey).toEqual([]);
      expect(comp.departedAt).toBeNull();
      expect(comp.arrivedAt).toBeNull();
    });

    it('handles optional fields', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-002',
        originYard: 'VCS',
        destinationYard: 'P6',
      });

      expect(comp.cargoType).toBeNull();
      expect(comp.wagonCount).toBeNull();
    });
  });

  describe('departComposition', () => {
    it('transitions from loading to in_transit', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      const departed = departComposition(comp, 'VBR');

      expect(departed.status).toBe('in_transit');
      expect(departed.journey).toHaveLength(1);
      expect(departed.journey[0].fromYard).toBe('VFZ');
      expect(departed.journey[0].toYard).toBe('VBR');
      expect(departed.journey[0].departedAt).toBeTruthy();
      expect(departed.journey[0].arrivedAt).toBeNull();
      expect(departed.departedAt).toBeTruthy();
    });

    it('links handover UUID when provided', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      const departed = departComposition(comp, 'VBR', 'handover-uuid-123');

      expect(departed.journey[0].handoverUuid).toBe('handover-uuid-123');
    });

    it('throws when in_transit', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      const departed = departComposition(comp, 'VBR');
      expect(() => departComposition(departed, 'VCS')).toThrow();
    });

    it('allows departure after arriving at intermediate yard', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VTO',
      });
      const departed = departComposition(comp, 'VBR');
      const arrived = arriveComposition(departed, 'VBR');
      const departed2 = departComposition(arrived, 'VTO');

      expect(departed2.status).toBe('in_transit');
      expect(departed2.journey).toHaveLength(2);
      expect(departed2.journey[1].fromYard).toBe('VBR');
      expect(departed2.journey[1].toYard).toBe('VTO');
    });
  });

  describe('arriveComposition', () => {
    it('transitions from in_transit to arrived', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      const departed = departComposition(comp, 'VBR');
      const arrived = arriveComposition(departed, 'VBR');

      expect(arrived.status).toBe('arrived');
      expect(arrived.currentYard).toBe('VBR');
      expect(arrived.journey[0].arrivedAt).toBeTruthy();
    });

    it('throws when not in_transit', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      expect(() => arriveComposition(comp, 'VBR')).toThrow();
    });
  });

  describe('completeComposition', () => {
    it('transitions from arrived to completed', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      const departed = departComposition(comp, 'VBR');
      const arrived = arriveComposition(departed, 'VBR');
      const completed = completeComposition(arrived);

      expect(completed.status).toBe('completed');
    });

    it('throws when loading', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      expect(() => completeComposition(comp)).toThrow();
    });

    it('throws when in_transit', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      const departed = departComposition(comp, 'VBR');
      expect(() => completeComposition(departed)).toThrow();
    });
  });

  describe('getJourneyProgress', () => {
    it('returns 10 for loading', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      expect(getJourneyProgress(comp)).toBe(10);
    });

    it('returns 50 for in_transit', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      const departed = departComposition(comp, 'VBR');
      expect(getJourneyProgress(departed)).toBe(50);
    });

    it('returns 90 for arrived at destination', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      const departed = departComposition(comp, 'VBR');
      const arrived = arriveComposition(departed, 'VBR');
      expect(getJourneyProgress(arrived)).toBe(90);
    });

    it('returns 100 for completed', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      const departed = departComposition(comp, 'VBR');
      const arrived = arriveComposition(departed, 'VBR');
      const completed = completeComposition(arrived);
      expect(getJourneyProgress(completed)).toBe(100);
    });
  });

  describe('getJourneyDurationMinutes', () => {
    it('returns null if not departed', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      expect(getJourneyDurationMinutes(comp)).toBeNull();
    });

    it('returns duration when departed', () => {
      const comp = createTrainComposition({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
      });
      const departed = departComposition(comp, 'VBR');
      const duration = getJourneyDurationMinutes(departed);
      expect(duration).not.toBeNull();
      expect(typeof duration).toBe('number');
    });
  });
});
