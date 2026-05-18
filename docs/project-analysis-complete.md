# PAL — Complete Project Analysis & Improvement Roadmap

**Generated:** 2026-05-18  
**Scope:** Full codebase exploration covering all features, API routes, pages, components, database schema, and integration points.

---

## 🏗️ Architectural Overview

**PAL** is a **Next.js 16 + Supabase** nightclub booking & guest management system with:

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix primitives)
- **Backend:** Supabase (PostgreSQL + Auth), service-role API routes
- **State/Forms:** react-hook-form + Zod (v4), @dnd-kit for drag-and-drop
- **Testing:** Vitest (unit/integration) + Playwright (E2E)
- **Auth:** Supabase Auth with JWT, middleware route protection, 13 roles with RBAC
- **i18n:** DE/EN toggle, full workflow translation dictionary

### Three-Client Supabase Architecture

```
src/lib/supabase/
├── config.ts       # Shared URL + keys
├── browser.ts      # Client (anon key) — createBrowserClient()
├── server.ts       # Server components/API routes — createServerClient()
├── middleware.ts   # Route protection — createMiddlewareClient()
└── index.ts        # Unified exports
```

### Current Implementation Status

| Feature Area            | Status               | Key Files                                                                                      |
| ----------------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| Auth & RBAC             | ✅ Complete          | `src/proxy.ts`, `src/lib/permissions.ts`, `src/app/login/`, `/settings/`                       |
| Events & Calendar       | ✅ Complete          | `src/app/events/`, `src/components/calendar-view.tsx`, `src/components/event-form.tsx`         |
| Artists & Performances  | ✅ Complete          | `src/app/artists/`, `src/components/artist-form.tsx`, `src/components/performance-form.tsx`    |
| Rider PDF Extraction    | ✅ Complete          | `src/lib/riders/`, `src/components/rider-viewer.tsx`, `src/components/rider-editor/`           |
| Door / Check-in         | ✅ Complete          | `src/app/door/`, `src/components/qr-scanner.tsx`, `src/components/capacity-dashboard.tsx`      |
| Guest Lists             | ✅ Complete          | `src/app/guest-lists/`, `src/components/guest-entry-form.tsx`                                  |
| Workflow / Kanban       | ✅ Complete          | `src/app/workflow/`, `src/components/task-card.tsx`, `src/components/task-detail/`             |
| Staff Management        | ✅ Complete          | `src/app/staff/`, `src/components/staff-form.tsx`                                              |
| Shift Scheduling        | 🟡 Near Complete     | `src/app/staff/shifts/`, `src/components/shifts/timeline/`                                     |
| Availability            | ✅ Complete          | `src/app/staff/availability/`, `src/components/availability-calendar.tsx`                      |
| Inventory               | ✅ Complete          | `src/app/inventory/`, `src/components/inventory-list.tsx`, `src/components/inventory-form.tsx` |
| Rentals                 | ✅ Complete          | `src/app/rentals/`, `src/components/rentals-list.tsx`, `src/components/rental-form.tsx`        |
| Venues + Sub-Locations  | ✅ Complete          | `src/app/venues/`, `src/components/venues/`                                                    |
| Contacts                | ✅ Complete          | `src/app/contacts/`, `src/components/contact-form.tsx`                                         |
| Admin / Role Management | ✅ Complete          | `src/app/admin/`                                                                               |
| Dashboard               | ✅ Complete          | `src/app/page.tsx`, `src/components/dashboard/`                                                |
| Settings / Profile      | ✅ Complete          | `src/app/settings/`                                                                            |
| Cloakroom               | ❌ Schema only       | `cloakroom_items` table, no UI                                                                 |
| Notifications           | ❌ Schema only       | `notifications` table, no sending logic                                                        |
| Task Attachments        | 🟡 API exists, no UI | Migration `20260512000004_task_attachments.sql`                                                |
| Payroll                 | ❌ Not started       | No implementation                                                                              |
| Multi-Venue             | ❌ Not started       | Limited support                                                                                |

---

## 📊 Feature Maturity Matrix

