# Merge Plan: feature/task-management-inventory → master

## Executive Summary

**Branch:** `origin/feature/task-management-inventory`
**Target:** `master`
**Commits:** 24 commits
**Scope:** Task management enhancements, inventory/rentals system, venue CRUD, new UI components
**Conflicts:** 2 files (`src/app/page.tsx`, `src/proxy.ts`)

---

## 1. Database Migration Analysis

### Master Branch Migrations (6 files)
| File | Description |
|------|-------------|
| `20240324000000_initial_schema.sql` | Core schema (events, tasks, profiles, etc.) |
| `20240325000000_relax_rls_for_public.sql` | Public RLS policies |
| `20240325000001_add_tasks_rls_policy.sql` | Task RLS policies |
| `20240325000002_add_artist_riders.sql` | Artist riders table |
| `20240325000003_add_booker_role.sql` | Booker role enum |
| `20240326000000_add_booker_rls_policies.sql` | Booker RLS policies |
| `20260428000000_multi_role_system.sql` | **Multi-role system overhaul** |

### Feature Branch Migrations (6 files)
| File | Description |
|------|-------------|
| `20240324000000_initial_schema.sql` | Core schema (unchanged) |
| `20240325000000_relax_rls_for_public.sql` | Public RLS (unchanged) |
| `20240325000001_add_tasks_rls_policy.sql` | Task RLS (unchanged) |
| `20240325000002_add_artist_riders.sql` | Artist riders (unchanged) |
| `20240325000003_add_booker_role.sql` | Booker role (unchanged) |
| `20260427000000_tasks_enhancement_inventory.sql` | **NEW: Task + Inventory tables** |

### ⚠️ CRITICAL: Migration Divergence

**Master-only (NOT on branch):**
- `20240326000000_add_booker_rls_policies.sql` — Booker RLS policies for events/artists/performances/tasks
- `20260428000000_multi_role_system.sql` — Major overhaul: new roles enum (`booking`, `social-media`, `night-management`, `label`, `tech`, `tech-lead`, `gastro`, `backoffice`, `awareness`, `azubi`), drops/rewrites ALL RLS policies

**Branch-only (NOT on master):**
- `20260427000000_tasks_enhancement_inventory.sql` — Adds 5 new tables + task enhancements

### New Tables on Feature Branch

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `task_history` | Audit log for task changes | task_id, changed_by, from_status, to_status, change_type, reason |
| `items` | Inventory items | name, category (sound/lighting/dj/furniture/bar/misc), serial_number, brand, model, condition |
| `item_location_history` | Track item movements | item_id, location, action (check_in/out/transfer/rental_out/rental_return) |
| `rentals` | Equipment rental tracking | item_id, rented_to, rental_date, expected_return, actual_return, status |
| `task_items` | Junction: tasks ↔ items | task_id, item_id (composite PK) |

### Task Table Changes (ALTER TABLE)
- **New status values:** `todo`, `in_progress`, `pending_approval`, `done`, `cancelled` (replaces old: `needs_refining`, `review`)
- **New columns:** `created_by`, `due_date`, `scheduled_date`, `needs_approval`, `blocked`, `blocked_reason`
- **Modified:** `event_id` now nullable (tasks can exist without events)
- **Data migration:** `review` → `pending_approval`, backfill `created_by` from `assignee_id`

### RLS Policy Changes on Branch
- Task RLS: More permissive — anyone can create/view tasks; assignee, creator, or admin/manager can update
- New tables: All use permissive "anyone can..." policies (suitable for internal app)
- Task comments: Anyone can view, but insert requires `auth.uid() = author_id`

### ⚠️ Migration Execution Order After Merge

Since `20260427000000_tasks_enhancement_inventory.sql` (branch) is dated BEFORE `20260428000000_multi_role_system.sql` (master), the merged migration order should be:

```
1. 20240324000000_initial_schema.sql
2. 20240325000000_relax_rls_for_public.sql
3. 20240325000001_add_tasks_rls_policy.sql
4. 20240325000002_add_artist_riders.sql
5. 20240325000003_add_booker_role.sql
6. 20240326000000_add_booker_rls_policies.sql    ← from master
7. 20260427000000_tasks_enhancement_inventory.sql ← from branch
8. 20260428000000_multi_role_system.sql           ← from master (DROPS/REWRITES RLS)
```

