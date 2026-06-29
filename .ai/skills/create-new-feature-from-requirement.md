# Create New Feature From Requirement

## 当前项目执行示例

示例：根据 `CURRENT_REQUIREMENT.md` 为 ABI ontology entity 增加颜色预设。

步骤：

1. 读取 `.ai/requirements/CURRENT_REQUIREMENT.md`。
2. 定位 `apps/abi/src/pages/workbench/ontology-kg/entity`。
3. API 若需要，查 `apps/abi/src/service/api/ontology-network.ts`。
4. UI 使用 Ant Design + UnoCSS，不使用 Chat 的 Tailwind。
5. 抽 pure helper 时在同域新增 `*.test.ts`。
6. 运行 `pnpm test` 和 `pnpm --filter chatbi build`。
7. 写 `.ai/runs/<date>-<task>/run-log.md`。

## 空白模板版

读取需求、分析影响范围、制定计划、实现、补测试、验证、回归、写 run log、更新 AI 系统。
