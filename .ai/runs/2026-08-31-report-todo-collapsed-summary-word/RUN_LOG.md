# Report Todo collapsed summary and WORD label

## Scope

- Correct the collapsed Todo activity summary so the active Todo and its current public child step have distinct meanings.
- Standardize the Word report format label as `WORD` without changing download data or file extensions.

## Changes

- `getCollapsedTodoExecutionSummary` now uses the current `in_progress` Todo `content` for the executing task label.
- The invocation label only uses the current Todo's `in_progress` public step, in `actionIntention -> title -> action` order.
- Completed steps and output chunks no longer supply or infer an invocation name. When no public running step exists, the summary only shows the active Todo.
- Invocation labels that already contain `skill` or `技能` are left unchanged; other labels receive the `技能` suffix.
- Report format display labels use `WORD`; the internal `word` format and `.docx` file name remain unchanged.

## Validation

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode/helpers.test.ts apps/chat/src/components/conversation/report-mode/ReportTodoList.test.tsx`
  - Passed: 2 files, 27 tests.
- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
  - Passed: 10 files, 83 tests.
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - Passed.
- `pnpm --filter ai-bot build`
  - Passed.
  - Existing warnings remain for non-route files under route directories, Ant Design `use client` directives, mixed static/dynamic imports, and the large output chunk.
- `git diff --check`
  - Passed.

## Regression check

- The expanded Todo panel still hides the collapsed activity summary.
- Report download option values, URLs, and `.docx` file names are unchanged.
- No Stream reducer, history adapter, Todo ownership, or report completion logic changed.

## AI system update assessment

- No updates are needed for `.ai/prompts/`, `.ai/agents/`, `.ai/skills/`, `.ai/mcp/`, `.ai/context/`, `.ai/checklists/`, or `.ai/decisions/` because this is a localized presentation rule already captured in `CURRENT_REQUIREMENT.md`.
