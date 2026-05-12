# Progress

## Status
In Progress

## Tasks
- [x] T1 — Add visible 'Create New Artist' button in PerformanceForm
- [x] T2 — Fix performance time ordering when adding from artist page
- [x] T3 — Add items directly from task detail view (not just edit mode)

## Files Changed
- `src/components/performance-form.tsx` — Restructured artist search area with flex layout; added visible Plus button to open inline create form directly
- `src/app/api/performances/route.ts` — Replace naive max+1 order_index with time-ordered insertion (sort by start_time, find position, shift subsequent performances)
- `src/components/task-detail/task-detail-items.tsx` — Added `onAddItems` prop, "Add Item" button with Command popover for searching/selecting inventory items
- `src/components/task-detail/task-detail-view.tsx` — Added `onAddItems` prop, wired through to TaskDetailItems
- `src/components/task-detail-dialog.tsx` — Added `handleAddItems` handler that calls PUT /api/tasks/[id] with items payload, passes to view

## Notes
- T1 complete. The plus (+) button next to the artist search input makes 'Create New Artist' discoverable without having to type into the search dropdown first. Also closes the form if already open (toggle).
- T2 complete. Performance POST now inserts at correct time position instead of appending at end. A `PerfRow` type was added to replace `any` usage.
- T3 complete. "Add Item" button appears in task detail view header — opens a search popover to find and link inventory items without entering edit mode. Uses existing PUT /api/tasks/[id] endpoint.
