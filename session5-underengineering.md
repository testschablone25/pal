# Session 5: Under-engineering — Loading/Error Boundaries, Pagination, NavBar Filtering

## U1: Loading & Error Boundaries (20 files)

Created `loading.tsx` and `error.tsx` for all route segments:

| Route | loading.tsx | error.tsx |
|---|---|---|
| `/` (root) | `src/app/loading.tsx` | `src/app/error.tsx` |
| `/events` | `src/app/events/loading.tsx` | `src/app/events/error.tsx` |
| `/artists` | `src/app/artists/loading.tsx` | `src/app/artists/error.tsx` |
| `/staff` | `src/app/staff/loading.tsx` | `src/app/staff/error.tsx` |
| `/inventory` | `src/app/inventory/loading.tsx` | `src/app/inventory/error.tsx` |
| `/workflow` | `src/app/workflow/loading.tsx` | `src/app/workflow/error.tsx` |
| `/venues` | `src/app/venues/loading.tsx` | `src/app/venues/error.tsx` |
| `/guest-lists` | `src/app/guest-lists/loading.tsx` | `src/app/guest-lists/error.tsx` |
| `/door` | `src/app/door/loading.tsx` | `src/app/door/error.tsx` |
| `/rentals` | `src/app/rentals/loading.tsx` | `src/app/rentals/error.tsx` |

**Pattern:** All loading.tsx are server components using `PageSkeleton`. All error.tsx are `'use client'` showing `AlertTriangle` icon, error message, and retry button.

## U2: Pagination Controls (1 new file)

- `src/components/pagination-controls.tsx` — Reusable `PaginationControls` component
- Features: page window of 5 (current ± 2), prev/next buttons, ellipsis for large ranges, total item count display
- All list APIs support `limit`/`offset` — ready to be wired into list pages

## D5: NavBar Role-Based Filtering (1 modified file)

**`src/components/nav-bar.tsx`:**

1. Added `createClient` from `@/lib/supabase/browser` to fetch current user
2. Added `canAccessRoute` + `AppRole` from `@/lib/permissions`
3. On mount: calls `supabase.auth.getUser()` then fetches roles from `user_roles` table
4. Filters `navItems` (both desktop + mobile) using `canAccessRoute(userRoles, href)`
5. If user has no roles, only the Dashboard link is shown
6. Removed unused `onNavigate` prop from `MobileNavLink`

## Verification

- `npx tsc --noEmit`: Zero new type errors (all errors pre-existing in test files)
- `npm run lint`: Zero new warnings/errors from changed files

## Open Risks/Questions

- **Pagination not wired into list pages yet** — the component exists but list pages need `limit`/`offset` query params + page state integration. That's a follow-up task.
- **NavBar role fetch is an extra query on every mount** — negligible but could be cached or moved to a global auth context if performance becomes an issue.
- **Dashboard link is always visible** — per spec, all authenticated users can access dashboard.

## Recommended Next Steps

1. Wire `PaginationControls` into list pages (events, artists, staff, inventory, venues, guest-lists)
2. Consider consolidating role-fetching into a shared auth hook/context to avoid fetching in both NavBar and Dashboard