```
Feature                    Schema  API     UI      Tests   Production-Ready
─────────────────────────────────────────────────────────────────────
Events/Calendar            ✅      ✅      ✅      🟡      ✅
Artists/Performances       ✅      ✅      ✅      🟡      ✅
Rider Extraction           ✅      ✅      ✅      🟡      ✅
Guest Lists                ✅      ✅      ✅      ❌      ✅
Door/Check-in              ✅      ✅      ✅      🟡      ✅
QR Scanner                 ✅      ✅      ✅      🟡      ✅
Capacity Dashboard         ✅      ✅      ✅      ❌      ✅
Venues + Sub-Locations     ✅      ✅      ✅      ❌      ✅
Staff Management           ✅      ✅      ✅      ❌      ✅
Shift Scheduling           ✅      ✅      ✅      ❌      ✅ (near)
Availability               ✅      ✅      ✅      ❌      ✅
Workflow/Kanban            ✅      ✅      ✅      🟡      ✅
Inventory                  ✅      ✅      ✅      ❌      ✅
Rentals                    ✅      ✅      ✅      ❌      ✅
Contacts                   ✅      ✅      ✅      ❌      ✅
Auth/Security              ✅      ✅      ✅      ❌      🟡
Admin/Roles                ✅      ✅      ✅      ❌      ✅
Settings/Profile           ✅      ✅      ✅      ❌      ✅
i18n                       ✅      ✅      ✅      ❌      ✅
Cloakroom                  ✅      ❌      ❌      ❌      ❌
Notifications              ✅      ❌      ❌      ❌      ❌
Payroll                    ❌      ❌      ❌      ❌      ❌
Task Attachments           ✅      ✅      ❌      ❌      ❌
Shift Templates            ✅      ✅      ✅      ❌      🟡 (UI exists, DB persistence TBD)
Shift Swaps                ✅      ❌      🟡      ❌      ❌ (UI-only, no persist)

✅ = Complete   🟡 = Partial   ❌ = Missing/Not started
```

---

## 🗄️ Database Schema Overview

### Core Tables (from initial schema + migrations)

```sql
-- Auth & Users
profiles (id PK → auth.users, email, full_name, phone, avatar_url)
user_roles (id PK, user_id FK → profiles, role app_role)

-- Venues & Events
venues (id PK, name, address, capacity, venue_type, is_pal_location, notes, contact_*)
venue_sub_locations (id PK, venue_id FK, name, description, capacity)
events (id PK, venue_id FK, name, date, door_time, end_time, status, max_capacity)

-- Artists & Riders
artists (id PK, name, city, fee, genre, bio, contact_*, tech_rider JSONB, hospitality_rider JSONB)
labels (id PK, name)
artist_labels (artist_id FK, label_id FK) -- many-to-many
performances (id PK, event_id FK, artist_id FK, start_time, end_time, stage, order_index)

-- Guest Lists
guest_lists (id PK, event_id FK, name, created_by FK → profiles)
guest_entries (id PK, guest_list_id FK, guest_name, email, phone, category, plus_ones,
                qr_token UUID, qr_token_expires_at, status, checked_in_*)

-- Staff & Shifts
staff (id PK, profile_id FK → profiles, role, contract_type, is_minor, hourly_rate)
shifts (id PK, event_id FK, staff_id FK, role, start_time, end_time, break_minutes, status,
         sub_location_id FK, clocked_in_at, clocked_out_at, actual_break_minutes)
availability (id PK, staff_id FK, date, available, reason, available_from, available_until, notes)

-- Tasks & Workflow
tasks (id PK, title, description, status, priority, assignee_id FK → profiles,
        event_id FK, venue_id FK, due_date, scheduled_date, needs_approval, blocked,
        blocked_reason, created_by FK, parent_task_id FK, task_type)
task_assignees (task_id FK, profile_id FK) -- many-to-many
task_items (task_id FK, item_id FK, goal_sub_location_id FK, delivered_at)
task_comments (id PK, task_id FK, author_id FK, content)
task_history (id PK, task_id FK, changed_by FK, from_status, to_status, change_type, reason)
sub_tasks (if exists)

-- Inventory & Rentals
items (id PK, name, category (dj_audio|lighting|pa_sound|infrastructure|venue_misc),
        serial_number, brand, model, condition_enum, location, sub_location_id FK, qr_token)
item_location_history (id PK, item_id FK, location, action, moved_by FK → profiles)
rentals (id PK, item_id FK, rented_to, contact_*, rental_date, expected_return, actual_return,
          status (active|returned|overdue))

-- Other
contacts (id PK, name, email, phone_*, position, notes, venue_id FK)
cloakroom_items (id PK, event_id FK, item_type, tag_number, claimed, claim_token)
notifications (id PK, type, recipient_id FK → profiles, channel, status, payload JSONB)
```

