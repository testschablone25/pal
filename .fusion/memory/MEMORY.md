# Project Memory

<!-- Curated long-term memory. Store durable decisions, conventions, preferences, and pitfalls. -->

## Decisions

## Conventions

## Pitfalls

## Context

## Nav Bar Scrollable Wrapper

- Desktop nav items use `overflow-x-auto lg:overflow-x-visible` with `flex-nowrap` and `scrollbar-hide` for horizontal scroll on smaller screens
- `scrollbar-hide` utility defined in `src/app/globals.css` — hides scrollbar in WebKit and Firefox
- Gradient fade overlay (right edge) using `bg-gradient-to-l from-zinc-950/80 to-transparent pointer-events-none lg:hidden`
- Nav links use `whitespace-nowrap` to prevent text wrapping within items
- PAL logo and right-side controls use `flex-shrink-0` to stay fixed while nav items scroll
