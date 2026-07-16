# 表格横向滚动条悬浮显示修复 Run Log

## 基本信息

- 日期：2026-07-16
- 任务名称：table-scroll-hover-fix
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（本次为截图驱动需求，无独立需求文件条目）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Regression、Review、Knowledge（角色化阶段）
- 任务类型：样式缺陷修复 / 跨模块统一

## 需求摘要

「数据准备 > 数据语义」页面：左侧分组目录（antd Splitter）拖宽后，右侧表格区域变窄，列被截断且无横向滚动条，无法查看被截断的列。诉求：

1. 列溢出时应可横向滚动查看全部列。
2. 鼠标悬停在表格上时出现滚动条（默认透明、悬浮显示）。
3. 其他存在同样问题的模块一并排查修复。

## 影响范围

- `apps/abi/src/styles/scss/table.scss`（全局表格样式，滚动条隐藏规则的根源）
- `apps/abi/src/pages/component/system/model/modules/model-card-list.css`
- `apps/abi/src/pages/component/system/skills/skill.css`

## 修改文件

- `apps/abi/src/styles/scss/table.scss`
- `apps/abi/src/pages/component/system/model/modules/model-card-list.css`
- `apps/abi/src/pages/component/system/skills/skill.css`

## 实现说明

### 根因

基础类 `.assistant-table-scroll`（table.scss 第 105-161 行）已实现正确的「默认透明、悬浮显示」滚动条方案，且同时覆盖外层容器与内层 antd 的 `.ant-table-content` / `.ant-table-body`（`scroll.x` 创建的真正横向滚动容器）。

但各模块表格类（`.semantics-table`、`.plugin-table`、`.dictionary-table`、`.api-key-table`、`.assistant-table`、`.space-menu-table`、`.user-table`、`.role-table`）以及各 `*-wrapper`、`:has()` 选择器、和 `model-card-list.css` / `skill.css`，都用 `display: none` / `scrollbar-width: none` 完全隐藏了内/外层滚动条。列溢出时因此没有任何可用滚动条 → 列被截断且无法滚动。

### 修复策略

在源头删除所有「隐藏滚动条」规则，让统一的 `.assistant-table-scroll` 悬浮显示样式生效。相比用全局 `!important` 覆盖对抗，删除更彻底可靠（尤其能处理 `skill.css` 的跨文件 `!important`）。

### 具体改动

- table.scss：删除 8 个模块内层内容类的 `.ant-table-content` / `.ant-table-body` 隐藏块；删除 4 个外层 `:has()` 隐藏块；删除 7 个 `*-wrapper` 的 `.assistant-table-scroll` 隐藏块。对纯说明性场景保留一行注释；对替换后仅剩注释而成为空规则集的类（`.user-table`、`.role-table`、`.space-user-table-wrapper`、`.role-table-wrapper`、`.space-role-table-wrapper`、`.user-table-wrapper`）连同其标题注释整体删除，避免「空规则集」lint 警告。
- model-card-list.css：删除 `.model-table` / `.model-table-wrapper .assistant-table-scroll` 隐藏规则。
- skill.css：删除 `.skills-table` / `:has(.skills-table)` 隐藏规则（含 `!important`）。

### 追加：去除空闲时的滚动条凹槽

需求追加：鼠标未悬停时不应保留滚动条凹槽/轨道。原先 `.assistant-table-scroll` 始终保留 7px 滚动条空间（仅 thumb 透明），因此列溢出时会看到一条空白凹槽。改为：默认 `scrollbar-width: none` + `::-webkit-scrollbar { width:0; height:0 }`（完全折叠，无凹槽）；hover 时恢复 `thin` / `7px` 并显示 thumb。外层容器与内层 `.ant-table-content`/`.ant-table-body` 同步处理。

### 再追加：避免 hover 展开滚动条造成挤压（最终方案）

上一步「折叠到 0、hover 展开 7px」在 Windows Chrome 下会导致 hover 时滚动条从 0 → 7px，挤压/抽动内容（用户反馈「会挤一下」）。根因：Windows Chrome 下可见且可拖动的滚动条必定占用布局宽度，纯 CSS 无法做到「既覆盖内容又不占空间」。

经与用户确认，选择「预留固定空间不跳动」方案：

