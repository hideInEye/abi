# Requirements

# 项目实例版：当前项目需求入口

本目录用于把 `abi` monorepo 中的真实开发意图沉淀成可执行需求。当前仓库包含多个前端应用与共享包，需求必须先明确影响范围，再进入实现：

- ABI 工作台：`apps/abi`，例如本体图谱、实体管理、指标/维度建模、登录态处理。
- ChatBI / AI Bot：`apps/chat`，例如会话请求封装、鉴权失效、接口错误展示。
- Dashboard：`apps/dashboard`，例如运营面板、权限入口、图表展示。
- 共享包：`packages/auth`、`packages/request`、`packages/utils`、`packages/webhook-*`，例如鉴权协议、请求适配、通用工具。

## 当前项目使用流程

1. 先阅读 `.ai/context/PROJECT_OVERVIEW.md`、`.ai/context/MODULE_MAP.md`、`.ai/context/BUILD_AND_RUN.md`，确认项目边界。
2. 按任务类型选择模板：
   - 新功能：复制 `FEATURE_SPEC_TEMPLATE.md` 到 `CURRENT_REQUIREMENT.md`。
   - Bug 修复：复制 `BUGFIX_SPEC_TEMPLATE.md` 到 `CURRENT_REQUIREMENT.md`。
   - 重构：复制 `REFACTOR_SPEC_TEMPLATE.md` 到 `CURRENT_REQUIREMENT.md`。
   - 混合任务：从 `REQUIREMENT_TEMPLATE.md` 开始补全。
3. 在 `CURRENT_REQUIREMENT.md` 中写清楚：
   - 真实路径，例如 `apps/abi/src/pages/workbench/ontology-kg/entity`。
   - 真实命令，例如 `pnpm --filter chatbi build`、`pnpm build`、`pnpm test`。
   - 已知限制，例如根级 `pnpm lint`、`pnpm type-check` 当前存在配置缺口，不能直接作为唯一验收依据。
4. 如果某项信息在当前仓库中没有明确证据，必须写：`当前仓库未发现明确证据，后续需要人工确认。`
5. 开发中需求变更时，先更新 `CURRENT_REQUIREMENT.md`，再继续修改代码。

## 当前项目示例

- 用户要求在 ABI 本体图谱实体页新增字段筛选：使用 `FEATURE_SPEC_TEMPLATE.md`，范围写 `apps/abi/src/pages/workbench/ontology-kg/entity`，验收命令优先写 app 级构建和相关测试。
- 用户要求修复 Chat 登录过期后页面空白：使用 `BUGFIX_SPEC_TEMPLATE.md`，范围写 `apps/chat/src/service/request/index.ts`、`packages/auth/src/index.ts`，补充 401/403 场景。
- 用户要求整理 ABI 指标建模表单：使用 `REFACTOR_SPEC_TEMPLATE.md`，必须声明不改变接口字段、不改变路由、不扩大组件职责。

# 空白模板版

本目录用于管理项目需求。任何业务开发前，先把需求写入 `CURRENT_REQUIREMENT.md`。

## 使用方式

1. 阅读项目上下文文档，确认模块、命令、风险。
2. 根据任务类型选择模板。
3. 将模板内容复制到 `CURRENT_REQUIREMENT.md` 并补全。
4. 让 AI 使用对应 prompt 执行。
5. 需求变更时先更新 `CURRENT_REQUIREMENT.md`，再继续开发。

## 模板

- `REQUIREMENT_TEMPLATE.md`
- `FEATURE_SPEC_TEMPLATE.md`
- `BUGFIX_SPEC_TEMPLATE.md`
- `REFACTOR_SPEC_TEMPLATE.md`

## 填写规则

- 必须写清楚影响路径、用户场景、验收标准、验证命令。
- 必须区分事实、推测、待确认事项。
- 没有证据时写：`当前仓库未发现明确证据，后续需要人工确认。`
