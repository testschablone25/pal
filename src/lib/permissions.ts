// Centralized role permissions configuration
// This is the single source of truth for what each role can access
// Multi-role: users can have multiple roles, access granted if ANY role matches

export type AppRole = 
  | 'admin'
  | 'manager'
  | 'booking'
  | 'social-media'
  | 'night-management'
  | 'label'
  | 'staff'
  | 'tech'
  | 'tech-lead'
  | 'gastro'
  | 'backoffice'
  | 'awareness'
  | 'azubi';

// All available roles
export const ALL_ROLES: AppRole[] = [
  'admin',
  'manager',
  'booking',
  'social-media',
  'night-management',
  'label',
  'staff',
  'tech',
  'tech-lead',
  'gastro',
  'backoffice',
  'awareness',
  'azubi',
];

// Route groups for middleware protection
export const ROUTE_GROUPS = {
  DASHBOARD: '/',
  ARTISTS: '/artists',
  ARTISTS_NEW: '/artists/new',
  EVENTS: '/events',
  EVENTS_NEW: '/events/new',
  DOOR: '/door',
  STAFF: '/staff',
  WORKFLOW: '/workflow',
  GUEST_LISTS: '/guest-lists',
  VENUES: '/venues',
  ADMIN: '/admin',
} as const;

// Which roles can access which route groups
// User has access if ANY of their roles is in the list
export const ROLE_ROUTE_ACCESS: Record<string, AppRole[]> = {
  [ROUTE_GROUPS.DASHBOARD]: ALL_ROLES, // All authenticated users can access dashboard
  [ROUTE_GROUPS.ARTISTS]: ['admin', 'manager', 'booking', 'label'],
  [ROUTE_GROUPS.ARTISTS_NEW]: ['admin', 'manager', 'booking'],
  [ROUTE_GROUPS.EVENTS]: ['admin', 'manager', 'booking', 'social-media', 'night-management', 'staff', 'backoffice'],
  [ROUTE_GROUPS.EVENTS_NEW]: ['admin', 'manager', 'booking', 'social-media', 'night-management', 'backoffice'],
  [ROUTE_GROUPS.DOOR]: ['admin', 'manager', 'night-management', 'awareness'], // Deferred for MVP
  [ROUTE_GROUPS.STAFF]: ['admin', 'manager', 'backoffice', 'staff'],
  [ROUTE_GROUPS.WORKFLOW]: ['admin', 'manager', 'staff', 'booking', 'backoffice'],
  [ROUTE_GROUPS.GUEST_LISTS]: ['admin', 'manager', 'booking', 'social-media'],
  [ROUTE_GROUPS.VENUES]: ['admin', 'manager'],
  [ROUTE_GROUPS.ADMIN]: ['admin', 'backoffice'], // Admin panel for role management
} as const;

// Role configuration with metadata
// Rank is used for display priority (higher = more prominent)
export const ROLE_CONFIG: Record<AppRole, { label: string; badgeColor: string; rank: number; description: string }> = {
  admin: { label: 'Admin', badgeColor: 'bg-red-600', rank: 100, description: 'Vollzugriff auf alle Funktionen' },
  manager: { label: 'Manager', badgeColor: 'bg-green-600', rank: 90, description: 'Geschäftsführung und operative Leitung' },
  'tech-lead': { label: 'Tech Lead', badgeColor: 'bg-purple-600', rank: 85, description: 'Technische Leitung' },
  booking: { label: 'Booking', badgeColor: 'bg-amber-600', rank: 80, description: 'Künstler- und Eventbuchung' },
  'social-media': { label: 'Social Media', badgeColor: 'bg-pink-600', rank: 75, description: 'Marketing und Social Media' },
  'night-management': { label: 'Night Management', badgeColor: 'bg-indigo-600', rank: 70, description: 'Nächtliche Veranstaltungsleitung' },
  backoffice: { label: 'Backoffice', badgeColor: 'bg-teal-600', rank: 65, description: 'Verwaltung und Personalwesen' },
  label: { label: 'Label', badgeColor: 'bg-violet-600', rank: 60, description: 'Label- und Musikmanagement' },
  tech: { label: 'Tech', badgeColor: 'bg-blue-600', rank: 50, description: 'Technik und Equipment' },
  staff: { label: 'Staff', badgeColor: 'bg-cyan-600', rank: 40, description: 'Allgemeines Personal' },
  gastro: { label: 'Gastro', badgeColor: 'bg-orange-600', rank: 35, description: 'Gastronomie und Bar' },
  awareness: { label: 'Awareness', badgeColor: 'bg-emerald-600', rank: 30, description: 'Awareness und Sicherheit' },
  azubi: { label: 'Azubi', badgeColor: 'bg-zinc-600', rank: 10, description: 'Auszubildende / Praktikanten' },
} as const;

