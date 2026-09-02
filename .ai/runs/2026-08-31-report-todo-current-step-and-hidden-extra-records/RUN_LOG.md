# Report Todo current step and hidden extra records

## Scope

- Correct the collapsed Todo activity summary to show the active Todo and the latest child-step title.
- Remove the presentation-only sections for pre-replan and unassigned execution records.

## Changes

- The collapsed summary now resolves the child-step name in `title -> actionIntention -> action` order.
- A running child step remains preferred; when it has just completed and the next `plan.update` has not arrived, the latest visible child step remains in the summary.
- Removed the `matchedGroupKeys` and `unassignedSteps` presentation derivations and both extra rendering sections from `ReportTodoList`.
- Removed the unused `historyGroupTitle` style. Stream aggregation and history ownership data remain unchanged.

## Validation

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode/helpers.test.ts apps/chat/src/components/conversation/report-mode/ReportTodoList.test.tsx`
  - Passed: 2 files, 28 tests.
- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
  - Passed: 10 files, 84 tests.
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - Passed.
- `pnpm --filter ai-bot build`
  - Passed.
  - Existing route-file, Ant Design directive, mixed-import, and chunk-size warnings remain.
- `git diff --check`
  - Passed.

## Regression check

- Expanded Todo details still render steps belonging to the displayed task.
- Collapsing the Todo panel hides detail rows and shows the active Todo plus child-step title.
- Report artifact detection, stream reduction, history adaptation, and task ownership were not changed.

## AI system update assessment

- No updates are needed for `.ai/prompts/`, `.ai/agents/`, `.ai/skills/`, `.ai/mcp/`, `.ai/context/`, `.ai/checklists/`, or `.ai/decisions/`.
