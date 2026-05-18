---
name: pal
description: PAL Nightclub Booking & Guest Management System — full project conventions, database schema, API patterns, and known issues
---

# PAL — Nightclub Booking & Guest Management System

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (Next.js 16) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run test:unit` | Vitest all unit/integration |
| `npm run test:e2e` | Playwright all e2e |
| `npm test` | Unit + e2e sequentially |
| `npm run knip` | Dead code detection |
| `npm run jscpd` | Duplicate code detection |
| `npm run seed:pal-data` | Seed sample data |
| `npm run seed:test-users` | Create test user accounts |
| `npm run seed:staff` | Create staff accounts |
| `npm run test:rider` | Test rider PDF upload pipeline |
| `npx vitest run src/lib/qr.test.ts` | Single unit test |
| `npx playwright test src/test/e2e/homepage.spec.ts` | Single e2e test |

Always run `npm run lint`, `npm run knip`, and `npm run jscpd` after making changes. Run relevant tests.

---

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + Supabase
**Auth:** Supabase Auth (email/password) + middleware route guard
**Hosting:** Vercel (deployed from `master` branch)
**Remote:** `https://github.com/testschablone25/pal.git`

### Three-Client Supabase Architecture

| Client | When | File | Key |
|--------|------|------|-----|
| **Browser** | Client components | `@/lib/supabase/browser` | Anon key |
| **Server** | RSC / API routes with auth | `@/lib/supabase/server` | SSR cookie |
| **Middleware** | Route guard | `@/lib/supabase/middleware` | Cookie-based |
| **Admin (service role)** | API routes bypassing RLS | `createClient(url, serviceKey)` directly | Service role key |

> **⚠️ Middleware is in `src/proxy.ts`** (not `src/middleware.ts` — non-standard location).

### Project Structure

```
src/
  app/              # Pages (App Router) + API routes
  components/       # Feature components + ui/ (shadcn/ui primitives)
  hooks/            # Custom React hooks
  lib/              # Utilities, Supabase clients, domain logic
    supabase/       # Client factories (browser, server, middleware, config)
    riders/         # Rider PDF extraction types + logic
    staff-shifts/   # Shift scheduling types + utilities
    utils/          # cn(), etc.
  test/             # Tests (unit/, integration/, e2e/)
  proxy.ts          # Auth middleware (route guard)
```

---

## Database Schema (Supabase PostgreSQL)

### Enums
```sql
app_role: admin | manager | booking | social-media | night-management | label | staff | tech | tech-lead | gastro | backoffice | awareness | azubi
guest_category: presale | guestlist | walkin
contract_type: permanent | freelance | minor
```

### Tables

**`profiles`** — User profiles (FK to `auth.users`)
- `id UUID PK`, `email TEXT UNIQUE`, `full_name TEXT`, `phone TEXT`, `avatar_url TEXT`, `created_at`, `updated_at`

**`user_roles`** — Multi-role permissions
- `id UUID PK`, `user_id UUID → profiles`, `role app_role`, `UNIQUE(user_id, role)`

**`venues`** — Club/venue locations
- `id UUID PK`, `name TEXT`, `address TEXT`, `capacity INT`, `venue_type TEXT CHECK(venue|storage|office|mixed)`, `notes TEXT`, `contact_name/phone/email`, timestamps
- RLS: Anyone can SELECT

**`venue_sub_locations`** — Sub-areas within venues (floors, rooms)
- `id UUID PK`, `venue_id UUID → venues`, `name TEXT`, `description TEXT`, `capacity INT`, `UNIQUE(venue_id, name)`

**`events`** — Scheduled events/parties
- `id UUID PK`, `venue_id UUID → venues`, `name TEXT`, `date DATE`, `door_time TIME`, `end_time TIME`, `status TEXT CHECK(draft|published|cancelled|completed)`, `max_capacity INT`, timestamps

**`artists`** — Performers/bands
- `id UUID PK`, `name TEXT`, `city TEXT`, `fee DECIMAL`, `genre TEXT`, `bio TEXT`, `contact_email/phone`, `promo_pack_url`, `documents JSONB`, `tech_rider JSONB`, `hospitality_rider JSONB`, timestamps
- GIN indexes on `tech_rider` and `hospitality_rider`
- Rider JSONB structure defined in `src/lib/riders/types.ts`

