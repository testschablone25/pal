# PAL Codebase Review — Findings

> Comprehensive audit conducted 2026-05-05. Use as cross-reference when fixing issues.

---

## 🔴 Critical Issues

### C1. Most API Routes Bypass Auth Entirely

**Severity**: High  
**Files affected**: ~41 of 49 route files  
**Impact**: Anyone who can reach the endpoint can create/delete/modify data without authentication.

**Pattern (wrong, used in most routes)**:

```ts
const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);
// No auth check — direct query with admin privileges
```

**Pattern (correct, used in shifts/staff only)**:

```ts
const auth = await requireAuth(request, "SHIFTS_WRITE");
if (!auth.authorized) return auth.response;
```

**Unauthenticated routes (need `requireAuth()`)**:

- `/api/events/` (GET, POST)
- `/api/artists/` (GET, POST)
- `/api/tasks/` (GET, POST)
- `/api/tasks/[id]/` (GET, PUT, DELETE)
- `/api/tasks/[id]/approve`
- `/api/tasks/[id]/reject`
- `/api/tasks/[id]/block`
- `/api/tasks/[id]/comments`
- `/api/tasks/[id]/deliver-item`
- `/api/tasks/[id]/status`
- `/api/tasks/[id]/history`
- `/api/venues/` (GET, POST)
- `/api/venues/[id]/` (GET, PUT, DELETE)
- `/api/venues/[id]/sublocations/` (GET, POST)
- `/api/venues/[id]/sublocations/[subId]/`
- `/api/items/` (GET, POST)
- `/api/items/[id]/` (GET, PUT, DELETE)
- `/api/items/[id]/tasks`
- `/api/items/[id]/qr`
- `/api/items/[id]/rider-assignments`
- `/api/items/[id]/location-history`
- `/api/rentals/` (GET, POST)
- `/api/rentals/[id]/` (GET, PUT, DELETE)
- `/api/rentals/[id]/return`
- `/api/performances/` (GET, POST)
- `/api/performances/[id]`
- `/api/artists/[id]/` (GET, PUT, DELETE)
- `/api/artists/extract-rider`
- `/api/artists/generate-tasks`
- `/api/artists/[id]/delete-rider`
- `/api/availability/` (GET, POST)
- `/api/availability/[id]`
- `/api/checkin`
- `/api/dashboard`
- `/api/generate-qr`
- `/api/itinerary/[eventId]`
- `/api/occupancy/[eventId]`
- `/api/profiles`
- `/api/admin/roles`
- `/api/shifts/` (uses requireAuth ✓)
- `/api/shifts/[id]/` (uses requireAuth ✓)
- `/api/shifts/bulk` (uses requireAuth ✓)
- `/api/shifts/[id]/clock-in` (uses requireAuth ✓)
- `/api/shifts/[id]/clock-out` (uses requireAuth ✓)
- `/api/staff/` (uses requireAuth ✓)
- `/api/staff/[id]/` (uses requireAuth ✓)

### C2. Three Inconsistent Auth Client Patterns

**Severity**: Medium  
**Impact**: Mixed security semantics, confusing maintenance, some routes respect RLS others don't.

| Pattern                            | Implementation                                    | Used by                                                                                                                             |
| ---------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **A — Admin client, no auth**      | `createClient(url, serviceKey)`                   | events, artists, tasks, venues, items, rentals, dashboard, performances, admin/roles, checkin, availability, itineraries, occupancy |
| **B — Server auth (cookies)**      | `await createClient()`                            | guest-lists, guest-entries                                                                                                          |
| **C — Admin client + requireAuth** | `createClient(url, serviceKey)` + `requireAuth()` | shifts, staff                                                                                                                       |

---

## 🟠 Design & Architecture Issues

### D1. Massive File Bloat / Monolith Components

