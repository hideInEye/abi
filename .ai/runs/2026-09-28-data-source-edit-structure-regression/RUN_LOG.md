# 数据源编辑配置结构回归修复运行记录

## 结果

- 删除非 Excel 数据源 `configuration` 的 `Array.isArray` 强制校验，恢复既有对象结构直接展开到编辑记录。
- `sheets` 继续保存解析后的原始配置对象，未包装或转换为数组。
- 保留损坏 JSON 的错误处理和 Excel `excelConfig` 的数组结构校验。

## 提交审计

审计提交：`758f596a1e6910f09f2831ba09b95208989e000c`。

- ABI 首页的两个 `Array.isArray` 用于读取空间列表数组，并保留提交前的 `response.data.rows` 回退，不会把对象型配置转换为数组。
- 数据源编辑新增的两个判断中，非 Excel `configuration` 数组限定与实际创建端 `JSON.stringify({ ...表单字段 })` 冲突，已修复；Excel `excelConfig` 在提交前代码中即通过 `[0]` 读取，数组契约保持不变。
- Dashboard `viewProjectData` 排除数组是为了保证 `ProjectDataType` 项目根对象契约。
- Dashboard `renderer-registry`、`runtime-config` 中的数组判断属于该提交明确实施的安全 JSON DSL 校验；其中过滤步骤、条件集合、地图中心点本身定义为数组，不是对既有接口响应的任意改形。
- Database 数据选择从 `response.data.data` 调整为 `response.data?.data ?? response.data`，保留原嵌套结构并增加缺少外层包装时的回退，没有把对象改成数组。
- 未发现第二处与本次相同的“既有对象被无依据强制限定为数组”的修改，因此未改动其他模块。

## 验证

- `dataSourceEdit.test.ts`：3 条用例通过，覆盖对象配置、索引数组兼容、损坏 JSON 和非法 Excel 配置。
- 相关 ESLint：0 error；源文件保留 3 条该提交已有的属性排序/尾逗号 warning，未为本需求进行无关格式化。
- `git diff --check`：通过。
- 未执行无关模块测试或全量构建。

## AI 系统更新判断

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 与本运行记录。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
