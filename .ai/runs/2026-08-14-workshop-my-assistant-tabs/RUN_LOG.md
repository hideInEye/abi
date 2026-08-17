# 2026-08-14 对话页应用工坊：新增「我的助手」tab（只读卡片列表）+ tab 重排

## 需求

对话页「应用工坊」按参考版式调整：

1. 新增「我的助手」tab，且为**第一个** tab。tab 完整顺序：
   我的助手 → 我的分析 → 我的报告 → 最近使用 → 我的收藏 → 我的分享。
2.「我的助手」tab 内容参照 abi 管理页（`apps/abi/.../app-workshop/my-assistant`）实现，样式保持一致。
3. 经确认，功能范围为**只读卡片列表**（图标 + 名称 + 描述 + 状态标签，无编辑/删除/上线开关等管理操作）；
   状态过滤为**仅已上线**（`status='1'`，同 abi）。

需求类型：前端 UI + 只读数据接入（复用既有后端接口，不改接口协议）。

## 修改

- `apps/chat/src/service/api/app.ts`
  - 新增 `fetchAssistantList({ appName?, status?, spaceId? })`：`POST /abi-chat/v1/app/list`，
    `baseURL` 用 `window.APP_CONFIG?.VITE_BASE_API`，`spaceId` 缺省复用本文件 `getSpaceId()`（读 localStorage）。
- `apps/chat/src/components/AssistantIcon.tsx`（新增）
  - 从 abi 端 `AssistantIcon` 移植纯展示逻辑：`ASSISTANT_ICONS`（15 种预设图标配色）、
    `getAssistantIcon`、`AssistantIconBlock`（渐变圆角方块 + 白色 antd 图标）。仅依赖 `@ant-design/icons`。
    未移植 `AssistantIconPicker`（只读场景不需要）。
- `apps/chat/src/pages/chat/workshop/index.tsx`
  - `WORKSHOP_TABS` 第一项加入 `{ key: 'my-assistant', label: '我的助手' }`（此前误加的分区标题 JSX 已删除）。
  - 新增 `AssistantCard` 类型 + `mapAssistant`（映射后端 AppItem）。
  - 新增 `assistants` 状态；`fetchList` 增加 `my-assistant` 分支，调用 `fetchAssistantList({ status: '1' })`。
  - 新增 `isAssistantTab`、`filteredAssistants`（名称/描述搜索 + 创建时间范围过滤）、`pagedAssistants`；
    `totalCount` 按当前 tab 在助手/记录两套数据间切换，复用既有前端分页。
  - 数据区渲染增加外层三元：`my-assistant` 渲染只读卡片网格（`.ws-card-grid` / `.ws-assistant-card`），
    其余 tab 保持原表格逻辑不变。搜索框 placeholder 按 tab 切换为「请输入助手名称」。
- `apps/chat/src/index.css`
  - 删除已废弃的 `.ws-section-title`（分区标题方案已弃用）。
  - 新增卡片样式 `.ws-card-scroll` / `.ws-card-grid` / `.ws-assistant-card`（`.wac-head/.wac-main/.wac-title/.wac-desc/.wac-footer/.wac-tag`，
    含 `.off`/`.draft` 状态色），数值与 abi `.abi-assistant-card` 对齐；读只读场景去除 `cursor:pointer`。

## 决策 / 说明

- 默认激活 tab 仍为 `recently-used`：参考图高亮项为「最近使用」，且不额外改动默认选中行为。
- chat 与 abi 为独立应用，无法复用 abi 的 SCSS / 组件，故移植图标逻辑并以 `ws-`/`wac-` 前缀重写卡片样式。
- 卡片为只读：无 Switch、编辑、更多（元数据分析/删除）等操作，仅展示图标/名称/描述/状态标签。
- 未新增后端接口，`/abi-chat/v1/app/list` 为既有接口（abi 端已使用）。

## 验证

- `apps/chat` 下 `npx tsc --noEmit -p tsconfig.app.json`：本次改动的
  `workshop/index.tsx`、`AssistantIcon.tsx`、`service/api/app.ts` 均**无类型错误**。
  仅存量文件 `components/conversation/autoChart/multi-measure-pie-chart.ts` 有一处**既有语法错误**（与本任务无关，git 无改动）。
- 代码级自查：tab 顺序符合需求；数据区三元分支平衡；卡片样式数值对齐 abi；仅查已上线助手。
- 未运行浏览器回归（需后端环境提供 `/abi-chat/v1/app/list` 数据与 spaceId）。

## 长期文档更新建议

- 无需更新 `.ai/context/`。如后续「我的助手」卡片要支持点击进入对话/查看详情，或「我的分析/我的报告」接入后端，
  应在 `CURRENT_REQUIREMENT` 中补充并同步本目录运行记录。