### ⚠️ RLS Policy Conflict Risk

The branch migration (#7) creates RLS policies for tasks/task_comments. The master migration (#8) then **drops and recreates** many of those same policies. This creates a conflict:

- Branch: `Assignee can update tasks` (assignee, created_by, admin/manager)
- Master: `Assignee can update tasks` (assignee_id, admin/manager/backoffice)

**Resolution:** The master migration's RLS policies (#8) will overwrite the branch's (#7), which is correct since master has the more comprehensive multi-role system. The branch's `created_by` check will be lost — we should add it to master's policy post-merge.

---

## 2. Code Changes Summary

### New API Routes (12 endpoints)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/items` | GET, POST | List/create inventory items |
| `/api/items/[id]` | GET, PUT, DELETE | Single item CRUD |
| `/api/items/[id]/location-history` | GET | Item movement history |
| `/api/rentals` | GET, POST | List/create rentals |
| `/api/rentals/[id]` | GET, PUT, DELETE | Single rental CRUD |
| `/api/rentals/[id]/return` | POST | Process rental return |
| `/api/tasks/[id]/approve` | POST | Approve task |
| `/api/tasks/[id]/reject` | POST | Reject task |
| `/api/tasks/[id]/block` | POST | Block/unblock task |
| `/api/tasks/[id]/history` | GET | Task history |
| `/api/venues/[id]` | GET, PUT, DELETE | Single venue CRUD |

### Modified API Routes
| Route | Changes |
|-------|---------|
| `/api/tasks` | New fields, filters, item links |
| `/api/tasks/[id]` | Creator+items, edit logging, status workflow |
| `/api/tasks/[id]/status` | History logging |
| `/api/dashboard` | Stats for blocked/pending/rentals/due-this-week |
| `/api/artists/extract-rider` | Remove LM Studio refs, use OpenRouter |

### New Components (8)
| Component | Purpose |
|-----------|---------|
| `inventory-list.tsx` | Inventory items table with search/filter |
| `inventory-form.tsx` | Create/edit item form |
| `inventory-detail.tsx` | Item detail view with location history |
| `checkin-checkout-modal.tsx` | Check in/out items |
| `rentals-list.tsx` | Rentals table with tabs (active/returned/overdue) |
| `rental-form.tsx` | Create rental form |
| `task-history-timeline.tsx` | Task audit trail display |
| `task-card.tsx` (modified) | + blocked indicator, approval badge, due date badge |

### New Pages
| Page | Purpose |
|------|---------|
| `/inventory` | Inventory list |
| `/inventory/[id]` | Inventory detail |
| `/rentals` | Rentals management |

### Modified Pages
| Page | Changes |
|------|---------|
| `/page.tsx` (dashboard) | + stat widgets, inventory/rentals links, role badge logic |
| `/venues/page.tsx` | + edit/delete dialogs, VenueForm component |
| `/workflow/page.tsx` | New columns (pending_approval, cancelled), + filters |
| `/login/page.tsx` | Minor changes |

### Deleted Files (⚠️ Breaking)
| File | Impact |
|------|--------|
| `src/lib/permissions.ts` | Role-based route access system removed |
| `src/lib/permissions.test.ts` | Tests removed |
| `src/app/admin/page.tsx` | Admin role management UI removed |
| `src/app/api/admin/roles/route.ts` | Admin roles API removed |

### Modified Infrastructure
| File | Changes |
|------|---------|
| `src/proxy.ts` | Removed role-based access control; simplified to auth-only |
| `.env.example` | + LM_STUDIO_URL |
| `.env.vercel` | **NEW** — contains OIDC token (⚠️ should be gitignored) |
| `vercel.json` | **NEW** — Vercel deployment config |
| `scripts/update-passwords.ts` | **NEW** — dev utility |

---

## 3. Conflict Resolution Plan

### Conflict 1: `src/app/page.tsx`
**Cause:** Both branches modify dashboard — master adds multi-role support (`userRoles[]`), branch adds stat widgets (`blockedCount`, etc.)
**Resolution strategy:**
- Keep master's `userRoles` array approach (from multi-role system)
- Add branch's stat widget state variables
- Merge role badge logic (keep master's `getRoleBadges()` from permissions, but branch removed it)
- Since branch deletes `permissions.ts`, we need to inline the badge logic OR preserve permissions.ts from master

### Conflict 2: `src/proxy.ts`
**Cause:** Master keeps role-based access control via `canAccessRoute()`, branch removes it entirely
**Resolution strategy:**
- **Decision needed:** Keep role-based route guards (master) or remove them (branch)?
- Branch approach is simpler but less secure — any authenticated user can access any route
- Recommendation: Keep master's role-based approach but add `/inventory` and `/rentals` to PROTECTED_ROUTES

---

## 4. Merge Execution Steps

### Phase 1: Pre-Merge Preparation
1. ✅ Create this merge plan
2. Backup current master: `git branch backup/master-pre-merge`
3. Verify Supabase database state matches master migrations

### Phase 2: Merge Execution
```bash
# 1. Checkout master
git checkout master

# 2. Create merge branch for safety
git checkout -b merge/task-inventory-integration

# 3. Attempt merge
git merge origin/feature/task-management-inventory

# 4. Resolve conflicts in src/app/page.tsx and src/proxy.ts
```

### Phase 3: Conflict Resolution

#### src/proxy.ts — Use master's approach (role-based)
- Keep `canAccessRoute` import and logic from master
- Add `/inventory` and `/rentals` to `PROTECTED_ROUTES`
- Keep `PUBLIC_ROUTES` from branch

#### src/app/page.tsx — Hybrid approach
- Keep `userRoles: AppRole[]` from master (multi-role support)
- Add branch's stat widgets (blockedCount, pendingApprovalCount, etc.)
- Keep `getRoleBadges` and `canAccessRoute` from master's permissions system
- Preserve branch's stat fetching from dashboard API

### Phase 4: Reconcile Permissions System
Since branch deletes `permissions.ts` but master relies on it:
- **Keep** `src/lib/permissions.ts` from master
- **Keep** `src/lib/permissions.test.ts` from master
- Update `src/app/page.tsx` to use both systems

### Phase 5: Post-Merge RLS Fix
The branch migration creates task RLS policies that master's multi-role migration overwrites. After merge, verify:
- Task update policy includes `created_by` check (from branch intent)
- Admin/manager/backoffice roles can manage tasks (from master)

### Phase 6: Verification
```bash
npm run lint
npm run build
npm run test:unit
npm run knip
npm run jscpd
```

---

## 5. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| RLS policy conflicts between migrations | 🔴 High | Manually verify final RLS state after migration |
| Permissions.ts deletion breaks admin route guards | 🔴 High | Keep permissions.ts from master |
| .env.vercel with OIDC token committed | 🟡 Medium | Add to .gitignore, remove from tracking |
| Dashboard API regression | 🟡 Medium | Test dashboard loads with both userRoles and stats |
| Task status workflow change | 🟡 Medium | Verify existing tasks migrate `review` → `pending_approval` |
| Hardcoded service keys in branch dashboard API | 🟡 Medium | Use `supabaseConfig` from master instead |
| Duplicate `use client` directive in workflow page | 🟢 Low | Remove duplicate during conflict resolution |

---

## 6. Files Changed Summary

**Total:** 55 files changed, +6,942 lines, -1,782 lines

- **New files:** 25 (API routes, components, pages, tests, configs)
- **Modified files:** 22
- **Deleted files:** 4 (permissions.ts, permissions.test.ts, admin/page.tsx, admin API)
- **Migrations:** +1 new, 2 master-only need reconciliation

---

## 7. Recommended Post-Merge Actions

1. **Run database migrations** on Supabase in correct order
2. **Verify RLS policies** match expected access patterns
3. **Update `.gitignore`** to exclude `.env.vercel`
4. **Remove `.env.vercel`** from git tracking
5. **Fix hardcoded Supabase keys** in dashboard API route (use config import)
6. **Run full test suite** and fix any failures
7. **Test admin functionality** — if admin page is needed, recreate it with new role system
8. **Verify venues CRUD** works end-to-end
9. **Test inventory workflow** (create item → check out → check in → rental)
