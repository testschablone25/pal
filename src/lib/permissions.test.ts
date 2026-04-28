import { describe, it, expect } from 'vitest';
import {
  canAccessRoute,
  hasPermission,
  getHighestRole,
  sortRolesByRank,
  hasRole,
  getRoleBadges,
  isValidRole,
  parseRoles,
  getAssignableRoles,
  ALL_ROLES,
  type AppRole,
} from './permissions';

describe('Multi-Role Permissions System', () => {
  describe('canAccessRoute', () => {
    it('should return false for null or empty roles', () => {
      expect(canAccessRoute(null, '/artists')).toBe(false);
      expect(canAccessRoute([], '/artists')).toBe(false);
    });

    it('should grant admin access to all routes', () => {
      expect(canAccessRoute(['admin'], '/artists')).toBe(true);
      expect(canAccessRoute(['admin'], '/staff')).toBe(true);
      expect(canAccessRoute(['admin'], '/events')).toBe(true);
      expect(canAccessRoute(['admin'], '/admin')).toBe(true);
    });

    it('should accept single role (backward compatibility)', () => {
      expect(canAccessRoute('admin' as AppRole, '/artists')).toBe(true);
      expect(canAccessRoute('booking' as AppRole, '/artists')).toBe(true);
      expect(canAccessRoute('azubi' as AppRole, '/artists')).toBe(false);
    });

    it('should grant access if ANY role matches', () => {
      // User with azubi and booking roles can access artists
      expect(canAccessRoute(['azubi', 'booking'], '/artists')).toBe(true);
      // User with only azubi cannot
      expect(canAccessRoute(['azubi'], '/artists')).toBe(false);
    });

    it('should respect route access rules', () => {
      // /artists: admin, manager, booking, label
      expect(canAccessRoute(['booking'], '/artists')).toBe(true);
      expect(canAccessRoute(['label'], '/artists')).toBe(true);
      expect(canAccessRoute(['staff'], '/artists')).toBe(false);
      
      // /staff: admin, manager, backoffice, staff
      expect(canAccessRoute(['backoffice'], '/staff')).toBe(true);
      expect(canAccessRoute(['staff'], '/staff')).toBe(true);
      expect(canAccessRoute(['booking'], '/staff')).toBe(false);
      
      // /events: admin, manager, booking, social-media, night-management, staff, backoffice
      expect(canAccessRoute(['social-media'], '/events')).toBe(true);
      expect(canAccessRoute(['night-management'], '/events')).toBe(true);
      expect(canAccessRoute(['awareness'], '/events')).toBe(false);
    });

    it('should handle nested routes', () => {
      expect(canAccessRoute(['booking'], '/artists/new')).toBe(true);
      expect(canAccessRoute(['booking'], '/artists/123')).toBe(true);
      expect(canAccessRoute(['staff'], '/staff/shifts')).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should return false for null or empty roles', () => {
      expect(hasPermission(null, 'ARTISTS_READ')).toBe(false);
      expect(hasPermission([], 'ARTISTS_READ')).toBe(false);
    });

    it('should grant admin all permissions', () => {
      expect(hasPermission(['admin'], 'ARTISTS_READ')).toBe(true);
      expect(hasPermission(['admin'], 'ARTISTS_WRITE')).toBe(true);
      expect(hasPermission(['admin'], 'ROLES_MANAGE')).toBe(true);
    });

    it('should grant access if ANY role has permission', () => {
      // Only backoffice can manage roles, not staff
      expect(hasPermission(['staff', 'backoffice'], 'ROLES_MANAGE')).toBe(true);
      expect(hasPermission(['staff'], 'ROLES_MANAGE')).toBe(false);
    });
  });

  describe('getHighestRole', () => {
    it('should return null for empty array', () => {
      expect(getHighestRole([])).toBe(null);
    });

    it('should return the highest ranked role', () => {
      expect(getHighestRole(['azubi', 'staff', 'manager'])).toBe('manager');
      expect(getHighestRole(['booking', 'label'])).toBe('booking');
    });

    it('should handle single role', () => {
      expect(getHighestRole(['admin'])).toBe('admin');
    });
  });

  describe('sortRolesByRank', () => {
    it('should sort roles by rank (highest first)', () => {
      const roles: AppRole[] = ['azubi', 'staff', 'manager', 'admin'];
      const sorted = sortRolesByRank(roles);
      expect(sorted).toEqual(['admin', 'manager', 'staff', 'azubi']);
    });

    it('should not modify original array', () => {
      const roles: AppRole[] = ['azubi', 'admin'];
      const sorted = sortRolesByRank(roles);
      expect(roles[0]).toBe('azubi'); // Original unchanged
      expect(sorted[0]).toBe('admin');
    });
  });

  describe('hasRole', () => {
    it('should return true if user has the role', () => {
      expect(hasRole(['staff', 'booking'], 'staff')).toBe(true);
      expect(hasRole(['staff', 'booking'], 'booking')).toBe(true);
    });

    it('should return false if user does not have the role', () => {
      expect(hasRole(['staff'], 'admin')).toBe(false);
    });

    it('should grant admin all roles', () => {
      expect(hasRole(['admin'], 'staff')).toBe(true);
      expect(hasRole(['admin'], 'booking')).toBe(true);
    });
  });

  describe('getRoleBadges', () => {
    it('should return badges sorted by rank', () => {
      const badges = getRoleBadges(['azubi', 'manager', 'staff']);
      expect(badges[0].role).toBe('manager');
      expect(badges[1].role).toBe('staff');
      expect(badges[2].role).toBe('azubi');
    });

    it('should include label and color for each badge', () => {
      const badges = getRoleBadges(['admin']);
      expect(badges[0].label).toBe('Admin');
      expect(badges[0].color).toBe('bg-red-600');
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      expect(isValidRole('admin')).toBe(true);
      expect(isValidRole('booking')).toBe(true);
      expect(isValidRole('azubi')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('invalid')).toBe(false);
      expect(isValidRole('booker')).toBe(false); // Old role name
      expect(isValidRole('promoter')).toBe(false); // Old role name
    });
  });

  describe('parseRoles', () => {
    it('should filter valid roles', () => {
      const parsed = parseRoles(['admin', 'invalid', 'booking']);
      expect(parsed).toEqual(['admin', 'booking']);
    });

    it('should return empty array for non-array input', () => {
      expect(parseRoles(null)).toEqual([]);
      expect(parseRoles('admin')).toEqual([]);
      expect(parseRoles(undefined)).toEqual([]);
    });
  });

  describe('getAssignableRoles', () => {
    it('should allow admin to assign all roles', () => {
      const assignable = getAssignableRoles(['admin']);
      expect(assignable).toEqual(ALL_ROLES);
    });

    it('should allow backoffice to assign lower-ranked roles', () => {
      const assignable = getAssignableRoles(['backoffice']);
      expect(assignable).toContain('staff');
      expect(assignable).toContain('azubi');
      expect(assignable).not.toContain('admin');
      expect(assignable).not.toContain('manager');
    });

    it('should not allow other roles to assign', () => {
      expect(getAssignableRoles(['staff'])).toEqual([]);
      expect(getAssignableRoles(['booking'])).toEqual([]);
    });
  });
});
