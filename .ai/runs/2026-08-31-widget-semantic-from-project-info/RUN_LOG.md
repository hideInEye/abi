# RUN_LOG：助手分享悬浮框数据语义改随 getProjectInfo 下发

- 日期：2026-08-31
- 依据：`.ai/requirements/CURRENT_REQUIREMENT.md`「2026-08-31 追加」段（用户口头确认口径）

## 背景

助手分享悬浮框原先单独调 `GET /copilot/v1/schema/tree?spaceId=&shareCode=` 拉取数据语义分组树。用户确认口径变更：语义应随助手详情接口 `GET /dashboard/api/v1/project/getProjectInfo/{type}/{appId}?shareCode=` 一并下发（结构与 app/get 的 `versions[].schemaSemantics[].schemaConfig[]` 一致），后端字段尚未加上，前端先行对接并降级。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `apps/chat/src/components/chat-widget/service.ts` | 删除 `API.semanticTree` 与 `fetchSemanticTree`；`WidgetAssistantInfo.spaceId` 替换为 `semantics: WidgetSemanticNode[]`；新增纯函数 `mapProjectSemantics`（版本选取同详情抽屉：latestVersionId → versions[0] → 详情自身，`schemaConfig` 映射为扁平 schema 叶子 `id=schema_<id>/schemaId/name/groupName=groupPath`）；`fetchAssistantInfo` 解析并携带 `semantics` |
| `apps/chat/src/components/chat-widget/ChatWidget.tsx` | 移除 `fetchSemanticTree` 导入与 `spaceId` 分支拉取，`load` 中直接 `setSemanticTree(assistantInfo?.semantics ?? [])`；删除 `semLoading` 状态及「加载中...」分支（树随助手信息同步到达） |
| `apps/chat/src/components/chat-widget/service.test.ts` | 新增 `mapProjectSemantics` 三例：版本选取、缺 id 跳过/无 versions 回退、后端未加字段返回空列表 |
| `.ai/requirements/CURRENT_REQUIREMENT.md` | 追加 2026-08-31 口径变更记录 |

## 行为等价性说明

- 语义选中后发送链路不变：`context.extra` 仍携带 `semantic_id/semantic_group_name/semantic_name`。
- 降级策略等价：后端未加字段/响应缺 `schemaSemantics` 时 `semantics=[]`，下拉显示「暂无数据语义」，对话不阻断。
- `renderSemNode` 的分组分支保留（当前数据全为 schema 叶子，不渲染分组），无功能回退。
- 删除的 `fetchSemanticTree` 仅 widget 内部使用；chat 主对话 `conversation-analysis` 与大屏的同名调用不受影响。

## 验证

- `pnpm vitest run apps/chat/src/components/chat-widget`：3 文件 19/19 通过（service.test.ts 4→7 例）。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：无错误。

## 后续事项

- 后端在 `getProjectInfo/{type}/{appId}` 响应补齐 `versions[].schemaSemantics` 后，分享页/嵌入悬浮框语义下拉即可自动生效，前端无需再改；联调时若字段名有出入，仅需调整 `mapProjectSemantics`。

## 是否需要更新其他 .ai 资产

- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`（口径变更已记录于 CURRENT_REQUIREMENT）。
