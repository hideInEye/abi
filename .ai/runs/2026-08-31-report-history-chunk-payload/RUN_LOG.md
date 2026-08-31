# 报告历史包装输出解析修复运行记录

## 基本信息

- 日期：2026-08-31
- 任务：修复历史 query 中完整 `{ "chunks": [...] }` 工具载荷被当作普通文本展示的问题
- 状态：已完成并验证

## 需求与边界

- 历史 `steps[].outputs` 与实时 `step.chunk` 复用同一套包装载荷解析能力。
- 只展示内部公开逻辑输出，过滤 `emit_to_client: false`、外层 JSON、chart 元数据和尾部框架提醒。
- 保持直接 text/markdown/code/image/html/pdf/word 输出的既有行为。
- 不修改后端协议、Todo 归属、最终报告判定、报告样式或普通对话。

## 修改内容

- `.ai/requirements/CURRENT_REQUIREMENT.md`
  - 追加“历史报告包装输出与实时流统一解析”需求和验收标准。
- `apps/chat/src/components/conversation/report-mode/embeddedChunkPayload.ts`
  - 将物理 chunk 类型判断参数收窄为必要字段。
  - 新增历史/成型输出归一化函数，复用实时包装载荷的识别和展开规则。
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.ts`
  - 历史公开输出进入步骤模型前先执行包装载荷归一化。
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.test.ts`
  - 新增完整 `{ chunks: [...] } + Reminder` 历史样本回归测试。
  - 验证图片标题与完整 URL 被保留，公开文本正常展示，隐藏信息被过滤，最终 HTML 报告判定不变。

## 验证结果

- 定向历史/Reducer/Todo 测试：3 个文件，38 项通过。
- 完整报告模式测试：10 个文件，82 项通过。
- TypeScript：`pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json` 通过。
- 构建：`pnpm --filter ai-bot build` 通过。
- 格式检查：`git diff --check` 通过。

## 构建提示

- 构建继续输出项目已有的 route 文件未导出 `Route`、Ant Design `use client`、动态/静态重复导入以及大 chunk 提示。
- 上述均为既有非阻断提示，与本次历史载荷解析修改无关。

## 回归结论

- 实时分片载荷处理保持不变。
- 历史完整包装载荷现在与实时完成态得到相同的逻辑输出。
- 报告生成 Todo 的 HTML/Markdown 候选与 PDF/Word 附件规则未放宽。
- 普通对话、接口和页面样式未修改。

## AI 开发资产检查

- `.ai/prompts/`：无需更新。
- `.ai/agents/`：无需更新。
- `.ai/skills/`：无需更新。
- `.ai/mcp/`：无需更新。
- `.ai/context/`：无需更新。
- `.ai/checklists/`：无需更新。
- `.ai/decisions/`：无需更新，本次为既有协议的适配缺陷修复。
