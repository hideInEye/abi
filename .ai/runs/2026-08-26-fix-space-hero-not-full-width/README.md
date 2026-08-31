# 修复空间编辑抽屉 hero 横幅不占满（Safari 表现为两侧缩进）

## 基本信息

- 日期：2026-08-26
- 任务名称：fix-space-hero-not-full-width
- 需求文件：用户口头反馈（截图：编辑空间抽屉 hero 横幅左右各缩进约 40px，仅 Safari 复现）
- 执行 AI：Qoder
- 任务类型：Bug 修复（全局 CSS 类名冲突）

## 需求摘要

空间编辑抽屉（`SpaceEdit.tsx` → `SpaceBasicInfo`）顶部蓝色 hero 横幅在 Safari 中未占满内容区宽度，左右各缩进约 40px；其他浏览器正常。要求定位原因并修复。

## 影响范围

- `apps/abi/src/pages/space-list/modules/SpaceInfoEdit.tsx`（hero 根节点类名）
- `apps/abi/src/styles/scss/table.scss`（空间 hero 根选择器）
- 不影响技能详情抽屉（`skill.css` 的 `.sd-v5-hero` 及其 `__*` 子类保持原样）

## 修改文件

- `apps/abi/src/styles/scss/table.scss`：`.sd-v5-hero` → `.sd-v5-space-hero`，并加注释说明禁止改回（防止与 skill.css 同名规则冲突）。
- `apps/abi/src/pages/space-list/modules/SpaceInfoEdit.tsx`：hero 根 div `className="sd-v5-hero"` → `"sd-v5-space-hero"`。

## 实现说明

根因：两个无关组件共用全局类名 `.sd-v5-hero`。

- 空间页 hero 样式在 `table.scss`（经 `global.scss @forward 'table'` 注入各 chunk），未声明 margin。
- 技能详情抽屉 `skill.css` 中 `.sd-v5-hero { margin: 24px 40px 0; ... }`，且带 `::before/::after` 装饰。
- 只要 skill.css 的样式 chunk 进入当前文档（访问过技能页、缓存旧资源等），其 margin 就泄漏到空间页 hero，造成左右各 40px 缩进——与截图像素测量一致（2x DPR 下约 80px）。
- 该泄漏取决于"页面是否加载了 skill.css / 缓存版本"，并非浏览器引擎差异；Safari 恰好处在加载了该规则的资源状态（旧缓存或会话内加载过技能 chunk），故表现为"只有苹果不占满"。
- 修复方式：空间页 hero 根类改名为 `.sd-v5-space-hero`，彻底解除同名冲突；子级类（`-bg/-orb/-content/...`）与 skill.css 的 BEM `__*` 类不冲突，保持不动（最小改动）。
- 佐证：`src/styles/scss/table.css`（未被引用的旧编译产物）中已存在 `.sd-v5-space-hero`，说明该改名方案此前验证过；本次在 tsx 与 scss 两端重新保持一致。

## 测试记录

### 执行的命令

- 静态检查：GetProblems（语言服务器未就绪，未返回问题）
- 产物核查：`dist/assets` 中 `margin:24px 40px 0` 版 `.sd-v5-hero` 仅存在于技能路由 chunk `index-cFpgl3-h.css`

### 测试结果

- 无运行时测试可跑（纯类名改动，不涉逻辑）；改动为字符串级替换，不引入类型风险。

### 失败和修复过程

- PowerShell 内联 `$` 变量被终端包装层吞掉 → 改用 `Select-String -List` 管道写法完成 dist 产物核查。

## 回归检查

- 技能详情抽屉仍使用 `.sd-v5-hero` + `__inner/__head/...`，未改动，样式不受影响。
- 空间页 hero 子级类选择器（`.sd-v5-hero-bg` 等）仍在 table.scss 中定义且被 SpaceInfoEdit 使用，未改名，渲染不变。
- 行为等价说明：修复后空间 hero 在任何浏览器/缓存状态下都只应用 table.scss 的规则（padding 32px 40px、无 margin），即其他浏览器原本的正常表现。

## Review 结果

- 改动 2 个文件、各 1 处选择器/类名，无业务逻辑变化，无新增接口调用。

## 发现的问题

- `apps/abi/src/styles/scss/table.css` 是无人引用的编译残留，建议后续清理（本次不动，避免扩大范围）。
- 项目存在多处跨模块同名 `.sd-v5-*` 全局类（skill.css 与 table.scss），属已知技术债，新增样式时应加模块前缀。

## 本轮经验

- "某浏览器独现"的布局差异，优先怀疑全局 CSS 类名冲突 + 资源缓存/异步 chunk 加载状态差异，而非引擎 bug；用 dist 产物定位规则归属 chunk 是有效手段。

## 是否需要更新 AI 系统

### 需要更新的 context

- 可在 `context/KNOWN_RISKS.md` 追加：全局 `.sd-v5-*` 类名跨模块冲突风险（skill.css vs table.scss）。

### 需要更新的 prompts / agents / skills / mcp / checklists

- 不需要。

## 后续建议

- 清理未引用的 `table.css` 编译残留。
- 新增全局样式统一使用模块前缀（如 `skill-v5-*` / `space-v5-*`）。

## 未解决问题

- 无法在本环境实际启动 Safari 验证；需用户在 Safari 强刷（清除缓存）后确认 hero 占满。
