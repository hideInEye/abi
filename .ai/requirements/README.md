# Requirements

# 项目实例版：当前项目需求模板

本目录用于把 `abi` monorepo 中的真实开发意图沉淀成可执行需求。当前仓库包含多个前端应用与共享包，需求必须先明确影响范围，再进入实现：

- ABI 工作台：`apps/abi`，例如本体图谱、实体管理、指标/维度建模、登录态处理。
- ChatBI / AI Bot：`apps/chat`，例如会话请求封装、鉴权失效、接口错误展示。
- Dashboard：`apps/dashboard`，例如运营面板、权限入口、图表展示。
- 共享包：`packages/auth`、`packages/request`、`packages/utils`、`packages/webhook-*`，例如鉴权协议、请求适配、通用工具。

`CURRENT_REQUIREMENT.md` 只用作只读模板，不再写入任务需求、进度或结果。本目录保留的项目实例和历史文档不代表当前任务；其中要求覆盖该文件的旧说明不再适用，以 `AGENTS.md` 和 `.ai/context/AI_DEVELOPMENT_RULES.md` 为准。

## 当前项目使用流程

1. 先阅读 `.ai/context/PROJECT_OVERVIEW.md`、`.ai/context/MODULE_MAP.md`、`.ai/context/BUILD_AND_RUN.md`，确认项目边界。
2. 创建本轮 `.ai/runs/<date>-<task-name>/`，按任务类型参考模板，将实际需求保存为该目录下的 `REQUIREMENT.md`：
   - 通用需求：参考 `CURRENT_REQUIREMENT.md` 的空白模板。
   - 新功能：参考 `FEATURE_SPEC_TEMPLATE.md`。
   - Bug 修复：参考 `BUGFIX_SPEC_TEMPLATE.md`。
   - 重构：参考 `REFACTOR_SPEC_TEMPLATE.md`。
   - 混合任务：参考 `REQUIREMENT_TEMPLATE.md`。
3. 在本轮 `REQUIREMENT.md` 中写清楚：
   - 真实路径，例如 `apps/abi/src/pages/workbench/ontology-kg/entity`。
   - 真实命令，例如 `pnpm --filter chatbi build`、`pnpm build`、`pnpm test`。
   - 已知限制，例如根级 `pnpm lint`、`pnpm type-check` 当前存在配置缺口，不能直接作为唯一验收依据。
4. 如果某项信息在当前仓库中没有明确证据，必须写：`当前仓库未发现明确证据，后续需要人工确认。`
5. 后续需求变更先在新一轮 runs 目录保存更新后的 `REQUIREMENT.md`，说明与前一轮的关系，再继续修改代码；目录重名时追加序号，不覆盖旧轮次。
6. 计划、实现、验收和 run log 均引用本轮实际需求路径。需求和运行记录只在本机查看，不加入 Git。

## 当前项目示例

- 用户要求在 ABI 本体图谱实体页新增字段筛选：使用 `FEATURE_SPEC_TEMPLATE.md`，范围写 `apps/abi/src/pages/workbench/ontology-kg/entity`，验收命令优先写 app 级构建和相关测试。
- 用户要求修复 Chat 登录过期后页面空白：使用 `BUGFIX_SPEC_TEMPLATE.md`，范围写 `apps/chat/src/service/request/index.ts`、`packages/auth/src/index.ts`，补充 401/403 场景。
- 用户要求整理 ABI 指标建模表单：使用 `REFACTOR_SPEC_TEMPLATE.md`，必须声明不改变接口字段、不改变路由、不扩大组件职责。

# 空白模板版

本目录提供需求模板。任何业务开发前，先把实际需求写入本轮 `.ai/runs/<date>-<task-name>/REQUIREMENT.md`，不修改 `CURRENT_REQUIREMENT.md` 模板。

## 使用方式

1. 阅读项目上下文文档，确认模块、命令、风险。
2. 根据任务类型选择模板。
3. 参考模板，在本轮 `.ai/runs/<date>-<task-name>/REQUIREMENT.md` 补全实际需求。
4. 让 AI 使用对应 prompt 执行。
5. 每轮需求变更独立保存到新的 runs 目录，保留旧需求；再根据新一轮需求继续开发。

## 模板

- `CURRENT_REQUIREMENT.md`（只读模板，不写入具体任务）
- `REQUIREMENT_TEMPLATE.md`
- `FEATURE_SPEC_TEMPLATE.md`
- `BUGFIX_SPEC_TEMPLATE.md`
- `REFACTOR_SPEC_TEMPLATE.md`

## 填写规则

- 必须写清楚影响路径、用户场景、验收标准、验证命令。
- 必须区分事实、推测、待确认事项。
- 没有证据时写：`当前仓库未发现明确证据，后续需要人工确认。`
