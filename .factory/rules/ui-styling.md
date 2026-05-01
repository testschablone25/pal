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

## Form Design Patterns

### Dialog Sizing

- Form dialogs: `max-w-xl` (~576px) — comfortable width for single-column forms with 2-3 column grids
- Avoid `max-w-[70vw]` — creates excessively wide dialogs that feel empty
- Detail dialogs: `max-w-2xl` (~672px) — more space for metadata and nested content

### Sectioned Layout

- Group fields into logical sections with clear visual separation
- Each section gets a `<Separator />` (bg-zinc-800) and a `<SectionHeader>` with:
  - A Lucide icon (h-4 w-4, text-zinc-500)
  - Uppercase title with `tracking-wider` and `text-zinc-300`
- Sections order: Basic Info → Assignment → Schedule → Advanced

### Progressive Disclosure

- Advanced/optional fields live in a `<Collapsible>` from `@/components/ui/collapsible`
- Starts collapsed unless pre-populated data exists
- Trigger shows a chevron (ChevronDown/ChevronRight) and a flex-grow separator line
- Auto-open via `setAdvancedOpen(true)` when task has parent_task_id, items, or task_type

### Inline Toggle Pills

- Use for multi-option fields with 5+ choices (e.g., task types)
- Rendered as `rounded-full` buttons with `text-xs font-medium border`
- Selected state: `bg-violet-600/20 text-violet-400 border-violet-600/50`
- Unselected state: `bg-zinc-800/50 text-zinc-400 border-zinc-700`
- Include a "clear" / "Any" pill to reset selection to null
- Clicking an already-selected pill deselects it (toggle behavior)

### Priority Color Coding

- Priority selects show colored indicator dots in both trigger and dropdown:
  - low: `bg-zinc-500` (grey)
  - medium: `bg-blue-500` (blue)
  - high: `bg-orange-500` (orange)
  - urgent: `bg-red-500` (red)
- Dot: `w-2 h-2 rounded-full shrink-0`
- Render via custom `<SelectValue>` children to show selected dot in trigger

### Form Footer

- Separated from content by `border-t border-zinc-800` with `pt-6 mt-2`
- Error messages aligned left, action buttons (Cancel + Submit) aligned right with `ml-auto`
- Submit button: `bg-violet-600 hover:bg-violet-700 min-w-[120px]`
- Cancel button: `variant="outline" border-zinc-800 text-zinc-400 hover:text-zinc-200`

### Auto-Focus

- Primary text input (e.g., Title) gets `autoFocus` to allow immediate typing
- Only on create mode; edit mode should not shift focus
