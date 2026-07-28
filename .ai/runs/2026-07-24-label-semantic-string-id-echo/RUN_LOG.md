# Run Log: label semantic string id echo

## Objective
修复标签语义编辑时数据语义组、数据语义只显示 ID、不显示名称的问题。根因是后端返回的分组/语义 ID 为超长字符串，前端链路中按 number 处理后触发 JavaScript 最大安全整数精度问题，导致 Select value 无法与 options 精确匹配。

## Scope
- `apps/abi/src/components/tableSemantics.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/module/TagModal.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/hooks/useTagManagement.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/semantic-tag/SemanticTag.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/types/index.ts`
- `apps/abi/src/service/api/tag-meaning.ts`

## Changes
- `TableSemantics` 支持 `valueAsString`，分组和数据语义 option value 可按字符串生成。
- `TableSemantics` 支持 `groupFieldName`，标签语义使用 `semanticsGroupId` 字段回显。
- 标签编辑表单初始化时保留后端 ID 字符串，不再转 number，也避免把空值转为 `'undefined'`。
- 标签分组查询的 `groupId` 改为字符串状态，查询/新增/编辑链路不再强制 number。
- 表语义 option 匹配改为 `String(a) === String(b)`，兼容后端返回 string ID。
- 删除调试日志。

## Validation
- `git diff --check -- apps/abi/src/components/tableSemantics.tsx apps/abi/src/pages/workbench/ontology-kg/label-meaning/module/TagModal.tsx apps/abi/src/pages/workbench/ontology-kg/label-meaning/hooks/useTagManagement.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/semantic-tag/SemanticTag.tsx apps/abi/src/pages/workbench/ontology-kg/label-meaning/types/index.ts apps/abi/src/service/api/tag-meaning.ts`: passed.
- `rg "console\\.log\\(|semanticGroupId\\+|semanticSchemaId\\+|Number\\(.*groupId|groupId.*Number" ...`: no matches in touched label ID chain files.
- `pnpm --filter chatbi build:test`: passed, Vite build completed.
- `pnpm --filter chatbi typecheck`: failed due existing workspace type resolution issues in `packages/hooks`, `packages/materials`, `packages/simple-router`, `packages/uno-preset` (missing React/@sa/axios/UnoCSS type resolution). No reported errors from the touched ontology label files in the displayed output.

## Regression Notes
- 标签语义新增仍 uses 当前左侧选中分组 ID，按字符串传递给后端。
- 标签语义编辑时数据语义组和数据语义 Select 使用字符串 value 匹配后端返回值，应显示 option label。
- `TableSemantics` 默认行为保持 number/value 原样，仅传入 `valueAsString` 的调用方使用字符串 value。

## AI Artifact Updates
- `.ai/runs/2026-07-24-label-semantic-string-id-echo/RUN_LOG.md` added.
- No updates needed for `.ai/prompts/`, `.ai/agents/`, `.ai/skills/`, `.ai/mcp/`, `.ai/context/`, `.ai/checklists/`, or `.ai/decisions/`.
