# 报告执行输出 GFM 表格渲染修复运行记录

## 任务

修复报告 Todo 执行步骤中 `output_type=markdown` 的表格被显示为带竖线普通文本的问题。

## 根因

报告步骤使用 ReactMarkdown 默认 CommonMark 解析能力。Markdown 表格属于 GitHub Flavored Markdown 扩展，未启用 GFM 插件时会被解析为普通段落。

## 修改

- 为 `apps/chat` 增加 `remark-gfm` 依赖并同步 pnpm lockfile。
- 仅在报告步骤输出的 ReactMarkdown 上启用 GFM 插件。
- 在报告模式 CSS Module 中补充表格、表头和单元格样式；宽表继续由既有步骤输出容器滚动。
- 新增组件回归测试，验证示例内容生成 `table/thead/tbody/th/td`。
- 在 `CURRENT_REQUIREMENT.md` 补充本次目标、非目标和验收标准。

## 验证

1. 修复前运行 `pnpm exec vitest run apps/chat/src/components/conversation/report-mode/ReportTodoList.test.tsx`
   - 新增表格用例失败，输出确认为 `<p>| 订单总金额 | ...</p>`。
2. 修复后再次运行同一命令
   - 1 个测试文件、4 条用例全部通过。
3. `pnpm --store-dir /Users/juvenile/Library/pnpm/store/v3 --filter ai-bot install --offline --frozen-lockfile --ignore-scripts`
   - 通过，锁文件与依赖声明一致。
4. `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
   - 10 个测试文件、67 条用例全部通过。
5. `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
   - 通过，无输出。
6. `pnpm --filter ai-bot build`
   - 构建成功；保留既有路由文件、Ant Design `use client` 和 bundle 体积提示。

## 回归结论

- 报告步骤中的单列及多列表格可以按 GFM 语义渲染。
- 普通文本、代码、列表、链接和分隔线仍经过现有 ReactMarkdown 渲染。
- 未修改历史解析、Todo 归属、事件聚合、报告产物识别或普通对话 Markdown。

## 文档与 AI 配置影响

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md`。
- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
