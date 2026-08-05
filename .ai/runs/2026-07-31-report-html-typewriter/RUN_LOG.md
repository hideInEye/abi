# 右侧 HTML 报告打字机展示运行记录

## 基本信息

- 日期：2026-07-31
- 分支：`dev/zanghb-20260720-chatreport`
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 范围：`apps/chat/src/components/conversation/report-mode/` 与统一会话中的报告预览接入

## 目标与边界

采用“分段 text 拼接完成后模拟打字机展示”方案。前端仍先由 reducer 提取完整 HTML 候选，只有报告整体完成、ToDo 全部进入终态并首次自动打开右栏时才播放动画。

本次没有修改 Redis/Java SSE 协议、报告候选聚合、普通对话、Markdown 报告展示或 iframe 权限。不会把半截 JSON、残缺 HTML 或逐条 text chunk 直接作为 `srcDoc`。

## 实现

### HTML 文档运行时

- 新增 `htmlTypewriter.ts`，在完整后端 HTML 末尾幂等追加一次沙箱内运行时。
- iframe 仍只加载一次完整 `srcDoc`；动画通过 `TreeWalker` 收集并逐步恢复正文文本节点，不按动画帧重载 iframe。
- 跳过 `script/style/noscript/template/textarea/svg`、隐藏节点和 `aria-hidden=true` 节点，不修改标签、属性、图片、图表或脚本源码。
- 动画时长根据正文字符数计算，限制在约 1.4–8 秒，避免长报告持续数分钟。
- 使用闪烁光标提示正在呈现；完成或异常时清理光标及临时样式。
- 尊重 `prefers-reduced-motion: reduce`。运行时异常时恢复所有原始文本；报告 CSP 阻止注入脚本时保持完整 HTML 直接显示。
- 保持 iframe `sandbox="allow-scripts"`，没有增加同源、表单、弹窗或顶层跳转权限。

### 播放生命周期

- `shouldAnimateReportPreview` 只允许 `source=task`、HTML、已完成且 ToDo 全部终态的报告在 `auto` 打开原因下播放。
- `useReportConversation` 只在实时任务首次满足自动开栏条件时设置播放状态。
- 用户关闭后从报告文件卡手动重开时清除播放状态，直接显示完整正文。
- 历史 query 恢复的报告不会自动播放生成动画。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation/report-mode/htmlTypewriter.ts`
- `apps/chat/src/components/conversation/report-mode/htmlTypewriter.test.ts`
- `apps/chat/src/components/conversation/report-mode/helpers.ts`
- `apps/chat/src/components/conversation/report-mode/helpers.test.ts`
- `apps/chat/src/components/conversation/report-mode/useReportConversation.ts`
- `apps/chat/src/components/conversation/report-mode/ReportPreviewPane.tsx`
- `apps/chat/src/components/conversation/index.tsx`

## 测试与验证

测试先按预期失败：项目尚不存在 `htmlTypewriter` 模块和 `shouldAnimateReportPreview`，用于确认新增用例确实覆盖目标行为。

完成后执行：

```text
pnpm --filter ai-bot exec vitest run \
  src/components/conversation/report-mode/reportTaskStorage.test.ts \
  src/components/conversation/report-mode/reportTimeline.test.ts \
  src/components/conversation/report-mode/reportRecovery.test.ts \
  src/components/conversation/report-mode/helpers.test.ts \
  src/components/conversation/report-mode/htmlTypewriter.test.ts \
  src/components/conversation/report-mode/reportHistoryAdapter.test.ts \
  src/components/conversation/report-mode/reportStreamReducer.test.ts \
  src/service/api/report.test.ts \
  src/service/api/app.test.ts
```

- 结果：9 个测试文件、49 项测试全部通过。
- HTML 转换测试覆盖完整文档、片段、幂等注入、运行时语法、减少动态效果、非正文过滤、帧动画和最长时长。
- 播放判定测试覆盖实时自动打开、手动重开、历史报告和 Markdown 不播放。

```text
pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json
```

- 结果：通过。

```text
pnpm --filter ai-bot build
```

- 结果：通过。
- 保留项目已有的 Ant Design/TanStack `use client`、重复静态/动态导入和大 chunk 非阻断提示。

```text
pnpm --filter ai-bot exec eslint <本次 TypeScript 文件>
```

- 结果：未进入源码检查。当前 ESLint 9 flat config 与配置中的 `env` 字段不兼容；这是仓库已有门禁问题，本次未扩大范围修改 ESLint 配置。

```text
git diff --check
```

- 结果：通过。

## 回归与风险

- 普通对话、报告提交、事件 reducer、IndexedDB、历史 query 和 Markdown 预览没有改变。
- HTML 自带严格 CSP 时可能阻止内联运行时，此时完整报告直接显示，功能可用但无动画。
- 报告自己的脚本若在加载后持续替换正文，动画只保证初始可见文本节点；iframe 沙箱仍限制其访问宿主状态。
- 当前没有浏览器 E2E/截图门禁，仍需用一次真实完成报告检查视觉速度、长报告滚动和窄屏切换。

## AI 开发系统评估

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 并新增本 run log。
- 本次是报告预览的局部展示策略，不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