**`performances`** — Artist→Event assignments
- `id UUID PK`, `event_id UUID → events`, `artist_id UUID → artists`, `start_time TIME`, `end_time TIME`, `stage TEXT DEFAULT 'main'`, `order_index INT`

**`guest_lists`** — Named lists attached to events
- `id UUID PK`, `event_id UUID → events`, `name TEXT`, `created_by UUID → profiles`

**`guest_entries`** — Individual guests on a list
- `id UUID PK`, `guest_list_id UUID → guest_lists`, `guest_name/email/phone`, `category guest_category`, `plus_ones INT`, `qr_token UUID UNIQUE`, `qr_token_expires_at TIMESTAMPTZ`, `status TEXT CHECK(pending|checked_in|checked_out|cancelled)`, `checked_in_at/out_at`, `checked_in_by UUID → profiles`
- RLS: Door staff (admin, manager, night-management, awareness, staff) can manage

**`staff`** — Staff members (one per profile)
- `id UUID PK`, `profile_id UUID → profiles`, `role TEXT`, `contract_type`, `is_minor BOOLEAN`, `hourly_rate DECIMAL`

**`shifts`** — Staff shift assignments
- `id UUID PK`, `event_id UUID → events`, `staff_id UUID → staff`, `role TEXT`, `start_time TIMESTAMPTZ`, `end_time TIMESTAMPTZ`, `break_minutes INT`, `status TEXT CHECK(scheduled|confirmed|completed|cancelled)`, timestamps

**`availability`** — Staff availability per day
- `id UUID PK`, `staff_id UUID → staff`, `date DATE`, `available BOOLEAN`, `reason TEXT`, `set_by UUID → staff`, `UNIQUE(staff_id, date)`

**`tasks`** — Workflow/Kanban items
- `id UUID PK`, `title TEXT`, `description TEXT`, `status TEXT CHECK(todo|in_progress|pending_approval|done|cancelled)`, `priority TEXT CHECK(low|medium|high|urgent)`, `assignee_id UUID → profiles`, `event_id UUID → events`, `venue_id UUID → venues`, `created_by UUID → profiles`, `due_date DATE`, `scheduled_date DATE`, `needs_approval BOOLEAN`, `blocked BOOLEAN`, `blocked_reason TEXT`, `parent_task_id UUID → tasks`, `task_type TEXT CHECK(setup|teardown|repair|maintenance|logistics|procurement|tech_check|crew|booking|cleanup|safety|inventory|catering|transportation|documentation)`, timestamps
- Can be linked to event OR venue (or neither), not required

**`task_comments`** — Comments on tasks
- `id UUID PK`, `task_id UUID → tasks`, `author_id UUID → profiles`, `content TEXT`

**`task_history`** — Audit log for task state changes
- `id UUID PK`, `task_id UUID → tasks`, `changed_by UUID → profiles`, `from_status TEXT`, `to_status TEXT`, `change_type TEXT CHECK(created|status_change|blocked|unblocked|approved|rejected|edited)`, `reason TEXT`

**`items`** — Inventory items (equipment)
- `id UUID PK`, `name TEXT`, `category TEXT CHECK(dj_audio|lighting|pa_sound|infrastructure|venue_misc)`, `serial_number TEXT UNIQUE`, `brand TEXT`, `model TEXT`, `condition_enum TEXT CHECK(new|good|fair|poor|broken)`, `condition_notes TEXT`, `current_location TEXT`, `sub_location_id UUID → venue_sub_locations`, `notes TEXT`, `photo_url TEXT`, `qr_token TEXT UNIQUE`, timestamps

**`item_location_history`** — Movement audit for items
- `id UUID PK`, `item_id UUID → items`, `location TEXT`, `action TEXT CHECK(check_in|check_out|transfer|rental_out|rental_return)`, `moved_by UUID → profiles`, `timestamp TIMESTAMPTZ`

