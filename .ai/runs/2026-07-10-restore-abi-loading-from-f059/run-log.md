# 2026-07-10 恢复 f059 前 ABI 系统 Loading

## 需求

- 用户要求将提交 `f059c829fea6ae5080d9efddd7497065bf697042` 中 ABI 系统加载相关改动“修改回来”。
- 保留当前 chat loading 改动，不提交代码。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
  - 追加本次恢复 ABI loading 的需求说明，移除与本次指令冲突的非目标。
- `apps/abi/index.html`
  - 恢复 `f059c829fea6ae5080d9efddd7497065bf697042` 之前的 ABI 静态启动 loading 占位。
- `apps/abi/src/App.tsx`
  - 恢复 `GlobalLoadingContainer` import。
  - 恢复 `RouterProvider fallback={<GlobalLoadingContainer />}`。

## 验证

- 已执行代码级 diff 检查。
- 已执行 `git diff --check`，通过。

## 未运行

- 未运行测试/构建。原因：用户此前明确要求“不用测试构建，我来测试”，本轮仅按指令恢复 ABI loading 范围。

## 回归检查

- 本轮仅修改 ABI loading 相关文件与 `.ai` 记录。
- 未覆盖当前工作区已有 chat loading 改动。
- 未执行提交。

## AI 文档更新判断

- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
