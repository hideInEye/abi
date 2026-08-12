# 技能新增/编辑接口增加 skillType 字段

- 日期：2026-08-12
- 类型：前端接口字段对接 + 卡片展示（无新增接口调用）
- 需求：`0:内置技能 1:外部技能`，技能新增和编辑接口增加 `skillType` 字段。

## 目标

1. 技能「新增（安装）」接口携带 `skillType`。
2. 技能「编辑」接口携带 `skillType`。
3. 技能卡片上显示「内置/外部」类型。

## 结论（用户确认）

- 前端不加类型下拉选择器；新增、编辑统一固定提交 `skillType=1`（外部技能）。
- 「更新技能版本」与「安装技能」共用 `publishSkillApi`（`/skill/publish`），同样携带 `skillType=1`。
- 卡片按列表返回的 `skillType` 显示：`0` → 内置技能，其余（含默认 1、缺省）→ 外部技能。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `apps/abi/src/service/api/skill.ts` | `updateSkillInfoApi` 入参类型新增可选 `skillType`，补注释 |
| `apps/abi/src/pages/component/system/skills/modules/skill-edit-drawer.tsx` | 编辑保存调用 `updateSkillInfoApi` 固定传 `skillType: 1` |
| `apps/abi/src/pages/component/system/skills/modules/skill-publish-drawer.tsx` | 提交 FormData 追加 `skillType=1`（install/update 共用） |
| `apps/abi/src/pages/component/system/skills/index.tsx` | `SkillItem` 新增 `skillType`；加 `resolveSkillTypeLabel`；卡片正文新增「类型」行 |

## 非目标 / 未改动

- 未新增任何接口调用；未改路由、未改列表（表格）视图列、未改详情抽屉。
- 未触碰仓库中其它未提交改动（assistant-edit-drawer、useConversationController、AiChatPanel 等）。

## 验证

- 命令：`pnpm --filter chatbi typecheck`（`tsc --noEmit --skipLibCheck`）。
- 结果：本次改动的 4 个文件零类型报错。
- 剩余报错均为仓库既有 pre-existing：
  - `packages/materials`、`packages/simple-router`、`packages/uno-preset`：monorepo 下 `react` / `@unocss/*` 类型解析缺失。
  - `src/router/elegant/imports.ts`、`routes.ts`：elegant 自动生成的路由 `RouteKey` union 未同步（含 `component_system_skills`、icon-selector、editor-quill 等），与本任务无关。

## 风险与回归

- 行为等价：仅新增出参字段与一处卡片展示行，未改动原有安装/编辑/更新逻辑与其它字段。
- 若后端对 `skillType` 有校验（如枚举/必填），需确认固定值 `1` 满足；如后续需要按包内容区分内置/外部，再评估加选择器。

## 是否需更新 .ai 长期文档

- 否。属常规字段对接，未引入新约定或架构变化。
