# 探索模式待办「幽灵任务」修复

- 日期：2026-09-15
- 范围：apps/abi 助手编辑抽屉 · 探索模式流式 reducer（`mergeExploreTasks`）

## 现象

截图显示「待办事项 4/5」，其中一条「编写SQL查询不同收获方式和省份的订单量和金额」永远停留在
「等待执行」，且列表末尾又出现一条几乎同名、已完成的待办。用户质疑「有一个没执行，是数据还是前端问题」。

## 根因（前端问题，非数据问题）

对 `pasted-text.txt` 原始 SSE 流分析，5 个 `plan.update` 均为**完整计划快照**：

- v1：`todo-2cb46124` =「编写SQL查询…」pending
- v2：该 todo 消失，后端重新规划为**新 id** `todo-9e1ef822` =「编写SQL查询…（使用 t_logistics.carrier 作为收获方式）」
- `todo-2cb46124` 此后再未出现，且从未关联任何 step

原 `mergeExploreTasks` 做 keyed 合并时，**保留了 incoming 快照中已不存在的 prev 任务**，导致被替换的
`todo-2cb46124` 残留成永远 pending 的幽灵任务，新任务被追加到末尾 → 列表 5 条、计数 4/5。

后端行为合法（LLM 细化计划、重发新 todo_id）；前端应把每次快照视为权威、丢弃其中已不存在的旧待办。

## 改动

- `exploration-mode/exploreStreamReducer.ts` · `mergeExploreTasks`：
  1) 遍历 prev 时**跳过（丢弃）不在 incoming 快照中的任务**，消除幽灵 pending；
  2) 新增 todo_id **按其在快照中的相邻锚点原位插入**（被重新规划替换出的新任务落在被替换任务的位置），
     找不到锚点时插到队首/末尾——不再无脑追加末尾。
- `exploration-mode/exploreStreamReducer.test.ts`：新增回归用例
  “drops a stale todo replaced by a re-planned todo_id and keeps the new one in place”（含尾部稳定任务，验证原位而非末尾）。

## 验证

- `npx vitest run exploreStreamReducer.test.ts`：12 passed（含新增用例），无回归。
- 既有用例（首帧顺序、乱序稳定、追加新 id、无 todo_id 整组替换）全部通过。

## 影响与边界

- 被重新规划替换的待办（新 id）依据 incoming 快照中的相邻锚点**原位插入**（回到被替换任务的位置），
  不再追加到列表末尾。
- 纯乱序更新（同一组 id 重新排序、无增删）仍保持既有 prev 顺序稳定、只改状态，不受影响。
- 该修复不改变自动展开/收起逻辑。

---

## 追加：待办不自动展开/收起修复

### 现象
实时运行时正在执行的待办不会自动展开展示步骤，完成后也不会自动收起。

### 根因（判断条件错误，非数据问题）
对 `pasted-text.txt` 核实：20 个 step 的 `todo_id` 与各任务一一匹配（f4c728f9=9 、9e1ef822=6、4859d4ed=4、
33f22e5b=1，幽灵 2cb46124=0），todo 关联无误。问题在 `getTodoRowView` 的自动展开条件以
`steps.some(status === 'running')`（步骤级）为主触发：步骤间 LLM 思考间隙无 running 步骤→ in_progress
待办折叠（闪烁）；完成后所有步骤为 done→永不再开。与用户自己确认的「自动开合以待办级为粒度」矛盾。

### 数据依据
各待办恰好在一个 plan 版本内为 in_progress（f4c728f9@v1、9e1ef822@v2、4859d4ed@v3、33f22e5b@v4），随后转 completed。
故以 `task.status === 'in_progress'` 为触发可得到「运行中持续展开 / 完成即收起」，无闪烁。

### 改动
`ExploreMessageRow.tsx` · `getTodoRowView`：自动展开条件改为
`isSelected || task.status === 'in_progress' || steps.some(running)`（后者仅作步骤先于 plan.update 到达的兼容兵底）。
收起仍由 `collectFinishedTodoIds` 在 in_progress→终态时清除手动覆盖态。

### 验证
`tsc --noEmit`：ExploreMessageRow 零新增错误（仅存量基线）。reducer 单测 12 passed 不受影响。

---

## 追加：工作室底部空白一大截修复

### 现象
全屏「工作室」预览中，内容（表格/最终结论）下方出现一大截空白。

### 根因（CSS 高度链断裂）
`ExplorePreviewPane` 的 `.pane` 挂在 `CommonDrawer` 的 body（`height:100%` 的**块级容器，非 flex**）内。
`.pane` 依赖 `flex:1`（块级父下失效）且未设 `height`，白卡片收缩到内容高；`.paneBody` 又有
`max-height: calc(100vh - 280px)` 封顶，进一步阻止其填满。两者叠加→面板提前结束，抽屉底部露出空白。

### 改动（`styles.module.css`，`.pane` 仅此处使用，安全）
- `.pane` 增加 `height: 100%`，填满抽屉 body。
- `.paneBody` 移除 `max-height: calc(100vh - 280px)`，由 `flex:1 + min-height:0 + overflow:auto` 内部滚动。

### 验证
纯 CSS 改动，无 TS 影响；`.pane`/`.paneBody` 仅 ExplorePreviewPane 使用，无其他布局回归风险。
