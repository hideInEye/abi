# 原子指标映射中文名称校验

## 范围与结果

- 日期：2026-10-08；需求：`CURRENT_REQUIREMENT.md` 顶部同名章节。
- 开始时存在上一轮映射字段、类型、测试和需求记录的未提交修改，本轮在这些修改上继续，不覆盖其他改动。
- 业务代码仅修改 `KnowledgeAtomicMappingDrawer.tsx`：将“中文名称”接入现有表单，初始化来源名称，复用创建页 `validateKnowledgeIndicatorName` 和 600ms 输入防抖校验。
- 校验规则包含必填、1–50 字符、禁止纯数字、仅允许中文/英文/数字/下划线、禁止 `_#_` 和接口重名检查。共享校验器保持不变。
- 重名检查传入当前分组和来源表中文名，检查实际提交的完整映射名称。已映射行不触发重名校验；保存仅校验已选且未映射行。
- 提交从表单读取已校验的中文名称，并沿用原报文构造方法；未恢复独立“指标名称”列。默认 `num`、`techId[].dataType`、聚合配置与提交成功后关闭逻辑不变。

## 验证与回归

- 按同一修复任务中用户“不用测试构建”的要求，未运行测试、类型检查、构建或浏览器验证。
- 更新 `KnowledgeAtomicMappingDrawer.test.tsx` 的直接相关断言：中文名称字段接线、无效名称、映射名称重名检查参数及失败、已选行校验、表单值进入报文、校验失败不提交。未执行，不宣称用例通过。
- `git diff --check` 通过；源码检查确认名称校验返回 Promise，保存等待 `validateFieldsAndScroll`；校验失败返回后不会执行映射请求。
- 源码回归确认名称校验与报文构造使用同一来源表名称和表单中文名称，既有空白修剪规则保持一致。
- 未修改公共校验规则、接口地址、全局样式、指标编辑页、标签语义及无关模块。

## AI 系统更新

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 并生成本运行记录。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/` 无需更新。
- 按开发、审查、回归和知识更新角色化阶段处理，未启动子代理。
- `frontend-dev-guidelines` 与 `vercel-react-best-practices` 用于复用既有 React/Ant Design 表单：中文名称由表单单独维护，避免表单值与行状态双份同步；未引入新框架或依赖。
