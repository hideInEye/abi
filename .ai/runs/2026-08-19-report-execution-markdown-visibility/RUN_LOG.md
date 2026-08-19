# 报告执行步骤 Markdown 可见性修复运行记录

## 任务

修复报告历史中普通 Todo 的 Skill Markdown 被当成最终报告正文过滤的问题，同时保持真正的报告产物不在执行步骤中重复展示。

## 修改

- 在 `CURRENT_REQUIREMENT.md` 中补充本次缺陷的目标、非目标与验收标准。
- 将执行输出过滤从“所有 HTML/Markdown 一律隐藏”调整为“只在报告生成 Todo 或已识别报告产物步骤中隐藏”。
- 普通 Todo 中的 text、分隔线与 Markdown 继续使用现有 ReactMarkdown 展示。
- 对重规划执行组和未归属步骤沿用同一产物识别规则。
- 新增回归测试，覆盖四段 Skill 输出完整展示，以及最终 Markdown 报告正文不在 Todo 内重复展示。

## 验证

1. 修复前定向测试能够稳定复现两个失败：Skill Markdown 缺失、helper 仍按格式全局过滤。
2. `pnpm exec vitest run apps/chat/src/components/conversation/report-mode/ReportTodoList.test.tsx apps/chat/src/components/conversation/report-mode/helpers.test.ts`
   - 2 个测试文件、18 条用例全部通过。
3. `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
   - 10 个测试文件、66 条用例全部通过。
4. `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
   - 通过，无输出。
5. `pnpm --filter ai-bot build`
   - 构建成功。
   - 保留既有路由文件提示、Ant Design `use client` 提示和 bundle 体积提示；本次没有新增构建错误。
6. 定向 `git diff --check`
   - 通过。

## 回归结论

- 普通执行步骤中的 Skill Markdown 不再丢失。
- `---` 仍按 Markdown 规则渲染为水平分隔线。
- 最终 HTML/Markdown/PDF/Word/report payload 仍不会在报告 Todo 的执行详情中重复显示。
- 未修改历史分组、Todo 归属、报告候选、接口协议和样式。

## 文档与 AI 配置影响

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md`。
- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
