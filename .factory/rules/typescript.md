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

## Hydration-Safe Patterns

- `disabled={!value}` where `value` is a string can cause hydration mismatches: `disabled={false}` renders as `disabled="false"` (an HTML attribute browsers treat as truthy), while React on the client removes the attribute entirely
- Use strict comparison instead: `disabled={value === ""}` always returns a consistent boolean on server and client
- Same applies to any boolean HTML attribute driven by a non-boolean value

## Timeline / Aligned Layout Patterns

When building a timeline with header (hour labels) and rows (shift bars):

- The header's left spacer must exactly match the row's left column width (e.g. both use `w-48`)
- Put filter/search UI in a separate row above the timeline header, not inline alongside the hour labels
- Use absolute positioning for hour labels with `left: ${(i / totalHours) * 100}%`
- Ensure all positioning functions (`getTimePosition`, `getTimeWidth`) use the same time-parsing logic so position, width, and label text are always in sync
