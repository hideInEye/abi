# 2026-07-30 数据集 SQL 模式「选择表」抽屉（表/字段勾选，前端先行）

## 需求

用户指令：数据集 SQL 创建页「选择表」图标点击后打开抽屉，支持表、字段勾选（表折叠默认只展示表级勾选，展开后展示字段选择区：计数/搜索/物理字段名/字段备注）。历史勾选记录保存与回显需要后端接口——用户明确「先把前端实现了，接口存的话等接口好了对接」。

对应 `.ai/requirements/CURRENT_REQUIREMENT.md` 中「2026-07-30 追加：数据集 SQL 模式『选择表』抽屉」。

## 修改内容

### 新增 apps/abi/src/pages/workbench/data-preparation/data-collection-operate/modules/TableFieldPickerDrawer.tsx

- 基于 `CommonDrawer`（遵守 UI_STYLE_GUIDE 抽屉规则），title「选择表」+ icon + description，footer 取消/确定。
- 勾选模型 `TableFieldSelection = Record<tableName, originName[]>`：key 存在即表被勾选。
- 表级 Checkbox 在 Collapse header 内（stopPropagation 避免触发折叠）：
  - 勾选：字段未加载则先按需加载，然后全选该表字段；
  - 取消：移除该表；
  - 字段已加载时按数量精确计算全选/半选（indeterminate），未加载时按是否有勾选记录展示。
- 展开面板 `FieldPanel`：「字段选择（已选/总数）」计数 + 字段名搜索（本地过滤）+ ATable rowSelection（物理字段名/字段备注两列），与既有 `FieldSelectModal.TableSelection` 同风格。
- 字段全部取消勾选时联动取消表勾选。
- 按需加载带并发去重（loadPromiseRef），复用调用方传入的 `fetchFields`。
- 打开抽屉时以外部 value 快照初始化草稿，取消关闭不影响已确认勾选。
- 组件内标注 TODO(接口对接)：接口就绪后在打开时拉取回显、确定时提交。

### 修改 apps/abi/src/pages/workbench/data-preparation/data-collection-operate/modules/SqlModeEditor.tsx

- 新增 `tablePickerOpen` / `tableSelection` 状态；「选择表」图标 onClick 打开抽屉，有勾选时图标高亮（#3467FF）。
- `fetchFields`（已有的 getFieldByDataSource 缓存封装）直接传给抽屉复用。
- 切换数据源时同时清空 `tableSelection`；抽屉 `key={sourceId}` 绑定数据源，切换时重挂载以重置抽屉内部字段缓存。

## 验证

- `npx tsc --noEmit -p apps/abi/tsconfig.json`：两个改动文件无任何报错；仓库共 716 个 pre-existing 报错（含 data-collection-operate 下未触碰旧文件），与本次改动无关。
- 运行验证：dev server 已启动（9527 被占用，实际 http://localhost:9528），用户选择自行手动验证，AI 未做浏览器冒烟（用户取消了自动化浏览器调用）。
- 用户手动验证结果：通过（用户确认「没问题了」）。

## 风险 / 未解决事项

- 勾选结果目前仅存于 SqlModeEditor 组件状态：离开页面即丢失，等后端接口提供保存/回显后对接（TODO 已标注）。
- 字段禁用（如截图中 account_number 灰色锁定）未实现，等接口定义禁用标记后追加。
- 勾选结果暂未参与 SQL 自动补全范围限定或 AI 生成上下文，用途待需求确认。
- 抽屉一次性渲染全部表的 Collapse 项；表数量极多时如有性能问题可后续加表名搜索/虚拟滚动。

## 是否需要更新 .ai 长期文档

- `.ai/context/`：无需，属局部功能新增，抽屉遵循既有 CommonDrawer 规则。
- 接口对接完成后建议在 `API_CONTRACTS.md` 补充勾选记录接口约定。

---

# 同日追加：SQL 模式保存参数对接（后端口径）

## 需求

后端确认口径（经与用户两轮确认，用户糾正过一次理解）：

- SQL 原文仍存 `union[0].currentDs.tableInfo.sql`（union 假节点不动）；`unionSql` 保持原样（union 序列化）；
- 新增参数 `viewHistory`：存「选择表」勾选的表结构（平铺，格式对齐快速创建的 union）；字段名经两次调整：存 unionSql → 新增 viewInfo → 最终定为 viewHistory（unionSql 始终恢复原样）；
- SQL 模式不传 `allFields`；新增走 `addDataSet`，编辑走 `saveDataSet`。

勾选记录保存/回显由此顺带解决（前一阶段的 TODO 闭环），无需单独接口。

## 修改内容

### TableFieldPickerDrawer.tsx

- `TableFieldSelection` 从 `Record<tableName, originName[]>` 升级为 `Record<tableName, PickerFieldItem[]>`（字段对象含 comment），保存时直接组装 `currentDsFields`；内部勾选逻辑同步调整（rowSelection keys ↔ 对象数组换算）。
- 移除已完成的 TODO(接口对接) 注释。

### SqlModeEditor.tsx

- 勾选状态提升为受控 props：`tableSelection` / `onTableSelectionChange`，组件内只保留抽屉开关；未触碰用户新加的 AI 生成 SQL 逻辑。

### [id].tsx

- 新增页面级 `sqlTableSelection` 状态，传给 SqlModeEditor；切换数据源（含 Modal.confirm 分支）时清空。
- `saveSql`：新增 `viewHistory` 参数存勾选表结构 `[{ currentDs: {sourceId, tableName}, currentDsFields: [{...field, checked: true}] }]`；`unionSql`/`union` 保持原样；删除 `allFields` 传参；按 `id && id !== '0'` 分流 saveDataSet/addDataSet（此前一律 saveDataSet，新增场景不对）。
- `getDetail`：sql 模式下解析 `viewHistory` 回显勾选（无效/假节点跳过；解析失败静默不回显）。

## 验证

- `npx tsc --noEmit`：三个改动文件 0 报错（仓库既有报错不变）。
- 接口联调待用户与后端验证（保存报文 + 编辑回显）。

## 风险 / 未解决事项

- 未勾选任何表时 `viewHistory` 为 `"[]"`，是否允许由后端校验（前端未拦截）。
- 旧 SQL 数据集（无 viewHistory 字段）编辑时不回显勾选，重新保存后自动补齐。
- 字段禁用（截图 account_number 灰色锁定）仍未实现，等后端给禁用标记。
