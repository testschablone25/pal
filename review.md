# PAL Project — Sub-Task Implementation Review

**Date: 2026-04-30**

---

## Phase-by-Phase Breakdown

### ✅ Phase 0: Foundation — COMPLETE

| Sub-Task                                   | Status  | Details                                                               |
| ------------------------------------------ | ------- | --------------------------------------------------------------------- |
| Project skeleton (Next.js 16 + App Router) | ✅ Done | `layout.tsx`, `globals.css`, `proxy.ts`                               |
| Database schema (12 migrations)            | ✅ Done | 11 migrations from initial through workflow improvements (2026-06-01) |
| Auth (Supabase)                            | ✅ Done | Login/signup pages, browser/server/middleware clients                 |
| RLS policies                               | ✅ Done | Multi-role system with 13 roles                                       |
| shadcn/ui primitives (60+ components)      | ✅ Done | Full set in `src/components/ui/`                                      |
| Test setup                                 | ✅ Done | Vitest + Playwright, 75 unit tests passing                            |
| Dead code detection (Knip)                 | ✅ Done | `knip.json` configured                                                |
| Duplicate detection (jscpd)                | ✅ Done | `.jscpd.json` configured                                              |

---

### ✅ Phase 1: Guest List + Door — COMPLETE

| Sub-Task            | Status  | Details                                                           |
| ------------------- | ------- | ----------------------------------------------------------------- |
| Guest list API      | ✅ Done | `src/app/api/guest-lists/` with entries sub-route                 |
| Guest entry CRUD    | ✅ Done | Schema + API + `GuestEntryForm` component                         |
| QR token generation | ✅ Done | `src/lib/qr.ts` + tests                                           |
| QR scanning         | ✅ Done | `QRScanner` component using `html5-qrcode`                        |
| Check-in/out        | ✅ Done | `src/app/api/checkin/route.ts`, `CheckInCheckoutModal`            |
| Capacity tracking   | ✅ Done | `CapacityDashboard` component                                     |
| Door page UI        | ✅ Done | `src/app/door/page.tsx` with tabs (scanner, entry form, capacity) |

---

### ✅ Phase 2: Artist & Booking — MOSTLY COMPLETE

| Sub-Task                             | Status     | Details                                                              |
| ------------------------------------ | ---------- | -------------------------------------------------------------------- |
| Artist CRUD                          | ✅ Done    | API at `src/app/api/artists/`, pages for list/detail/create/edit     |
| Performance CRUD                     | ✅ Done    | API at `src/app/api/performances/`                                   |
| Running order (drag-drop)            | ✅ Done    | `RunningOrder` component with `@dnd-kit`                             |
| Event CRUD                           | ✅ Done    | API at `src/app/api/events/`, pages for list/detail/create           |
| Calendar view                        | ✅ Done    | `CalendarView` component                                             |
| Rider extraction (PDF via LM Studio) | ✅ Done    | `src/app/api/artists/extract-rider/route.ts` + `RiderViewer`         |
| Task generation from riders          | ✅ Done    | `src/app/api/artists/generate-tasks/route.ts` + `task-generation.ts` |
| Itinerary generation                 | ✅ Done    | `src/lib/itinerary.ts` + API at `src/app/api/itinerary/`             |
| **⚠ Venue CRUD — read-only**         | ⚡ Partial | API at `src/app/api/venues/` returns venues, no create/edit UI       |
| **⚠ Artist calendar integration**    | ❓ Unknown | Needs deeper investigation                                           |

---

### 🔶 Phase 3: Staff Planning — PARTIALLY COMPLETE

