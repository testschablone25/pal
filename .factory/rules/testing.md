# Testing Conventions

## Framework & Tools
- Unit/integration tests: Vitest (jsdom environment)
- E2E tests: Playwright (Chromium, Firefox, WebKit)
- Test setup file: `src/test/setup.ts`

## File Organization
- Unit tests: `src/test/unit/` or co-located as `*.test.ts`
- Integration tests: `src/test/integration/`
- E2E tests: `src/test/e2e/` as `*.spec.ts`
- Lib-level unit tests co-located: `src/lib/qr.test.ts`

## Commands
- Run all unit/integration: `npm run test:unit`
- Run single test: `npx vitest run src/lib/qr.test.ts`
- Run E2E: `npm run test:e2e`
- Run single E2E: `npx playwright test src/test/e2e/homepage.spec.ts`

## Test Structure
- Use descriptive test names: "should [action] when [condition]"
- One assertion per test when possible
- Use `beforeEach` for common setup
- Mock external services (Supabase, fetch), not internal modules

## API Route Testing
- Mock Supabase client responses
- Test success cases and error cases (400, 404, 500)
- Validate response shapes match expected types
