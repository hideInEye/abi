# chat 技能商店查看页补齐公开/私有切换 Run Log

## 基本信息

- 日期：2026-08-17
- 任务名称：chat-skill-visibility-segmented
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（本轮为跨端 UI 能力对齐，未新增需求章节）
- 任务类型：功能补齐 / 跨端实现对齐
- 涉及阶段：Project Analyst、Developer、Test、Regression

## 需求摘要

chat 应用「技能商店」卡片点击「查看」打开的技能详情抽屉缺少「公开/私有」切换，参照 abi 管理端技能管理的实现补齐。

## 影响范围

- `apps/chat/src/pages/chat/skill/SkillDetailDrawer.tsx`

## 修改文件

- `apps/chat/src/pages/chat/skill/SkillDetailDrawer.tsx`（+56 / -1）

## 实现说明

对齐管理端 `apps/abi/src/pages/component/system/skills/modules/skill-detail-drawer.tsx` 的既有实现：

1. 右侧栏在「标签管理」与「生命周期管理」之间插入「可见范围」卡片，使用 antd `Segmented`（`block`），选项为 公开 `PUBLIC`（`GlobalOutlined`）/ 私有 `PRIVATE`（`LockOutlined`），下方 `sd-v5-muted` 说明文案与管理端逐字一致。
2. 新增 `visibility` / `savingVisibility` 状态；`useEffect` 从 `detail?.visibility ?? skill?.visibility` 同步，后端未返回时默认 `PRIVATE`。
3. `handleVisibilityChange` 乐观更新 + 失败回滚，调用已有 `updateSkillInfo`（`POST /api/abi-copilot/v1/skill/update`，只提交 `skillId` + `visibility`），成功后 `message.success` 并 `loadDetail()` 刷新详情，顶部 Hero 可见范围徽章随 `src.visibility` 同步。

与管理端的唯一差异：失败分支不再本地 `message.error`。chat 的请求拦截器（`apps/chat/src/service/request/index.ts` 中 `isBackendBizError` + `showBackendError`）已对 `code >= 400` 统一透传后端 `msg`，组件内再弹一次会出现双报错，故失败分支只回滚状态。判定成功沿用本文件既有 `isOk(res)`（chat 拦截器返回响应体 `{ code, msg, data }`，与 abi 的 `res.response.data.code` 取值路径不同）。

未新增任何接口：`updateSkillInfo` 在 `apps/chat/src/service/api/skill.ts:31` 已存在；`SkillItem.visibility`、`resolveVisibilityBadge` 也已存在。

## 测试记录

### 执行的命令

- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
- `pnpm --filter ai-bot build`
- `git diff --check`

### 测试结果

- tsc：无输出，通过，未新增类型错误。
- build：`built in 1m 33s` 成功，仅有仓库既有的 chunk >500kB 体积告警。
- `git diff --check`：本次修改文件无空白问题；仅报出既有未提交改动 `apps/dashboard/src/designer/header/items/ai-chat/AiChatPanel.tsx:517` 的行尾空格，非本任务改动，未处理。

## 回归检查

- 技能商店列表、广场/我的技能 Tab、搜索与高级筛选、添加/移除、启用/停用未改动。
- 详情抽屉的下载、文件浏览、版本发布/切换/删除、标签增删、删除技能逻辑未改动。
- `onDeleted` 仍是唯一触发列表刷新的回调；可见范围变更只刷新抽屉详情，与管理端行为一致（管理端同样不刷新列表）。
- 已知行为边界：抽屉内改完可见范围后，列表卡片的「公开/私有」标签与广场跨空间过滤仍沿用本次列表请求的旧数据，需重新拉列表才更新——与管理端一致，本次未扩大改动范围。

## Review 结果

改动集中在单个组件，未触碰接口层、样式文件与其他页面；复用 chat 现有 `sd-v5-*` 样式类（`apps/chat/src/index.css` 中已存在 `.sd-v5-card`、`.sd-v5-card__title`、`.sd-v5-muted`），无新增 CSS。

## 本轮经验

跨端复刻管理端交互时，UI/文案/字段可逐字对齐，但响应成功判定与错误提示必须按各自请求层约定改写：abi 取 `res.response.data.code` 且组件内提示错误，chat 拦截器返回响应体并已统一弹出后端 `msg`，组件内不可重复提示。

## 是否需要更新 AI 系统

- context：不需要。
- prompts / agents / skills / MCP / checklists：不需要。

## 后续建议

若产品要求可见范围变更后列表标签即时同步，可给 `SkillDetailDrawer` 增加一个 `onUpdated` 回调，在 `handleVisibilityChange` 成功后触发列表 `fetchList()`；管理端需同步处理，避免两端行为再次分叉。

## 未解决问题

- 后端是否限制非创建者修改 `visibility` 未确认，前端两端均未做权限判断，失败时依赖后端返回的 `msg` 提示。
