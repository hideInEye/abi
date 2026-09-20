# 本体网络列表分页快速跳转 Run Log

## 基本信息

- 日期：2026-09-15
- 任务：ontology-pagination-quick-jumper
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` 中“本体网络列表分页快速跳转”
- 影响应用：`apps/abi`

## 最终行为

1. 本体网络实体、关系、指标建模、维度建模和标签语义五类主列表通过共用 `OntologyTablePagination` 始终显示“跳至 [页码] 页”。
2. 有效页码按回车后复用原分页回调；空值、非数字和超出总页数的值不会触发翻页。
3. 共用分页器不再依赖 Ant Design 内置 `showQuickJumper` 的条件渲染，因此列表只有一页时也会显示跳转控件。
4. 维度详情中的“关联指标”列表保留 Ant Design 分页快速跳转；原 `handleTableChange`、当前页、每页条数、总数和接口请求参数不变。
5. 推荐问法和技术术语列表现有手写“前往 [页码] 页”跳转能力保持不变。
6. `pagination={false}` 且没有独立分页器的抽屉内静态表格不在本轮新增分页，避免改变需求外的数据展示行为。

## 修改文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/dimensionOperateDrawer/RelatedMetricsTab.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/components/OntologyTablePagination.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/components/OntologyTablePagination.module.scss`
- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `.ai/runs/2026-09-15-ontology-pagination-quick-jumper/RUN_LOG.md`

## 静态核对

- 使用 `rg` 扫描 `ontology-kg` 下的 `Pagination`、`OntologyTablePagination`、Table `pagination` 配置和手写跳转控件。
- 确认五类主列表全部复用 `OntologyTablePagination`：维度当前能显示是因为数据超过一页，指标、标签、实体、关系在单页数据下会受到 Ant Design 底层条件渲染限制。
- 检查本地 `rc-pagination` 实现，确认内置快速跳转条件为 `total > pageSize`；共用组件现改用自身始终渲染的跳转控件，不再受该条件影响。
- 两处手写分页继续包含 `quick-jumper`，关联指标表格保留 `showQuickJumper: true`。
- `git diff --check`：通过。

## 测试与构建

- 按用户明确要求，本轮未运行单元测试、类型检查或构建。

## 回归边界

- 未修改列表接口、查询参数、分页回调、页容量选项、全局 Ant Design 配置或全局样式；跳转样式仅位于共用组件的 CSS Module。
- 未修改本体网络之外的业务代码。

## AI 系统更新判断

- `.ai/requirements/`：已更新本轮目标、非目标、影响范围、验收标准和验证要求。
- `.ai/runs/`：已新增本 Run Log。
- `.ai/context/`、`.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`：不需要更新；本轮未改变架构、长期开发规则、角色流程或外部协议。
