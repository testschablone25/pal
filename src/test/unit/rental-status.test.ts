import { describe, it, expect } from 'vitest';

describe('Rental Status Logic', () => {
  it('should detect overdue rentals', () => {
    const isOverdue = (expectedReturn: string, actualReturn: string | null): boolean => {
      if (actualReturn) return false;
      return new Date(expectedReturn) < new Date();
    };

    expect(isOverdue('2026-03-01', null)).toBe(true);
    expect(isOverdue('2027-06-01', null)).toBe(false);
    expect(isOverdue('2026-03-01', '2026-03-28')).toBe(false);
  });

  it('should calculate rental duration in days', () => {
    const calculateDuration = (start: string, end: string): number => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    };

    expect(calculateDuration('2026-04-01', '2026-04-03')).toBe(2);
    expect(calculateDuration('2026-04-01', '2026-04-10')).toBe(9);
    expect(calculateDuration('2026-04-01', '2026-04-01')).toBe(0);
  });

  it('should construct correct location entry on rental return', () => {
    const createReturnEntry = (itemId: string, returnLocation: string, returnedBy: string) => ({
      item_id: itemId,
      location: returnLocation,
      action: 'rental_return',
      moved_by: returnedBy,
    });

    const entry = createReturnEntry('item-1', 'Main Storage', 'user-1');

    expect(entry.action).toBe('rental_return');
    expect(entry.location).toBe('Main Storage');
    expect(entry.item_id).toBe('item-1');
  });

  it('should default return location to Main Storage when not specified', () => {
    const getReturnLocation = (specified?: string): string => {
      return specified || 'Main Storage';
    };

    expect(getReturnLocation()).toBe('Main Storage');
    expect(getReturnLocation('Room A')).toBe('Room A');
    expect(getReturnLocation('')).toBe('Main Storage');
  });

  it('should handle status transitions correctly', () => {
    const validTransitions: Record<string, string[]> = {
      active: ['returned', 'overdue'],
      returned: [],
      overdue: ['returned'],
    };

    expect(validTransitions['active']).toContain('returned');
    expect(validTransitions['active']).toContain('overdue');
    expect(validTransitions['returned']).toHaveLength(0);
    expect(validTransitions['overdue']).toContain('returned');
  });
});
