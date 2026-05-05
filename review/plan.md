# PAL Remediation Plan — Current State & Priority Order

> **Updated**: 2026-05-05 (Sessions 7-8 completed)
> **Cross-reference**: `review/findings.md` (issue IDs), `review/plan.md` (previous plan)
> **Strategy**: Fix dead ends first (P0), then deliverable plan items (P1), then architecture debt (P2), then UX quality (P3), then polish (P4), then deferred (P5)

---

## ✅ Already Delivered (Sessions 1-8)

These are complete and shipped. Not re-opening.

| Session              | What was done                                                                                                        | Verification                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **1 — Security**     | `requireAuth()` on all 49 API route files (34 newly protected + 15 existing)                                         | `npx tsc --noEmit` clean              |
| **2 — Architecture** | 4 monoliths decomposed: task-detail (-77%), rider-editor (-90%), task-form (-43%), dashboard (-49%) → 16 new modules | All under 460 lines                   |
| **3 — Bugs**         | 5 bugs fixed: time overlap, occupancy default, door UUIDs, promoter limits docs, backfill docs                       | Tests passing                         |
| **4 — Cleanup**      | 18 unused shadcn removed, 3 dead migrations archived, seed data extracted, dead table migration, npm scripts         | `npm run lint` clean                  |
| **5 — Boundaries**   | 20 loading/error boundaries, NavBar role filtering                                                                   | Files exist for all 10 route segments |
| **6 — Unit Tests**   | 6 test files, 47 tests covering dashboard, pagination, task-detail, task-form                                        | 70/71 passing                         |
| **7 — Batches 1-4**  | P0 dead ends fixed (edit page, share, status, door links), P1.1 pagination wired, P1.2 squash migration created      | `npx tsc --noEmit` clean              |
| **8 — Architecture** | P2.1 staff shifts decomposed 2,217→946 lines, P2.2 venues decomposed 1,145→578 lines, P1.3 e2e tests (26), P3 UX     | jscpd 5.17%, knip clean               |

---

## 📋 Remaining Work — Priority Ordered

---

### P0 — Dead Ends & Broken UX

These are paths in the UI that lead to 404s, do nothing, or are missing critical flows.

#### P0.1 — Create event edit page (EventForm supports edit mode)

**Issue**: Event detail page links to `/events/[id]/edit/` → **404**
**File**: `src/app/events/[id]/page.tsx:296`
**Fix**: Create `src/app/events/[id]/edit/page.tsx` (15 lines, thin wrapper around `EventForm mode="edit"`)

```tsx
// The component already exists — EventForm has mode="create" | "edit"
```

#### P0.2 — Fix Share button (or remove it)

**Issue**: Share button on event detail has no `onClick` handler — renders but does nothing
**Fix**: Either implement share (copy URL to clipboard) or remove the button

#### P0.3 — Add event status management to event detail

**Issue**: Events have `draft | published | cancelled | completed` status but no way to change it from the detail page
**Fix**: Add a toolbar dropdown or action buttons for Publish / Cancel / Complete, with confirmation dialogs

#### P0.4 — Add guest list + door links to event detail page

**Issue**: When viewing an event, there's no way to navigate to its guest list or door page
**Fix**: Add buttons like "Guest List" and "Door" that link to `/guest-lists?event_id=X` and `/door?event_id=X`

---

### P1 — Plan Deliverables (not completed from original sessions)

These are items scoped in the original plan that weren't delivered.

#### P1.1 — Wire PaginationControls into list pages

**Issue**: `src/components/pagination-controls.tsx` exists but isn't used anywhere
**Files to modify**: events page, artists page, inventory page, staff page, venues page, workflow page
**Each page needs**:

- Page state (`currentPage`, `totalItems`)
- Fetch with `limit`/`offset` query params
- `<PaginationControls>` component wired to `onPageChange`

#### P1.2 — Create squash migration

**Issue**: 11 separate migrations still in `supabase/migrations/`, complex history
**Fix**: Create `20260506000000_squash.sql` with all current table defs + RLS policies + roles, archive old ones

#### P1.3 — E2E tests for critical flows

**Issue**: Zero E2E tests for PAL-specific functionality
**Tests to create**:

- Door/check-in: create guest list → add guest → scan QR → check in → verify status
- Event→shift: create event → assign staff → verify shift appears
- Rider→task: upload rider → generate tasks → verify tasks in workflow

---

### P2 — Architecture Debt (remaining monoliths)

These are the same class of problem as Session 2 but we didn't scope them originally.

#### P2.1 — Decompose staff shifts page (2,216 lines)

**File**: `src/app/staff/shifts/page.tsx`
**Contains**: Drag-drop timeline, shift CRUD, clock-in/out, bulk ops, templates, role-colored bars
**Extract into**:

```
src/components/staff-shifts/
  shift-timeline.tsx         — Drag-drop timeline
  shift-form.tsx             — Create/edit shift form
  shift-clock-actions.tsx    — Clock-in/clock-out buttons
  shift-bulk-create.tsx      — Bulk shift creation dialog
```

#### P2.2 — Decompose venues page (1,145 lines)

**File**: `src/app/venues/page.tsx`
**Contains**: Venue CRUD, sub-location management, inline capacity editing
**Extract into**:

```
src/components/venues/
  venue-form.tsx             — Create/edit venue form
  venue-sub-location-form.tsx — Sub-location CRUD
  venue-stats.tsx            — Aggregated stats display
```

#### P2.3 — Decompose AvailabilityCalendar (1,377 lines)

**File**: `src/components/availability-calendar.tsx`
**Contains**: Calendar grid, staff filtering, date selection, availability toggle
**Deferred for now** — less user-facing impact than shifts/venues

