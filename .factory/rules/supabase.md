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
