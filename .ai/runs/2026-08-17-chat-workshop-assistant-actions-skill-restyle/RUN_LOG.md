# 2026-08-17 chat 应用工坊「我的助手」加查看/取消发布 + 技能商店卡片改助手样式

## 基本信息

- 日期：2026-08-17
- 任务名称：chat-workshop-assistant-actions-skill-restyle
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Qoder
- 涉及 agent：Developer、Test、Regression、Review、Knowledge（角色化阶段）
- 任务类型：功能新增 + 样式对齐（不改后端接口）

## 需求摘要

1. chat「应用工坊 → 我的助手」tab 的助手卡片，新增两个底部操作按钮：
   - 「查看」：打开只读详情抽屉（此前 AskUserQuestion 已选定「只读详情抽屉」方案）。
   - 「取消发布」：将助手下线（仅对已上线 `status='1'` 的助手显示）。
2. chat「技能商店」卡片样式改为与「我的助手」一致的 `.ws-assistant-card` 玻璃拟态风格，但技能原有功能（查看详情、启用/停用、添加/移除、广场/我的技能 tab、搜索、时间筛选）全部保留。

## 影响范围

- `apps/chat/src/pages/chat/workshop/`（我的助手卡片 + 新建详情抽屉）
- `apps/chat/src/pages/chat/skill/index.tsx`（技能卡片重排为助手样式）
- `apps/chat/src/index.css`（卡片底部操作按钮 + 抽屉样式；删除 skill 页遗留死代码）
- 不涉及 `apps/abi`、`apps/dashboard`、`packages/*`；不新增/修改任何后端接口。

## 修改文件

- 新增 `apps/chat/src/pages/chat/workshop/AssistantDetailDrawer.tsx`（145 行）
  - 只读详情抽屉：打开瞬间用卡片兜底数据渲染，`fetchAssistantDetail` 返回后覆盖；展示图标/名称/状态徽标/应用类型/描述/提示词/开场白/创建&更新时间。
- 修改 `apps/chat/src/pages/chat/workshop/index.tsx`（约 +59 -2）
  - 新增 imports：`updateAssistant`、`AssistantDetailDrawer`、`EyeOutlined`、`message`。
  - 新增 state：`detailOpen`、`detailAgent`、`unpublishingId`（取消发布 loading 按 id 独立，避免整列禁用）。
  - 新增 `handleViewAssistant`（打开抽屉）、`handleUnpublish`（`updateAssistant({ appId, appName, status: '2' })`，成功后 `message.success` + 刷新列表）。
  - 卡片 `.wac-footer` 增加 `.wac-actions`：「查看」按钮 +「取消发布」按钮（仅 `status==='1'` 显示，处理中禁用并显示「处理中…」）。
  - 组件末尾渲染 `<AssistantDetailDrawer />`。
- 修改 `apps/chat/src/pages/chat/skill/index.tsx`（约 +31 -32）
  - 新增 import `AssistantIconBlock`；新增 `SKILL_ICON_KEYS` + `skillIconKey`（SkillCard 无 icon 字段，按 key 稳定散列到预设图标）。
  - 卡片网格由旧 `.abi-*` 结构重写为 `.ws-assistant-card`：`.wac-head`（图标 + 标题/描述 + 右上角 添加/已添加/移除）、`.wac-footer`（状态 tag + `.wac-actions` 查看/启用停用）；空态用 `.ws-empty`，列表用 `.ws-card-scroll > .ws-card-grid`。
  - 全部原功能保留：`handleOpenDetail`、`handleToggleEnable`、`handleAddSkill`、`handleRemoveSkill`、广场/我的技能 tab、搜索、时间筛选、`SkillDetailDrawer`；卡片内按钮均 `stopPropagation`，避免误触发卡片点击详情。