### Key Enums

```sql
app_role: admin, manager, booking, social-media, night-management, label, staff, tech,
          tech-lead, gastro, backoffice, awareness, azubi
contract_type: permanent, freelance, minor
guest_category: presale, guestlist, walkin
```

---

## 🔐 RBAC System (13 Roles, Feature & Route Level)

The permissions system in `src/lib/permissions.ts` is comprehensive:

- **Route-level access** — `ROLE_ROUTE_ACCESS` maps each route to allowed roles
- **Feature-level permissions** — `FEATURE_PERMISSIONS` with READ/WRITE granularity
- **Role configuration** — `ROLE_CONFIG` with labels, badge colors, rank, descriptions
- **Utility functions** — `canAccessRoute()`, `hasPermission()`, `hasRole()`, `getHighestRole()`, `getAssignableRoles()`
- **Admin has universal access** — always passes all permission checks
- **Multi-role support** — user has union of all their roles' permissions

---

## 🔴 Critical Gaps

### Production Blockers

| Issue                                  | Severity | Details                                                                                                                                |
| -------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Service role key in ALL API routes** | 🔴 HIGH  | Every API route uses `createClient(url, serviceKey)` — bypasses RLS entirely. Should use user-context-aware client for user operations |
| **Middleware in `src/proxy.ts`**       | 🟡 MED   | Next.js expects `src/middleware.ts`. The proxy export pattern works but is non-standard                                                |
| **No staff auth linking**              | 🟡 MED   | `staff.profile_id` references `profiles.id`, but many staff records have no linked auth user — they can't log in                       |
| **No password reset**                  | 🟡 MED   | Only login+signup; no "forgot password" flow                                                                                           |
| **No rate limiting**                   | 🟡 MED   | No protection against brute-force login attempts                                                                                       |

### Missing Features (Schema Exists, No Implementation)

| Feature                | Table                         | Priority | Effort  |
| ---------------------- | ----------------------------- | -------- | ------- |
| Cloakroom UI           | `cloakroom_items`             | 🟡 MED   | ~2 days |
| Notification engine    | `notifications`               | 🟡 MED   | ~3 days |
| Task attachments UI    | `task_attachments` SQL exists | 🟢 LOW   | ~1 day  |
| Shift swap persistence | (currently in-memory only)    | 🟢 LOW   | ~2 days |

### Test Gaps

| Area                      | Missing Tests               | Risk   |
| ------------------------- | --------------------------- | ------ |
| Shifts/Staff/Availability | No integration or E2E tests | High   |
| Guest Lists               | No E2E tests                | Medium |
| Venues                    | No integration or E2E tests | Medium |
| Inventory/Rentals         | No E2E tests                | Low    |
| Shift scheduling flow     | No E2E tests                | High   |

---

## 🚀 Improvement Recommendations by Priority

### P0 — Production Must-Haves

| #   | Improvement                   | Description                                                                   | Files/Tables                                     |
| --- | ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | **Staff auth linking**        | Admin page to link existing staff records to auth users so staff can log in   | `staff`, `profiles`, `src/app/admin/link-staff/` |
| 2   | **Staff self-service portal** | `/my-shifts` page — staff view upcoming shifts, confirm, request time off     | `src/app/my-shifts/`, `shifts`, `availability`   |
| 3   | **Notification engine**       | Implement email sending for shift assignments, task approvals, swap requests  | `notifications`, SMTP integration                |
| 4   | **API auth hardening**        | Move API routes from service-role to user-context-aware client where possible | All `src/app/api/*/route.ts`                     |
| 5   | **Shift E2E tests**           | Add Playwright tests for the full shift scheduling flow                       | `src/test/e2e/`                                  |

