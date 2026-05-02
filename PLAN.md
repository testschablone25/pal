# Staff Module Enhancement Plan

## Context

The `/staff` module is a core part of the PAL nightclub booking system. It currently has basic CRUD for staff members, a shift scheduling page, and an availability calendar. The goal is to significantly improve all three areas: staff management, shift scheduling, and availability, while integrating the already-existing role-based permission system into the staff module.

## Current State

- **Staff CRUD**: `src/app/staff/page.tsx` (list with filters), `src/app/staff/new/page.tsx`, `src/app/staff/[id]/edit/page.tsx`, `src/components/staff-form.tsx`, API at `src/app/api/staff/`
- **Shift Scheduling**: `src/app/staff/shifts/page.tsx` (event selector, timeline view, shift list), API at `src/app/api/shifts/`, DB table `shifts`
- **Availability**: `src/app/staff/availability/page.tsx` + `src/components/availability-calendar.tsx` (per-staff calendar), API at `src/app/api/availability/`, DB table `availability`
- **Permissions**: Fully defined in `src/lib/permissions.ts` (13 roles, feature-based perms, route access rules). Middleware in `src/proxy.ts` enforces route access. API routes currently use service key (bypass RLS) and only the admin/roles API checks permissions.
- **DB Schema**: Staff, shifts, availability tables in initial migration. Staff has `profile_id` FK to profiles.

## Approach

We'll work incrementally through 5 major phases. Each phase builds on the previous one.

---

## Files to Modify (Full List)

### Staff CRUD

- `src/app/staff/page.tsx` — Remove hourly rate column
- `src/components/staff-form.tsx` — Remove hourly rate field; add profile/user creation flow
- `src/app/api/staff/route.ts` — Remove hourly_rate from POST; add permission checks; add user creation
- `src/app/api/staff/[id]/route.ts` — Remove hourly_rate from PUT; add permission checks

### Shift Scheduling (Phase 2)

- `src/app/staff/shifts/page.tsx` — Major overhaul: edit dialog, drag-drop timeline, filtering, conflict warnings
- `src/app/api/shifts/route.ts` — Add permission checks; add conflict detection endpoint logic; bulk operations
- `src/app/api/shifts/[id]/route.ts` — Add permission checks; add clock-in/clock-out endpoints

### Shift Templates

- `src/app/api/shifts/templates/route.ts` — New: CRUD for shift templates
- `src/components/shift-template-form.tsx` — New: shift template form

### Shift Clock-In/Out

- `src/app/api/shifts/[id]/clock-in/route.ts` — New: clock-in endpoint
- `src/app/api/shifts/[id]/clock-out/route.ts` — New: clock-out endpoint

### Shift Swaps

- `src/app/api/shifts/[id]/swap/route.ts` — New: request/approve shift swap
- `src/components/shift-swap-request.tsx` — New: swap request UI

### Availability (Phase 3)

- `src/components/availability-calendar.tsx` — Major overhaul: self-service mode, colleague visibility
- `src/app/staff/availability/page.tsx` — Add staff-only view (own availability)
- `src/app/api/availability/route.ts` — Add permission checks; filter by user identity

### Permissions Integration (Phase 4)

- `src/app/api/staff/route.ts` — Add `hasPermission` checks
- `src/app/api/staff/[id]/route.ts` — Add `hasPermission` checks
- `src/app/api/shifts/route.ts` — Add `hasPermission` checks
- `src/app/api/shifts/[id]/route.ts` — Add `hasPermission` checks
- `src/app/api/availability/route.ts` — Add `hasPermission` checks
- `src/app/api/availability/[id]/route.ts` — Add `hasPermission` checks
- All UI components — Gate actions (add/edit/delete) behind permission checks

### User Invite Flow (Phase 5)

- `src/app/api/invite/route.ts` — New: invite staff (create user + profile + staff record)
- `src/components/staff-form.tsx` — Add email/password fields for new user creation
- `src/app/staff/new/page.tsx` — Update to support invite flow

### Database