**`rentals`** — Item rentals to external parties
- `id UUID PK`, `item_id UUID → items`, `rented_to TEXT`, `contact_person/phone/email`, `rental_date DATE`, `expected_return DATE`, `actual_return DATE`, `notes TEXT`, `status TEXT CHECK(active|returned|overdue)`, `created_by UUID → profiles`

**`task_items`** — Items linked to tasks (for delivery tracking)
- `task_id UUID → tasks`, `item_id UUID → items`, `goal_sub_location_id UUID → venue_sub_locations`, `delivered_at TIMESTAMPTZ`, `PRIMARY KEY(task_id, item_id)`

---

## RLS Policies (Key Ones)

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| profiles | own | — | own | — |
| user_roles | own | — | — | — |
| venues | ✅ anyone | — | — | — |
| events | ✅ anyone (published/draft) | admin/manager/etc. | same | same |
| artists | ✅ anyone | — | — | — |
| performances | ✅ anyone | — | — | — |
| guest_entries | door staff | door staff | door staff | door staff |
| staff | ✅ anyone | — | — | — |
| shifts | ✅ anyone | — | — | — |
| availability | — | own or manager | own or manager | own or manager |
| tasks | ✅ anyone | ✅ anyone | assignee/admin/manager/backoffice | — |
| items | ✅ anyone | ✅ anyone | ✅ anyone | ✅ anyone |
| rentals | ✅ anyone | ✅ anyone | ✅ anyone | ✅ anyone |

> **⚠️ Known issue:** API routes use service role key (bypasses RLS). Many tables have overly permissive RLS. Needs tightening for production.

---

## Coding Conventions

### Imports (strict order)
1. External packages (react, next, lucide-react, etc.)
2. `@/` path-aliased imports
3. Relative imports
4. `import type { ... }` for type-only imports
5. Named exports preferred over default

### Formatting
- 2-space indent, double quotes, semicolons always
- No Prettier — ESLint via `eslint-config-next` only

### TypeScript
- Strict mode — never `any`, use `unknown` + type guards
- `interface` for object shapes, `type` for unions/Zod inference
- Optional: `?` suffix; nullable: `string | null`

### Naming
- Files/dirs: **kebab-case** (`event-form.tsx`)
- Components: **PascalCase** (`export function EventForm`)
- Hooks: **camelCase** with `use` prefix (`useToast`)
- Utilities: **camelCase** (`generateQRToken`, `cn`)
- Constants: **UPPER_SNAKE_CASE** (`PROTECTED_ROUTES`, `GENRES`)
- API route handlers: named `GET`, `POST`, `PUT`, `DELETE`

### Components
- Client components: `'use client'` at top
- Server components (pages): no directive
- Props interfaces: `{ComponentName}Props`
- Forms: `react-hook-form` + `zodResolver` + shadcn `Form` components
- Navigation: `useRouter()` from `next/navigation`

---

## API Route Pattern

