# 2026-08-27 探索模式待办事项按 todo_id 稳定排序（keyed diff）

## 需求

探索模式左侧「待办事项」列表展示顺序与完成顺序相反，且执行过程中顺序来回跳动。
原因：`plan.update` 事件直接用后端下发的 `tasks` 数组整组替换，后端下发顺序不稳定（倒序/乱序）。
要求：按 `todo_id` 排序，并按 `todo_id` 做 keyed diff——已知 id 保持首次出现顺序、仅更新字段，
新到达的 `todo_id` 追加到列表；顺序不再随后端下发顺序变化。
（右侧工作室出现重复结果属后端数据问题，后端排查中，前端不处理。）

## 修改

- `apps/chat/src/components/conversation/exploration-mode/exploreStreamReducer.ts`
  - 新增导出 `mergeExploreTasks`：按 `todo_id` 做 keyed diff，顺序以首次到达的 `plan.update` 为准——
    已知 id 保持首次出现顺序、仅更新字段，新 id 按到达顺序追加；
    后端未下发 `todo_id` 时退回整组替换，避免丢失任务。
  - `plan.update` 分支由整组替换改为 `mergeExploreTasks(item.tasks, event.tasks)`。
  - 纠正：实际 `todo_id` 为随机哈希（如 `todo-fec68b39`），无数值顺序；
    初版按哈希数字部分排序反而把后端正确顺序排反，已移除排序逻辑。
- `apps/chat/src/components/conversation/exploration-mode/historyAdapter.ts`
  - 历史恢复按 `todo_id` 在 `steps` 中首次出现的执行顺序定序（`orderTasksByStepAppearance`），
    未在 steps 中出现的任务保持 `task_plan` 原相对顺序置后；steps 无 `todo_id` 时用 `task_plan` 原序。
- `apps/abi/.../assistant-config/modules/exploration-mode/exploreStreamReducer.ts`
  - 同步以上 reducer 修改（abi 调试页与 chat 共用同一套探索模式逻辑）。
- 测试
  - `apps/abi/.../exploration-mode/exploreStreamReducer.test.ts` 与 chat 同名新增文件：
    使用真实哈希 id 的 plan.update 用例（首次到达顺序保持、乱序更新不重排、新 id 追加、无 id 回退整组替换）。
  - 新增 `apps/chat/.../exploration-mode/historyAdapter.test.ts`：历史按 steps 出现顺序定序 + 无 todo_id 回退原序。

## 验证

- `pnpm exec vitest run`：234 个用例全部通过（41 个套件中 `apps/chat/src/service/api/app.test.ts`
  因根目录 vitest 未配置 chat `@` 别名加载失败，属既有环境问题，与本次修改无关）。
- `apps/abi` 与 `apps/chat` 的 `tsc --noEmit` 均无 exploration-mode 相关错误
  （abi 既有错误集中在 `packages/*` 缺 react 类型声明，与本次无关）。

## 风险

- 实时顺序以首次到达的 `plan.update` 为准；若后端首次下发本身乱序，前端按其原序展示
  （现有实时数据首包顺序正确，乱序只发生在后续更新，keyed diff 已隔离）。
- 历史顺序依赖 steps 执行顺序；未被任何 step 引用的任务置后并保持 `task_plan` 相对顺序。

## 长期文档

- 无需更新 `.ai/context/`、`.ai/prompts/`、`.ai/decisions/`。
- 已沉淀记忆：探索模式 `todo_id` 为随机哈希、无数值顺序，禁止按 id 值排序，
  实时用首次到达 keyed diff、历史用 steps 出现顺序定序。
