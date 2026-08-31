# 报告同一步骤分片工具输出拼接修复运行记录

## 基本信息

- 日期：2026-08-28
- 状态：已完成并通过定向验证
- 需求来源：`.ai/requirements/CURRENT_REQUIREMENT.md` 中“同一执行步骤的分片工具输出拼接展示”
- 影响范围：`apps/chat/src/components/conversation/report-mode/`

## 问题与结论

后端可能把同一个 step id 的一份 `{ "chunks": [...] }` 工具结果按字符拆成多条外层 `output_type=text` 事件。原 reducer 已把这些事件标记为内部 `report_payload`，但 Todo 展示仍直接遍历物理 chunk，导致半截 JSON、被截断的签名 URL 和尾部框架提醒被当成 Markdown 展示。

本次将物理分片与页面逻辑输出分离：同一步骤先按事件顺序保存并拼接内部载荷，JSON 完整后再展开其中的公开 chunks。未闭合阶段不输出正文；`emit_to_client: false`、外层 JSON 和尾部提醒不进入页面。

## 修改内容

- 新增 `embeddedChunkPayload.ts`：
  - 识别 `{ chunks: ... }` text 载荷的开始和未闭合续片。
  - 提取完整顶层 JSON 对象，未闭合对象继续等待后续事件。
  - 将内部 `chunks` 转换为稳定的页面逻辑输出。
  - 过滤 `emit_to_client: false`。
  - 使用逻辑输出替换物理 `report_payload`，不直接展示原始分片。
- reducer 复用统一解析结果：
  - 仍按原顺序保存物理分片。
  - 报告生成 Todo 的 HTML/Markdown/PDF/Word 继续按既有候选和附件规则处理。
  - 非报告 Todo 的图片、文本、Markdown、代码可以在完整解析后正常展示。
- Todo 展示与公开摘要统一读取逻辑输出，图片沿用现有组件并使用后端公开标题作为 alt 文本。
- `ReportPublicChunk` 增加可选 `title`，只用于公开工具输出标题。
- 补充 reducer 与组件回归测试，覆盖三段拼接、完整前不可见、图片/文本展示、私有 chunk 和尾部提醒过滤。

## 验证结果

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
  - 10 个测试文件通过。
  - 81 个测试通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - 通过，无 TypeScript 错误。
- `pnpm --filter ai-bot build`
  - 通过。
  - 仍有项目原有的非路由文件扫描、Ant Design `use client`、动态/静态重复导入和大 chunk 警告；本次未新增构建错误。
- `pnpm exec prettier --check embeddedChunkPayload.ts ReportTodoList.test.tsx`
  - 通过。
- `git diff --check`
  - 通过。

## 回归检查

- 不同 step id 的内容不会合并。
- 普通直接 text/markdown/code/image 输出仍按原逻辑展示。
- 报告候选仍要求步骤属于报告生成 Todo，未放宽最终报告识别。
- 历史数据已经是 `steps[].outputs` 的逻辑输出时不受影响。
- 未修改普通对话、Java Stream 接口、Todo 数量和归属、报告完成条件及预览交互。

## 已知风险

- 当前载荷起始识别遵循后端已确认的 `{ "chunks": ... }` 协议；如果后端以后增加数组顶层、代码围栏或其他包裹格式，需要在解析适配层扩展，不能让展示组件直接兜底渲染原始分片。

## AI 开发资产更新判断

- 已更新：`.ai/requirements/CURRENT_REQUIREMENT.md`、本运行记录。
- 不需要更新：`.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`。本次是既有报告事件协议下的局部前端聚合缺陷修复，没有形成新的跨项目架构决策。
