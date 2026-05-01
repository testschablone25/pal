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

## Known Issues

- RLS was relaxed for public-facing tables (artists, venues, events, performances) to allow unauthenticated reads
- API routes use service role key directly (bypasses RLS) -- needs tightening for production
- The middleware is in src/proxy.ts instead of src/middleware.ts (non-standard location)
- Dashboard API fetches use user_id query param to work around RLS issues
- `date-fns` locale is `de` (German) throughout the dashboard

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
