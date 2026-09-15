# 框架级 Bug 复核文档生成 Run Log

## 基本信息

- 日期：2026-09-14
- 任务名称：framework-bug-review
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及 agent：Project Analyst、Planner、Review、Knowledge（单代理角色化阶段）
- 任务类型：分析结果文档化 / 待用户选定修复范围

## 需求摘要

依据对 `.ai/requirements/FRAMEWORK_BUG_FIX.md` 的重新分析生成独立复核文档，保留原 28 个编号，给出修正后的状态、优先级、最小修复边界、验收和测试建议，并提供未默认勾选的选择区。本轮不修改业务代码，也不制定具体实施计划。

## 影响范围

- `.ai/requirements/FRAMEWORK_BUG_FIX_REVIEW.md`
- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `.ai/runs/2026-09-14-framework-bug-review/RUN_LOG.md`

## 修改文件

- 新增 `.ai/requirements/FRAMEWORK_BUG_FIX_REVIEW.md`
- 更新 `.ai/requirements/CURRENT_REQUIREMENT.md`
- 新增 `.ai/runs/2026-09-14-framework-bug-review/RUN_LOG.md`

## 实现说明

1. 原始 `FRAMEWORK_BUG_FIX.md` 保持不变。
2. 新复核文档为 P0-01～P0-05、P1-01～P1-12、P2-01～P2-11 各提供一个总览结论，并区分确认存在、部分成立、待协议/复现和不按运行时 Bug 排期。
3. 重点修正了原分析中不完整或风险较高的方案，包括：
   - 不使用 `new Function()` 替代 `eval()`。
   - 不在未确认协议时把长期 token 直接放入 WebSocket query。
   - HistoryQueue 修复源头计数，不只钳制 size。
   - Dashboard 生命周期问题按统一销毁链路处理，而不是只清一个定时器。
4. 单独列出 4 个原文档遗漏问题和 6 个建议实施批次，所有选择项默认未勾选。
5. 固化后续接口修复的成功门禁和模块级测试约束。

## 测试记录

### 执行的命令

- `awk -F'|' '/^\\| \\[ \\] \\| P[012]-[0-9][0-9] \\|/ { id=$3; gsub(/^ +| +$/, "", id); print id }' .ai/requirements/FRAMEWORK_BUG_FIX_REVIEW.md | sort | uniq -c`
- `rg -c '^\\| \\[ \\] \\| P[012]-[0-9]{2} \\|' .ai/requirements/FRAMEWORK_BUG_FIX_REVIEW.md`
- `rg -c '^### \\[ \\] NEW-[0-9]{2}：' .ai/requirements/FRAMEWORK_BUG_FIX_REVIEW.md`
- `rg -c '^### \\[ \\] 批次 [A-F]：' .ai/requirements/FRAMEWORK_BUG_FIX_REVIEW.md`
- `git diff --check`
- `git diff -- .ai/requirements/FRAMEWORK_BUG_FIX.md`

### 测试结果

- 原 28 个编号在总览表编号列中各出现 1 次，总览表共 28 行。
- 新增问题 4 项，推荐批次 6 项，均为未勾选状态。
- `git diff --check` 通过，无空白错误。
- 原始 `FRAMEWORK_BUG_FIX.md` 无差异。
- 本轮仅修改 Markdown 文档，因此未运行业务单测、类型检查或构建，符合当前需求的测试边界。

### 失败和修复过程

首次用固定完整标题截取总览区时，终点标题与实际文案不一致，导致统计范围延伸到全文并重复计入详情引用。随后改为直接匹配总览表行及第二列编号，确认 28 个编号各有且仅有一条总览记录；文档内容无需因此修改。

## 回归检查

- 检查 Git 状态和变更文件范围，未发现 `apps/*`、`packages/*`、Nginx 或构建配置改动。
- 检查原始 Bug 文档差异为空。
- 检查新文档明确写明“用户确认前不生成业务修改计划、不修改业务文件”。
- 检查接口类问题继续遵循等待响应、真实成功门禁和失败阻断下一步的项目规则。

## Review 结果

文档达到“先供用户选择，再做实施计划”的目标。总览保留原编号，详细说明聚焦高风险和已确认问题；待协议项没有擅自给出可能扩大安全风险的代码方案，未确认项也没有被表述为已经复现。

## 发现的问题

- 原分析文档遗漏了 Dashboard Loader 空值处理、Dashboard HTTP 200 业务失败门禁、Chat `handleCollect` 异步契约以及微前端拓扑文档过时，已作为 NEW-01～NEW-04 提供选择。
- 部分问题需要后端协议、部署模式或安全信任边界证据，不能只凭前端静态代码直接实施。

## 本轮经验

框架级清单需要把“代码味道”“潜在风险”“已存在运行时 Bug”和“需先确认协议的问题”分开，否则优先级和修复方案容易被原始标题带偏。

## 是否需要更新 AI 系统

### 需要更新的 context

本轮不更新。NEW-04 若被用户选中，再校正 `PROJECT_OVERVIEW.md` 和 `ARCHITECTURE.md` 中的微前端拓扑。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。现有接口成功门禁、范围限制和测试规则已覆盖本轮后续要求。

### 需要更新的 decisions

暂不需要。待用户确认具体修复项并涉及架构或安全取舍时，再决定是否新增 ADR。

## 后续建议

用户先勾选单项或批次；确认后仅为所选范围更新当前需求、制定实施计划和测试矩阵，再进入代码修改。

## 未解决问题

- P0-03 的真实安全级别依赖脚本创建者与查看者之间的信任边界。
- P1-03、P1-11 依赖 WebSocket 鉴权与部署 CORS 协议。
- NEW-03 依赖收藏埋点是强依赖还是 best-effort 的产品契约。