// Feature-based permission model
// Defines what each feature requires (roles that can access it)
export const FEATURE_PERMISSIONS = {
  // Artists management
  ARTISTS_READ: ['admin', 'manager', 'booking', 'label', 'staff'],
  ARTISTS_WRITE: ['admin', 'manager', 'booking'],

  // Events management
  EVENTS_READ: ['admin', 'manager', 'booking', 'social-media', 'night-management', 'staff', 'backoffice'],
  EVENTS_WRITE: ['admin', 'manager', 'booking', 'social-media', 'night-management', 'backoffice'],
  EVENTS_DELETE: ['admin', 'manager'],

  // Guest lists
  GUEST_LISTS_READ: ['admin', 'manager', 'booking', 'social-media'],
  GUEST_LISTS_WRITE: ['admin', 'manager', 'booking', 'social-media'],

  // Check-in / Door
  CHECKIN: ['admin', 'manager', 'night-management', 'awareness', 'staff'],

  // Tasks
  TASKS_READ: ['admin', 'manager', 'staff', 'booking', 'backoffice'],
  TASKS_WRITE: ['admin', 'manager', 'backoffice'],
  TASKS_ASSIGN: ['admin', 'manager', 'backoffice'],

  // Staff management
  STAFF_READ: ['admin', 'manager', 'backoffice'],
  STAFF_WRITE: ['admin', 'manager', 'backoffice'],

  // Shifts and availability
  SHIFTS_READ: ['admin', 'manager', 'staff', 'backoffice'],
  SHIFTS_WRITE: ['admin', 'manager', 'backoffice'],
  AVAILABILITY_READ: ['admin', 'manager', 'backoffice'],
  AVAILABILITY_WRITE: ['admin', 'manager', 'staff', 'backoffice'],

  // Role management (who can assign roles)
  ROLES_MANAGE: ['admin', 'backoffice'],

  // Venues
  VENUES_READ: ['admin', 'manager'],
  VENUES_WRITE: ['admin', 'manager'],
} as const;

// Type for feature permission keys
export type FeaturePermission = keyof typeof FEATURE_PERMISSIONS;

// Legacy API_PERMISSIONS alias for backward compatibility
export const API_PERMISSIONS = FEATURE_PERMISSIONS;

// ============================================
// PERMISSION CHECK FUNCTIONS (Multi-Role Support)
// ============================================

/**
 * Check if ANY of the user's roles has access to a specific route
 * Admin always has access to everything
 */
export function canAccessRoute(userRoles: AppRole[] | AppRole | null, pathname: string): boolean {
  // No roles = no access
  if (!userRoles || (Array.isArray(userRoles) && userRoles.length === 0)) {
    return false;
  }

  // Normalize to array
  const roles = Array.isArray(userRoles) ? userRoles : [userRoles];

  // Admin has access to everything
  if (roles.includes('admin')) {
    return true;
  }

  // Find the most specific matching route group
  const matchingRoutes = Object.keys(ROLE_ROUTE_ACCESS)
    .filter(route => pathname === route || pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length); // Most specific first

  if (matchingRoutes.length === 0) {
    // No specific rule found, default to allowing authenticated users
    return true;
  }

  const mostSpecificRoute = matchingRoutes[0];
  const allowedRoles = ROLE_ROUTE_ACCESS[mostSpecificRoute];

  // Check if ANY of the user's roles is allowed
  return roles.some(role => allowedRoles.includes(role));
}

