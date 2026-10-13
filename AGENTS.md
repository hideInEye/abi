# AGENTS.md

本项目使用 `.ai/` 目录作为 AI 开发操作系统。

任何 AI 在修改代码前，必须先读取：

1. `.ai/README.md`
2. `.ai/context/PROJECT_OVERVIEW.md`
3. `.ai/context/ARCHITECTURE.md`
4. `.ai/context/MODULE_MAP.md`
5. `.ai/context/CODE_STYLE.md`
6. `.ai/context/TESTING_STRATEGY.md`
7. `.ai/context/AI_DEVELOPMENT_RULES.md`
8. `.ai/checklists/BEFORE_CODING.md`
9. `.ai/requirements/CURRENT_REQUIREMENT.md`（只读模板）及本轮 `.ai/runs/<date>-<task-name>/REQUIREMENT.md`

没有明确需求文件时，不允许直接开发业务功能。每轮任务或需求变更必须先参考只读模板，在 `.ai/runs/<date>-<task-name>/REQUIREMENT.md` 保存本轮实际需求，并在开始前确认目标、非目标、影响范围、验收标准和测试要求。

`.ai/requirements/CURRENT_REQUIREMENT.md` 只用作模板，不再写入任务需求、修改进度或验收结果，不得按任务覆盖或追加。模板中的实例和历史文档中的旧流程不作为当前任务依据。每轮使用独立 runs 目录，重名时追加序号，不覆盖其他轮次的需求；需求和运行记录仅在本机查看，不加入 Git。

开发完成后，必须：

1. 运行必要测试或明确说明无法运行的原因
2. 进行回归检查
3. 生成 `.ai/runs/<date>-<task-name>/` 运行记录
4. 输出是否需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`

禁止事项：

1. 不允许跳过项目上下文直接改代码
2. 不允许没有验证就声称完成
3. 不允许为了完成局部需求大范围重构无关模块
4. 不允许恢复或覆盖用户已有的未说明改动
5. 不允许引入与当前项目技术栈和代码风格冲突的实现方式
6. 注释只写 non-obvious reason，禁止保留intermediateattempts;PR描述只写最终行为，diff里看不出来的取舍以及从未合入的状态一律不要提及

当前环境可用“角色化阶段”模拟 subagent。每个阶段按照 `.ai/agents/` 中对应 agent 文件执行。
