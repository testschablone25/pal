# UI & Styling Conventions

## Theme
- Background: `bg-zinc-950` (page), `bg-zinc-900` (cards/surfaces)
- Borders: `border-zinc-800`
- Accent: `violet-600` (primary buttons, active states, highlights)
- Text: `text-white` (headings), `text-zinc-300` (body), `text-zinc-400`/`text-zinc-500` (secondary)
- Error: `text-red-400`, `bg-red-950/50`
- Success: `text-green-400`, `bg-green-600`

## Components
- Use shadcn/ui primitives from `@/components/ui/`
- Use `cn()` from `@/lib/utils` for conditional class merging
- Use Lucide icons imported individually
- Loading states: `Skeleton` component or `Loader2` with `animate-spin`
- Cards: `bg-zinc-900 border-zinc-800` always

## Language
- Dashboard and user-facing navigation: German (Moin, Aufgaben, Schichtplan, Abmelden)
- Internal/admin pages and forms: English (Create, Save, Cancel, Status)
- Date formatting: `dd.MM.yyyy` with `date-fns` and `de` locale for dashboard
