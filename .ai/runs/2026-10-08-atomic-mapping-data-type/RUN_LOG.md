# 原子指标映射名称移除与数据类型提交修正

## 范围与最终行为

- 日期：2026-10-08；需求：`CURRENT_REQUIREMENT.md` 顶部同名章节。
- 开始时工作区干净；按开发、审查、回归和知识更新角色化阶段执行，未启动子代理。
- 一键映射移除独立“指标名称”列及对应表单字段、名称校验和批内重名检查，保留来源字段的“中文名称”。
- 加载数据语义字段后，每行数据类型默认设置为“数值”（`num`），仍可修改并执行原有必填校验。
- 请求将数据类型放在 `techId[].dataType`，移除顶层 `dataType` 和独立指标名称 `bizName`；保持外层对象数组、`techId` 数组以及来源名称和聚合配置。
- 业务代码仅修改 `KnowledgeAtomicMappingDrawer.tsx`、`utils/atomicMapping.ts`、`types/metricModeling.types.ts`，同步维护两份直接相关既有测试断言。

## 验证与回归

- 按用户“无需测试构建”要求，未运行测试、类型检查、构建或浏览器联调；测试断言更新不代表运行通过。
- `git diff --check` 通过；源码搜索确认映射模块不再引用独立指标名称或批内重名工具。
- 源码检查：表单初始化写入 `num`，选中行数据类型经映射工具写入 `techId` 对象，已有字段类型 `fieldType` 保持不变。
- 源码检查：数据类型仅校验已选且未映射行；字段加载失败处理、聚合方式校验、提交成功后关闭与刷新链路保持不变。
- 未修改编辑页、标签语义、聚合字典、接口地址、全局样式或抽屉宽度。

## AI 系统更新

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 并生成本运行记录。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/` 均无需更新。
- 使用 `frontend-dev-guidelines` 与 `vercel-react-best-practices` 保持既有 React/Ant Design 表单边界；默认值在现有加载流程设置，没有新增状态同步副作用、框架或依赖。
