# RUN LOG: dimension edit schema list by semantics group

## 基本信息

- 日期: 2026-08-14
- 模块: `apps/abi/src/pages/workbench/ontology-kg`
- 需求来源: 用户本轮反馈
- 说明: `.ai/requirements/CURRENT_REQUIREMENT.md` 仍是 chat 报告旧需求，和本轮本体网络维度编辑回显修复不一致；本次按用户最新反馈执行。

## 问题

维度编辑时，详情接口 `/api/abi-ontology/api/v1/ontology/dimension/detail/{id}` 返回了 `semanticsGroupId` 和数据语义 id，但前端只查询了全部数据语义组：

- `/api/copilot/v1/group/list?groupName=&groupType=shema&pageNum=1&pageSize=100&spaceId=140`

没有继续根据详情中的 `semanticsGroupId` 查询该语义组下的数据语义：

- `/api/copilot/v1/schema/list?bizName=&groupId=2084895219285815309&pageNum=1&pageSize=1000`

导致 TreeSelect 没有对应 schema leaf，编辑态只能显示数据语义 id，无法显示名称。

## 修复

- `TableSemantics` 新增 `selectedGroupId` 入参。
- 编辑维度时由 `DimensionOperateDrawer` 将详情中的 `semanticsGroupId` / `semanticGroupId` 显式传给 `BaseInfoTab`，再传给 `TableSemantics`。
- `TableSemantics` 在编辑/回显时优先使用 `selectedGroupId` 查询 `/api/copilot/v1/schema/list`。
- schema list 查询 `pageSize` 从 `100` 调整为 `1000`，与本次联调接口要求一致。
- `Form.useWatch` 增加 `preserve: true`，降低未注册字段回填时 watch 不触发的风险；但编辑态不再依赖它作为唯一来源。

## 验证

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/utils/form-scroll.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
  - 结果: 通过，2 个测试文件，19 条用例。
- `git diff --check`
  - 结果: 通过。
- `pnpm --filter chatbi build`
  - 结果: 通过。
  - 备注: 仍有既有 Vite/UnoCSS 警告，包括 `selector-popover` / `selector-trigger` 图标加载失败、动态/静态导入 chunk 警告、chunk 体积警告；未阻断构建。

## 回归检查

- 未改变数据语义组接口查询。
- 未改变 TreeSelect “只能选择子级数据语义”的交互。
- 未改变维度保存 payload。
- 未回滚或覆盖工作区既有未提交改动。

## 长期文档评估

- `.ai/context/`: 暂不更新，本次是局部 bug fix。
- `.ai/checklists/`: 可后续补充“编辑态回显依赖详情 id 时，不能只依赖未注册字段 useWatch”作为前端表单检查项。
- `.ai/requirements/`: 当前 `CURRENT_REQUIREMENT.md` 与实际需求不一致，建议后续维护者更新。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/decisions/`: 暂不需要更新。