- `supabase/migrations/YYYYMMDD000000_staff_enhancement.sql` — New migration for shift templates table, shift swap requests table, staff clock-in/out tracking

---

## Reuse

| Existing Function/File  | Path                                       | What to Reuse                                                                                             |
| ----------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `canAccessRoute`        | `src/lib/permissions.ts`                   | Route-level access checks in middleware                                                                   |
| `hasPermission`         | `src/lib/permissions.ts`                   | Feature-level permission checks in API routes (same pattern as admin/roles API)                           |
| `FEATURE_PERMISSIONS`   | `src/lib/permissions.ts`                   | Already defines STAFF_READ, STAFF_WRITE, SHIFTS_READ, SHIFTS_WRITE, AVAILABILITY_READ, AVAILABILITY_WRITE |
| `ROLE_ROUTE_ACCESS`     | `src/lib/permissions.ts`                   | Already defines /staff route access                                                                       |
| Admin Roles API pattern | `src/app/api/admin/roles/route.ts`         | Reference for how to check permissions in API routes (fetch user_roles via user_id from session)          |
| Shifts Timeline View    | `src/app/staff/shifts/page.tsx`            | Existing timeline rendering logic to extend                                                               |
| Availability Calendar   | `src/components/availability-calendar.tsx` | Existing calendar UI to extend for self-service                                                           |
| Staff Form              | `src/components/staff-form.tsx`            | Existing form to modify                                                                                   |
| UI Components           | `src/components/ui/*`                      | Use existing shadcn/ui components (Dialog, Form, Select, etc.)                                            |

---

## Steps

### Phase 1: Remove Hourly Rate from UI & Add Staff-User Linking [DONE]

- [x] **Step 1.1** — Remove `hourly_rate` field from `src/components/staff-form.tsx` (form field and schema)
- [x] **Step 1.2** — Remove "Hourly Rate" column from `src/app/staff/page.tsx` table
- [x] **Step 1.3** — Remove `hourly_rate` from `src/app/api/staff/route.ts` POST handler
- [x] **Step 1.4** — Remove `hourly_rate` from `src/app/api/staff/[id]/route.ts` PUT handler

### Phase 2: Shift Scheduling Overhaul [DONE]

- [x] **Step 2.1** — Add Edit Shift dialog (open from existing timeline/bar or list; prepopulate form; PUT to `/api/shifts/[id]`)
- [x] **Step 2.2** — Add Role-based filter to timeline view (dropdown to filter visible shifts by role)
- [x] **Step 2.3** — Add Drag & Drop timeline scheduling (use `@dnd-kit` to drag shift bars to adjust start/end times)
- [x] **Step 2.4** — Add Shift Conflict Detection (when saving a shift, check if staff already has overlapping shift in same event; show warning dialog)
- [x] **Step 2.5** — Add Bulk Shift Assignment (select multiple staff + role + time range + event; create shifts for all in one go via `/api/shifts/bulk`)
- [x] **Step 2.6** — Create Shift Templates system (14 predefined templates in `src/lib/shift-templates.ts`; apply dialog at `src/components/shift-template-apply-dialog.tsx`)
- [x] **Step 2.7** — Add Staff Clock-In / Clock-Out tracking (columns: `clocked_in_at`, `clocked_out_at`; APIs at `/api/shifts/[id]/clock-in` and `/api/shifts/[id]/clock-out`; UI buttons on shifts page)
- [x] **Step 2.8** — Add Shift Swap Request System (client-side swap request flow with accept/decline/approve; UI dialog on shifts page)
- [x] **Step 2.9** — Add Shift Scheduling Export (CSV download + PDF via jspdf on shifts page)

### Phase 3: Availability Self-Service Overhaul [DONE]

- [x] **Step 3.1** — Add "My Availability" view for staff (`/staff/availability?view=me` or via tab) — loads current staff member's calendar only
- [x] **Step 3.2** — Staff can click dates to set themselves as available/unavailable with a reason (self-service flip with quick reason input)
- [x] **Step 3.3** — Manager/Admin/Backoffice view (`?view=all`) remains, with ability to override any staff member's availability
- [x] **Step 3.4** — Staff can see colleagues' availability (colleagues panel in calendar, indicators in shift scheduling view)
- [x] **Step 3.5** — Link Availability Calendar to Shifts page (isStaffUnavailable/getAvailabilityReason highlight conflicts)