| File                     | Lines | Problems                                                               |
| ------------------------ | ----- | ---------------------------------------------------------------------- |
| `task-detail-dialog.tsx` | 1,647 | Combines view/edit/comments/QR/delivery/subtasks/history/approval      |
| `rider-editor.tsx`       | 2,413 | Combines inventory picking, rider fields, sub-locations, auto-complete |
| `task-form.tsx`          | 980   | Combines form, item picking, sub-location selection, QR features       |
| `rider-viewer.tsx`       | 1,238 | Pure display but still huge                                            |
| `task-generation.ts`     | 1,095 | Contains ALL rider→task logic, assignment resolution, cleanup          |
| Dashboard (`page.tsx`)   | 1,112 | Inline TaskRow, QuickAction, all state, all queries                    |

### D2. Migration Trainwreck

| Problem                     | Details                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Dead migration 1**        | `20240325000003_add_booker_role.sql` adds old `booker` to old enum — overwritten completely by multi-role migration |
| **Dead migration 2**        | `20240326000000_add_booker_rls_policies.sql` — all policies dropped by `20260428000000`                             |
| **Empty migration**         | `20260430000000_remote_migration.sql` — just a comment placeholder                                                  |
| **Wrong role mappings**     | `promoter → social-media`, `artist → label`, `guest → azubi` are semantically incorrect                             |
| **Seed data in migrations** | `20260429000000` hardcodes venue UUIDs, sub-locations, and 47 inventory items — belongs in seed scripts             |

### D3. Staff Role vs user_roles Taxonomy Conflict

**Staff table** has its own `role` column with values: `'sound'`, `'light'`, `'manager'`, `'backoffice'`  
**user_roles** has: `'tech'`, `'tech-lead'`, `'manager'`, `'backoffice'`, etc.

Rider task generation uses `staff.role` for sound/light tech assignment, but `user_roles` doesn't have those granular roles. This creates two parallel role systems that never synchronize.

### D4. Dead Schema Modules

| Table             | Created In     | Status                                 |
| ----------------- | -------------- | -------------------------------------- |
| `cloakroom_items` | Initial schema | No API routes, no pages, no components |
| `notifications`   | Initial schema | No API routes, no pages, no components |

### D5. NavBar Doesn't Filter by Role

The sidebar shows all 10 navigation links to every user. Role-based filtering only happens after navigation at the proxy level (middleware redirect). Users see links to pages they can't access.

---

## 🟡 Logic Flaws

### F1. Performance Time Overlap Comparison Broken

**File**: `src/app/api/performances/route.ts`

```ts
// Comparing TIME columns as strings — fails across midnight boundary
return start_time < existingEnd && end_time > existingStart;
// "23:00:00" > "01:00:00" → false when it should be true
```

### F2. Task Approval Flow Has No Server-Side Permission Check

**Files**: `approve/route.ts`, `reject/route.ts`

Uses admin client (service key), no `requireAuth()`. The `approved_by` field is self-reported — the server trusts whoever sends it. Any client can call approve/reject.

### F3. Occupancy API Hardcodes 800 as Default Capacity

**File**: `src/app/api/occupancy/[eventId]/route.ts`

```ts
const max = event.max_capacity || 800; // Default to 800 for Techno Nightclub
```

Club-specific default in a generic API route.

### F4. Dashboard Performs 11+ Separate DB Queries

No query coalescing, no caching, no `Promise.all` parallel execution. Each dashboard load hits the database 11+ times.

### F5. Guest List Promoter Limits Feature Is Incomplete

`PROMOTER_LIMITS` in `guest-lists/[listId]/entries/route.ts`:

- No UI for promoter assignment
- No promoter role in the system
- No tracking of which promoter added which guest

### F6. Door Page Uses Hardcoded Demo UUIDs

```ts
const DEMO_EVENT_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_GUEST_LIST_ID = "00000000-0000-0000-0000-000000000002";
```

The door/check-in flow is broken for production.

### F7. `created_by` Backfill Is a Guess

Migration `20260427000000`:

```sql
UPDATE tasks SET created_by = assignee_id WHERE created_by IS NULL;
```

Assumes assignee == creator, which may not be true for manager-assigned tasks.

---

## 🟢 Over-Engineering

### O1. Rider System Is a Mini-ERP

The rider feature comprises:

- PDF upload + LLM extraction (`extract-rider/route.ts`: ~1,400 lines)
- Rider editor (`rider-editor.tsx`: 2,413 lines)
- Rider viewer (`rider-viewer.tsx`: 1,238 lines)
- Task generation from riders (`task-generation.ts`: 1,095 lines)
- Inventory item linking
- QR delivery verification workflow

Uses `nvidia/nemotron-3-super-120b-a12b:free` — a free-tier LLM that could be unreliable or disappear.

### O2. Task System Is Over-Engineered

The task system (dialog + form + card + history) is 3,073 lines supporting:

- Drag-and-drop kanban status changes (dnd-kit)
- Subtask trees with inheritance
- Item delivery via QR code scanning
- Approval/rejection with history timeline
- Block/unblock with reasons
- Comment threads
- Goal sub-location tracking
- Task type taxonomy (15 types)

### O3. 47 shadcn/ui Components for ~30 Pages

Likely unused: `resizable`, `menubar`, `context-menu`, `carousel`, `input-otp`, `navigation-menu`, `hover-card`, `aspect-ratio`, `slider`, `toggle-group`.

---

## 🔵 Under-Engineering / Missing

### U1. No Loading/Error Boundaries

Zero `loading.tsx` or `error.tsx` files in the entire App Router tree. No Suspense boundaries.

### U2. No Pagination UI

All list endpoints support `limit`/`offset` params, but no component implements pagination or infinite scroll.

### U3. No Component Tests for Critical Files

| File                     | Lines | Tests |
| ------------------------ | ----- | ----- |
| `task-detail-dialog.tsx` | 1,647 | 0     |
| `task-form.tsx`          | 980   | 0     |
| `rider-editor.tsx`       | 2,413 | 0     |
| `rider-viewer.tsx`       | 1,238 | 0     |
| Dashboard (`page.tsx`)   | 1,112 | 0     |
| Door (`door/page.tsx`)   | 237   | 0     |

### U4. 14 Scripts With No Entry Point or Docs

Scripts in `/scripts/`:

- `seed-riders-and-tasks.ts` (968 lines)
- `populate-test-data.ts`
- `assign-staff-shifts.ts`
- `create-test-users.ts`
- `create-staff-accounts.ts`
- etc.

No CLI, no documentation, no `package.json` scripts entry.

### U5. `contract_type` Enum Semantics

```sql
CREATE TYPE contract_type AS ENUM ('permanent', 'freelance', 'minor');
```

`'minor'` is a legal status (age), not a contract type. The separate `is_minor` boolean column handles this correctly — `'minor'` as a contract type is redundant.

---

## 📋 Action Items

### Phase 1 (Immediate — Security)

1. [ ] Add `requireAuth()` to all 41 unprotected API routes
2. [ ] Standardize on one auth pattern (recommendation: Pattern A with `requireAuth()`)
3. [ ] Remove hardcoded publishable key from config.ts

### Phase 2 (Architecture)

4. [ ] Break up `task-detail-dialog.tsx` into 5-6 focused files
5. [ ] Break up `rider-editor.tsx` into smaller components
6. [ ] Break up `task-form.tsx` into smaller components
7. [ ] Flatten migrations into 2-3 logical ones
8. [ ] Consolidate staff.role and user_roles taxonomies

### Phase 3 (Bug Fixes)

9. [ ] Fix performance time overlap comparison (use proper time comparison)
10. [ ] Add permission check to approve/reject endpoints
11. [ ] Remove hardcoded 800 default from occupancy API
12. [ ] Replace demo UUIDs in door page with real event selection

### Phase 4 (Cleanup)

13. [ ] Remove cloakroom_items and notifications table if truly unused
14. [ ] Remove unused shadcn/ui components
15. [ ] Move seed data from migrations to seed scripts
16. [ ] Remove dead `booker` role migrations
17. [ ] Add loading/error boundaries to route segments
18. [ ] Add pagination UI to list pages

### Phase 5 (Testing)

19. [ ] Add component tests for task-detail-dialog
20. [ ] Add component tests for task-form
21. [ ] Add e2e test for door/check-in flow
22. [ ] Add e2e test for rider→task generation flow