| Sub-Task                         | Status     | Details                                                                  |
| -------------------------------- | ---------- | ------------------------------------------------------------------------ |
| Staff CRUD API                   | ✅ Done    | `src/app/api/staff/` + `[id]/route.ts`                                   |
| Staff pages (list, create, edit) | ✅ Done    | `src/app/staff/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`           |
| Shift CRUD API                   | ✅ Done    | `src/app/api/shifts/` + `[id]/route.ts`                                  |
| Shift planning page              | ✅ Done    | `src/app/staff/shifts/page.tsx`                                          |
| Availability calendar            | ✅ Done    | `AvailabilityCalendar` component + `src/app/staff/availability/page.tsx` |
| **⚠ Staff detail page**          | ❌ Missing | `src/app/staff/[id]/page.tsx` does not exist                             |
| **⚠ Shift detail/edit page**     | ❌ Missing | No dedicated shift detail/edit UI                                        |

---

### ✅ Phase 5: Workflow/Kanban — COMPLETE

| Sub-Task                                      | Status  | Details                                                                                                                                     |
| --------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Task CRUD API (with rich filtering)           | ✅ Done | `src/app/api/tasks/` — supports status, priority, assignee, event, venue, search, my-tasks, blocked, needs-approval, parent_task_id filters |
| Kanban board UI                               | ✅ Done | `src/app/workflow/page.tsx` — full drag-drop with `@dnd-kit`                                                                                |
| Task cards                                    | ✅ Done | `TaskCard` with priority colors, date badges, assignee avatars                                                                              |
| Task detail dialog                            | ✅ Done | `TaskDetailDialog` — very comprehensive (1358 lines)                                                                                        |
| Task form (create/edit)                       | ✅ Done | `TaskForm` component                                                                                                                        |
| Task comments                                 | ✅ Done | `src/app/api/tasks/[id]/comments/route.ts`                                                                                                  |
| Task history                                  | ✅ Done | `task_history` table + `TaskHistoryTimeline` component                                                                                      |
| Task approval flow                            | ✅ Done | `src/app/api/tasks/[id]/approve/`, `reject/`, tests: `task-approval.test.ts`                                                                |
| Task block/unblock                            | ✅ Done | `src/app/api/tasks/[id]/block/`                                                                                                             |
| Sub-tasks (parent_task_id)                    | ✅ Done | Schema (2026-06-01 migration) + API filter support                                                                                          |
| Task-items junction + delivery                | ✅ Done | `task_items` table + `deliver-item` API route + goal_sub_location                                                                           |
| QR codes on items                             | ✅ Done | Item QR generation + `ItemQRDialog` component                                                                                               |
| Filter chips / search / sort / group-by-venue | ✅ Done | Rich filter bar in workflow page                                                                                                            |
| i18n (DE/EN) for workflow                     | ✅ Done | `useI18n` hook with full dictionary                                                                                                         |

---

### 🔴 Phase 4: Cloakroom — NOT STARTED (schema only)

| Sub-Task                          | Status     | Details                                  |
| --------------------------------- | ---------- | ---------------------------------------- |
| `cloakroom_items` table in schema | ✅ Done    | Exists in initial migration              |
| Cloakroom API routes              | ❌ Missing | No routes under `src/app/api/cloakroom/` |
| Cloakroom UI pages                | ❌ Missing | No pages in `src/app/cloakroom/`         |
| Claim token / QR                  | ❌ Missing | No implementation                        |

---

### ✅ Inventory / Equipment — COMPLETE (recently implemented)

| Sub-Task                           | Status  | Details                                               |
| ---------------------------------- | ------- | ----------------------------------------------------- |
| Items table + schema               | ✅ Done | Migrations 2026-04-27 and 2026-04-29                  |
| Items CRUD API                     | ✅ Done | `src/app/api/items/`                                  |
| Inventory list page with search    | ✅ Done | `src/app/inventory/page.tsx` → `InventoryList`        |
| Inventory detail page              | ✅ Done | `src/app/inventory/[id]/page.tsx` → `InventoryDetail` |
| Inventory form (create/edit)       | ✅ Done | `InventoryForm` component                             |
| Item location history              | ✅ Done | `item_location_history` table + API + UI              |
| Item QR codes                      | ✅ Done | `src/app/api/items/[id]/qr/route.ts`                  |
| Venue sub-locations                | ✅ Done | `venue_sub_locations` table + FK on items + RLS       |
| PAL inventory seed data (47 items) | ✅ Done | Seeded in migration 2026-04-29                        |
| PAL venue seed data (7 venues)     | ✅ Done | Seeded in migration 2026-04-29                        |