### P1 — Near-Term Additions

| #   | Improvement                 | Description                                                         | Effort   |
| --- | --------------------------- | ------------------------------------------------------------------- | -------- |
| 6   | **Cloakroom management UI** | CRUD for cloakroom items, claim/reclaim via QR, per-event dashboard | ~2 days  |
| 7   | **Analytics dashboard**     | Event attendance trends, staffing efficiency, rental utilization    | ~3 days  |
| 8   | **Persistent shift swaps**  | Save swap requests to DB, manager approval, notifications           | ~2 days  |
| 9   | **Task attachments UI**     | Upload/download/view files on task detail dialog                    | ~1 day   |
| 10  | **Password reset flow**     | "Forgot password" link on login page                                | ~0.5 day |

### P2 — Medium-Term

| #   | Improvement                   | Description                                                          |
| --- | ----------------------------- | -------------------------------------------------------------------- |
| 11  | **Public event calendar**     | Public-facing page showing upcoming events for marketing             |
| 12  | **Guest check-in portal**     | QR-based self-check-in kiosk mode                                    |
| 13  | **Payroll report generation** | Monthly hours per staff, break compliance, CSV/PDF export            |
| 14  | **Multi-venue support**       | Cross-venue staffing, shared inventory pools, consolidated reporting |
| 15  | **Recurring events**          | Auto-create weekly events + apply shift templates                    |

### P3 — Long-Term / Stretch

| #   | Improvement                     | Description                                                         |
| --- | ------------------------------- | ------------------------------------------------------------------- |
| 16  | **AI staffing recommendations** | Based on event type, day, capacity, ticket sales                    |
| 17  | **Lightspeed/POS integration**  | Sync sales data, track bar inventory                                |
| 18  | **Public artist database**      | Public roster + rider upload for self-service bookings              |
| 19  | **Mobile PWA**                  | Offline-capable for door check-in, clock-in/out, inventory scanning |
| 20  | **Enhanced itinerary PDF**      | Full staffing list, task list, rider summary, financial summary     |

---

## 📁 Project Structure Deep Dive

```
src/
├── app/                          # App Router pages + API
│   ├── admin/                    # Role management
│   ├── api/                      # All API routes
│   │   ├── admin/roles/          # Role CRUD
│   │   ├── artists/              # Artist CRUD + rider extraction + task gen
│   │   ├── auth/signout/         # Server-side signout
│   │   ├── availability/         # Staff availability CRUD
│   │   ├── checkin/              # QR check-in
│   │   ├── contacts/             # Telephone book CRUD
│   │   ├── dashboard/            # Aggregator endpoint
│   │   ├── events/               # Event CRUD
│   │   ├── generate-qr/          # QR code generation
│   │   ├── guest-lists/          # Guest list + entries CRUD
│   │   ├── items/                # Inventory CRUD, QR, location history, rider assignments, tasks
│   │   ├── itinerary/            # PDF itinerary generation
│   │   ├── labels/               # Artist labels CRUD
│   │   ├── occupancy/            # Capacity tracking
│   │   ├── performances/         # Performance CRUD
│   │   ├── profiles/             # User profiles
│   │   ├── rentals/              # Rental CRUD + return
│   │   ├── shifts/               # Shift CRUD, bulk, clock-in/out
│   │   ├── staff/                # Staff CRUD + current user
│   │   ├── tasks/                # Task CRUD, status, approve, reject, block, comments, attachments, history, deliver-item
│   │   ├── venues/               # Venue CRUD + sub-locations
│   │   └── ...
│   ├── artists/                  # Artist pages (list, detail, edit, new)
│   ├── contacts/                 # Contacts page
│   ├── door/                     # Door scanner page
│   ├── events/                   # Event pages (list, detail, edit, new)
│   ├── guest-lists/              # Guest list pages
│   ├── inventory/                # Inventory pages
│   ├── rentals/                  # Rentals page
│   ├── staff/                    # Staff pages (list, new, edit, shifts, availability)
│   ├── venues/                   # Venue pages
│   ├── workflow/                 # Kanban workflow pages
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   ├── settings/                 # Settings page
│   ├── layout.tsx                # Root layout (NavBar, UserProvider, I18nProvider)
│   ├── page.tsx                  # Dashboard (server component + client)
│   └── ...
├── components/
│   ├── dashboard/                # Dashboard sub-components (hero, stats, tasks, shifts, events, quick-actions)
│   ├── shifts/timeline/          # Shift timeline (block, header, row, utils, use-timeline-dnd)
│   ├── staff-shifts/             # Shift form, bulk create, clock actions
│   ├── task-detail/              # Task detail sub-components (actions, comments, items, meta, subtasks, view)
│   ├── task-form/                # Task form (fields, items)
│   ├── venues/                   # Venue form, stats, sub-location form
│   ├── rider-editor/             # Rider editor (hospitality, stage, tech)
│   ├── ui/                       # ~40 shadcn/ui primitives
│   └── ...
├── lib/
│   ├── riders/                   # Rider extraction (hybrid, pdf-to-image, task-generation, types)
│   ├── staff-shifts/             # Shared types, form schema, utils
│   ├── supabase/                 # Supabase clients (browser, server, middleware, config)
│   ├── validations/              # Zod schemas (shift, availability, template)
│   ├── permissions.ts            # RBAC system
│   ├── i18n.tsx                  # DE/EN translation
│   └── ...
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── test/
│   ├── e2e/                      # Playwright specs
│   ├── integration/              # Integration tests
│   ├── unit/                     # Unit tests
│   └── setup.ts
└── proxy.ts                      # Middleware (route protection)
```