### Phase 4: Permission Enforcement in Staff Module

- [x] **Step 4.1** — Add helper function `getUserRoles(userId)` in `src/lib/permissions.ts` plus `requireAuth()`/`authenticate()` helpers in `src/lib/api-auth.ts`
- [x] **Step 4.2** — Add `hasPermission` checks to `GET /api/staff` (requires STAFF_READ)
- [x] **Step 4.3** — Add `hasPermission` checks to `POST /api/staff` (requires STAFF_WRITE)
- [x] **Step 4.4** — Add `hasPermission` checks to `PUT /api/staff/[id]` (requires STAFF_WRITE)
- [x] **Step 4.5** — Add `hasPermission` checks to `DELETE /api/staff/[id]` (requires STAFF_WRITE)
- [x] **Step 4.6** — Add `hasPermission` checks to shift API routes (SHIFTS_READ for GET, SHIFTS_WRITE for POST/PUT/DELETE, clock-in/clock-out, bulk)
- [x] **Step 4.7** — Add `hasPermission` checks to availability API routes (AVAILABILITY_READ for GET, AVAILABILITY_WRITE for POST/PUT/DELETE)
- [ ] **Step 4.8** — Gate UI actions in staff list page (only show Add/Edit/Delete buttons for users with STAFF_WRITE)
- [ ] **Step 4.9** — Gate UI actions in shifts page (only show Add/Edit/Delete for users with SHIFTS_WRITE)
- [ ] **Step 4.10** — Gate UI actions in availability page (staff can set own availability; managers can override anyone)

### Phase 5: User Invite Flow for Staff Creation

- [ ] **Step 5.1** — Update `src/components/staff-form.tsx` to include email + temporary password fields for creating a new user account
- [ ] **Step 5.2** — Update `POST /api/staff` to: (a) create user via `supabase.auth.admin.createUser()`, (b) create profile entry, (c) create staff record linked to profile, (d) assign default staff role
- [ ] **Step 5.3** — Add optional role assignment during staff creation (defaults to `staff` role, admin/manager can assign additional roles)
- [ ] **Step 5.4** — Handle edit mode (staff without profile_id should be able to link to an existing profile or create one)

---

### Phase 6: General UI Polish

- [x] **Step 6.1** — Mount Toaster in root layout, add toast feedback after every CRUD operation
- [x] **Step 6.2** — Create `PageSkeleton` component, add loading skeletons to all pages
- [x] **Step 6.3** — Mobile-friendly nav with hamburger menu on small screens
- [x] **Step 6.4** — Create `EmptyState` component for empty list pages
- [ ] **Step 6.5** — Standardize page shell (consistent padding/max-width across all pages)
- [ ] **Step 6.6** — Submit button loading states on all forms
- [ ] **Step 6.7** — Standardized search/filter bar component
- [ ] **Step 6.8** — Replace `confirm()` with shadcn AlertDialog
- [ ] **Step 6.9** — Page transition animations (fade-in)
- [ ] **Step 6.10** — Badge color consistency utility
- [ ] **Step 6.11** — Date/time format utility (centralize date-fns patterns)
- [ ] **Step 6.12** — Dialog auto-close on successful create/edit

---

## Verification

1. **Unit tests**: Run `npm run test:unit` — permissions tests should still pass; any new utilities need tests
2. **Build check**: `npm run build` — should compile without errors
3. **Manual checks**:
   - Create a staff member → confirm user account is created and staff record links to profile
   - Staff list → hourly rate column is gone
   - Shift scheduling → can create/edit/delete shifts; conflicts are detected; drag-drop works; bulk assign works; templates work; clock-in/out works; swap requests work; export works
   - Availability → staff can set own availability; managers can override; colleagues' availability shown in shift view
   - Permission gating → staff user cannot add/edit/delete staff members; manager can
   - Admin page → roles are manageable