---

### ✅ Rentals — COMPLETE (recently implemented)

| Sub-Task                                    | Status  | Details                                    |
| ------------------------------------------- | ------- | ------------------------------------------ |
| `rentals` table + schema                    | ✅ Done | Migration 2026-04-27                       |
| Rentals CRUD API                            | ✅ Done | `src/app/api/rentals/`                     |
| Rentals list page                           | ✅ Done | `src/app/rentals/page.tsx` → `RentalsList` |
| Rental form (create)                        | ✅ Done | `RentalForm` component                     |
| Rental return flow                          | ✅ Done | `src/app/api/rentals/[id]/return/route.ts` |
| Status management (active/returned/overdue) | ✅ Done | Tests: `rental-status.test.ts`             |

---

### ✅ Multi-Role System — COMPLETE

| Sub-Task                                  | Status     | Details                                        |
| ----------------------------------------- | ---------- | ---------------------------------------------- |
| New role enum (13 roles)                  | ✅ Done    | Migration 2026-04-28                           |
| Role RLS policies rewritten               | ✅ Done    | Non-recursive policies                         |
| `permissions.ts` with FEATURE_PERMISSIONS | ✅ Done    | Comprehensive permission system                |
| Admin role management page                | ✅ Done    | `src/app/admin/page.tsx` with add/remove roles |
| Admin roles API                           | ✅ Done    | `src/app/api/admin/roles/route.ts`             |
| Route-level role guards                   | ⚠️ Partial | `proxy.ts` exists but needs tightening         |

---

### 🔴 Notifications — NOT STARTED (schema only)

| Sub-Task                        | Status     | Details                     |
| ------------------------------- | ---------- | --------------------------- |
| `notifications` table in schema | ✅ Done    | Exists in initial migration |
| Notification API routes         | ❌ Missing | No routes                   |
| Notification UI                 | ❌ Missing | No pages or components      |

---

### 🔴 LiteSpeed/Inventory Integration — NOT STARTED

| Sub-Task        | Status     | Details                         |
| --------------- | ---------- | ------------------------------- |
| Any integration | ❌ Missing | No mention anywhere in codebase |

---

## Summary Statistics

| Metric                       | Value                                                       |
| ---------------------------- | ----------------------------------------------------------- |
| Total unit/integration tests | 75 passing, 23 skipped (98 total)                           |
| Test files                   | 11 (9 pass, 2 skipped)                                      |
| Lint errors                  | **32 errors** (mostly `@typescript-eslint/no-explicit-any`) |
| Lint warnings                | 90                                                          |
| Knip unused exports          | 14 (permissions helpers, i18n type exports, etc.)           |
| jscpd duplicate code         | 6.64% (below 10% threshold ✅)                              |
| E2E tests                    | 4 specs (calendar, homepage, running-order, scanner)        |
| API route directories        | 17                                                          |
| Page directories             | 12                                                          |
| Migration files              | 11                                                          |
| Components (feature)         | 26                                                          |
| shadcn/ui components         | 60+                                                         |

---

## Priority Issues

1. **32 lint errors** — mostly `no-explicit-any` in ~20 files. Quick wins to fix.
2. **Cloakroom (Phase 4)** — schema exists, **zero implementation**. No API, no UI, no tests.
3. **Notifications** — schema exists, **zero implementation**.
4. **Staff detail page** — missing (`/staff/[id]/page.tsx`), only edit view exists.
5. **Shift detail/edit page** — no dedicated UI.
6. **91 Knip issues** — many are false positives but need cleanup (unused exports, wrong entry patterns).
7. **`proxy.ts`** — middleware at non-standard location, role guards need tightening.
8. **Skipped tests** — 23 of 98 tests skipped (artists integration, events integration).