---

### P3 — UX Quality Gaps

#### P3.1 — Overdue rental alerts

**Issue**: Rentals go `overdue` silently. Dashboard shows a count but no list or alert.
**Fix**: Add an overdue rental strip to the dashboard (similar to blocked tasks), or a notification-like component in the rentals page.

#### P3.2 — Add "My Shift" clock-in to dashboard

**Issue**: Clock-in/out is only accessible from the staff shifts page (2,216-line monolith)
**Fix**: When the logged-in user has an active or upcoming shift today, show a "Clock In" / "Clock Out" button on the dashboard hero section

#### P3.3 — Add "Add to Event" action on artist detail page

**Issue**: After viewing/creating an artist, there's no way to add them to an event's performance line-up
**Fix**: Add a button on the artist detail page that opens a dialog: select event → select stage/time → creates performance

#### P3.4 — Sub-location capacity tracking UI

**Issue**: `venue_sub_locations` has a `capacity` column but no UI uses or displays it
**Fix**: Show capacity in sub-location list on venue page, add to the venue expanded view

---

### P4 — Polish

#### P4.1 — German/English language consistency

**Issue**: Mixed language throughout:

- German: _Moin_, _Künstler_, _Aufgaben_, _Tür_, _Inventar_, _Verleih_, _Heute Abend_, _Schichtplan_
- English: _Tasks_, _Create Task_, _Share_, _Edit_, _Delete_, _Check In_, _Check Out_, _Rental Out_, _Transfer_
- Mixed: `statusBadgeClass()` is English-only, API error messages are English

**Decision needed**: Pick one language. `useI18n()` hook exists but is barely used. Either:

- Go full German (recommended — the target users are German club staff)
- Or remove i18n entirely and just hardcode German

#### P4.2 — Integration tests

**Issue**: Session 6 only covered unit tests. No integration tests for multi-step flows exist.
**Tests to create**:

- Guest list → check-in → occupancy update
- Item creation → QR generation → delivery via task

---

### P5 — Deferred

#### P5.1 — Role taxonomy consolidation (Session 7)

**Issue**: `staff.role` ('sound', 'light', 'manager', etc.) and `user_roles` ('tech', 'tech-lead', 'manager') are parallel taxonomies that never synchronize
**Fix**: Add 'sound', 'light' to `user_roles` enum, backfill from `staff.role`, update rider task generation
**Deferred because**: Schema migration + data migration. Touches rider task generation which is complex. Low user-facing impact currently.

---

## Priority Grid

| ID       | Item                             | Effort  | Impact             | Dependencies             |
| -------- | -------------------------------- | ------- | ------------------ | ------------------------ |
| **P0.1** | Event edit page                  | ~15 min | 🔴 Dead end → 404  | None                     |
| **P0.2** | Fix/remove Share button          | ~5 min  | 🟡 Useless UI      | None                     |
| **P0.3** | Event status management          | ~30 min | 🟡 Missing feature | None                     |
| **P0.4** | Guest list + door links on event | ~15 min | 🟡 UX gap          | None                     |
| **P1.1** | Wire pagination into lists       | ~2h     | 🔵 Missing feature | None                     |
| **P1.2** | Squash migration                 | ~1h     | 🟠 Cleanup         | None                     |
| **P1.3** | E2E tests                        | ~3h     | 🔵 Test coverage   | Playwright config exists |
| **P2.1** | Staff shifts decomposition       | ~3h     | 🟠 Architecture    | None                     |
| **P2.2** | Venues decomposition             | ~2h     | 🟠 Architecture    | None                     |
| **P3.1** | Overdue rental alerts            | ~1h     | 🟡 UX gap          | None                     |
| **P3.2** | Dashboard shift clock-in         | ~1h     | 🟡 UX gap          | None                     |
| **P3.3** | Artist→Event performance linking | ~1h     | 🟡 UX gap          | None                     |
| **P3.4** | Sub-location capacity UI         | ~30min  | 🟢 Enhancement     | None                     |
| **P4.1** | Language consistency             | ~4h     | 🟢 Polish          | Decision needed          |
| **P4.2** | Integration tests                | ~2h     | 🟢 Test coverage   | None                     |
| **P5.1** | Role taxonomy                    | ~3h     | 🟠 Architecture    | Depends on P2.1          |

---

## Execution Strategy

### Batch 1 — P0 (fix dead ends)

```
P0.1 Event edit page  → 15 min
P0.2 Fix Share button → 5 min
P0.3 Status management → 30 min
P0.4 Event→door links  → 15 min
                          ≈ 1h total
```

### Batch 2 — P1 (plan deliverables)

```
P1.1 Wire pagination → 2h
P1.2 Squash migration → 1h
P1.3 E2E tests       → 3h
                       ≈ 6h total (can parallelize)
```

### Batch 3 — P2 (architecture debt)

```
P2.1 Staff shifts decomposition → 3h
P2.2 Venues decomposition       → 2h
                                 ≈ 5h total (can parallelize)
```

### Batch 4 — P3 (UX quality)

```
P3.1 Overdue alerts         → 1h
P3.2 Dashboard clock-in     → 1h
P3.3 Artist→event linking   → 1h
P3.4 Sub-location capacity  → 30min
                              ≈ 3.5h total (can parallelize)
```

### Batch 5 — P4 (polish)

```
P4.1 Language consistency → 4h
P4.2 Integration tests    → 2h
                            ≈ 6h total (can parallelize)
```

### Batch 6 — P5 (deferred)

```
P5.1 Role taxonomy consolidation → 3h (only after P2.1)
```
