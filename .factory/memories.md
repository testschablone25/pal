# PAL Project Memories

## Architecture Decisions

- [2026-03-24] Chose Next.js 16 (App Router) + Supabase over alternatives for speed and German-region hosting
- [2026-03-24] Copied 48+ shadcn/ui components from octoevents-main reference project
- [2026-03-24] Three-client Supabase architecture: browser (anon key), server (SSR cookies), middleware (route guard)
- [2026-03-24] Service role key used in API routes for admin operations that bypass RLS
- [2026-03-25] Added `booker` role to app_role enum for flight/travel logistics handling
- [2026-03-25] Artist riders stored as JSONB columns (tech_rider, hospitality_rider) with GIN indexes
- [2026-03-25] LM Studio (local AI on port 1234) used for PDF rider extraction -- not a cloud service
- [2026-03-25] Rider extraction generates tasks automatically via /api/artists/generate-tasks
- [2026-03-27] Improved rider extraction to capture: stage monitors, power requirements, furniture (tables/dimensions, laptop stands), mixer USB connectivity requirements, FX pedals (correctly marked as artist brings optional), and image references
- [2026-04-30] Form redesign: sectioned layout with collapsible advanced fields, inline toggle pills for task types, color-coded priority indicators, auto-focus on primary field
- [2026-05-03] Shift timeline timezone fix: Supabase TIMESTAMPTZ returns UTC timestamps (may lack timezone suffix). All time-parsing functions must use `ensureUtc()` + `new Date()` to convert to local time. Sending timestamps to Supabase requires explicit timezone offset (e.g. `+02:00`) so PostgreSQL stores the correct UTC instant
- [2026-05-03] Dashboard: added 'Verfügbarkeit' quick-access button in shift plan card header, links to `/staff/availability?view=me`
- [2026-06-02] Venue Hub: venues page now shows expandable cards with tabbed detail (Overview, Tasks, Staff, Events, Inventory, Settings). Each venue card shows aggregated stats (open/urgent tasks, upcoming events, staff count, inventory count). Inline capacity editing on cards. Tasks can be linked directly to venue (venue_id) without requiring an event_id.
- [2026-06-03] Task PUT API: fields `assignee_id`, `event_id`, `due_date`, `scheduled_date`, `parent_task_id` normalized via `|| null` to prevent empty-string UUID/date constraint violations from the form (which sends `""` for "Unassigned" / "No event" select choices).
- [2026-06-03] Dashboard quick actions: replaced navbar-mirroring shortcuts with role-specific `QuickAction` entries using `hasRole()` from `@/lib/permissions`. Each role group gets 2–3 contextual shortcuts (e.g., tech sees Equipment/Rider, gastro sees Bar-Bestand, awareness sees Einlass/Gästelisten). Multi-role users see union of all their role shortcuts. Accent color per role group via `ACCENT_COLORS` map (emerald=staff, orange=gastro, indigo=awareness/night-mgmt, violet=booking, pink=social-media, teal=backoffice, red=admin).
- [2026-06-03] Task edit form: uses `(fullTask || task).task_items` instead of `task.task_items` because the list API (GET /api/tasks) doesn't include `task_items`. Using the list-API task would silently clear all linked items on save.

## Known Issues

- RLS was relaxed for public-facing tables (artists, venues, events, performances) to allow unauthenticated reads
- API routes use service role key directly (bypasses RLS) -- needs tightening for production
- The middleware is in src/proxy.ts instead of src/middleware.ts (non-standard location)
- Dashboard API fetches use user_id query param to work around RLS issues
- `date-fns` locale is `de` (German) throughout the dashboard
- Shift timestamps stored without timezone context: old shifts created before 2026-05-03 were sent as naive timestamps. Supabase TIMESTAMPTZ interpreted them as UTC (or server timezone), causing display offset. New shifts include explicit timezone offset, but old data may still display incorrectly until re-saved
- Task form sends empty strings `""` for UUID/date selects set to "Unassigned" / "No event" — API PUT handler now normalizes these to `null` via `|| null`, but the root cause (form sending `""` instead of `null`) remains in the form layer

## Implementation Status

- Phase 0 (Foundation): COMPLETE -- project skeleton, schema, TDD, auth
- Phase 1 (Guest List + Door): COMPLETE -- QR scanning, capacity tracking, check-in
- Phase 2 (Artist & Booking): MOSTLY COMPLETE -- CRUD, calendar, running order, riders, PDF extraction
- Phase 3 (Staff Planning): PARTIALLY COMPLETE -- API routes exist, availability calendar built, shifts API exists
- Phase 5 (Workflow/Kanban): COMPLETE -- drag-drop Kanban board with @dnd-kit, task CRUD, task detail dialogs, refined create/edit task form UX
- Phase 4 (Cloakroom): Schema exists, no UI implementation yet
- Notifications: Schema exists, no implementation yet
- Inventory/Lightspeed integration: Not started

## UI/UX Notes

- Dark theme: zinc-950 background, zinc-900 cards, violet-600 accent
- German language UI labels on dashboard (Moin, Aufgaben, Schichtplan, etc.)
- English labels on internal/workflow pages (Kanban column names, form labels)
- Navigation: sticky top nav bar with icon + text links
- Form dialogs max-w-xl (~576px) for focused single-column layouts; avoid 70vw which creates excessively wide forms
- Form sections use subtle dividers and uppercase tracking-wider headers with Lucide icons
- Advanced/optional fields behind Collapsible (radix-ui) to reduce cognitive load on initial open
- Task types rendered as inline toggle pills (rounded-full, toggleable) instead of selects for many-option fields
- Priority selects show color-coded dots (red=urgent, orange=high, blue=medium, grey=low) in trigger and dropdown
- Form buttons in sticky footer with border-t separator; error messages inline left, actions right

### Dashboard Glassmorphism

- Cards: `bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60` (primary), `/60` (secondary), `/50` (tertiary)
- Corner radius: `rounded-xl` (hero only), `rounded-lg` (cards), `rounded-md` (internal elements, icon pills, task rows)
- No gradients on stat cards — use solid backgrounds with colored left-border accent (`border-l-2 border-l-{color}-600/50`)
- No motion flourishes (`hover:-translate-y`, `hover:scale-*`) — keep transitions to color/border only
- Avatar: solid accent color (no gradient), subtle ring (`ring-1 ring-violet-900/40`), no glow shadows

### Role-Specific Quick Actions

- Dashboard footer quick bar uses `hasRole(userRoles, "role")` for conditional rendering
- Each entry: `<QuickAction href="..." icon={Icon} label="..." accent="color" />`
- Accent colors per role group: emerald (staff), orange (gastro), indigo (awareness/night-mgmt), violet (booking), pink (social-media), teal (backoffice), red (admin)
- `ACCENT_COLORS` map defined in-page: `"bg-{color}-600/15 text-{color}-400 group-hover:bg-{color}-600/20"`
- Links point to deep/filtered views, not top-level pages (e.g. `/workflow?needs_approval=true`, `/staff/availability?view=me`)

### API Error Handling

- Client fetch calls: read `response.json()` on non-OK responses to extract `errBody.error` for the toast message
- NEVER throw generic `"Failed to update task"` — always include the status code and API error field
- Pattern: `const errBody = await response.json().catch(() => ({})); throw new Error(errBody.error || \`Failed (${response.status})\`);`
