# 技能查看页概览 frontmatter 样式重排 Run Log

## 基本信息

- 日期：2026-08-18
- 任务名称：skill-detail-frontmatter-style
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（未单独填写，需求为口头："查看技能概览开头 name/description 全是黑色加粗太难看，description 要换行，且和下方正文一样小字灰色"）
- 执行 AI：Qoder
- 涉及 agent：Search（调研）、Developer（实现）、Regression（回归）
- 任务类型：缺陷修复 + 样式优化（小改动）

## 需求摘要

「查看技能 → 概览」正文开头的 `name: ... description: ...` 被渲染成一大段黑色加粗大标题，太难看。要求：name 与 description 分行；description 换行显示，字号更小、颜色与下方正文一致（灰色）。用户明确选择「保留并重排样式」（而非直接隐藏 frontmatter）。

- 目标：概览开头不再是黑色加粗大标题；name 作为普通小标题，description 单独成行、小字灰色（与正文一致）。
- 非目标：不改后端接口、不改 markdown 渲染库、不动顶部蓝色 Hero、不引入新依赖。
- 影响范围：abi + chat 两端技能详情抽屉的概览渲染 + 各自 markdown 样式表新增两个类。

## 根因分析

- 概览用 `<ReactMarkdown>{introduction}</ReactMarkdown>` 直接渲染 `getSkillIntroduction(Api)` 返回的 **SKILL.md 原文**。
- SKILL.md 顶部是 YAML frontmatter（`---\nname: ...\ndescription: ...\n---`），代码未做任何剥离。
- react-markdown 未启用 `remark-frontmatter`，把 `name/description` 两行 + 结尾 `---` 当作 **setext 二级标题** 解析，套用 `.skill-intro-md h1~h6` 的 `font-weight:600; color:#111827`（黑色加粗），于是 name 和 description 挤在一个黑色加粗大标题里。
- 顶部蓝色 Hero 已用接口字段 `bizName`（技能名）与 `summary`（描述）展示同样内容，正文这段属重复渲染。

## 修改文件

- `apps/abi/src/pages/component/system/skills/modules/skill-detail-drawer.tsx`
- `apps/abi/src/pages/component/system/skills/skill.css`
- `apps/chat/src/pages/chat/skill/SkillDetailDrawer.tsx`
- `apps/chat/src/index.css`

## 实现说明

两端做完全一致的改造（跨端对齐）：

1. 新增模块级纯函数 `parseSkillIntro(md)`：用正则提取顶部 frontmatter，解析出 `name` / `description`，并返回去掉 frontmatter 后的 `body`。
   - 仅当块以 `---` 开头且成功解析出 name 或 description 时才剥离；否则原样返回（`body = md`），保证无 frontmatter 或误判时不丢正文（安全兜底）。
   - 兼容单行值、引号包裹值、`|`/`>` 块标量（含 `-`/`+` chomping）多行值、`\r\n` 换行、BOM。
2. 组件内新增 `const introFm = useMemo(() => parseSkillIntro(introduction), [introduction])`（`useMemo` 两端均已导入）。
3. 概览渲染改为：先条件渲染 `name`（`.skill-intro-head__name`）+ `description`（`.skill-intro-head__desc`），再 `<ReactMarkdown>{introFm.body}</ReactMarkdown>`。
4. 样式表各新增 `.skill-intro-head / __name / __desc`：
   - `__name`：`15px / 600 / #1a2744`（普通小标题，不再是 17px 近黑加粗大标题）。
   - `__desc`：`13px / line-height 1.7 / #3e5068`，与正文容器 `.sd-v5-md`、正文段落完全一致（满足"和下面一样，小一点，颜色也一样"）。

未新增依赖、未新增接口调用、未改动顶部 Hero 与其它 markdown 元素样式。

## 测试记录

### 执行的命令

- LSP GetProblems：两个 `.tsx` + 两个样式文件。

### 测试结果

- 两个 `.tsx` 文件：无任何问题（零新增类型/语法错误）。
- 两个样式文件：仅既有告警（`skill.css` 3 处 `line-clamp` 兼容性 / `index.css` 3 处 `@tailwind` at-rule + 2 处 `line-clamp`），均与本次改动无关；新增的 `.skill-intro-head*` 无告警。

### 失败和修复过程

- 无。两端结构完全一致，8 处 SearchReplace 一次通过。

## 回归检查

- 无 frontmatter 的 SKILL.md：`parseSkillIntro` 返回 `body = 原文`、name/description 为空 → 不渲染头部块，`<ReactMarkdown>` 渲染原文，行为与改动前一致。
- 有 frontmatter：正文从真正的一级标题（如 `# Walmart Sales Data Deep Analyzer`）开始，头部显示重排后的 name + 灰色小字 description。
- 空 introduction：走原「版本说明 / README / Manifest」分支，未受影响。
- markdown 其它元素（h1~h6、p、code、table、blockquote…）样式未改。

## Review 结果

- 最小化改动：每端 = 1 个纯函数 + 1 行 useMemo + 1 处 render + 2 个 CSS 类；无重构、无牵连无关模块。
- 跨端一致：abi 与 chat 代码/样式逐行对齐。
- 安全兜底：解析失败一律回退原文，绝不丢正文。

## 本轮经验

- SKILL.md 概览用 react-markdown 裸渲染时，顶部 YAML frontmatter 会被当作 setext H2 渲染成黑色加粗大标题。若不想引入 `remark-frontmatter`/`gray-matter` 依赖，可用一个小正则函数剥离 frontmatter 并按需重排 name/description，改动更小。
- frontmatter 剥离必须加"解析不出 name/description 就回退原文"的兜底，避免把正文里的 `---`（分隔线）误判为 frontmatter 而截断内容。

## 是否需要更新 AI 系统

- context / prompts / agents / skills / MCP / checklists：暂不需要。

## 后续建议

- 若后续需要更完整的 YAML 能力（数组、嵌套、锚点等），再评估引入 `gray-matter`；当前需求下自写小解析已足够。

## 后续微调

- 用户反馈需保留字段标签：概览头部由"只显示值"改为 `name: {值}` / `description: {值}`，标签沿用各自样式（name 小标题、description 小字灰色）。改动仅两端 render 各 2 行，无 CSS 变更，GetProblems 零错误。

## 未解决问题

- 无。