/**
 * Check if ANY of the user's roles has a specific feature permission
 * Admin always has all permissions
 */
export function hasPermission(userRoles: AppRole[] | AppRole | null, permission: FeaturePermission): boolean {
  if (!userRoles || (Array.isArray(userRoles) && userRoles.length === 0)) {
    return false;
  }

  // Normalize to array
  const roles = Array.isArray(userRoles) ? userRoles : [userRoles];

  // Admin has all permissions
  if (roles.includes('admin')) {
    return true;
  }

  const allowedRoles = FEATURE_PERMISSIONS[permission] as readonly string[];
  return roles.some(role => allowedRoles.includes(role));
}

/**
 * Get all route paths a user can access based on their roles
 */
export function getAccessibleRoutes(userRoles: AppRole[]): string[] {
  // Admin can access all routes
  if (userRoles.includes('admin')) {
    return Object.keys(ROUTE_GROUPS);
  }

  return Object.entries(ROLE_ROUTE_ACCESS)
    .filter(([, allowedRoles]) => 
      userRoles.some(role => (allowedRoles as readonly string[]).includes(role))
    )
    .map(([route]) => route);
}

/**
 * Check if a user has a specific role
 */
export function hasRole(userRoles: AppRole[], role: AppRole): boolean {
  return userRoles.includes(role) || userRoles.includes('admin');
}

/**
 * Get the highest ranked role from a list of roles
 * Useful for display purposes when you need a single "primary" role
 */
export function getHighestRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null;
  
  return roles.reduce((highest, current) => {
    const currentRank = ROLE_CONFIG[current]?.rank ?? 0;
    const highestRank = ROLE_CONFIG[highest]?.rank ?? 0;
    return currentRank > highestRank ? current : highest;
  });
}

/**
 * Sort roles by rank (highest first)
 */
export function sortRolesByRank(roles: AppRole[]): AppRole[] {
  return [...roles].sort((a, b) => {
    const rankA = ROLE_CONFIG[a]?.rank ?? 0;
    const rankB = ROLE_CONFIG[b]?.rank ?? 0;
    return rankB - rankA;
  });
}

// ============================================
// DISPLAY UTILITIES
// ============================================

/**
 * Get badge color for a role
 */
export function getRoleBadgeColor(role: string): string {
  return ROLE_CONFIG[role as AppRole]?.badgeColor ?? 'bg-zinc-600';
}

/**
 * Get display label for a role
 */
export function getRoleLabel(role: string): string {
  return ROLE_CONFIG[role as AppRole]?.label ?? role;
}

/**
 * Get description for a role
 */
export function getRoleDescription(role: string): string {
  return ROLE_CONFIG[role as AppRole]?.description ?? '';
}

/**
 * Get all role badges for display
 * Returns roles sorted by rank (highest first)
 */
export function getRoleBadges(roles: AppRole[]): Array<{ role: AppRole; label: string; color: string }> {
  return sortRolesByRank(roles).map(role => ({
    role,
    label: ROLE_CONFIG[role].label,
    color: ROLE_CONFIG[role].badgeColor,
  }));
}

// ============================================
// ROLE VALIDATION & TYPE GUARDS
// ============================================

/**
 * Validate if a string is a valid role
 */
export function isValidRole(role: string): role is AppRole {
  return role in ROLE_CONFIG;
}

/**
 * Parse and validate an array of role strings
 */
export function parseRoles(roles: unknown): AppRole[] {
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles.filter((r): r is AppRole => typeof r === 'string' && isValidRole(r));
}

/**
 * Get roles that can be assigned by a user with the given roles
 * Non-admins can only assign roles with lower rank than their highest
 */
export function getAssignableRoles(userRoles: AppRole[]): AppRole[] {
  if (userRoles.includes('admin')) {
    return ALL_ROLES;
  }

  if (!userRoles.includes('backoffice')) {
    return []; // Only admin and backoffice can assign roles
  }

  const highestRank = getHighestRole(userRoles);
  const maxRank = highestRank ? ROLE_CONFIG[highestRank].rank : 0;

  return ALL_ROLES.filter(role => ROLE_CONFIG[role].rank < maxRank);
}
