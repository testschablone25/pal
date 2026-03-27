---
name: validation-gate-runner
description: Run lint/build/tests/validators, classify blockers as new vs pre-existing vs environment, and return a safe-to-commit verdict.
---

# Validation Gate Runner

## Use this skill when
- The user asks for validation before commit, merge, release, or push.
- The user wants to know whether failures are newly introduced or already pre-existing.
- The user asks for a concise go/no-go validation summary.

## Required behavior
1. Discover validation commands from nearest `AGENTS.md` and `package.json` scripts.
2. Build the run list in this order:
   - lint
   - build
   - unit tests
   - extra validators if available (for example `knip`, `jscpd`)
3. Run commands with shell-safe syntax (Windows PowerShell compatible):
   - do not rely on unix-only helpers like `head` or `tail`
   - avoid brittle command chaining patterns that break in PowerShell
4. Determine changed files (`git diff --name-only`) unless the user provides a file list.
5. If full-repo lint/validator output appears outside touched files, run targeted checks on changed files when possible.
6. Classify each command result using this rubric:
   - `pass`: command succeeds
   - `new_blocker`: failure affects changed files
   - `pre_existing`: failure is outside changed files
   - `env_blocker`: tooling/shell/environment issue prevents reliable validation
7. Never hide failures. If something is skipped, report it as skipped with reason.

## Classification rules
- Treat mixed failures (changed + unchanged files) as `new_blocker`.
- Treat missing commands/packages/shell incompatibility as `env_blocker`.
- Pre-existing failures are non-blocking only if changed files pass targeted checks.
- If targeted checks are impossible, keep the result conservative and do not mark safe.

## Output contract
Return:
1. A short summary sentence.
2. A table with one row per command:
   - `command`
   - `status` (`pass`/`fail`/`skipped`)
   - `blocker_type` (`pass`/`new_blocker`/`pre_existing`/`env_blocker`)
   - `impacted_files`
   - `evidence` (1-3 key lines)
3. Final verdict object:

```json
{
  "safe_to_commit": false,
  "blocking_reasons": ["new_blocker", "env_blocker"]
}
```

## Guardrails
- Do not push, deploy, or mutate remote state.
- Do not downgrade or silence errors to force a pass.
- Keep output concise and actionable.
