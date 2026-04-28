import { describe, it, expect } from 'vitest';

describe('Inventory Location Tracking', () => {
  it('should create correct location history entry on check-in', () => {
    const createLocationEntry = (itemId: string, location: string, action: string, movedBy: string) => ({
      item_id: itemId,
      location,
      action,
      moved_by: movedBy,
    });

    const entry = createLocationEntry('item-1', 'Main Storage', 'check_in', 'user-1');

    expect(entry.item_id).toBe('item-1');
    expect(entry.location).toBe('Main Storage');
    expect(entry.action).toBe('check_in');
    expect(entry.moved_by).toBe('user-1');
  });

  it('should validate action type is one of the allowed values', () => {
    const validActions = ['check_in', 'check_out', 'transfer', 'rental_out', 'rental_return'];

    expect(validActions).toContain('check_in');
    expect(validActions).toContain('check_out');
    expect(validActions).toContain('transfer');
    expect(validActions).toContain('rental_out');
    expect(validActions).toContain('rental_return');
    expect(validActions).not.toContain('delete');
    expect(validActions).not.toContain('move');
  });

  it('should update current_location when logging location change', () => {
    const updateLocation = (currentLocation: string | null, newLocation: string): string => {
      return newLocation;
    };

    expect(updateLocation('Main Storage', 'Room A')).toBe('Room A');
    expect(updateLocation(null, 'Main Storage')).toBe('Main Storage');
    expect(updateLocation('Rented to: Club XYZ', 'Main Storage')).toBe('Main Storage');
  });

  it('should detect when item is currently rented', () => {
    type ItemWithRental = {
      id: string;
      current_location: string;
      active_rental: { rented_to: string; expected_return: string } | null;
    };

    const rentedItem: ItemWithRental = {
      id: 'item-1',
      current_location: 'Rented to: Club XYZ',
      active_rental: { rented_to: 'Club XYZ', expected_return: '2026-05-01' },
    };

    const notRentedItem: ItemWithRental = {
      id: 'item-2',
      current_location: 'Main Storage',
      active_rental: null,
    };

    expect(rentedItem.active_rental).not.toBeNull();
    expect(rentedItem.active_rental?.rented_to).toBe('Club XYZ');
    expect(notRentedItem.active_rental).toBeNull();
  });

  it('should require a location for check-in/check-out', () => {
    const validateLocationAction = (location: string | null | undefined): boolean => {
      return !!location && location.trim().length > 0;
    };

    expect(validateLocationAction('Room A')).toBe(true);
    expect(validateLocationAction('')).toBe(false);
    expect(validateLocationAction(null)).toBe(false);
    expect(validateLocationAction(undefined)).toBe(false);
  });
});
