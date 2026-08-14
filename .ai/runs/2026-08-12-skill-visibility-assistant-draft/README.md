# 技能可见范围（公开/私有）+ 助手编排保存草稿与测试框锁定

- 日期：2026-08-12
- 类型：前端 UI + 接口字段对接（复用既有 `/skill/update`，无新增接口）
- 需求：
  1. 技能管理：技能查看页在「标签管理」与「生命周期」之间新增「可见范围（公开/私有）」，可即时修改并持久化。
  2. 助手编排：「保存」按钮改为「保存草稿」；未保存草稿时锁定右侧测试输入框。

## 结论（用户确认）

- 保存草稿后行为：维持现状，保存后仍关闭抽屉并刷新列表。
- 测试框锁定范围：仅首次保存前锁定 —— 新建助手在保存草稿前锁定；编辑已有助手默认解锁，且不随后续修改再次锁定。
- 可见范围仅需「公开 / 私有」两态（后端 `visibility` 另有 `NAMESPACE_ONLY`，本次不暴露；缺省按私有展示）。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `apps/abi/src/service/api/skill.ts` | `updateSkillInfoApi` 入参类型新增可选 `visibility`，补注释 |
| `apps/abi/src/pages/component/system/skills/modules/skill-detail-drawer.tsx` | 新增可见范围卡片（`Segmented` 公开/私有）；`visibility`/`savingVisibility` 状态；从 detail/skill 同步的 effect；`handleVisibilityChange`（乐观更新 + 失败回滚 + 成功后 `loadDetail`）；导入 `EyeOutlined`、`Segmented`、`updateSkillInfoApi` |
| `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx` | 新增 `draftSaved` 状态；打开时编辑态置 `true`/新建态置 `false`；`handleSave` 成功置 `true`；按钮文案「保存」→「保存草稿」；右侧测试 `Input` 按 `!draftSaved` 禁用并调整 placeholder/prefix(锁图标)/suffix/背景 |

## 关键设计决策

- 可见范围提交仅传 `{ skillId, visibility }`，不带 `skillType`/`status`/`summary`：参照 `skill-edit-drawer` 省略 `bizName` 亦安全，判定 `/skill/update` 为部分更新；避免误改内置技能类型或清空其它字段。
- 卡片与详情页顶部既有只读徽标（`visibilityBadge`）解耦：卡片为可编辑控件，两者均在 `loadDetail` 后刷新为服务端真实值。
- 助手锁定条件 `lock = !draftSaved`；编辑态因已保存故默认解锁，符合「仅首次保存前锁定」。

## 非目标 / 未改动

- 未新增任何后端接口；未改路由、列表视图与其它抽屉。
- 助手右侧测试输入框本为纯展示（无 value/onChange），锁定即视觉禁用，不改变原有提交逻辑。
- 未触碰仓库中其它未提交改动。

## 验证

- 命令：`pnpm --filter chatbi typecheck`（即 `tsc --noEmit --skipLibCheck`）。
- 结果：本次改动的 3 个文件零类型报错（对全量输出按文件名过滤 `skill-detail-drawer`/`api/skill.ts`/`assistant-edit-drawer` 均无命中）。
- 剩余报错均为仓库既有 pre-existing：`packages/*`（monorepo 下 `react`/`@unocss/*`/`@sa/*` 类型解析缺失）、`src/router/elegant/routes.ts`（自动生成路由 `RouteKey` union 未同步）、`src/service/request/*`（隐式 any）等，与本任务无关。

## 风险与回归

- 可见范围：依赖后端 `/skill/update` 接受并持久化 `visibility`；若后端对该字段有枚举校验，需确认 `PUBLIC`/`PRIVATE` 取值一致。乐观更新在失败时回滚，成功后以 `loadDetail` 回填为准。
- 助手草稿：新建助手保存草稿后抽屉关闭，锁定状态在下次打开该助手（编辑态）时默认解锁，符合确认结论。

## 是否需更新 .ai 长期文档

- 否。属常规字段对接与局部 UI 增强，未引入新约定或架构变化。