- `.assistant-table-scroll`：回退到「始终预留 7px + idle 透明 + hover 灰色」（与参考实现 `.table-data-container` 一致），hover 仅改 thumb 颜色、不重排；并在外层加 `scrollbar-gutter: stable` 保证纵向滚动条出现/消失也不跳动。
- `.page-content-area`（layouts/modules/global-content/style.css）：新增 `scrollbar-gutter: stable`，页面内容出现纵向滚动条时不再挤压。

权衡：始终预留约 7px（透明，视觉像内边距）；如需真正「不占空间的悬浮滚动条」需后续引入 OverlayScrollbars/SimpleBar 等库。

### 再追加：轨道背景与表格一致，空闲时凹槽融入表格

用户反馈：仍保留固定空间不跳动，但空闲时那条预留的透明凹槽仍与表格背景有色差、显得突兀。采纳用户建议——直接把滚动条轨道背景改成与表格一致（表格 `td` 背景为 `#f6f7ff`）。

- `.assistant-table-scroll`（外层）与内层 `.ant-table-content`/`.ant-table-body`：`::-webkit-scrollbar` / `::-webkit-scrollbar-track` 的 `background-color` 由 `transparent` 改为 `#f6f7ff`；Firefox `scrollbar-color` 的轨道色由 `transparent` 改为 `#f6f7ff`。
- thumb 仍保持 idle 透明、hover 灰色（`rgba(144,147,153,0.3)` → `0.5`）。
- 效果：空闲时预留的滚动条轨道与表格同色，凹槽视觉上消失；hover 时灰色 thumb 浮现在同色轨道上；空间始终预留，永不挤压跳动。

## 测试记录

### 执行的命令

- IDE 静态诊断（GetProblems）对三处改动文件做 SCSS/CSS 语法与 lint 校验。

### 测试结果

- 三个文件均无语法错误。
- 本次引入的 8 个「请勿使用空规则集」警告已通过删除空规则集全部消除。
- 剩余 6 个 `line-clamp` 兼容性警告为既有告警（`.source-name-text` / `.skill-name-cell` 等 `-webkit-line-clamp`），非本次改动引入，且不影响编译。

### 失败和修复过程

- SearchReplace 唯一性：table.scss 中隐藏块高度相似，按变体分组（带内联注释 / 无注释 / 带 `!important`）用 replace_all 或唯一上下文定位，全部替换成功。

## 回归检查

- `.assistant-table-scroll` 悬浮显示样式（外层 + 内层 `.ant-table-content`/`.ant-table-body`）保持不变，仍为唯一滚动条样式来源。
- fixed 左/右列背景、选中行高亮、复选框列、展开图标（dept/menu/space-menu-wrapper）等其它样式均未受影响（相关 wrapper 的真实内容保留）。
- 空占位表格撑满逻辑（`:has(.ant-table-placeholder)`）未改动。

## Review 结果

- 仅删除隐藏滚动条相关规则，未触碰业务逻辑与列定义。
- 未新增全局 `!important` 覆盖，避免特异性对抗。
- 空规则集清理仅移除无内容的类，未误删含样式的 wrapper。

## 发现的问题

- 既有 `line-clamp` 兼容性警告建议后续统一补充标准 `line-clamp` 属性，但不属于本任务范围。

## 本轮经验

- 统一滚动条方案应只在基础类维护一处；模块类不应各自 `display:none` 覆盖，否则破坏统一行为。
- 将内容替换为纯注释会产生「空规则集」lint 警告，应连同标题注释整体删除。

## 是否需要更新 AI 系统

### 需要更新的 context

- 可在 `.ai/context/CODE_STYLE.md` 补充「表格滚动条统一由 `.assistant-table-scroll` 悬浮显示接管，禁止模块类隐藏滚动条」约定（可选）。

### 需要更新的 prompts

- 无。

### 需要更新的 agents

- 无。

### 需要更新的 skills

- 无。

### 需要更新的 MCP 建议

- 无。

### 需要更新的 checklists

- 无。

## 后续建议

- 在浏览器中回归验证：拖宽分组目录后，数据语义及其它模块表格 hover 时出现横向滚动条并可滚动查看全部列。
- 统一处理 `-webkit-line-clamp` 兼容性告警。

## 未解决问题

- 未进行运行时（浏览器）视觉验证，需人工在页面确认悬浮滚动条表现。
