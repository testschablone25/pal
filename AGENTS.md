# AGENTS.md

## Project Overview

**PAL** — a Nightclub Booking and Guest Management System built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, and Supabase.

---

## Build / Lint / Test Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Start production | `npm run start` |
| Lint (ESLint) | `npm run lint` |
| **Run all unit/integration tests** | `npm run test:unit` |
| **Run a single unit test file** | `npx vitest run src/lib/qr.test.ts` |
| **Run tests matching a pattern** | `npx vitest run --grep "pattern"` |
| Run unit tests in watch mode | `npx vitest` |
| **Run all e2e tests** | `npm run test:e2e` |
| **Run a single e2e spec** | `npx playwright test src/test/e2e/homepage.spec.ts` |
| Run e2e in headed mode | `npx playwright test --headed` |
| Run all tests (unit + e2e) | `npm test` |

Always run `npm run lint` and the relevant test suite after making changes.

---

## Code Style

### Imports
- External packages first, then `@/` path-aliased imports, then relative imports
- Use `import type { ... }` for type-only imports
- Named exports preferred — avoid default exports
- Path alias: `@/*` maps to `./src/*`
- Lucide icons imported individually: `import { Search, Plus } from 'lucide-react'`

### Formatting
- 2-space indentation
- Double quotes for strings
- Semicolons always
- No Prettier is installed — rely on ESLint via `eslint-config-next`

### TypeScript
- Strict mode enabled — do not use `any`
- Use `interface` for object shapes, `type` for unions/intersections/Zod inference
- Optional properties: `?` suffix; nullable: `string | null`
- Function return types optional when inference is clear

### Naming Conventions
- **Files/dirs:** kebab-case (`event-form.tsx`, `use-toast.ts`)
- **Components:** PascalCase (`export function EventForm(...)`)
- **Hooks:** camelCase with `use` prefix (`useToast`)
- **Utilities:** camelCase (`generateQRToken`, `cn`)
- **Constants:** UPPER_SNAKE_CASE (`PROTECTED_ROUTES`, `GENRES`)
- **Variables/functions:** camelCase
- **API route handlers:** named exports matching HTTP methods (`GET`, `POST`, `PUT`, `DELETE`)

### Components
- Mark client components with `'use client'` at the top of the file
- Server components (pages) have no directive — default in App Router
- Define props via interfaces (e.g., `EventFormProps`)
- Use react-hook-form + zodResolver for all forms
- Navigation: `useRouter()` from `next/navigation`

### Error Handling
- **API routes:** try/catch the entire handler; return `NextResponse.json({ error: message }, { status })` on failure (400 validation, 404 not found, 500 server)
- **Client components:** try/catch with `setError(err instanceof Error ? err.message : 'An error occurred')`
- **Supabase errors:** destructure and check `if (error)` — handle specific codes like `PGRST116`
- Use `console.error` for logging; never throw raw errors to the user
- Always use `finally` to clean up loading states

### Utility Function: `cn()`
Use `cn()` from `@/lib/utils` (clsx + tailwind-merge) for conditional/tailwind class merging:
```ts
import { cn } from '@/lib/utils'
className={cn("base-class", condition && "extra", className)}
```

### API Routes
All routes live under `src/app/api/`. Structure:
- Validate input with Zod
- Query Supabase client (server-side) from `@/lib/supabase/server`
- Return typed JSON responses
- Handle errors with appropriate HTTP status codes

---

## Testing
- Unit/integration tests: Vitest (jsdom), files in `src/**/*.test.ts` and `src/test/integration/`
- E2E tests: Playwright across Chromium/Firefox/WebKit, files in `src/test/e2e/`
- Test setup file: `src/test/setup.ts`

---

## Project Structure
```
src/
  app/          # Pages (App Router) and API routes
  components/   # Feature components + ui/ (shadcn/ui primitives)
  hooks/        # Custom React hooks
  lib/          # Utilities, Supabase clients, domain logic
  test/         # Test files (unit, integration, e2e)
  middleware.ts # Auth route guards
```