- 修改 `apps/chat/src/index.css`（新增样式约 198 行，删除死代码约 194 行）
  - `.ws-assistant-card .wac-footer` 的 `justify-content` 由 `flex-start` 改为 `space-between`。
  - 新增 `.wac-actions` / `.wac-act`（+ `--danger` hover 变红 + `:disabled`）/ `.wac-add-btn`（+ `--added` 灰 / `--danger` 红）。
  - 新增 `.assistant-detail-drawer` 全套样式（hero 渐变头、关闭按钮、状态徽标、描述/提示词/开场白分区、创建&更新时间信息行）。
  - 删除 skill 页遗留死代码块 `.skill-store-view .abi-*`（含 abi-card-grid / abi-data-card / abi-card-act / btn-accent-gradient / abi-status-tag），技能卡片已改用 `.ws-*`，该块不再被引用。

## 实现说明

- 取消发布语义：后端 update 接口校验名称非空，故 `updateAssistant` 必须回传 `appName`；`status='2'` 表示下线（0 草稿 / 1 上线 / 2 下线）。列表接口只查 `status='1'`，下线成功后 `fetchList('my-assistant')` 刷新，卡片随即消失。
- 应用隔离：chat 不引用 abi 的 SCSS/组件，抽屉与图标均为 chat 端自有实现（`AssistantIconBlock` 已存在于 `chat/src/components`）；`AssistantDetailDrawer` 复用 `SkillDetailDrawer` 同款 `unwrapObject`/`formatDateTime` 辅助逻辑。
- 技能卡片图标：`SkillCard` 无 icon 字段，用 `skillIconKey(card.key)` 按 key 稳定散列到 6 个预设图标 key，保证同一技能图标稳定。
- 样式复用：`.ws-*` 类为全局选择器，skill 页 `.skill-store-view` 自身 `overflow-y:auto` 整体滚动，直接复用 `.ws-card-scroll/.ws-card-grid` 不改变整页滚动行为。

## 测试记录

### 执行的命令

- `cd apps/chat; npx tsc --noEmit -p tsconfig.app.json`

### 测试结果

- 本次改动的 4 个文件（AssistantDetailDrawer.tsx、workshop/index.tsx、skill/index.tsx、index.css）零类型错误。
- tsc 退出码 1，唯一报错为 `src/components/conversation/autoChart/multi-measure-pie-chart.ts(72,...)`（该 `.ts` 文件第 72 行含 JSX `return <div ref={chartRef} />;`，实为 `.tsx` 内容）——属仓库既有问题，`git status` 确认该文件未被本次改动触碰，与本任务无关。

### 失败和修复过程

- 实现中注释一度误写「应用工坑」，已改回「应用工坊」。
- `grep_code` 的 `include_pattern` 在本工作区不生效，改用无 include 过滤的全局 grep + 直接 Read 校验改动落地。

## 回归检查

- 我的助手：卡片正常渲染；「查看」打开只读抽屉，抽屉先显示兜底、详情返回后覆盖；「取消发布」仅对已上线助手显示，处理中禁用，成功后列表刷新卡片消失。
- 技能商店：广场/我的技能 tab、搜索、时间筛选、启用/停用、添加/已添加/移除、查看详情全部保留；卡片内按钮 `stopPropagation`，不误触卡片点击。
- 未触碰其他页面（对话、系统侧栏、会话分组）；删除的 CSS 死代码仅在被重写的 skill 页引用过，grep 确认 `abi-*` 类不再被 chat 引用（abi app 各自独立作用域，不受影响）。

## Review 结果

- 重点确认：未新增/改动后端接口；取消发布回传 `appName`；loading 按 id 独立；技能功能零回退；删除的仅为确认死代码。

## 发现的问题

- 既有：`multi-measure-pie-chart.ts` 为 `.ts` 却含 JSX，导致 tsc 报错，建议后续单独改名为 `.tsx`（不在本任务范围）。

## 本轮经验

- chat 端卡片样式已收敛到 `.ws-assistant-card` + `.ws-card-grid` 一套，后续新增卡片列表页可直接复用，避免再引入 `.abi-*` 死代码。

## 是否需要更新 AI 系统

### 需要更新的 context

- 可在 `.ai/context/` 补充「chat 卡片统一用 `.ws-assistant-card` / `.ws-card-grid`」的约定；本轮先记录于此 run log。

### 需要更新的 prompts / agents / skills / MCP / checklists

- 均无需更新。

## 后续建议

- 将 `multi-measure-pie-chart.ts` 重命名为 `.tsx` 以清除既有 tsc 报错。

## 未解决问题

- 无。
