# 技能查看页 name/description 标签加粗

## 任务描述

技能详情页（Skill Detail Drawer）中，SKILL.md 顶部 YAML frontmatter 提取出的 `name:` 和 `description:` 标签需要保持黑体加粗，而对应的值保持普通字体不加粗。

## 修改文件

- `apps/chat/src/pages/chat/skill/SkillDetailDrawer.tsx`
  - 将 `name:` / `description:` 标签用 `<span className="skill-intro-head__label">` 包裹，与值分离。
- `apps/abi/src/pages/component/system/skills/modules/skill-detail-drawer.tsx`
  - 同上，保持两个子应用实现一致。
- `apps/chat/src/index.css`
  - 移除 `.skill-intro-head__name` 的整体 `font-weight: 600`。
  - 新增 `.skill-intro-head__label { font-weight: 600; }`。
  - 将 `.skill-intro-head__desc` 的颜色从 `#3e5068` 统一为 `#1a2744`（与 `name` 一致）。
  - 将 `.skill-intro-head__name` 的字号从 `15px`、`.skill-intro-head__desc` 的字号从 `13px` 统一为 `14px`。
- `apps/abi/src/pages/component/system/skills/skill.css`
  - 同上。

## 验证结果

- `pnpm --filter ai-bot exec tsc --noEmit`：通过，无新增类型错误。
- `pnpm --filter chatbi typecheck`：项目中存在大量已有类型错误（模块解析、依赖声明等），修改文件未引入新错误。
- `GetProblems` 检查修改的 4 个文件：仅有既有 CSS warning（`@tailwind` / `line-clamp`），无新增问题。

## 是否更新 AI 资产

无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
