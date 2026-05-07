# WP-7: TASKS_UPDATE Permission — Complete ✅

## Changes Made

### src/lib/permissions.ts

Added `TASKS_UPDATE` permission entry after `TASKS_WRITE`:

```ts
TASKS_UPDATE: ["admin", "manager", "staff", "booking", "backoffice"],
```

This grants status-update, comment, and block/unblock access to staff and booking roles, while keeping create/delete/approve/reject behind `TASKS_WRITE` (admin/manager/backoffice only).

### src/app/api/tasks/[id]/comments/route.ts

- POST handler: `TASKS_WRITE` → `TASKS_UPDATE`
- GET handler: unchanged (`TASKS_READ`)

### src/app/api/tasks/[id]/status/route.ts

- PUT handler: `TASKS_WRITE` → `TASKS_UPDATE`

### src/app/api/tasks/[id]/block/route.ts

- POST handler: `TASKS_WRITE` → `TASKS_UPDATE`

## Not Changed (Correctly)

- `approve/route.ts`: stays `TASKS_WRITE` (admin/manager/backoffice only)
- `reject/route.ts`: stays `TASKS_WRITE`
- `tasks/route.ts` POST/DELETE: stay `TASKS_WRITE`
- `tasks/[id]/route.ts` PUT/DELETE: stay `TASKS_WRITE`
- `deliver-item/route.ts`: stays `TASKS_WRITE`

## Validation

- `npm run lint`: No new errors in changed files
- `npm run test:unit`: 122 passed, `permissions.test.ts` (26 tests) all pass
- 2 pre-existing failures (rider-extraction integration tests — require real API auth)