```typescript
// src/app/api/resource/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseConfig } from "@/lib/supabase/config";

const schema = z.object({ /* ... */ });

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);
    const { searchParams } = new URL(request.url);
    // ... query
    const { data, error } = await supabase.from("table").select("*");
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Client-side fetch pattern
```typescript
const res = await fetch("/api/resource");
if (!res.ok) {
  const errBody = await res.json().catch(() => ({}));
  throw new Error(errBody.error || `Failed (${res.status})`);
}
```

> NEVER throw generic `"Failed to update task"` — include status code + API error field.

---

## UI & Styling Conventions

### Theme Colors (Dark Theme)
| Token | Value | Usage |
|-------|-------|-------|
| Page bg | `bg-zinc-950` | Body background |
| Card/surface | `bg-zinc-900` | Cards, panels, dialogs |
| Border | `border-zinc-800` | Default borders |
| Accent | `violet-600` | Buttons, highlights, active states |
| Heading | `text-white` | Titles |
| Body text | `text-zinc-300` | Normal content |
| Secondary | `text-zinc-400`/`text-zinc-500` | Muted labels |
| Error | `text-red-400` / `bg-red-950/50` |
| Success | `text-green-400` / `bg-green-600` |

### Dashboard Glassmorphism
- **Cards:** `bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60` (primary), `/60` (secondary), `/50` (tertiary)
- **Corner radius:** `rounded-xl` (hero greeting only), `rounded-lg` (all cards, stat strips, panels), `rounded-md` (internal elements, icon pills, badges, task rows)
- **Stat cards (KPIs):** solid bg, colored left-border accent `border-l-2 border-l-{color}-600/50` + `hover:border-l-{color}-500/60`
- **No motion flourishes:** avoid `hover:-translate-y-*`, `hover:scale-*` — color/border transitions only
- **No colored blur decorations** on stat cards
- **Avatar:** solid `bg-violet-700`, `ring-1 ring-violet-900/40`, no gradients, no glow
- **Name in greeting:** solid `text-violet-400` (no gradient text)

### shadcn/ui Modifications
- `Card`: default variant has `rounded-lg` (not default 0)
- `DialogContent`: `rounded-lg`
- `Button`: `rounded-md`
- `Input`, `Textarea`: `rounded-md`
- `Badge`: `rounded-full text-xs`

### Language
- **Dashboard & navigation:** German (`Moin`, `Aufgaben`, `Schichtplan`, `Abmelden`)
- **Internal pages & forms:** English (`Create`, `Save`, `Cancel`, `Status`)
- **Date format:** `dd.MM.yyyy` with `date-fns` `de` locale

### Form Design Patterns
- **Dialog sizing:** `max-w-xl` (~576px) for forms; `max-w-2xl` (~672px) for detail dialogs
- **Sectioned layout:** `<Separator />` + `<SectionHeader>` with Lucide icon + uppercase `tracking-wider` title
- **Progressive disclosure:** Advanced fields in `<Collapsible>` (starts collapsed)
- **Toggle pills:** `rounded-full` buttons for multi-option fields (5+ choices)
  - Selected: `bg-violet-600/20 text-violet-400 border-violet-600/50`
  - Unselected: `bg-zinc-800/50 text-zinc-400 border-zinc-700`
- **Priority dots:** `w-2 h-2 rounded-full` — grey(medium), blue(medium), orange(high), red(urgent)
- **Form footer:** `border-t border-zinc-800 pt-6 mt-2` — errors left, Cancel + Submit right
  - Submit: `bg-violet-600 hover:bg-violet-700 min-w-[120px]`
  - Cancel: `variant="outline" border-zinc-800 text-zinc-400 hover:text-zinc-200`
- **Auto-focus:** primary input gets `autoFocus` on create mode only

### Page Wrappers
Every page route must wrap content in:
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
```

### Global Ambient Background
In `layout.tsx`, add fixed-position gradient blurs:
```tsx
<div className="fixed inset-0 pointer-events-none overflow-hidden">
  <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
  <div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-600/[0.03] rounded-full blur-3xl" />
</div>
<main className="relative">...</main>
```

---

## Role-Based Access Control (RBAC)

Roles are in `src/lib/permissions.ts`. Multi-role: access granted if ANY role matches.

### Route access groups
```
DASHBOARD("/")        → ALL_ROLES
ARTISTS("/artists")   → admin, manager, booking, label
EVENTS("/events")     → admin, manager, booking, social-media, night-management, staff, backoffice
DOOR("/door")         → admin, manager, night-management, awareness
STAFF("/staff")       → admin, manager, backoffice, staff
WORKFLOW("/workflow") → admin, manager, staff, booking, backoffice
GUEST_LISTS           → admin, manager, booking, social-media
VENUES                → admin, manager
INVENTORY             → admin, manager, tech, tech-lead, staff, booking, backoffice
RENTALS               → admin, manager, tech, tech-lead, booking
CONTACTS              → admin, manager, backoffice, booking
ADMIN("/admin")       → admin, backoffice
```

### Dashboard Quick Actions (ACCENT_COLORS)
| Role Group | Color | Example |
|-----------|-------|---------|
| Staff/Gastro | emerald | `bg-emerald-600/15 text-emerald-400` |
| Gastro | orange | |
| Awareness/Night-Mgmt | indigo | |
| Booking/Label | violet | |
| Social-Media | pink | |
| Backoffice | teal | |
| Admin | red | |

