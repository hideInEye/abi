# 项目实例版：当前项目 Agent 使用方式

当前环境可用“角色化阶段”模拟 subagent。对本仓库执行任务时，按以下方式组合：

- 新功能 ABI 页面：Project Analyst -> Planner -> Architect -> Developer -> Test -> Regression -> Review -> Knowledge。
- Chat 请求 bug：Project Analyst -> Debugging/Developer -> Test -> Regression -> Review。
- Dashboard 画布改动：Architect 和 Regression 必须参与，重点检查 `apps/dashboard/src/designer`。

真实项目边界：
- `apps/abi`：主应用，Ant Design + Redux + `@sa/simple-router`。
- `apps/chat`：聊天子应用，TanStack Router + Zustand + Tailwind。
- `apps/dashboard`：大屏设计器，React Router + MobX/manager + Less。
- `packages/*`：共享包，禁止依赖 `apps/*`。

# 空白模板版

列出本项目可用 agent、调用时机、必须读取文件、输出格式和协作关系。
