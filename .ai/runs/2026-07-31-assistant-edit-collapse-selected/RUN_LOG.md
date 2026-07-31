# 2026-07-31 助手编辑页折叠行交互调整与本体网络移除

## 需求

1. 助手编辑页（assistant-edit-drawer）删除本体网络相关内容。
2. 其余选择弹窗（数据语义 / MCP / 技能）保留，交互调整为：点击「+」打开选择抽屉；点击行/箭头像「示例」一样展开下方内容。
3. 补上添加逻辑：抽屉中勾选后，已选项展示在折叠行下方；列表限高最多 5 行，超出内部滚动。

## 修改文件

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`
  - 删除本体网络：`selectedOntologyIds` / `ontologyPickerOpen` 状态、本体网络 CollapseRow、本体网络 CapabilityPickerDrawer、`GlobalOutlined` 与 `ontologyPickerTabs` 引用。
  - `SectionKey` 扩展 `semantic` / `mcp` / `skill`，三行改为 `open={openMap.xxx}`、`onToggle={() => toggle('xxx')}`，「+」仍单独打开对应选择抽屉（extra 区域已 stopPropagation）。
  - 新增 `optionNameMap`（id→名称），通过抽屉列表加载回调（`onToolsLoaded` / 新增 `onOptionsLoaded`）回填，供下方已选列表展示名称。
  - 新增 `SelectedItemList` 组件：序号 + 名称单行省略，行高 32px，`maxHeight: 160`（5 行）超出 `overflowY: auto`；空态文案「暂未添加 xxx」。
  - 新增模式重置时同步清空数据语义/技能选中集合。
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/capability-picker-drawer.tsx`
  - 新增可选 prop `onOptionsLoaded`（与 ToolPickerDrawer 的 `onToolsLoaded` 对齐），列表加载成功后回传选项元数据；更新头注释。
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/capability-picker-configs.ts`
  - 删除 `ontologyPickerTabs` 配置及其独有接口引用（queryTag / queryDimensionList / queryKnowledgeIndicators / queryOntologyEntityList / queryOntologyRelationList）。

## 验证

- `npx tsc --noEmit --skipLibCheck`（apps/abi）：本次修改的 3 个文件无报错（仓库其余 pre-existing 报错与本次无关，整体 ExitCode 1 为既有状态）。
- grep 确认 modules 目录下无残留本体网络/ontology 引用（仅剩表语义仍在使用的 `normalizeRows` 共享工具导入）。
- 未运行浏览器回归（本地未启动服务）；建议人工验证：三行展开/收起、+ 号弹抽屉、勾选后下方列表回显、超过 5 项滚动。

## 风险与说明

- 已选集合仍未随保存提交（与改造前一致，待后端字段确认）。
- MCP 工具编辑回显场景下，若详情返回的工具 id 尚未通过抽屉加载出名称映射，下方列表暂显示带前缀的 id，打开工具抽屉加载列表后自动补全名称。

## 是否需要更新长期文档

- `.ai/context/`、`.ai/prompts/` 等暂不需要；本体网络移除属于该页面局部需求变化。

## 2026-07-31 追加：AI模型配置/开场引导加号与模型选择抽屉

### 需求

1. AI模型配置、开场引导两行也加上「+」号。
2. AI模型配置的选择抽屉：左侧展示「全部 + 所有供应商」，右侧展示模型列表。

### 修改文件

- 新增 `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/model-picker-drawer.tsx`
  - 复用 `GroupNavItem` / `PickerToolRow`，左侧「全部」+供应商目录（`fetchProviderList`），右侧模型列表（`fetchModelList`，按 `providerId` 本地过滤），支持搜索/全选/已选计数；打开后才请求并缓存，空间切换清缓存；id 带 `model_` 前缀。
- `assistant-edit-drawer.tsx`
  - AI模型配置行：「+」弹模型选择抽屉，行/箭头展开下方 `SelectedItemList`（同样最多 5 行滚动），`selectedModelIds` 暂不随保存提交。
  - 开场引导行：「+」弹编辑 Modal（TextArea 草稿确认后生效），行/箭头展开下方展示引导语；`prologue` 接入详情回显与提交 payload（原先硬编码空串）。
  - 新增模式重置时同步清空模型选中集合与开场引导。

### 验证

- `npx tsc --noEmit --skipLibCheck`（apps/abi）：本次文件无报错（仓库既有报错不变）。
- 建议人工验证：模型抽屉供应商切换过滤、勾选回显、开场引导编辑保存后提交 prologue 字段。

## 2026-07-31 追加：选择抽屉列表行增加描述列

### 需求

技能/MCP/工具列表行右侧增加描述，限制长度，超出省略号。

### 修改文件

- `tool-picker-drawer.tsx` 中共享行组件 `PickerToolRow`：
  - 名称列限宽 `maxWidth: 45%` 单行省略，Tooltip 改为展示名称；
  - 新增描述列：占右侧剩余宽度（flex:1 + minWidth:0），灰色 12px，单行超出省略号，Tooltip 展示完整描述；无描述不渲染。
  - 因为是共享组件，技能/MCP/内置工具/数据语义/模型五个抽屉列表同步生效（各自 fetchList 已映射 description 字段）。
- `capability-picker-configs.ts` 技能 fetchList：描述字段改用接口返回的 `summary`（原 `description` 字段无值）。

### 验证

- `npx tsc --noEmit --skipLibCheck`（apps/abi）：无新增报错。

## 2026-07-31 追加：推荐问题抽屉改为文本域批量编辑

### 需求

推荐问题抽屉去掉「批量添加」按钮，抽屉内直接展示提示语「请配置助手推荐问题，每行输入一条。」+ 大文本域，底部取消/确认。

### 修改文件（assistant-edit-drawer.tsx）

- 删除 batchModalOpen/batchText 状态、handleBatchAdd/handleDeleteQuestion、批量添加 Modal 及抽屉内列表+删除按钮。
- 新增 recDraft 草稿状态；打开抽屉（openRecDrawer）时用 recQuestions 换行拼接预填；确认（handleRecConfirm）按行解析 trim+去空后整体替换 recQuestions。
- 抽屉 footer 为取消/确认（CommonDrawer 透传 antd Drawer footer）；取消/关闭不生效。

## 2026-07-31 追加：顶部助手名称空值占位 + 编辑按钮

- 顶部栏名称为空（新增模式）时展示灰色占位文案「编辑助手名称」，后跟铅笔编辑按钮（EditOutlined），点击切换为输入框；输入框补充 placeholder「请输入助手名称」。
- 验证：tsc 无新增报错。

### 验证

- `npx tsc --noEmit --skipLibCheck`（apps/abi）：无新增报错。