---

## 🔗 Key Integration Touchpoints

| Integration            | Current State                                                            | Notes                              |
| ---------------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| Shifts ↔ Events        | ✅ `shifts.event_id → events.id`                                         | ON DELETE CASCADE                  |
| Shifts ↔ Staff         | ✅ `shifts.staff_id → staff.id`                                          | No CASCADE                         |
| Shifts ↔ Sub-Locations | ✅ `shifts.sub_location_id → venue_sub_locations.id`                     | Added in recent migration          |
| Tasks ↔ Events         | ✅ `tasks.event_id → events.id`                                          | Optional (ON DELETE CASCADE)       |
| Tasks ↔ Venues         | ✅ `tasks.venue_id → venues.id`                                          | Added in Venue Hub migration       |
| Tasks ↔ Items          | ✅ `task_items` junction table                                           | With goal_sub_location_id          |
| Tasks ↔ Assignees      | ✅ `task_assignees` many-to-many                                         | Plus single `assignee_id` on tasks |
| Dashboard ↔ Everything | ✅ Single endpoint aggregates shifts, tasks, events, colleagues, rentals | Uses service role                  |
| Rider ↔ Tasks          | ✅ Auto-generation from extracted rider data                             | Via `/api/artists/generate-tasks`  |
| Items ↔ Sub-Locations  | ✅ `items.sub_location_id → venue_sub_locations.id`                      | Inventory location tracking        |

---

## 📝 Knowledge Base & Planning References

- **Shift Scheduling Rework Plan:** `docs/shift-scheduling-rework.md` — Detailed 2-week production plan
- **Project Memories:** `.factory/memories.md` — Architecture decisions, known issues, UI/UX notes
- **MVP Plan:** `.sisyphus/plans/nightclub-booking-system-mvp-plan.md`
- **Continuation Plan:** `.sisyphus/plans/pal-implementation-continuation.md`
- **Gap Analysis:** `.sisyphus/plans/nightclub-booking-system-review.md`
- **AGENTS.md:** Project build/lint/test commands and coding standards
- **This document:** `docs/project-analysis-complete.md`

---

## 🎯 Top 5 Recommended Immediate Actions

1. **Staff auth linking** — Without it, most staff can't log in and see their shifts. This is the #1 blocker.
2. **Cloakroom UI** — Schema exists, small feature (2 days), important for nightclub operations
3. **Notification engine** — Schema exists, enable email for task approvals, shift assignments
4. **Staff self-service** — `/my-shifts` page so staff can view/confirm shifts
5. **Production hardening** — Move away from service-role in API routes, fix middleware location
