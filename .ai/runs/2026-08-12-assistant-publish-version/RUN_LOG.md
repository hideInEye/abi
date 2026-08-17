# 运行记录：助手编辑「上线」接入 version/publish

- 日期：2026-08-12
- 类型：功能改动（接口接入，无 UI 变化）
- 触发需求：口头确认 —— 助手编辑抽屉点击「上线」时，先保存当前编辑，再对最新版本调用 `POST /abi-chat/v1/app/version/publish`（入参 `versionId`，Long，必传）。

## 目标

1. 助手编辑抽屉的「上线」按钮：先调 `add/update` 保存当前编辑，保存成功后再调 `version/publish` 完成上线（先保存再发布）。
2. `version/publish` 的 `versionId` 使用打开抽屉时 `loadDetail` 已加载的最新版本 ID（编辑态可用，不额外发请求）。

## 非目标

- 不新增/重查接口获取 `versionId`（不从保存响应解析、不再调 `app/get`）。
- 不改动「保存」（草稿）逻辑、`buildPayload` 结构、必填校验及其它字段。
- 不改动列表页 Switch 快捷上/下线（`handleToggle`）逻辑。
- 不改动 UI 样式与文案（成功提示沿用「已上线，状态设为发布」）。

## 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`
  - 新增 import：`publishVersionApi`（`@/service/api/abi-chat-app` 已存在该导出）。
  - 新增 state：`versionId`（`number | string | undefined`）。
  - `loadDetail`：进入时先 `setVersionId(undefined)` 清除上一个助手的残留；解析出 `version` 后 `setVersionId(version?.versionId ?? detail.latestVersionId)`。
  - 新增模式重置：追加 `setVersionId(undefined)`。
  - `handlePublish`：保存成功后，若 `versionId` 有效（`!= null` 且非空串）则调用 `publishVersionApi({ versionId })`，失败（返回 `{ error }`）则保留抽屉不关闭；随后置 `status='1'`、提示成功、关闭刷新。

## 关键约定

- 服务层 `publishVersionApi({ versionId })` 已定义：`POST /api/abi-chat/v1/app/version/publish`（见 `service/api/abi-chat-app.ts`）。
- `apiRequest` 为扁平请求：失败返回 `{ error }` 而非抛错，故保存与发布均以 `if (error) return` 判定。
- `versionId` 来源：详情 `app/get` 的 `latestVersionId`（配置嵌于 `data.versions[]`，与既有 `loadDetail` 取版本口径一致）。
- 编辑态（`isEdit`）才有已加载 `versionId`；新建态首次「上线」暂无 `versionId`，按约定不触发 `version/publish`（仅保存），符合“用已加载 versionId、不额外请求”的选择。

## 验收标准

1. 编辑已有助手点「上线」：先发 `app/update` 保存，成功后发 `app/version/publish`（body 含 `versionId`）。
2. `version/publish` 的 `versionId` 等于打开抽屉时详情的 `latestVersionId`。
3. 保存失败或发布失败：抽屉不关闭，由请求层统一提示后端错误。
4. 成功后提示「已上线，状态设为发布」并关闭抽屉、刷新列表。

## 验证

- 类型检查：`pnpm --filter chatbi typecheck`（`tsc --noEmit --skipLibCheck`）。改动文件 `assistant-edit-drawer.tsx` 无报错（过滤该文件命中 0 条）；项目其余 417 条为既有 pre-existing 报错，与本次无关。
- `if (versionId != null && ...)` 守卫内 TS 将 `versionId` 收窄为 `number | string`，匹配 `publishVersionApi` 入参类型。
- 运行时验证：待联调（需真实后端 `latestVersionId` 与 `version/publish` 返回）。

## 回归检查

- 「保存」草稿流程（`handleSave`，`buildPayload('0')`）未改动。
- 列表页 Switch 快捷上/下线（`handleToggle`）未改动。
- `loadDetail` 其余回显（模型/数据语义/技能/工具/开场引导/推荐问题）未改动，仅新增 `versionId` 记录。

## 是否需要更新其他 .ai 资产

- context / checklists / decisions：无需变更。
- 已通过记忆沉淀「助手编辑上线先保存再发布、versionId 取已加载 latestVersionId」这一约定。
