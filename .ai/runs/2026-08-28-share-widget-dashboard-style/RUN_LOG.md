# RUN_LOG：助手分享悬浮框对齐大屏对话风格 + 数据语义下拉筛选框

- 日期：2026-08-28
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` →「2026-08-28 追加：助手分享悬浮框对齐大屏对话风格 + 数据语义下拉筛选框」
- 类型：UI 对齐 + 小功能增强（无新增接口协议，仅复用既有统一接口）

## 目标

1. 助手分享悬浮框（`apps/chat/src/components/chat-widget/`）视觉对齐大屏对话面板 `AiChatPanel`（配色、头部、状态栏、气泡、输入区）。
2. 输入区新增与大屏同款「数据语义」下拉筛选框（分组树），选中后随对话下发语义参数。

## 变更清单

| 文件 | 变更 |
| --- | --- |
| `apps/chat/src/components/chat-widget/service.ts` | `WidgetAssistantInfo` 新增 `spaceId`；新增 `WidgetSemanticNode/WidgetSemanticSelection` 类型与 `fetchSemanticTree`（复用 `/copilot/v1/schema/tree`，随 shareCode 免登录，失败降级空数组）；`getJson` 支持附加 query 参数；`sendChatStream` 新增可选 `semantic` 参数，选中时向 `context.extra` 透传 `semantic_id/semantic_group_name/semantic_name`（与大屏一致），未选中不下发 |
| `apps/chat/src/components/chat-widget/ChatWidget.tsx` | 结构对齐大屏：渐变 AI 图标头部 + 关闭按钮、思考状态栏（正在思考中...）、消息气泡时间移到气泡下方、输入区工具栏；新增语义分组树下拉（分组展开/收起、叶子可选中、点击外部收起），发送时透传所选语义；图标全部内联 SVG，不依赖 antd |
| `apps/chat/src/components/chat-widget/index.css` | 全量改为大屏配色体系：主题色 #1677ff/#4096ff 渐变、#f5f7fa/#f0f5ff/#1778FF、human 渐变气泡/ai 描边气泡（12px 圆角 asymmetric）、#f5f7fa 输入框聚焦蓝色描边、渐变发送钮、红色停止钮；新增语义 selector 与下拉树样式；继续全量 `abi-cw-` 前缀 |
| `apps/chat/src/pages/assistant-share-page/$shareCode.tsx` | 分享校验/密码提交后归一化响应 `type`（react/workflow/dashboard），作为 `verifiedType` 传入 ChatWidget，供 `getProjectInfo/{type}/{id}` 统一接口取助手信息（含 spaceId） |
| `.ai/requirements/CURRENT_REQUIREMENT.md` | 追加 2026-08-28 需求段落 |

## 与大屏的行为差异（有意保留）

- 悬浮框不强制必选数据语义（大屏会拦截「请先选择数据语义」）：分享助手可能未绑定语义，未选中时不下发语义字段、仍可发送。
- 欢迎页推荐问题列表保留（大屏无此项）。
- 语义树拉取失败/无 spaceId 时，下拉显示「暂无数据语义」，不阻断对话。

## 验证

- `pnpm vitest run apps/chat/src/components/chat-widget`：3 个测试文件、16 个用例全部通过（history / service / shareUrl）。
- `apps/chat` 执行 `tsc --noEmit -p tsconfig.app.json`：本次改动文件无错误；仅存在既有无关错误 `src/components/conversation/autoChart/multi-measure-pie-chart.ts(72)`（改动前已存在，未触碰）。
- 回归检查：未修改分享校验/会话/历史协议与大屏、chat 主对话流程。
- 2026-08-28 复验（另一会话复核）：`pnpm vitest run apps/chat/src/components/chat-widget` 16 用例通过；`apps/chat` 下 `tsc --noEmit -p tsconfig.app.json` 仅既有无关错误 `multi-measure-pie-chart.ts(72)`（未触碰）。

## 遗留 / 风险

- 语义树接口 `/copilot/v1/schema/tree` 在分享免登录（shareCode）场景下的后端支持未经联调验证；前端已按失败降级空树处理，不影响对话主链路。
- 视觉一致性建议在分享页实际打开比对大屏面板一次。

## 是否需更新其他 .ai 资产

- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`。
