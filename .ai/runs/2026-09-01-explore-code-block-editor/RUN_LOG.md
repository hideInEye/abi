# 探索模式代码块千问风格渲染与右侧编辑面板

## 基本信息

- 日期：2026-09-01
- 任务名称：explore-code-block-editor
- 需求文件：用户对话直接下达（CURRENT_REQUIREMENT.md 仍为指标建模任务，本轮为独立 UI 需求）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：新功能 / UI 对齐千问

## 需求摘要

探索模式「当前步骤详情」返回的 sql / shell / python 代码按千问风格代码块渲染：顶栏左侧语言标识（python / bash / sql），主体行号 + 语法高亮；顶栏右侧增加「编辑」（铅笔图标 + 文案）与「复制」按钮；点击编辑在右侧打开编辑面板，与现有工作室共用同一套分屏动画壳，CodeMirror 可就地编辑。

## 影响范围

- `apps/chat/src/components/conversation/exploration-mode/`（新增代码块与编辑面板）
- `apps/chat/src/components/conversation/components/MessageList.tsx`（透传编辑回调）
- `apps/chat/src/components/conversation/index.tsx`（右侧面板状态与分屏互斥）
- 不影响 `apps/abi` 的探索模式副本（其未传编辑回调时仅隐藏编辑按钮，复制/高亮不生效因 abi 副本未接入，保持原渲染）。

## 修改文件

- 新增 `apps/chat/src/components/conversation/exploration-mode/ExploreCodeBlock.tsx`
- 新增 `apps/chat/src/components/conversation/exploration-mode/ExploreCodeEditorPane.tsx`
- `apps/chat/src/components/conversation/exploration-mode/ExploreMessageRow.tsx`
- `apps/chat/src/components/conversation/exploration-mode/ExplorePreviewPane.tsx`（导出 CollapseIcon 复用）
- `apps/chat/src/components/conversation/exploration-mode/styles.module.css`
- `apps/chat/src/components/conversation/components/MessageList.tsx`
- `apps/chat/src/components/conversation/index.tsx`

## 实现说明

- `detectCodeLanguage` 保守识别：SQL 沿用原 `SQL_LIKE`；JSON 需整体合法解析；shebang / 首行 import/def/echo/pip 等强信号直接判定；其余按 python / shell 特征计分（≥2 且互斥）避免说明文字误判。后端 `outputType === 'code'` 但未识别语言时兜底 `text` 纯文本代码块。
- 代码块复用已有依赖 `react-syntax-highlighter`（Prism + oneLight，与 Answer.tsx 一致），行号 + 高亮，最大高度 360px 内滚动。
- 复制：`navigator.clipboard` 优先，降级 `execCommand`；成功图标切换 1.6s。
- 编辑：`onEditCode` 回调沿 ExploreMessageRow → MessageList → Conversation 上抛；Conversation 持有 `codeEditor` 状态，与工作室 / 报告侧栏互斥（打开编辑关闭另两者，反之亦然），复用 `reportStyles.reportPaneWrap` 分屏壳并延迟一帧加 open 类播放入场动画；父级输入区收拢条件并入 `onExplorePreviewChange`。
- 编辑面板用已有 `@uiw/react-codemirror`，sql / json 挂对应语言扩展，python / bash 纯文本编辑；头部含语言徽标、复制、收起按钮。
- `AssistantDetailDrawer` 直接使用 ExploreMessageRow 未传回调，编辑按钮自动隐藏，行为兼容。
- 补充（用户反馈后）：调用入参 `focusedActionInput` 原保留旧 `processCode` 灰底样式，现按用户标注「json 内容，按照 json 格式规范渲染」改为 `ExploreCodeBlock language="json"`（normalizeActionInput 已做 2 空格格式化），与过程代码共用 `handleEditCode` 编辑入口；同步删除废弃的 `.processCode` / `.processCode::before` 样式。

## 测试记录

### 执行的命令

- `npx tsc -p tsconfig.app.json --noEmit`（apps/chat）
- `npx vitest run apps/chat/src/components/conversation/exploration-mode`
- `npx vite build`（apps/chat，后台执行）

### 测试结果

- tsc：本次改动文件无类型错误；仅存既有 `autoChart/multi-measure-pie-chart.ts`（.ts 内含 JSX）报错，与本轮无关。
- vitest：exploration-mode 2 个测试文件 7 个用例全部通过。
- eslint：仓库 eslint 配置自身存在 flat-config `env` 键既有问题，无法运行，非本轮引入。

### 失败和修复过程

- 初次替换 ExploreMessageRow 时误留旧 `renderProcessOutput` 并丢失 `normalizeActionInput` 注释，第二轮替换已删除重复函数并恢复注释。

## 回归检查

- 非代码文本仍走 `ExploreRichText`（表格/markdown）渲染，不受影响。
- 调用入参 `focusedActionInput` 已改为 json 代码块渲染（见实现说明补充），不再使用旧 `processCode` 样式。
- 工作室 / 报告侧栏打开、关闭、互斥逻辑保持原状，仅新增编辑面板互斥分支。
- 图片 / PDF / Word 输出渲染分支未改动。

## Review 结果

- 改动局限于探索模式展示层与右侧面板装配，未新增接口调用。
- 语言识别规则保守，误判时回退原富文本渲染。

## 发现的问题

- `apps/chat` eslint 配置 flat-config 不兼容（`env` 键）导致 lint 无法运行，属既有问题。
- `multi-measure-pie-chart.ts` 既有语法问题导致 tsc 全量不干净。

## 本轮经验

- 右侧分屏壳（reportPaneWrap/bodySplit）可作为通用右栏容器，新面板只需状态互斥 + 延迟一帧加 open 类即可复用入场动画。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。

### 需要更新的 prompts / agents / skills / mcp / checklists

不需要。

## 后续建议

- 若助手调试抽屉（AssistantDetailDrawer）也需要代码编辑，可复用 `onEditCode` 在其内部挂编辑面板。
- 如需 python / bash 编辑高亮，可引入 `@codemirror/legacy-modes`。

## 未解决问题

- 编辑结果目前仅面板内本地态，不回写后端（需求未要求）。
