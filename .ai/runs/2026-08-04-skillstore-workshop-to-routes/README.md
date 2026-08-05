# 2026-08-04 技能商店/应用工坊 改为独立路由页面

## 需求

将 chat 应用侧边栏「技能商店」「应用工坊」从基于组件条件渲染（`showSkillStore` / `showWorkshop` 状态）改为独立路由页面，路由分别为 `/chat/workshop`、`/chat/skill`。

修复缺陷：选中技能商店/应用工坊后再切回对话页面不显示（对话内容区不渲染）。

## 根因

原实现里 `apps/chat/src/pages/chat/route.tsx` 用 `showSkillStore` / `showWorkshop` 两个本地 state 控制内容区渲染分支，当任一为 true 时 `<Outlet />` 完全不挂载。切回对话依赖 pathname 变化的副作用手动置回 false，但仅覆盖 `/chat/task` 分支，其他返回路径不复位，导致 Outlet 一直不渲染、对话页面空白。

## 改动

- 新增 `apps/chat/src/pages/chat/skill.tsx`：`/chat/skill` 路由，`component: SkillStoreView`。
- 新增 `apps/chat/src/pages/chat/workshop.tsx`：`/chat/workshop` 路由，`component: WorkshopView`。
- 修改 `apps/chat/src/pages/chat/route.tsx`：
  - 移除 `showSkillStore` / `showWorkshop` state 及 `prevPathnameRef` 自动关闭副作用。
  - `showSkillStore` / `showWorkshop` 改为由 `pathname` 派生（`startsWith('/chat/skill')` / `'/chat/workshop'`），仅用于页面标题、激活态高亮、加载态抑制。
  - `handleNavItemClick` 改为 `navigate({ to: '/chat/skill' | '/chat/workshop' })`。
  - 内容区恒定渲染 `<Fragment key={newChatNonce}><Outlet /></Fragment>`，技能商店/工坊作为子路由由 Outlet 承载。
  - 移除不再使用的 `SkillStoreView` / `WorkshopView` 导入、`handleBackFromSkillStore`、`useRef` 导入。
- `routeTree.gen.ts` 由 TanStack Router 插件自动重新生成（新增 `/chat/skill`、`/chat/workshop`）。

## 验证

- `npx vite`（dev）启动成功，无编译/转换报错；`routeTree.gen.ts` 已自动包含两条新路由类型。
- 代码级回归：`WorkbenchMenuList` 激活态、`pageTitle`、`routeLoading` 抑制均改为 pathname 派生，行为等价；新建对话（`CreateConversationButton` 内部 navigate 到 `/chat/task/new`）会自然离开技能/工坊路由，Outlet 正常渲染对话页面 —— 缺陷修复。

## 风险 / 说明

- SkillStoreView 的 `onBack` 为可选 prop 且组件内未使用，作为路由 component 直接挂载不受影响。
- 未改动两个视图组件内部逻辑与后端接口。

## 后续修复：从工坊/技能商店切回对话的加载闪烁

### 现象

从「应用工坊 / 技能商店」跳转对话时，先白屏加载，再出现 1-2s 的加载态才显示对话；而对话↔对话切换只有短暂的普通加载。

### 根因（与上面的空白 bug 无关，是独立的既有问题）

技能商店/工坊为独立路由，进入后 `ConversationAnalysis`（`/chat/task` 的组件）被卸载。切回对话是**冷挂载**：`appList`、模型列表、语义树、会话历史全部重新拉取（约 1-2s），期间 `curConv` 为空、内容区渲染为空 → 白屏/闪烁。对话↔对话切换时组件**不卸载**（同一路由仅参数变化），`appList`/模型/语义已在内存，只重载目标会话，故顺滑。

`route.tsx` 的 `ChatRouteLoading`（~420ms 白色磨砂遮罩）在两种路径下都会出现，属正常，非本次问题。

### 改动（Option A：模块级工作台缓存）

仅改 `apps/chat/src/components/conversation-analysis/index.tsx`：

- 新增模块级缓存 `workbenchCacheBySpace: Map<spaceId, WorkbenchCache>`，含 `getWorkbenchCache` / `patchWorkbenchCache`，保存 `appList` / `modelOptions` / `currentModel` / `embedModelId` / `modelLoaded` / `semanticTree` / `semanticLoaded`，跨卸载/重挂载保留。
- 组件冷挂载时用缓存**预解析初始值**：`curApp` / `appList` / `curConv`（按 `routeChatId` 优先命中目标会话）/ `modelOptions` / `currentModel` / `embedModelId` / `semanticTree` 及两个 `loadedRef` 均从缓存初始化。
- 各请求成功后写缓存：`getAppList`（`setAppList` 后）、模型 effect、语义 effect。
- 挂载 effect：命中缓存（或 `routeChatId==='new'`）时以 `{ silent: true }` 调 `getAppList`，只后台刷新列表、不触发加载态、不重置 `curConv`。

### 效果

曾进入过工作台后再切回对话，冷挂载直接命中缓存即时渲染，仅静默刷新，体验与对话↔对话一致；两条路径都只剩 `route.tsx` 的 ~420ms 白色遮罩。URL 保持独立路由不变。

### 验证

- `npx tsc --noEmit -p tsconfig.app.json`：本文件无报错（仅有一处与本次无关的既有语法错误 `autoChart/multi-measure-pie-chart.ts`，及 `loading` 未使用的既有告警）。

## .ai 长期文档

无需更新。
