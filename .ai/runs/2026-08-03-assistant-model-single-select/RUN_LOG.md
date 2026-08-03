# 运行记录：助手「AI模型配置」单选落库

- 日期：2026-08-03
- 类型：功能改动（新功能/字段接入）
- 触发需求：口头确认 —— 模型改单选，列表只展示大模型（不展示嵌入模型），嵌入模型固定默认 6，模型直接存 `chatModelId` 并回显匹配。

## 目标

1. 助手编辑页「AI模型配置」由多选改为单选。
2. 模型选择列表仅展示语言模型（大模型），过滤掉向量/嵌入模型。
3. 保存/上线时把选中模型 id 存入 `chatModelId`（单值 Long），嵌入模型固定 `embedModelId: 6`。
4. 编辑回显：读 `detail.chatModelId` 反向匹配选中项，并解析模型名用于展示。

## 非目标

- 不改动 数据语义 / 技能 / 工具 的既有多选逻辑与提交结构。
- 不实现 `modelSetting`（模型高级参数 JSON）落库；本次只存关联模型 id。
- 不做嵌入模型的 UI 选择（固定 6）。

## 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/model-picker-drawer.tsx`
  - 新增 `singleSelect` prop；单选模式隐藏「全选」，改为「模型列表 / 已选 1 项 / 未选择」表头。
  - `loadData` 过滤 `String(m.modelType) === '1'`（仅语言模型/大模型）。
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`
  - 新增 `handleModelSingleSelect`：选中即替换、再次点击同项取消（单选语义）。
  - `buildPayload`：由选中项 `model_<id>` 反解出 `chatModelId`（未选则不传）；固定 `embedModelId: 6`。
  - `buildPayload`：新增 `schemaSemantics`（`schema_<id>` → `{schemaConfig:[{type:'schema',id}]}`）与 `skills`（`skill_<id>` → `{skillConfig:[{type:'skill',id}]}`）落库。
  - `loadDetail`：`chatModelId` 回显为 `model_<id>`，并调用 `fetchModelList` 解析模型名合入 `optionNameMap`；新增 `schemaSemantics`/`skills` 反解回显选中态。
  - `ModelPickerDrawer` 使用处传 `singleSelect`，`onToggle` 改为 `handleModelSingleSelect`，`onBatchToggle` 置空。
  - 新增 import：`fetchModelList` from `@/service/api`（barrel 已 re-export system-manage）。

## 关键约定

- 模型类型语义（见 `constants/manage.tsx` 的 `MODAL_TYPE_OPTIONS`）：`'1'` = 语言模型（大模型），`'2'` = 向量模型（嵌入模型）。
- 选中项 id 前缀 `model_<modelId>`，落库时 `chatModelId = Number(id 去前缀)`。
- 接口字段：`chatModelId` (Long，关联对话模型，单值)、`embedModelId` (Long，固定 6)。

## 验收标准

1. 打开模型选择抽屉：只出现语言模型，无向量模型；无「全选」，只能选一个。
2. 保存/上线请求体：含 `chatModelId`（选中时）与 `embedModelId: 6`；未选模型时不带 `chatModelId`。
3. 编辑已有助手：模型行回显选中并显示模型名。

## 验证

- 类型检查：对两个改动文件执行 `tsc --noEmit`（apps/abi），两文件均无报错（项目其余为既有报错，与本次无关）。
- 运行时验证：待联调（后端 `chatModelId` 匹配需真实数据）。

## 回归检查

- 数据语义 / 技能 / 工具 的多选 `makeToggle` / `makeBatchToggle` 仍在使用，未受影响。
- 模型多选相关的 `makeBatchToggle(setSelectedModelIds)` / `makeToggle(setSelectedModelIds)` 已移除引用，无残留未用告警。

## 回显契约修正（后端返回结构）

- 详情接口 `get` 返回结构：配置字段（`appPrompt`/`prologue`/`recQuery`/`chatModelId`/`embedModelId`/`schemaSemantics`/`skills`/`tools`）嵌在 `data.versions[]` 中，顶层 `data` 仅有 `appName`/`status`/`enableDebug`/`publicAccess`/`description` 等基础字段。
- `loadDetail` 修正：取 `versions` 中 `versionId === latestVersionId` 的版本（降级取 `versions[0]`，再降级取顶层）作为配置来源；基础字段仍读顶层。此前从顶层读配置字段导致 6 项全部回显失败。

## 名称随 config 落库（免拉列表回显）

- 需求：存的时候把名称带上，否则回显都是 id（需先打开抽屉拉列表才能解析名称）。
- `buildPayload`：`toolConfig`/`schemaConfig`/`skillConfig` 每项新增 `name`（取自 `optionNameMap[id]`，即打开抽屉选中时已存的名称）。
- `loadDetail`：回显时从 `toolConfig`/`schemaConfig`/`skillConfig` 的 `c.name` 取出合入 `optionNameMap`，进编辑页即显示名称，无需再拉列表。
- 依赖前提：后端将 `toolConfig`/`schemaConfig`/`skillConfig` 作为 JSON 原样存取（已知返回为原样回显）。若后端做字段白名单校验过滤掉 `name`，则回退到“打开抽屉后由 `optionNameMap` 解析名称”的旧行为，选中态回显不受影响。
- AI模型：`chatModelId` 为单值 Long 无法携带 name，仍走 `fetchModelList` 解析名称。

## 是否需要更新其他 .ai 资产

- context：无需变更。
- 已通过记忆沉淀「AI模型配置单选与模型类型过滤规则」「模型类型字段语义定义」两条项目约定。
