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
