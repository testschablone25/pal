# TypeScript Conventions

## General
- Strict mode enabled -- never use `any`, use `unknown` with type guards instead
- Use `interface` for object shapes, `type` for unions/intersections/Zod inference
- Optional properties: `?` suffix; nullable: `string | null`
- Function return types optional when inference is clear
- Export types alongside their implementations

## React Components
- Functional components only with PascalCase names
- Props interfaces named `{ComponentName}Props`
- Mark client components with `'use client'` directive
- Server components (pages) have no directive
- Use `react-hook-form` + `zodResolver` for all forms
- Navigation: `useRouter()` from `next/navigation`

## Imports
- External packages first, then `@/` path-aliased imports, then relative imports
- Use `import type { ... }` for type-only imports
- Named exports preferred -- avoid default exports (except page components)
- Path alias: `@/*` maps to `./src/*`
- Lucide icons imported individually: `import { Search, Plus } from 'lucide-react'`

## Naming
- Files/dirs: kebab-case (`event-form.tsx`, `use-toast.ts`)
- Components: PascalCase (`export function EventForm(...)`)
- Hooks: camelCase with `use` prefix (`useToast`)
- Utilities: camelCase (`generateQRToken`, `cn`)
- Constants: UPPER_SNAKE_CASE (`PROTECTED_ROUTES`, `GENRES`)
- API route handlers: named exports matching HTTP methods (`GET`, `POST`, `PUT`, `DELETE`)

## Formatting
- 2-space indentation
- Double quotes for strings
- Semicolons always
- No Prettier -- rely on ESLint via `eslint-config-next`
