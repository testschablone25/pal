# Supabase Conventions

## Client Usage
- Browser (client components): `createClient()` from `@/lib/supabase/browser`
- Server (RSC/API routes with auth): `createClient()` from `@/lib/supabase/server`
- Admin operations in API routes: direct `createClient(url, serviceKey)` from `@supabase/supabase-js`
- Middleware: `createMiddlewareClient()` from `@/lib/supabase/middleware`

## API Route Pattern
- Validate input with Zod
- Use service role client for admin operations bypassing RLS
- Return `NextResponse.json({ error: message }, { status })` on failure
- Destructure Supabase errors and check `if (error)` -- handle `PGRST116` for not found
- Use try/catch around entire handler

## Database
- Migrations in `supabase/migrations/` with timestamp prefix
- RLS enabled on all tables
- JSONB columns with GIN indexes for structured data (e.g., riders)
- `updated_at` triggers on mutable tables

## Security
- Never expose service role key to client
- Never log or return raw Supabase errors to users
- Always validate user session before mutations

## TIMESTAMPTZ Handling

The `shifts` table (and others) use `TIMESTAMPTZ` columns. This requires careful handling:

### Writing timestamps
- Always include the browser's timezone offset when sending timestamps to Supabase
- Example: `"2026-05-02T22:30:00+02:00"` (not `"2026-05-02T22:30:00"`)
- Without the offset, PostgreSQL interprets the naive string as UTC (or server timezone), causing a display offset for the user
- Use a helper like `getLocalTimezoneOffset()` to get the browser's `±HH:MM` suffix

### Reading timestamps
- Supabase/PostgREST returns TIMESTAMPTZ values in UTC, but may omit the timezone suffix (returning `"2026-05-02T20:30:00"` instead of `"2026-05-02T20:30:00+00:00"`)
- `new Date("2026-05-02T20:30:00")` (no suffix) is treated as LOCAL time in Chrome but as UTC in Safari — this is a cross-browser inconsistency
- Always use an `ensureUtc()` helper that appends `Z` when no timezone suffix is present, then use `new Date()` which correctly converts UTC to local time
- Do NOT use regex to extract hours/minutes from ISO strings — this skips timezone conversion and displays the wrong time

### Drag-and-drop time manipulation
- Use `new Date(ensureUtc(isoString))` for arithmetic, then `date.toISOString()` for output (always includes `Z`)
- The output `Z`-suffixed string will be correctly parsed by `ensureUtc()` + `new Date()` downstream

### Consistency rule
- All time-parsing functions (`parseTimeParts`, `getTimePosition`, `getTimeWidth`, `formatTime`, `snapTo15Minutes`) must use the same parsing approach (i.e. `ensureUtc()` + `new Date()`)
- If one function uses regex extraction and another uses `new Date()`, the position and text will disagree, causing visual misalignment
