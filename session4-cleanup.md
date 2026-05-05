# Session 4 — Cleanup Report

## D2: Flatten Migrations ✅

### Archived dead migrations → `supabase/migrations/archived/`
- `20240325000003_add_booker_role.sql` — overwritten by multi-role migration
- `20240326000000_add_booker_rls_policies.sql` — all policies dropped by `20260428000000`
- `20260430000000_remote_migration.sql` — empty placeholder

### Moved seed data out of migration
- `supabase/migrations/20260429000000_venue_sublocations_and_inventory_align.sql` — Seed INSERT blocks replaced with comment pointing to seed script
- `scripts/seed-pal-data.ts` — **New** — TypeScript seed script with all venues, sub-locations, and 47 inventory items

## D4: Dead Schema — cloakroom_items + notifications ✅

- `supabase/migrations/20260505000000_remove_dead_tables.sql` — **New migration**
  - `DROP TABLE IF EXISTS cloakroom_items CASCADE;`
  - `DROP TABLE IF EXISTS notifications CASCADE;`
  - Comment noting these can be re-added if needed

## O3: Prune Unused shadcn/ui Components ✅

### Verified with grep: 18 components had zero imports in `src/`
Removed:
- `resizable.tsx`, `menubar.tsx`, `context-menu.tsx`, `carousel.tsx`
- `input-otp.tsx`, `navigation-menu.tsx`, `hover-card.tsx`, `aspect-ratio.tsx`
- `slider.tsx`, `toggle-group.tsx`, `alert.tsx`, `breadcrumb.tsx`
- `collapsible.tsx`, `drawer.tsx`, `pagination.tsx`, `radio-group.tsx`
- `sidebar.tsx`, `sonner.tsx`

## U4: Add package.json Scripts ✅

Added to `package.json`:
```json
"seed:pal-data": "npx tsx scripts/seed-pal-data.ts",
"seed:test-users": "npx tsx scripts/create-test-users.ts",
"seed:staff": "npx tsx scripts/create-staff-accounts.ts",
```

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Zero new errors (all pre-existing test file issues) |
| `npm run lint` | Zero new lint issues |
| `npm run knip` | No new unused code detected |
