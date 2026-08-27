# 对话框技能选择可见「我的技能」+ 工坊/商店 tab 字号统一

## 基本信息

- 日期：2026-08-26
- 任务名称：chat-skill-mine-visible-in-dialog
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-08-26 追加节）+ 用户截图反馈
- 执行 AI：Qoder
- 任务类型：功能补全 + 样式统一

## 需求摘要

1. 技能商店「我的技能」下已添加的技能，要在对话框（输入框「更多 → 技能」）技能选择中看到。
2. 应用工坊 tab 字体大小与技能商店 tab 不一致，需统一。

## 影响范围

- `apps/chat/src/components/conversation/components/chat-input/index.tsx`（技能弹窗数据源过滤）
- `apps/chat/src/pages/chat/skill/index.tsx`（技能商店收藏状态获取，对齐对话收藏调用时机）
- `apps/chat/src/index.css`（`.ws-tab` 字号）
- 不影响：助手编排抽屉、探索/报告模式提交透传逻辑。

## 修改文件

- `chat-input/index.tsx`：
  - `startSkillLoad`（首次 hover 打开技能弹窗时触发一次）改为只调 `fetchFavoriteList({ favorType: 'skill' })`（用户明确：弹窗只认收藏列表），弹窗候选即「我的技能」；行原始字段 spread 保留（报告提交用 `latestVersionId/skillType`），`id` 取 `favorId ?? favor_id ?? skillId ?? id`、名称取 `bizName ?? skillName ?? name`；删除 `querySkillList` 导入与合并过滤逻辑。
- `pages/chat/skill/index.tsx`：收藏状态获取逻辑逐项对齐对话收藏（`SidebarHistoryTopics` / `-GroupSessionListView`）与工坊「我的收藏」：
  - `myIds` 初始为空 Set（对齐对话侧 `favoriteChatIds` 初始空 Set）；
  - 列表加载只调 `querySkillList({})`，不调任何收藏接口；
  - `favorite/list?favorType=skill`：仅切到「我的技能」tab 时拉取（对齐工坊按 tab 拉取 `favorite/list`）；
  - `favorite/status?favorType=skill`：暂不接入（单条查询会随卡片数量放大请求量，用户明确要求先去掉），等后端批量接口后再补；
  - `addOrRemove?favorType=skill`：添加/移除切换，按响应 `favoriteStatus` 回写集合，不乐观更新（对齐对话 `handleFavoriteTopic`）；
  - 删除 localStorage `mySkills` 读写。
- `index.css`：字号统一为 14px——侧边栏 `.nav-link-item`（13→14）、技能商店 `.skill-filter-tabs .ant-tabs-tab`（15→14）、应用工坊 `.ws-tab`（15→14），各加注释说明。

## 实现说明

- 原弹窗按 spaceId 由后端过滤，导致已添加的跨空间公开技能不可见；改为与技能商店一致的「查全部 + 前端过滤」模式，并把「我的技能」作为始终可见集合并入。
- 收藏调用时机经历多轮用户纠偏，最终逐一对齐对话侧现有代码（详见修订记录）；核心原则：**列表加载不调收藏接口，交互时才按需调**。
- 收藏列表行解析兼容 `rows` 顶层/`data.rows`/`data.list`/`data` 数组，目标 id 取 `favorId ?? favor_id ?? skillId`。
- 提交逻辑不变：探索模式 `skillSourceVersionIds`、报告模式 `buildReportSourceVersionFields` 仍基于 `skillList` 项（含 `id/latestVersionId/skillType`），合并后的项来自同一 `querySkillList` 返回，字段完整。

## 测试记录

### 执行的命令

- `npx tsc --noEmit -p tsconfig.app.json`（apps/chat）
- GetProblems（chat-input/index.tsx、skill/index.tsx、index.css）

### 测试结果

- 改动文件无类型错误；CSS 仅有既有 `@tailwind`/`-webkit-line-clamp` 警告。
- 全量 tsc 仅存既有错误 `src/components/conversation/autoChart/multi-measure-pie-chart.ts`（.ts 内含 JSX，历史遗留，与本次无关）。

### 失败和修复过程

- 无。

## 回归检查

- 技能弹窗搜索、多选、启用标签渲染逻辑未动。
- 非「我的技能」项的可见性 = 启用 + 空间可见（公开全平台/私有本空间），与技能商店广场可见性规则一致；原后端 spaceId+status 过滤的等价语义由前端规则覆盖。
- 应用工坊 tab 仅字号变化，padding/下划线/颜色未动。
- 未触碰用户既有未说明改动（`SpaceInfoEdit.tsx`、`table.scss` 等）。

## Review 结果

- 3 个文件改动：弹窗数据过滤、商店收藏调用时机对齐、字号；接口均为既有收藏三接口（`addOrRemove`/`status`/`list`），仅 favorType 换 skill，无新增接口定义。

## 是否需要更新 AI 系统

### 需要更新的 context

- 不需要。

### 需要更新的 prompts / agents / skills / mcp / checklists

- 不需要。

## 后续建议

- abi 端技能管理（`apps/abi/.../skills/index.tsx`）仍用 localStorage `mySkills`，建议后续同步切换为收藏接口，避免两端数据源不一致。

## 修订记录

- 2026-08-26（v2）：按用户反馈将「我的技能」数据源由 localStorage 修正为收藏接口 `favorite/list?favorType=skill`（对话框 + 商店同步），删除 localStorage 读写。
- 2026-08-26（v3，已废弃）：用户补充要求对齐 `favorite/status`；误将 status 放入列表加载流程逐个调用，被用户否定。
- 2026-08-26（v4，已废弃）：改为商店挂载时拉 `favorite/list` + 打开详情时查 `favorite/status`，用户仍判定与对话不一致。
- 2026-08-26（v5）：通读对话收藏全部代码（`SidebarHistoryTopics.tsx`、`-GroupSessionListView.tsx`、`workshop/index.tsx`）后逐项对齐：集合初始空、列表加载零收藏调用、`favorite/list` 仅「我的技能」tab + 弹窗打开时、`favorite/status` 仅打开详情时、`addOrRemove` 按响应 `favoriteStatus` 回写不乐观更新。
- 2026-08-26（v6）：用户指出对话收藏一次操作涉及两个接口（`favorite/status` + `favorite/addOrRemove`）；抽出 `checkSkillFavorite`，在鼠标移入卡片、打开详情时查 `favorite/status`。
- 2026-08-26（v7，最终）：用户要求去掉技能侧 `favorite/status` 单条查询（请求量随卡片数放大，后端后续提供批量接口）；删除 `checkSkillFavorite`、卡片 hover 与详情打开处的 status 调用及 `fetchIsFavorite` 导入；收藏态改由「我的技能」tab 的 `favorite/list` 与 `addOrRemove` 响应回写维护。
- 2026-08-26（v8）：字号纠偏——用户实测左侧（侧边栏菜单项 13px）与右侧（工坊 tab 15px）不一致，要求统一 14px；将 `.nav-link-item`、技能商店 `.ant-tabs-tab`、`.ws-tab` 三处全部设为 14px（此前只改了 `.ws-tab` 且方向反了，导致左侧“没反应”）。
- 2026-08-26（v9）：用户明确对话框技能弹窗「只认 favorite/list」：`startSkillLoad` 去掉 `querySkillList` 与合并过滤，仅调 `fetchFavoriteList({ favorType: 'skill' })`，弹窗候选即「我的技能」；保留行原始字段供提交使用。

## 未解决问题

- 需用户在实际环境验证：商店添加技能后对话框弹窗可见；工坊与商店 tab 字号视觉一致。
