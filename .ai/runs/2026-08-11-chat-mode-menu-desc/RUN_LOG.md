# 聊天输入框模式切换菜单升级为 icon+名称+文案 Run Log

## 基本信息

- 日期：2026-08-11
- 任务名称：chat-mode-menu-desc
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-08-11 追加节）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Test、Regression
- 任务类型：前端 UI 调整（纯前端）

## 需求摘要

将 chat 输入框工具栏的模式切换下拉（交互/探索/报告）从「icon+名称」单行菜单项升级为参考图样式的「icon+名称+描述文案」两行菜单项，选中项右侧展示勾选标记并高亮：

- 交互：敏捷问数，基础分析
- 探索：自主规划，复杂分析
- 报告：深度挖掘，智能洞察

## 影响范围

- `apps/chat/src/components/conversation/components/chat-input/index.tsx`
- `apps/chat/src/index.css`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 修改文件

- `apps/chat/src/components/conversation/components/chat-input/index.tsx`
  - `ChatInputMode` 类型新增 `desc` 字段；`getModeConfig` 为三个模式补充描述文案。
  - `modeMenuItems` 改为基于 `getModeConfig` 映射生成，菜单项 label 为自定义两行结构（第一行 icon+名称同排 / 第二行描述文案 / 右侧选中勾 `CheckOutlined`），选中项附加 `mode-menu-item--selected` className。
  - 模式 Dropdown 增加 `overlayClassName="mode-menu-overlay"` 承载面板样式。
- `apps/chat/src/index.css`
  - 新增 `.mode-menu-overlay` 面板与 `.mode-menu-item*` 两行菜单项样式，全部复用现有 CSS 变量（`--ink`、`--ink-2`、`--ink-3`、`--accent-soft`、`--r-sm`、`--r-md`、`--shadow-l`）。

## 实现说明

- 菜单项结构：第一行 icon（14px，`--ink-2`）与名称（13px 常规字重，`--ink`）同排；第二行描述文案（12px，`--ink-3`）以 24px 缩进（icon 宽 14px + 间距 10px）与名称左对齐；右侧选中勾（`--ink`）垂直居中。名称按用户要求不加粗。
- 选中态背景使用 `--accent-soft`，与现有 `.input-label-btn.active` 的高亮语义一致；hover 沿用 antd 菜单默认浅灰背景，贴近参考图。
- 触发按钮保持原「icon+名称+箭头」样式不变；`selectMode` 业务逻辑（探索开发中回退、mode 上抛、切换提示）完全未动。

## 测试记录

### 执行的命令

- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
- `pnpm --filter ai-bot build`
- `git diff --check`

### 测试结果

- tsc：通过，无输出无报错。
- build：`✓ built in 1m 44s` 成功；仅有既有的 antd "use client" directives、chunk 体积与动态/静态导入混用警告，均与本次改动无关。
- git diff --check：通过，无空白错误。

### 失败和修复过程

无失败。

## 回归检查

- `handleSend` 发送校验顺序（校验 → onSend → 清空）未改动。
- 探索模式点击仍提示「探索模式开发中，已保持交互模式」并回退交互模式。
- 报告/交互切换仍通过 `onModeChange` 上抛，父级模式控制 `selectedModeKey` 同步逻辑未变。
- 工具栏其余按钮（+、数据选择、思考、更多）、语音与发送按钮未改动。
- 样式仅新增独立 class，未覆盖既有选择器。

## Review 结果

- 纯 UI 展示层改动，未触碰接口协议、状态管理和报告模式逻辑。
- 新样式全部使用 chat 现有 CSS 变量，符合 `UI_STYLE_GUIDE.md` 对 apps/chat 的约束。
- 菜单项通过 antd Menu items 的 `className`/`label` 扩展，未引入新依赖。

## 发现的问题

无新增问题。构建警告为仓库既有问题。

## 本轮经验

antd Dropdown 菜单项需要两行自定义结构时，用 `label` 自定义节点 + item `className` + `overlayClassName` 三层配合即可完全控制视觉，无需替换为 Popover 自绘菜单。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。UI_STYLE_GUIDE 已覆盖 chat 变量使用规则。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。

## 后续建议

如产品后续确认探索模式上线，仅需移除 `selectMode` 中的开发中回退分支，菜单文案结构无需再动。

## 未解决问题

- 未启动 dev server 做浏览器视觉验收；建议人工打开对话页确认下拉两行布局与选中勾效果。
