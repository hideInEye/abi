# RUN LOG 2026-09-10 大屏设计器单击图表默认打开 AI 抽屉、单击空白收回

## 需求

`.ai/requirements/CURRENT_REQUIREMENT.md` 顶部「2026-09-10 追加：大屏设计器单击图表默认打开 AI 抽屉、单击空白收回」。
交互稿口径：单击图表 → 右侧抽屉打开且默认 AI 页签（头部展示图表名称）；单击空白处 → 收回抽屉。

## 修改文件

- `apps/dashboard/src/designer/right/RightStore.ts`
  - `activeConfig` 新增同组件防重挂载守卫：面板可见时重复激活同一 id+type 直接返回，保留当前页签。
  - 默认页签策略：`setNewActiveMenu` 时优先 `ai`（菜单含 AI 时）；无 AI 菜单保持旧回退（可见取首菜单、新开取 style）；分组/无 style 仍回退 base。
- `apps/dashboard/src/designer/operate-provider/movable/DesignerSelectable.tsx`
  - `onSelectEnd` 末尾新增点选（`!e.isDragStart`）分支：空选择 → `activeConfig(null, null)` 收回面板；单组件（shift 点选原样、否则 `findTopGroupLayer` 归顶分组后唯一）→ `activeConfig(id, type)` 打开面板。
- 新增 `apps/dashboard/src/designer/right/RightStore.test.ts`（7 用例，mock DesignerLoader.definitionMap）。
- `.ai/requirements/CURRENT_REQUIREMENT.md` 追加本轮需求节。

## 命令与结果

- 定向：`npx vitest run apps/dashboard/src/designer/right/RightStore.test.ts` → 7/7 通过。
- 全量：`npx vitest run`（根，无 coverage）→ 75 文件 660 用例，69 文件通过；本轮新增 `RightStore.test.ts` 7/7 通过。6 个失败文件均为既有基线：`abi/chat` 的 `auth.test.ts`、`auth-policy.test.ts`（09-09 鉴权迁移回滚后遗留）、`chat workshop assistantResources.test.ts`、`chat service/api/app.test.ts`（根运行缺 `@/constant/chat` 别名加载失败），与本轮 dashboard 改动无导入关系。
- 类型：`apps/dashboard` 下 `npx tsc --noEmit --skipLibCheck` → 10 个既有基线错误（ShareDesignerLoader/AbstractDesignerController/home/my-screen 的 dayjs 与 TS6133 等），改动文件零错误，对比基线无新增。
- `git diff --check` → 通过。

## 回归检查

- 双击激活（DesignerCanvas updateActive）：单击已打开面板后双击同组件命中 activeConfig 同组件守卫与 updateActive 的 same-id 早退，无重复重挂载。
- 图层列表激活（BaseLayer.activeComponentConfig）：自带 same-id 早退，默认页签随新策略（含 AI 菜单组件首次激活进 AI）。
- 撤销/删除路径（AddRollbackImpl、HistoryRecordOperateProxy 调 `activeConfig(null, "")`）：行为不变，仍收回面板。
- 拖拽移动/框选/缩放控制点：`isDragStart=true` 或 Selecto onDragStart 对 moveable 元素 stop，不触发开合。
- AiChatPanel 常驻 display 切换与模块级消息缓存不受影响；面板收回后重开命中历史缓存不重复拉接口。

## 风险与待办

- 手工走查仅两条核心动作：单击图表（抽屉打开且默认 AI、头部展示图表名称）、单击空白（抽屉收回）；拖拽/框选/控制点由 `isDragStart` 与 Selecto stop 代码级排除，双击/图层列表/同组件重挂载由 RightStore 单测覆盖，无需人工逐项走查。
- 全量 vitest 的 6 个失败文件归因为既有基线（鉴权回滚遗留 + 根运行别名缺失），不由本轮引入；如后续修复基线需另行记录。

## AI 系统更新判断

- 无需更新 `context/`、`prompts/`、`agents/`、`skills/`、`mcp/`、`checklists/`、`decisions/`：本轮为设计器局部交互调整，未改变架构与流程约定。
