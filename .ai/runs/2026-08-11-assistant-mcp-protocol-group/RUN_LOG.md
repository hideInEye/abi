# 运行记录：助手 MCP 工具保存协议分组字段（mcp_sse/mcp_streamable）与 sort

- 日期：2026-08-11
- 类型：功能改动（字段接入 / 保存与回显）
- 触发需求：后端要求保存 MCP 工具时按协议归组 —— 查工具协议属于 sse 还是 streamable http，把该工具的**真实 groupId** 存入 `toolConfig` 的对应列表 `mcp_sse` / `mcp_streamable`；另需给 `tools`/`skills`/`schemaSemantics` 每项补 `sort`。详见 `.ai/requirements/CURRENT_REQUIREMENT.md` 对应章节。

## 目标

1. 保存助手（`POST /api/abi-chat/v1/app/{add,update}`）时，MCP 工具（`toolType='2'`）在 `toolConfig` 内额外写入 `mcp_sse`、`mcp_streamable` 两个数组。
2. 归组规则：`frontProtocol === 'sse'` → 真实 groupId 入 `mcp_sse`；`streamableHttp` → 入 `mcp_streamable`；另一数组置空 `[]`。
3. 列表存**真实 groupId（长号）**，不是组名 groupPath。
4. 给 `tools` / `skills` / `schemaSemantics` 每项补 `sort`（用选择顺序索引）。
5. 编辑回显：详情接口 `get` 原样返回 `mcp_sse`/`mcp_streamable`，直接保留到本地元数据。

## 非目标

- 不新增任何接口调用；复用工具选择器已有的 `group/list` 与 `register/list` 数据链路。
- 不改动内置工具（`toolType='1'`）的既有提交结构（内置工具不写 mcp 字段）。
- 不改动 数据语义 / 技能 / 工具 的选中态多选逻辑，仅新增字段。

## 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/tool-picker-drawer.tsx`
  - `ToolOption` 类型新增 `groupId?`（真实长号）与 `frontProtocol?`（协议）。
  - `loadMcpTools` 的 `items.map` 带出 `groupId`（函数入参，即 `namespaceId: s_<groupId>` 的真实分组号）与 `m.frontProtocol`。
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`
  - 新增 `toolMcpMetaMap` state：`id -> { mcpSse: string[]; mcpStreamable: string[] }`。
  - `mergeOptionNames` 扩展：对 `mcp_` 前缀且带 `groupId` 的选项，按 `frontProtocol` 归入 sse/streamable。
  - `loadDetail`：`version.tools` 回显时，MCP 项读取 `c.mcp_sse`/`c.mcp_streamable`（`.map(String)`）还原到 `toolMcpMetaMap`。
  - 新增模式 reset：清空 `toolMcpMetaMap`。
  - `buildPayload`：MCP 工具项写入 `mcp_sse`/`mcp_streamable`（取 `toolMcpMetaMap`，缺省 `[]`）；`tools`/`schemaSemantics`/`skills` 每项补 `sort: index`。
- `.ai/requirements/CURRENT_REQUIREMENT.md`
  - 追加本次需求章节（需求类型/背景/目标/非目标/影响范围/验收标准/测试要求）。

## 关键约定

- 工具选项 id 编码：`mcp_<registerId>` / `builtin_<toolId>`；`group === 'mcp'` 判定为 MCP 工具。
- `toolType`：`'2'` = MCP，`'1'` = 内置工具（见需求文档截图）。
- groupId（真实长号，如 `2083128677879574532`）vs groupPath（组名，如「111」）：mcp_sse/mcp_streamable 存 groupId。
- `frontProtocol` 取值：`'sse'` | `'streamableHttp'`；比较时统一 `toLowerCase()`，非 sse 一律归入 streamable。
- `sort` 用 `Array.from(selectedXxxIds).map((id, index) => ...)` 的选择顺序索引。

## 验收标准

1. 选中 MCP 工具保存：请求体对应 `tools[].toolConfig[0]` 含 `mcp_sse`/`mcp_streamable`，其一含该工具真实 groupId、另一为 `[]`。
2. `tools`/`skills`/`schemaSemantics` 每项均含 `sort`。
3. 内置工具项不含 mcp 字段。
4. 编辑已有助手：MCP 工具的协议分组从详情原样回显，再次保存不丢失。

## 验证

- 类型检查：`pnpm --filter chatbi exec tsc --noEmit -p tsconfig.json`。
  - 两个改动文件 `assistant-edit-drawer.tsx`、`tool-picker-drawer.tsx` **均无报错**（过滤输出为空）。
  - 项目其余报错（`build/config/proxy.ts`、`build/plugins/unplugin-icon.ts` 的 vite 版本冲突、若干旧组件/测试文件）为既有历史问题，与本次改动无关。
- 运行时验证：待联调（需后端真实返回 `frontProtocol` 与详情原样回显 mcp 字段）。

## 回归检查

- `optionNameMap` / `optionGroupMap` 的写入路径未改，名称与分组路径回显不受影响。
- 内置工具、数据语义、技能、模型的选中态与提交结构未改（仅新增 `sort` 字段与 MCP 专属字段）。
- `mergeOptionNames` 新增分支仅对 `mcp_` 前缀且带 `groupId` 生效，其它选项行为不变。

## 是否需要更新其他 .ai 资产

- context：无需变更（未改架构/模块边界）。
- decisions：无需新增（未引入架构级决策）。
- 建议记忆沉淀：MCP 工具保存需按 `frontProtocol` 把真实 groupId 归入 `toolConfig.mcp_sse`/`mcp_streamable`；三类子项均需 `sort`。
