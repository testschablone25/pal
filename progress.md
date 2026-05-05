# PAL Remediation — Progress

## ✅ Done (Session 1-6 + Current)

| Batch | Item                       | Status | Notes                                                                                    |
| ----- | -------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| P0.1  | Event edit page            | ✅     | `src/app/events/[id]/edit/page.tsx` created, thin wrapper around `EventForm mode="edit"` |
| P0.2  | Fix Share button           | ✅     | Copys URL to clipboard via `navigator.clipboard.writeText`                               |
| P0.3  | Event status management    | ✅     | Toolbar with Publish/Cancel/Complete buttons on event detail                             |
| P0.4  | Guest list + door links    | ✅     | Navigation buttons on event detail page                                                  |
| P1.1  | Wire pagination            | ✅     | Artist list + Inventory list wired with `PaginationControls`                             |
| P1.2  | Squash migration           | ✅     | `20260603000000_squash.sql` created, 12 old migrations archived                          |
| P2.1  | Staff shifts decomposition | ✅     | 2,217→946 lines (57%↓). 4 modules + 3 shared files extracted                             |
| P2.2  | Venues decomposition       | ✅     | 1,145→578 lines (49%↓). 3 modules extracted                                              |
| P1.3  | E2E tests                  | ✅     | 3 spec files, 26 tests covering door→checkin, event→shift, rider→task                    |
| P3.1  | Overdue rental alerts      | ✅     | Amber strip on dashboard when overdue rentals exist                                      |
| P3.2  | Dashboard clock-in         | ✅     | Clock-in/out button in dashboard hero for active shifts                                  |
| P3.3  | Artist→Event linking       | ✅     | Dialog on artist detail: select event → stage/time → create performance                  |
| P3.4  | Sub-location capacity      | ✅     | Capacity shown in sub-location pills + tooltip                                           |

## 🚧 In Progress

_None_

## ⏳ Remaining

| ID  | Item | Effort | Notes |
| --- | ---- | ------ | ----- |

| P4.1 | Language consistency | 4h | Decision needed (DE vs EN) |
| P4.2 | Integration tests | 2h | Guest list→check-in, item→QR→delivery |
| P5.1 | Role taxonomy | 3h | Depends on P2.1 |
