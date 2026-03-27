# pal

nightclub booking + guest management app built with next.js, react, typescript, and supabase.

```
   /\_/\
  ( o.o )   pal
   > ^ <
```

## what it does

- manage events, venues, artists, and performances
- manage staff, shifts, and availability
- run guest lists + door check-in flow
- track tasks in a workflow board
- extract artist rider PDFs and auto-create operational tasks

## stack

- next.js 16 (app router)
- react 19 + typescript
- supabase (db + auth)
- tailwind css + radix ui
- vitest + playwright

## install

1. install deps:
   ```bash
   npm install
   ```
2. create env file:
   ```bash
   cp .env.example .env.local
   # windows powershell:
   copy .env.example .env.local
   ```
3. set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
4. run dev server:
   ```bash
   npm run dev
   ```

## useful commands

```bash
npm run dev
npm run build
npm run lint
npm run test:unit
npm run test:e2e
npm run knip
npm run jscpd
```

## rider extraction + task creation

- upload rider PDF from an artist page
- technical + hospitality data is extracted and saved
- task generation runs automatically after upload
- if no event/performance is linked, tasks are created as unscheduled (`event_id = null`)

## if it doesn't work

1. check `.env.local` keys first (`NEXT_PUBLIC_SUPABASE_URL`, publishable key, service role key)
2. for better extraction quality, run LM Studio at `http://127.0.0.1:1234` (fallback extraction still works without it)
3. verify task output in `/workflow`
