# 报告模式渐进展示修订运行记录

## 基本信息

- 日期：2026-07-31
- 分支：`dev/zanghb-20260720-chatreport`
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 目标：报告生成按“思考 → ToDo → 报告文件”逐步展示，并移除用户界面的底层传输术语。

## 变更摘要

1. 新增 `thinking / todo / report` 展示阶段纯函数。
2. 第一条计划到达前只渲染思考区；计划到达后才渲染 ToDo。
3. HTML/Markdown 片段仍可更新内部报告候选，但不在思考或 ToDo 执行内容中提前展示。
4. 只有整体状态完成且所有任务为 `completed/cancelled` 时，才显示报告文件并首次自动打开右栏。
5. 手动打开报告和报告预览组件均增加最终阶段防御校验。
6. 把等待、重试、恢复、失败和本地保存提示改成面向用户的产品语言；内部错误码不再显示。
7. 更新当前需求与前端 UI 规格，补充阶段显隐、文案和测试规则。

## 验证结果

### 报告相关单元测试

```text
pnpm --filter ai-bot exec vitest run \
  src/components/conversation/report-mode/reportTaskStorage.test.ts \
  src/components/conversation/report-mode/reportTimeline.test.ts \
  src/components/conversation/report-mode/reportRecovery.test.ts \
  src/components/conversation/report-mode/helpers.test.ts \
  src/components/conversation/report-mode/reportHistoryAdapter.test.ts \
  src/components/conversation/report-mode/reportStreamReducer.test.ts \
  src/service/api/report.test.ts \
  src/service/api/app.test.ts
```

- 结果：8 个测试文件、42 项测试全部通过。
- 新增覆盖：无计划、执行中、候选提前到达、任务未结束、全部完成、包含 cancelled 终态以及报告正文不提前泄露。

### 类型检查

```text
pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json
```

- 结果：通过。

### 生产构建

```text
pnpm --filter ai-bot build
```

- 结果：通过。
- 已有非阻断提示：Ant Design/TanStack Router 的 `use client` 指令提示、静态与动态导入重叠提示、产物 chunk 大小提示。

### 差异检查

```text
git diff --check
```

- 结果：通过。

## 调研说明

- 本轮原计划通过已登录浏览器复核 IMA、豆包、Claude 和 ChatGPT 的实时研究交互。
- 浏览器自动化能力在当前环境缺少本地技能目录；官方安装方式又因远程脚本未固定版本而被安全策略拒绝，因此没有伪装成已完成线上调研。
- 本次交互依据用户参考图和已确认的主流渐进披露原则实现：当前阶段突出、未开始阶段不占位、完成产物最后出现、错误提示采用任务语言。

## 回归与风险

- 普通对话发送、历史消息组件和普通对话接口未在本轮修改。
- 真实后端如果在整体完成时仍保留 `pending/in_progress` 任务，前端会继续停留在 ToDo 阶段，不会提前展示报告；需要联调确认最终计划快照会把所有任务置为 `completed/cancelled`。
- 当前工作区包含本轮之前尚未提交的报告历史合并、Java 读流接入及 Node server 删除等改动，本轮没有恢复或覆盖这些已有改动。

## AI 开发系统更新评估

- `.ai/prompts/`：无需更新。
- `.ai/agents/`：无需更新。
- `.ai/skills/`：无需更新。
- `.ai/mcp/`：无需更新。
- `.ai/context/`：无需更新，系统架构边界没有新增变化。
- `.ai/checklists/`：无需更新。
- `.ai/decisions/`：无需新增 ADR，本次属于已确认报告 UI 的交互修订。
