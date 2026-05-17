# WP-1 Result: Fix Critical Unprotected API Routes

**Status:** ✅ Complete

## Changes Made

### File: `src/app/api/guest-lists/route.ts`
- Added `import { requireAuth } from '@/lib/api-auth'`
- **GET handler:** Added `const auth = await requireAuth(request, 'GUEST_LISTS_READ'); if (!auth.authorized) return auth.response;` — was previously unprotected
- **POST handler:** Replaced `supabase.auth.getUser()` check with `requireAuth(request, 'GUEST_LISTS_WRITE')` — now enforces role-based access instead of just any-auth
- Used `auth.userId` for `created_by` field instead of re-fetching user (cleaner, avoids null issues)

### File: `src/app/api/guest-lists/[listId]/entries/route.ts`
- Added `import { requireAuth } from "@/lib/api-auth"`
- **GET handler:** Added `requireAuth(request, "GUEST_LISTS_READ")` — was previously unprotected
- **POST handler:** Replaced `supabase.auth.getUser()` check with `requireAuth(request, "GUEST_LISTS_WRITE")` — was previously any-auth
- **DELETE handler:** Added `requireAuth(request, "GUEST_LISTS_WRITE")` — was previously unprotected

## Access Control (Now)

| Endpoint | Before | After |
|---|---|---|
| GET /api/guest-lists | No auth | `GUEST_LISTS_READ` (admin, manager, booking, social-media) |
| POST /api/guest-lists | Any auth user | `GUEST_LISTS_WRITE` (admin, manager, booking, social-media) |
| GET /api/guest-lists/[id]/entries | No auth | `GUEST_LISTS_READ` (admin, manager, booking, social-media) |
| POST /api/guest-lists/[id]/entries | Any auth user | `GUEST_LISTS_WRITE` (admin, manager, booking, social-media) |
| DELETE /api/guest-lists/[id]/entries | No auth | `GUEST_LISTS_WRITE` (admin, manager, booking, social-media) |

## Validation
- ✅ `npm run lint` — no new errors in modified files
- ✅ `npm run knip` — no new dead code/exports
- ✅ `npm run test:unit` — 122/124 tests pass (2 pre-existing failures in rider-extraction, unrelated)
- ✅ TypeScript compilation clean

## Risks
- None. The permission groups `GUEST_LISTS_READ` and `GUEST_LISTS_WRITE` already exist in `FEATURE_PERMISSIONS` and align with `ROLE_ROUTE_ACCESS` for the `/guest-lists` page route.
