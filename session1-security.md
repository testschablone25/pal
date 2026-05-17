# Session 1: Security — requireAuth() to all unprotected API routes

## Summary

Added `requireAuth()` (or `authenticate()` for broad-access routes) to **34 API route files** (~71 export handlers) that previously had no authentication checks.

## Permission Mapping

| Permission | Route Files Modified |
|---|---|
| TASKS_READ | tasks/route (GET), tasks/[id] (GET), tasks/[id]/history (GET), tasks/[id]/comments (GET), items/[id]/tasks (GET) |
| TASKS_WRITE | tasks/route (POST), tasks/[id] (PUT, DELETE), tasks/[id]/approve (POST), tasks/[id]/reject (POST), tasks/[id]/block (POST), tasks/[id]/status (PUT), tasks/[id]/comments (POST), tasks/[id]/deliver-item (POST) |
| EVENTS_READ | events/route (GET), events/[id] (GET), performances/route (GET), performances/[id] (GET), occupancy/[eventId] (GET), itinerary/[eventId] (GET) |
| EVENTS_WRITE | events/route (POST), events/[id] (PUT, DELETE), performances/route (POST), performances/[id] (PUT, DELETE), itinerary/[eventId] (PUT) |
| ARTISTS_READ | artists/route (GET), artists/[id] (GET) |
| ARTISTS_WRITE | artists/route (POST), artists/[id] (PUT, DELETE), artists/extract-rider (POST, GET), artists/generate-tasks (POST), artists/[id]/delete-rider (DELETE) |
| INVENTORY_READ | items/route (GET), items/[id] (GET), items/[id]/location-history (GET), items/[id]/rider-assignments (GET), items/[id]/qr (GET) |
| INVENTORY_WRITE | items/route (POST), items/[id] (PUT, DELETE), items/[id]/location-history (POST), items/[id]/qr (POST) |
| VENUES_READ | venues/route (GET), venues/[id] (GET), venues/[id]/sublocations (GET) |
| VENUES_WRITE | venues/route (POST), venues/[id] (PUT, DELETE), venues/[id]/sublocations (POST), venues/[id]/sublocations/[subId] (PUT, DELETE) |
| ROLES_MANAGE | admin/roles/route (GET, POST, DELETE) |
| CHECKIN | checkin/route (POST) |
| authenticate() | rentals/route (GET, POST), rentals/[id] (GET, PUT, DELETE), rentals/[id]/return (POST), dashboard/route (GET), generate-qr/route (POST) |

## Routes Already Protected (not modified)

- shifts/route, shifts/[id], shifts/[id]/clock-in, shifts/[id]/clock-out, shifts/bulk — already had requireAuth
- staff/route, staff/[id] — already had requireAuth
- availability/route, availability/[id] — already had requireAuth
- profiles/route — already had authenticate
- guest-lists routes — use Pattern B (server auth via getUser()), left as-is

## Pattern Applied

For Pattern A (admin client via `@supabase/supabase-js`):
```ts
import { requireAuth } from '@/lib/api-auth';

// At start of handler:
const auth = await requireAuth(request, 'FEATURE_PERMISSION');
if (!auth.authorized) return auth.response;
```

For broad-access routes (rentals, dashboard, generate-qr):
```ts
import { authenticate } from '@/lib/api-auth';

const auth = await authenticate(request);
if (!auth.authorized) return auth.response;
```

For Pattern B (server client via `@/lib/supabase/server`):
- Occupancy, checkin routes — added `requireAuth()` alongside existing server client
- Kept existing `createClient` import patterns untouched

## Verification

- `npx tsc --noEmit` — Zero errors from `src/app/api/` files (all pre-existing errors are in test files only)

## Edge Cases Handled

1. **extract-rider/route.ts** — Has both GET and POST in the same file; both got requireAuth with ARTISTS_READ/ARTISTS_WRITE respectively
2. **admin/roles/route.ts** — Used `Request` type instead of `NextRequest`; needed to import NextRequest and construct it from the plain Request for requireAuth compatibility. Removed now-unused `hasPermission`/`AppRole` imports that were redundant with requireAuth.
3. **venues/route.ts (GET)** — Originally had no request parameter (`GET()`); changed to `GET(request: NextRequest)` for requireAuth compatibility
4. **Occupancy route** — Pattern B file using server client; requireAuth works independently since it creates its own server+admin clients internally
