# Run Log: 助手编辑页扩展能力工具选择抽屉化 + MCP 参数修复

- 日期：2026-07-30
- 需求：`.ai/requirements/CURRENT_REQUIREMENT.md` 2026-07-30 追加「助手编辑页扩展能力工具选择改为抽屉 + 按需加载 + MCP 参数修复」
- 类型：前端交互重构 + 接口参数缺陷修复

## 背景

1. 助手编辑页（智能编排/助手配置）在组件挂载时一次性调用 `queryMcpList` + `queryToolListApi`，后续接入更多能力接口会导致挂载请求过多。
2. 折叠行内平铺全量工具列表，列表过长影响观感。
3. `queryMcpList` 调用相比 MCP 服务页（plugin）少传 `search: 'blur'` 与 `namespaceId`（MCP 按分组存储，namespaceId = `s_分组ID`），返回数据不正确。

## 用户决策（AskUserQuestion 确认）

- MCP 参数：抽屉内带分组切换，选中分组后才调 `register/list` 带 `s_分组ID`。
- 容器形式：抽屉 Drawer。
- 内置工具：与 MCP 工具一起挪进抽屉，分 tab、均按需加载。

## 修改文件

- 新增 `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/tool-picker-drawer.tsx`
  - 工具选择抽屉（CommonDrawer，620px），Tabs：「MCP工具」「内置工具」。
  - MCP tab：首次打开加载 MCP 分组（`tableSemanticsGroupList`，groupType=mcp，spaceId），左侧分组目录切换；选中分组后调 `queryMcpList({ pageNo, pageSize, search: 'blur', namespaceId: 's_' + groupId })`，按分组缓存（ref），重复切换/打开不重复请求。
  - 内置工具 tab：首次进入时调 `queryToolListApi({})`，加载一次后缓存。
  - 支持名称本地过滤、全选/半选、已选计数；spaceId 变化时清空全部缓存。
  - 列表加载完成通过 `onToolsLoaded` 回传元数据供父级展示已选名称。
- 修改 `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`
  - 删除挂载时的 `fetchToolGroups`（`queryMcpList`/`queryToolListApi` 全量请求）及相关状态、`ToolGroupHeader`/`ToolItemRow` 子组件。
  - （同日追加调整）MCP 行不再展开展示已选列表：整行点击（含 + 号）直接打开工具选择抽屉，行右侧仅展示「已选 N 项」计数；移除 `SelectedToolGroup`、`toolMeta` 回显逻辑，`ToolPickerDrawer.onToolsLoaded` 改为可选 prop。
  - 勾选状态 `selectedToolIds` 与保存 payload（tools/toolType/toolConfig）逻辑保持不变。

## 同日追加：数据语义 / 本体网络 / 技能同样改为抽屉选择

用户决策：三块都做成和 MCP 一样的抽屉样式；接口分别为数据语义（分组+列表）、本体网络（属性建模三个分组+实体语义+关系配置）、技能（技能列表）；勾选结果暂不随保存提交（后端字段未确认）。

- 新增 `modules/capability-picker-drawer.tsx`：通用能力选择抽屉（配置驱动 tabs，可选分组目录），复用 tool-picker-drawer 的 GroupNavItem/PickerToolRow 与懒加载+缓存模式（按 tab+分组缓存，spaceId 变化清缓存）。
- 新增 `modules/capability-picker-configs.ts`：三套 tab 配置，接口调用方式与各管理页一致：
  - 数据语义：分组 groupType='shema' + `schemalist({groupId, pageNum, pageSize})` → schemaId/bizName。
  - 本体网络 5 个 tab：语义标签（'tag' + `queryTag({groupId, spaceId})`）、维度（'ontology-dimension' + `queryDimensionList`）、指标（'ontology' + `queryKnowledgeIndicators`）、实体语义（`queryOntologyEntityList`，无分组）、关系配置（`queryOntologyRelationList`，无分组）。
  - 技能：`querySkillListApi({})`（与技能管理页一致不传 spaceId）。
  - id 前缀：schema_/tag_/dim_/ind_/entity_/rel_/skill_。
- 修改 `assistant-edit-drawer.tsx`：数据语义/本体网络/技能三行改为整行点击弹各自抽屉（open={false}），行右侧展示「已选 N 项」；SectionKey 移除 semanticKnowledge/ontologyNetwork/skills；新增三个选中集合（暂不随保存提交）。
- 修改 `tool-picker-drawer.tsx`：导出 GroupNavItem/PickerToolRow 供通用抽屉复用，删除误留的孤立表达式行。

## 验证

- `npx tsc --noEmit -p apps/abi/tsconfig.json`：仅存在仓库既有 pre-existing 报错；本次改动的 4 个文件（assistant-edit-drawer、tool-picker-drawer、capability-picker-drawer、capability-picker-configs）按文件名过滤无任何报错。
- 未运行浏览器联调（本地未起后端）；已选中项、缓存命中、参数拼装均为代码级回归检查。
- vitest 用例集中在 ontology-kg，与本次改动无关，未新增测试（UI 组件交互，无新增纯函数）。

## 风险与遗留

- 已选项仅在各抽屉内可见/可取消，主页行只显示已选总数。
- 分组 pageSize 60、列表 pageSize 200 沿用现有取值，超量场景暂未分页。
- 数据语义/本体网络/技能的勾选结果暂不随保存提交，也无编辑回显（后端字段结构确认后再接 payload/回显）。
- 未运行浏览器联调（本地未起后端），建议验证各抽屉打开/切 tab 时的请求时机与参数。

## 是否需要更新 .ai/ 长期文档

- `context/`：暂不需要（未引入新架构约定）。
- 建议后续接入更多能力接口时，将「按需加载 + 抽屉选择」模式沉淀到 `context/ARCHITECTURE.md` 或 decisions。
