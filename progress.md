# PAL Remediation — Progress

## ✅ Done (Session 1-6 + Current)

| Batch | Item | Status | Notes |
|---|---|---|---|
| P0.1 | Event edit page | ✅ | `src/app/events/[id]/edit/page.tsx` created, thin wrapper around `EventForm mode="edit"` |
| P0.2 | Fix Share button | ✅ | Copys URL to clipboard via `navigator.clipboard.writeText` |
| P0.3 | Event status management | ✅ | Toolbar with Publish/Cancel/Complete buttons on event detail |
| P0.4 | Guest list + door links | ✅ | Navigation buttons on event detail page |
| P1.1 | Wire pagination | ✅ | Artist list + Inventory list wired with `PaginationControls` |
| P1.2 | Squash migration | ✅ | `20260603000000_squash.sql` created, 12 old migrations archived |
| P2.1 | Staff shifts decomposition | ✅ | 2,217→946 lines (57%↓). 4 modules + 3 shared files extracted |

## 🚧 In Progress

_None_

## ⏳ Remaining

| ID | Item | Effort | Notes |
|---|---|---|---|
| P1.3 | E2E tests | 3h | Door/check-in, event→shift, rider→task |
| P2.2 | Venues decomposition | 2h | 1,145-line monolith |
| P3.1 | Overdue rental alerts | 1h | Dashboard overdue strip |
| P3.2 | Dashboard shift clock-in | 1h | Clock-in on dashboard hero |
| P3.3 | Artist→Event linking | 1h | Add to event from artist detail |
| P3.4 | Sub-location capacity UI | 30min | Show capacity in venue view |
| P4.1 | Language consistency | 4h | Decision needed (DE vs EN) |
| P4.2 | Integration tests | 2h | Guest list→check-in, item→QR→delivery |
| P5.1 | Role taxonomy | 3h | Depends on P2.1 |
