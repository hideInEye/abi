# Run Log: 指标自定义表达式接入系统字典

## 基本信息

- 日期：2026-09-22
- 任务名称：metric-expression-dictionaries
- 任务类型：本体网络指标建模功能调整
- 需求来源：用户指定系统字典类型、复合自定义技术定义布局及来源字段插入交互

## 完成结果

1. 自定义原子指标的快捷函数改为合并读取 `ontology_fun`、`ontology_atomic`。
2. 复合指标自定义模板增加数据语义、来源字段插入入口、表达式和快捷函数，快捷函数合并读取 `ontology_fun`、`ontology_derivative`。
3. 字典请求使用 `/api/system/dict/data/list` 既有服务，固定 `pageNum=1&pageSize=1000`；仅在两组请求均通过成功门禁后更新选项，失败时清空并允许重试。
4. 复合指标来源字段沿用业务限定条件的维度、度量、日期分组。点击字段时把字段技术名称插入表达式当前光标或选区位置，控件不保留选中值。
5. 点击复合指标快捷函数时插入函数模板并把光标放到参数位置，之后可以继续点击来源字段完成表达式。
6. 复合自定义提交时从表达式识别实际引用字段，生成 `relItemId` 和 `techId` 字段数组；表达式未引用已知来源字段时阻止提交。
7. 其他复合模板、全局样式和系统字典维护模块未修改。

## 验证记录

- 定向 Vitest（字典适配、来源字段识别、UI 契约）：3 个文件、18 个用例全部通过。
- API 响应契约与提交报文 Vitest：2 个文件、63 个用例全部通过。
- 指标建模目录 Vitest：176 个用例通过；既有 `IndicatorSearchSelect.test.tsx` 的 3 个用例仍因 React/ahooks `Invalid hook call` 基线问题失败，与本次修改无关。
- 修改文件 ESLint `--quiet`：通过。
- ABI TypeScript：仓库全量检查仍有既有基线错误；过滤 `metric-modeling` 后无本次模块错误输出。
- `git diff --check`：通过。
- 未执行全量构建，符合当前需求测试范围。

## 回归检查

- 原子指标仍要求先选择来源字段，函数按钮会插入完整字段表达式。
- 复合自定义来源字段不写入持久选中态，可重复点击同一字段并按当前光标插入。
- 非自定义复合模板继续使用原有字段、校验和表达式生成逻辑。
- 未修改全局 Ant Design 样式，未覆盖工作区内无关未提交改动。

## AI 系统更新评估

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 和本运行记录。
- 本次不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
