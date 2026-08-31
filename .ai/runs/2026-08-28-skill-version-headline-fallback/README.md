# 技能版本发布后标签误显「历史版本」修复

- 日期：2026-08-28
- 类型：Bug 修复（chat 与 abi 双端技能详情版本列表）

## 问题现象

- 新添加技能第一次发布后，版本列表直接显示「历史版本」，不显示「当前启用」；
- 添加新版本并发布后同样全部显示「历史版本」；
- 点击一次「回滚」后显示才恢复正常。

## 根因

- 版本三态标签 `resolveVersionStatus(status, isCurrent)` 的 `isCurrent` 仅由技能详情的 `sourceSkillId` 决定；
- 后端 `version/select`（回滚）会回写 `sourceSkillId`，而 `version/publish`（发布）只更新 `latestVersionId`；
- 因此从未回滚过的技能 `sourceSkillId` 为空，任何版本都匹配不上「当前启用」，全部落入「历史版本」分支；回滚一次后 `sourceSkillId` 有值，显示即正常。

## 修复

- 当前启用版本号取值增加兜底：`sourceSkillId || latestVersionId || skill?.latestVersionId`
  （镜像后端生效版本解析：优先回滚显式选中，其次取最新发布版本；`skill` 行数据兜底详情缺字段场景）。

## 非目标

- 不改发布/回滚/删除版本的接口调用与刷新流程；
- 不改版本列表排序、初始选中版本（仍为 `sourceSkillId || list[0]`）；
- 不改卡片级「当前启用/离线版本」两态逻辑。

## 影响范围

- apps/abi/src/pages/component/system/skills/modules/skill-detail-drawer.tsx（headlineVersionId 一行）
- apps/chat/src/pages/chat/skill/SkillDetailDrawer.tsx（同上）
- 连带受益：版本「当前版本」pill、右栏「当前公开版本」展示（均基于 headlineVersion）。

## 行为等价说明

- 已回滚技能：`sourceSkillId` 有值，短路生效，显示与修复前完全一致；
- 未回滚技能：发布后最新发布版本显示「当前启用」，其余已发布版本显示「历史版本」，DRAFT 仍为「离线版本」并可发布。

## 验证

- 两应用 `tsc --noEmit --skipLibCheck` 均无涉及修改文件的报错；GetProblems 无错误。
- 运行时验证：待用户在实际环境复测（新技能首次发布、新版本发布、回滚三场景）。

## 后续

- 无需更新 .ai/prompts、.ai/agents、.ai/skills、.ai/mcp、.ai/context、.ai/checklists、.ai/decisions。
