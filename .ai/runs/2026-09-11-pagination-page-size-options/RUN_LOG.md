# 分页器每页数量选项统一为 12/18/24/30

## 基本信息

- 日期：2026-09-11
- 任务名称：pagination-page-size-options
- 需求文件：无（用户口头需求，后经确认收窄：仅带卡片视图的模块改为 12、18、24、30；纯列表模块不动）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：UI 一致性调整（纯前端）

## 需求摘要

仅带卡片视图（卡片或卡片/列表可切换）的模块，分页器「每页数量」选项统一为 12/18/24/30，默认每页数量同步为 12。纯列表（不能切卡片）模块保持原样。

## 影响范围

- abi（卡片模块，保留改动）：my-assistant（含 ShareRecordList）、my-share、my-collect、recently-used、assistant-config、semantics-table-list、data-source、data-collection、data-dictionary（原无每页数量选择且卡片视图无分页，本次补齐）、job/{time,log,email}、effect-review、system/{skills,tools,plugin,model-card-list}、api-key、space-list、ontology-kg（entity/relation/label-meaning 各表与 `OntologyTablePagination`）。
- abi（纯列表模块，已全部还原）：log/{action,access}、manage/{user,role,post,group,role-auth}、space-{role,user}、ontology-kg 的 technical-jargon 与 recommended-inquiries、`hooks/common/{table,treeTable}.ts`。
- chat：`pages/chat/skill`、`pages/chat/workshop`（卡片）保留改动。
- dashboard：`my-screen/MyScreen`、`my-screen/ShareRecordList`、`home/project-list/ProjectList`（卡片）保留改动，原 12/20/30/50 统一为 12/18/24/30。
- `packages/hooks/src/use-table.ts`：已还原（无 apiParams 页面均为纯列表）。
- 不改动：会话内嵌表格（ChatWidget/ViewEle/ExploreRichText/CausalAnalysis）、数据采集 SQL 预览（BottomSql）、抽屉内未配置选项的 antd 默认分页。

## 修改文件

仅卡片模块，见 `git diff` 名单；核心：
- `apps/abi/src/pages/workbench/ontology-kg/components/OntologyTablePagination.tsx`（仅被带卡片视图的本体表使用）
- abi 各卡片模块页：my-assistant（含 ShareRecordList）、my-share、my-collect、recently-used、assistant-config、semantics-table-list、data-source、data-collection、job/{time,log,email}、effect-review、system/{skills,tools,plugin,model-card-list}、api-key、space-list、ontology-kg（entity/relation/label-meaning）
- `apps/chat/src/pages/chat/{skill,workshop}/index.tsx`
- `apps/dashboard/src/pages/{my-screen,home/project-list}/*`

已还原（纯列表模块，含曾误改的全部内容与 hooks）：log/{action,access}、manage/{user,role,post,group(+group-table),role-auth/[id],role-auth-drawer,role-auth-operate-drawer}、space-{role,user}、technical-jargon/TagTable、recommended-inquiries/{QuestionTable,useQuestionManagement}、`hooks/common/{table,treeTable}.ts`、`packages/hooks/src/use-table.ts`。

## 实现说明

- 卡片模块选项块替换为 `{12,18,24,30}条/页`（覆盖原 10/15/20/25/30、10/15/20、10/20/50、12/20/30/50、10/12/15/20/25/30、[10,20,30,40,50] 等形态），驱动分页器的默认值同步为 12（useState 初值、apiParams pageSize/page_size、INITIAL_PAGINATION/fePageSize、PAGE_SIZE）。
- 共享 hooks（`table.ts`/`treeTable.ts`/`use-table.ts`）未做任何修改：内置分页仅被纯列表页渲染，卡片页均 `pagination={false}` + 自定义 Select。
- 卡片/列表判定依据：页面存在 `viewMode('list'|'card')`、`abi-card-grid` 或卡片视图；`hideViewToggle`/无卡片均视为纯列表。
- 字典（data-dictionary）：分页条从 `DictionaryTable` 上提到 `index.tsx`，卡片/列表两视图共用（与 semantics-table-list/data-source 同模式）；卡片视图改为渲染前端切片后的当页数据；默认 12 条/页，下拉 12/18/24/30；抽屉内枚举表（EnumTable/EnumDrawer）未动。

## 测试记录

### 执行的命令

- `node scripts/tmp-update-page-size-options.mjs`（一次性替换脚本，带匹配计数断言，执行后已删除）
- `apps/abi`: `npx tsc --noEmit --skipLibCheck`
- `apps/chat` / `apps/dashboard`: `npx tsc --noEmit --skipLibCheck`（过滤改动文件）

### 测试结果

- 替换/回退脚本断言全部通过（一次性脚本，执行后已删除）。
- 全仓 grep 确认：纯列表模块无 `12条/页`/`pageSize: 12`/`|| 12` 残留；卡片模块选项与默认值一致。
- `table.ts`/`treeTable.ts`/`use-table.ts` 已不在 git diff 名单中（与 HEAD 一致）。
- tsc 输出中改动文件无新增错误（仅基线既有的模块解析/类型报错）。

### 失败和修复过程

- 初版脚本两处路径/期望不符（role-auth-operate-drawer 实际位于 `manage/role-auth/modules/`；manage/post 无 pageSizeVal 兜底行），已按实际路径补改并移除多余断言。

## 回归检查

- 卡片模块分页器默认值均落在新选项集合内，Select 不会出现无 label 的裸值；apiParams 与 Select 值同源，请求 size 与展示一致。
- 纯列表模块（含共享 hooks）已与改动前完全一致，行为无任何变化。

## Review 结果

改动均为字面量（选项/初值），无业务逻辑变更；未触碰会话内嵌表格与 SQL 预览分页；未给任何共享 hook 增加兜底逻辑。

## 发现的问题

- 仓库基线 tsc 存在大量既有报错（packages 模块解析等），与本次无关。
- chat/dashboard 的 eslint 配置仍为 eslintrc 旧格式，flat config 下无法运行，属基线问题。

## 本轮经验

分页器选项分散在各页面字面量中，后续可抽统一常量（如 `PAGE_SIZE_OPTIONS`）集中管理。需求范围（哪些模块算“所有模块”）应在动手前先与用户确认视图形态边界，避免误改纯列表模块；共享 hooks 的“顺手兜底”属于超范围改动，不应自行添加。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。

## 后续建议

如产品确认会话内嵌表格（ChatWidget/ViewEle 等）也要统一 12/18/24/30，可再单独调整。

## 未解决问题

无。
