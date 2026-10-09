# AI Development Operating System

`.ai/` 是本仓库的 AI 开发操作系统，用于让后续 Codex、Claude Code、Cursor 或其他 AI 在同一套项目事实、规则、SOP 和复盘机制下继续开发。

## 目录职责

- `context/`：项目事实、架构、模块边界、代码风格、测试、构建、部署、风险和技术债。
- `prompts/`：可直接复制给 AI 的任务 Prompt 模板。
- `agents/`：角色化执行阶段。当前环境可用这些文件模拟 subagent。
- `skills/`：可执行 SOP，覆盖启动项目、补测试、调试、回归、更新 AI 系统等常见动作。
- `mcp/`：按当前项目技术栈推荐的 MCP 能力和使用规则。
- `requirements/`：需求入口和规格模板。开发前必须先填写 `CURRENT_REQUIREMENT.md`。
- `runs/`：每轮开发记录模板和实际 run log，仅在本机生成、查看；整个目录由 Git 忽略，不加入版本控制。
- `decisions/`：架构决策记录。
- `checklists/`：编码前、提交前、完成前、测试和知识更新检查清单。

## 初始化后如何使用

1. 新任务开始前读取 `AGENTS.md` 和本 README。
2. 填写 `.ai/requirements/CURRENT_REQUIREMENT.md`。
3. 按需求类型选择 `.ai/prompts/` 中的模板。
4. 根据影响范围调用或模拟 `.ai/agents/` 中的角色。
5. 按 `.ai/skills/` 执行开发、测试、调试和回归。
6. 完成后创建 `.ai/runs/<date>-<task-name>/`，记录命令、结果、风险和知识更新建议。

## 新功能开发流程

1. 填写 `requirements/CURRENT_REQUIREMENT.md`，明确目标、非目标、影响范围和验收标准。
2. 使用 `prompts/10_NEW_FEATURE_CONVERSATION_TEMPLATE.md`。
3. 读取 `context/PROJECT_OVERVIEW.md`、`ARCHITECTURE.md`、`MODULE_MAP.md`、`CODE_STYLE.md`、`TESTING_STRATEGY.md`。
4. 先定位所属应用或 package：`apps/abi`、`apps/chat`、`apps/dashboard` 或 `packages/*`。
5. 按现有架构增加页面、API、状态或工具函数。
6. 补充 Vitest characterization/unit tests，至少覆盖新增纯函数、适配层或关键边界。
7. 运行相关 lint/typecheck/test/build 命令。
8. 写 run log，并判断是否更新 `.ai/`。

## Bug 修复流程

1. 使用 `prompts/11_BUGFIX_CONVERSATION_TEMPLATE.md`。
2. 先复现或构造最小失败场景。
3. 优先添加回归测试，再修复。
4. 对鉴权、请求封装、路由、微前端集成、设计器状态等高风险模块，必须检查影响范围。
5. 修复后运行相关测试并写 run log。

## 重构流程

1. 使用 `prompts/12_REFACTOR_CONVERSATION_TEMPLATE.md`。
2. 明确重构目标、非目标和回滚方案。
3. 先补 characterization tests，保护当前行为。
4. 小步修改，避免跨应用同步重构。
5. 更新 `context/ARCHITECTURE.md`、`MODULE_MAP.md` 或 `decisions/DECISION_LOG.md`。

## 测试补充流程

当前仓库已有根脚本 `pnpm test`，实际执行 `vitest run --coverage`，测试文件目前集中在 `apps/abi/src/pages/workbench/ontology-kg/`。新增测试优先使用现有 Vitest 风格，优先覆盖纯函数、API 参数映射、状态转换、错误处理和路由守卫。

## 每轮复盘流程

每轮开发结束后必须：

1. 使用 `runs/RUN_LOG_TEMPLATE.md` 建立本轮记录。
2. 记录修改文件、测试命令、失败与修复过程、回归结果。
3. 判断是否需要更新 `context/`、`prompts/`、`agents/`、`skills/`、`mcp/`、`checklists/` 或 `decisions/`。
4. 如果发现稳定规则，写入长期文档；如果只是临时问题，写入 run log 或 `context/KNOWN_RISKS.md`。

## Prompt / Agent / Skill / MCP 更新规则

- 项目事实变化：更新 `context/`。
- 开发流程变化：更新 `prompts/` 和 `checklists/`。
- 角色分工变化：更新 `agents/`。
- 可复用操作步骤变化：更新 `skills/`。
- 外部工具能力变化：更新 `mcp/`。
- 架构方向性决策：新增 ADR 或更新 `decisions/DECISION_LOG.md`。
