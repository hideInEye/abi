# 分享记录 API Key 列表改为卡片右侧无遮罩浮层

## 基本信息

- 日期：2026-10-08
- 任务名称：share-apikey-popover
- 需求文件：无（用户口头需求：API Key 列表弹出方式错误，应在卡片右侧打开且不要遮罩）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：UI 交互修正

## 需求摘要

「我的助手-分享记录」卡片上的「API Key查看」原为居中 Modal（带遮罩），改为锚定按钮、在卡片右侧展开的无遮罩浮层（Popover），点击外部自动关闭。

## 影响范围

- `apps/abi/src/pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx`

## 修改文件

- `apps/abi/src/pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx`

## 实现说明

- 移除底部居中 `Modal`，改为每张卡片「API Key查看」按钮外包 `Popover`：`trigger="click"`、`placement="right"`、受控 `open={akRecord?.id === r.id}`。
- `onOpenChange` 打开时复用原 `openAkList`（原 openAkModal 改名）取数逻辑：优先读列表行 apiKeys，缺失按 shareCode 单查详情；关闭时清空当前记录。
- 浮层内容保持原列表样式（灰底圆角行、maxHeight 320 滚动、空态 Empty），内容宽度固定 300。
- Popover 默认无遮罩，点击外部/再次点击按钮关闭，符合设计稿。

## 测试记录

### 执行的命令

- `cd apps/abi; npx tsc --noEmit -p tsconfig.json`（过滤 ShareRecordList 无报错）

### 测试结果

- 类型检查通过，改动文件无新增错误。

### 失败和修复过程

- 无。ESLint 因项目插件版本不兼容无法运行（已知问题），以 tsc 为准。

## 回归检查

- 分享记录列表渲染、分页、复制链接逻辑未改动。
- API Key 取数链路（列表行字段 → 详情兜底）保持不变，仅触发方式变化。
- 同一时间仅一张卡片的浮层打开（受控 open 按记录 id 互斥）。

## Review 结果

- 仅交互容器由 Modal 换为 Popover，无业务逻辑变化；Modal import 已移除，无残留引用。

## 发现的问题

- 无。

## 本轮经验

- 卡片行内「查看类」轻量列表优先用锚定 Popover（无遮罩、点击外部关闭），避免居中 Modal 打断浏览。

## 是否需要更新 AI 系统

### 需要更新的 context

- 不需要。

### 需要更新的 prompts

- 不需要。

### 需要更新的 agents

- 不需要。

### 需要更新的 skills

- 不需要。

### 需要更新的 MCP 建议

- 不需要。

### 需要更新的 checklists

- 不需要。

## 后续建议

- 如设计稿要求浮层跟随卡片滚动容器裁剪，可再评估 `getPopupContainer`。

## 未解决问题

- 未做浏览器实机验证（需登录环境），交互以 antd Popover 受控行为为准。
