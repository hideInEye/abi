# 项目实例版：基于当前项目的新功能开发对话模板

```text
请在当前 xindun monorepo 中开发一个新功能：为 `apps/abi/src/pages/workbench/ontology-kg/entity` 的实体编辑流程增加颜色预设选择。

你必须先读取：
- `AGENTS.md`
- `.ai/README.md`
- `.ai/context/PROJECT_OVERVIEW.md`
- `.ai/context/ARCHITECTURE.md`
- `.ai/context/MODULE_MAP.md`
- `.ai/context/CODE_STYLE.md`
- `.ai/context/UI_STYLE_GUIDE.md`
- `.ai/context/API_CONTRACTS.md`
- `.ai/context/TESTING_STRATEGY.md`
- `.ai/requirements/CURRENT_REQUIREMENT.md`（只读模板）
- 本轮 `.ai/runs/<date>-<task-name>/REQUIREMENT.md`（实际需求；缺失时先参考模板创建）

当前项目规则：
- 每轮任务或需求变更在独立 runs 目录保存 REQUIREMENT.md，仅本地查看；不修改 CURRENT_REQUIREMENT.md 模板，不覆盖旧轮次需求。
- ABI 页面代码放 `apps/abi/src/pages/...`。
- ABI API 调用放 `apps/abi/src/service/api/...`，请求走 `apps/abi/src/service/request/index.ts`。
- ABI UI 使用 Ant Design + UnoCSS + `apps/abi/src/styles/css/global.css`，不要引入 Tailwind。
- 本体知识图谱 ID 使用 `OntologyNetworkId = string | number`，不要强制转 number。
- 测试使用 Vitest，同域新增或更新 `*.test.ts`。

执行步骤：
1. 检查 `git status`，不要恢复当前 README/ref-request 删除。
2. 定位实体模块真实文件。
3. 制定计划，说明是否需要修改 API、状态、UI 和测试。
4. 实现颜色预设，保持现有提交参数 `color` 兼容。
5. 补充 Vitest 测试，覆盖默认值、回显和 fallback。
6. 运行 `pnpm test` 和 `pnpm --filter chatbi build`。
7. 记录根 `pnpm lint/type-check` 当前不可用，不把它们当通过。
8. 写 `.ai/runs/<date>-ontology-entity-color-presets>/run-log.md`。
9. 判断是否更新 `.ai/context/` 或 `.ai/skills/`。

完成输出：修改摘要、文件列表、测试结果、构建结果、风险、run log 路径。
```

# 空白模板版：新功能开发对话模板

```text
你是当前项目的新功能开发执行者。请先读取 `AGENTS.md`、`.ai/README.md`、关键 context 和本轮 `.ai/runs/<date>-<task-name>/REQUIREMENT.md`。实际需求文件缺失时，先参考 `.ai/requirements/CURRENT_REQUIREMENT.md` 只读模板创建；不要修改模板或覆盖其他轮次需求。

执行：
1. 检查 git status。
2. 分析需求目标/非目标/影响范围。
3. 制定计划。
4. 读取真实代码。
5. 实现功能。
6. 添加或更新测试。
7. 运行验证。
8. 做回归检查。
9. 生成 run log。
10. 判断是否更新 `.ai/`。

禁止：不读上下文直接开发、没有需求文件直接开发、未验证声称完成、无说明大范围重构。
```
