# 自定义维度“保存并配置层级”修复运行记录

## 基本信息

- 日期：2026-09-07
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` 当前需求
- 影响范围：ABI 本体网络属性建模的自定义维度保存与层级配置衔接
- 用户既有改动：`entity/components/AttributeDrawer.tsx` 保持未修改

## 根因

- 自定义维度创建接口成功后，`useDimensionModeling.handleSubmit` 仅向创建抽屉返回布尔成功值。
- “保存并配置层级”随后由 `DimensionOperateDrawer` 自行拼装层级目标记录；新建态没有 `editingItem.id`，代码将 `id` 写成 `0`。
- `HierarchyModal` 在发起层级保存接口前要求有效 `record.id`，因此直接返回并提示“层级参数构建失败”，没有调用层级保存接口。
- 从列表进入层级配置时，列表记录已经包含后端返回的真实维度 ID，所以该入口正常。

## 修复结果

1. 维度提交结果新增 `dimensionId`，创建成功后兼容从 flat request 的 `data` 或原始响应中读取 `dimId`、`id`、`dimensionId` 及直接 ID 值。
2. 编辑态继续优先使用当前维度 ID，不改变编辑保存和列表层级配置入口。
3. 创建接口仅返回 `true` 时，仅“保存并配置层级”额外按本次提交的中英文名称查询新维度；查询响应明确成功且名称精确匹配后才取得 ID。
4. 创建失败继续返回 `null`，创建抽屉不关闭且不进入层级配置；创建成功但仍无法取得 ID 时关闭已完成保存的创建抽屉，但不打开无法保存的层级弹窗，并提示从列表进入。
5. 普通“保存”不增加兜底查询；维度创建、编辑、层级保存的接口路径和 payload 均未修改。

## 自动化验证

- 修复前回归测试按预期失败：`getSubmittedDimensionId is not a function`。
- 定向 Vitest：维度 mapper、层级 payload、维度接口响应契约共 3 个测试文件、86 项测试全部通过。
- 全量 `pnpm test`：66 个测试文件、616 项测试通过；2 个既有 chat 测试文件失败：
  - `apps/chat/src/service/api/app.test.ts` 无法解析 `@/constant/chat`。
  - `apps/chat/src/pages/chat/workshop/assistantResources.test.ts` 旧期望缺少现有 `description`、`prologue` 空字段。
- `pnpm --filter chatbi build`：通过，转换 7602 个模块；存在项目既有 UnoCSS 图标、动态/静态导入和大分块告警。
- `pnpm --filter chatbi typecheck`：被仓库既有类型错误阻塞；本次新增 ID 提取、提交结果类型和 hook 衔接代码没有新增诊断。维度文件筛选结果仍包含修改前已有的字段数组、viewId 与批量映射类型错误。
- 修改文件的全文件 Prettier 检查仍报告 4 个既有文件未完全格式化；为避免把本次 ID 修复扩大成整文件格式化，没有执行 `--write`。新增代码保持邻近代码风格。
- `git diff --check`：通过。

## 回归检查

- 层级 payload 仍为 `{ spaceId, dimId, groups }`，本轮只保证 `dimId` 来自已成功保存的真实维度。
- 层级字段、拖拽、层级组、历史层级回显与保存成功关闭逻辑未修改。
- 创建接口失败、兜底查询失败或没有精确匹配记录时不会进入层级下一步。
- 未执行登录后的真实接口操作，需要在可用环境中回归“新增自定义维度 → 保存并配置层级 → 保存并应用结构”。

## AI 开发系统更新判断

- 已更新：`.ai/requirements/CURRENT_REQUIREMENT.md`。
- 已新增：本运行记录。
- 无需更新：`.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`。
