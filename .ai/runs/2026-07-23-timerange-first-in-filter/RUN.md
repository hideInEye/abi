# 2026-07-23 高级筛选面板「时间范围」置于首位

## 需求
用户要求：ABI 高级筛选面板中把「时间范围」筛选项放到第一个位置；但**本体网络-关系配置**页面的高级筛选不改（时间范围保持原位）。

## 目标 / 非目标
- 目标：多筛选项的高级筛选面板将「时间范围」移到第一位。
- 非目标：不改关系配置（relation）；不改仅有「时间范围」单项的面板（无需调整）；不改接口、查询参数、表格逻辑。

## 影响范围（已改）
- `apps/abi/src/pages/workbench/ontology-kg/entity/components/EntitySearch.tsx`（实体编码/标签类型/时间范围 → 时间范围首位）
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeSearchBar.tsx`（指标类型/状态/时间范围）
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionSearchBar.tsx`（英文名/时间范围）
- `apps/abi/src/pages/workbench/job/time/index.tsx`（任务状态/时间范围）
- `apps/abi/src/pages/workbench/job/email/index.tsx`（任务状态/时间范围）
- `apps/abi/src/pages/component/applications/api-key/index.tsx`（状态/时间范围）
- `apps/abi/src/pages/component/data/effect-review/index.tsx`（场景类型/审核状态/时间范围）

## 明确未改
- `apps/abi/src/pages/workbench/ontology-kg/relation/index.tsx`（关系配置，按用户要求保持不变）
- 仅含单个「时间范围」项：space-list、data-collection、data-dictionary（已在首位，无需调整）
- job/log：只有「任务执行时间/执行状态」，无「时间范围」项，不涉及

## 改动方式
仅调整 `filters` 中 `<SearchFilterField>` 块顺序（纯 JSX 重排），未改控件属性、事件、表单字段名与查询逻辑。

## 验证
- 逐块 SearchReplace，行数增删对称（各文件 +10/-10 或 +11/-11）。
- 语言服务器初始化中，未能即时输出类型检查结果；改动为纯顺序调整，无逻辑变更，风险低。

## 补充（第二轮：补齐遗漏页面）
用户指出工具管理/技能管理/系统管理/空间管理未改。已对以下有时间筛选的页面追加置顶改造：
- `apps/abi/src/pages/component/system/tools/index.tsx`（状态/时间范围）
- `apps/abi/src/pages/component/system/skills/index.tsx`（状态/时间范围）
- `apps/abi/src/pages/manage/user/index.tsx`（手机号/用户状态/创建时间）
- `apps/abi/src/pages/manage/menu/index.tsx`（菜单状态/创建时间）
- `apps/abi/src/pages/manage/dept/index.tsx`（状态/创建时间）
- `apps/abi/src/pages/manage/role/index.tsx`（状态/创建时间）
- `apps/abi/src/pages/space/space-role/index.tsx`（状态/创建时间）
- `apps/abi/src/pages/space/space-menu/index.tsx`（状态/创建时间）

注：`manage/*`、`space/*` 使用 label「创建时间」，均由末位移至首位（纯 JSX 重排）。model/plugin 仅有时间项，已在首位。

### 未新增时间筛选（用户确认「暂不新增」「不改了」）
- `space/space-user`（仅成员类型）、`manage/group`（仅名称输入）、`manage/post`（无高级筛选）当前无时间筛选，按用户要求保持现状。

## 后续
无需更新长期文档。