> Links in quick actions point to deep/filtered views, not top-level navbar pages.

---

## TIMESTAMPTZ Handling (Critical)

### Writing timestamps to Supabase
- ALWAYS include timezone offset: `"2026-05-02T22:30:00+02:00"` (not naive `"2026-05-02T22:30:00"`)
- Without offset, PostgreSQL stores as UTC → display offset for user

### Reading timestamps from Supabase
- Supabase returns TIMESTAMPTZ in UTC, may omit timezone suffix → `"2026-05-02T20:30:00"` (no Z)
- `new Date("2026-05-02T20:30:00")` = LOCAL time in Chrome, UTC in Safari (inconsistent!)
- ALWAYS use an `ensureUtc()` helper that appends `Z` when no timezone suffix present
- Do NOT use regex to extract hours/minutes from ISO strings — skips timezone conversion

### Consistency rule
All time-parsing functions (`parseTimeParts`, `getTimePosition`, `getTimeWidth`, `formatTime`, `snapTo15Minutes`) must use `ensureUtc()` + `new Date()`. Mixing approaches causes visual misalignment.

---

## Rider PDF Extraction

- **Local AI:** LM Studio on `localhost:1234` (gemma-4-vision model) — no cloud service
- **Endpoints:** `/api/artists/extract-rider` (PDF upload → JSON extraction), `/api/artists/generate-tasks` (extracted rider → tasks)
- **Rider data stored** in `artists.tech_rider` and `artists.hospitality_rider` as JSONB
- **Shared types:** `src/lib/riders/types.ts` — always import from here to prevent interface drift
- **Inventory linking:** Equipment in rider JSONB can reference `inventory_item_id`/`inventory_item_name`
- **Reverse lookup:** `GET /api/items/[id]/rider-assignments` — finds all artists referencing an item in their riders

---

## Known Issues & Gotchas

1. **Middleware location:** in `src/proxy.ts` instead of `src/middleware.ts` — non-standard
2. **RLS too permissive:** API routes use service role key (bypasses RLS); many tables have public RLS — tighten for production
3. **Dashboard API uses `user_id` query param** to work around RLS issues
4. **Task form sends `""` for UUID/date selects** ("Unassigned" / "No event") — API PUT handler normalizes to `null` via `|| null`, but root cause in form layer remains
5. **Old shift timestamps** (pre-2026-05-03) stored without timezone context — may display offset until re-saved
6. **Cloakroom (Phase 4):** schema exists, no UI
7. **Notifications:** schema exists, no implementation
8. **Inventory/Lightspeed integration:** not started
9. **`<p>` cannot contain `<div>`:** badges/cards rendered as `<div>` inside `<p>` cause hydration errors — use `<div>` wrapper
10. **Edit tool read-range constraint:** must read target bytes in same session before editing; use `sed` or `python3` for bulk changes

---

## Session Lessons

- **Radix PopoverTrigger blocks input keystrokes** when `<Input>` is wrapped with `<PopoverTrigger asChild>` inside controlled popover → use `PopoverAnchor` + outer wrapper, or plain `<div>` with mousedown click-outside
- **Shared types prevent drift:** extract shared interfaces into `src/lib/riders/types.ts` — import from there
- **Task edit form** must use `(fullTask || task).task_items` because list API (`GET /api/tasks`) does not include `task_items`
- **Single-task API** must include `parent_task` join (same as list API) for breadcrumb navigation to work

---

## E2E Test Commands
```bash
npx playwright test src/test/e2e/scanner.spec.ts
npx playwright test src/test/e2e/door-checkin.spec.ts
npx playwright test src/test/e2e/calendar.spec.ts
npx playwright test src/test/e2e/rider-extraction.spec.ts
npx playwright test src/test/e2e/rider-task.spec.ts
npx playwright test src/test/e2e/running-order.spec.ts
npx playwright test src/test/e2e/event-shift.spec.ts
npx playwright test src/test/e2e/homepage.spec.ts
```
