# 2026-09-03 分享记录密码改走详情单查接口（助手与大屏统一）

## 任务来源

用户确认：分享记录列表接口（`POST /project/share/list`）不返回密码字段，后端已改为单独查询 `GET /api/v1/project/share/{shareCode}`，助手分享和大屏分享统一。要求按新口径改复制逻辑。

对应需求：`.ai/requirements/CURRENT_REQUIREMENT.md`「2026-09-03 追加二」。本任务取代「2026-09-02 追加二」中基于列表行密码字段的方案（行数据永远无密码，文案切换会永远退化为「复制链接」）。

## 修改文件

| 文件 | 修改内容 |
| --- | --- |
| `apps/abi/src/service/api/share.ts` | 新增 `fetchProjectShareDetailApi(shareCode)`：GET `/api/dashboard/api/v1/project/share/{shareCode}`（网关前缀与既有分享接口一致） |
| `apps/abi/src/pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx` | 行数据 `sharePassword` 改为 `shareCode`（列表缺字段时从 shareUrl 尾段兜底）；`handleCopy` 改 async，点击时单查详情取密码（读 `sharePassword` 单字段），失败降级仅复制链接 + warning；按钮文案恢复固定「复制链接和密码」 |
| `apps/abi/src/pages/workbench/app-workshop/my-assistant/AssistantShareModal.tsx` | 创建响应密码读取收敛回 `sharePassword` 单字段，删除 2026-09-02 加的兼容链（创建响应字段明确） |
| `apps/dashboard/src/api/BaseApi.ts` | 新增 `getSharePassword(shareCode)`：GET `/dashboard/api/v1/project/share/{shareCode}`，返回密码字符串（无密码空串）/ null（查询失败），不弹全局错误（调用方降级处理） |
| `apps/dashboard/src/pages/my-screen/ShareRecordList.tsx` | 同 abi 端：`shareCode` 行字段、async `handleCopy` 单查详情、失败降级 warning、固定文案；链接格式转换（`/#/`→`/`、`/dr/`→`/dashboard-share-page/`）保持不变 |

## 关键决策

1. **点击时单查，不在列表加载时批量预查**：每页 10~12 条记录，预查会产生 N 次请求；点击复制才需要密码，单查 1 次即可。
2. **按钮文案恢复固定「复制链接和密码」**：密码只有点击后才可知，列表行无法预判有无密码，动态文案失去数据源；复制内容与 toast 仍随实际密码切换（有密码「分享链接和密码已复制到剪贴板」/无密码「分享链接已复制到剪贴板」）。
3. **详情失败降级不阻断**：查询失败时仍复制链接并 warning「获取分享密码失败，已仅复制分享链接」，避免按钮完全无响应。
4. **shareCode 兜底**：列表 `id` 映射此前已使用 `item.shareCode`（2026-08-28 联调字段），另加 shareUrl 尾段提取兜底（分享链接契约为 `.../{shareCode}` 结尾）。
5. **详情密码字段收敛为 `sharePassword` 单字段**：用户确认后端字段即 `sharePassword`（与创建响应一致），删除 `password/sharePwd` 兼容链。
6. **助手分享弹窗不查详情**：创建响应已含 `sharePassword`，弹窗行为本就正确，仅收敛兼容链。

## 行为等价说明

- 有密码记录：修复目标行为——复制内容含「访问密码」行（此前列表无密码字段导致只复制链接）。
- 无密码记录：复制仅链接，与改前一致。
- 列表拉取、分页、状态标签、空态、切空间重拉、大屏链接转换：均未改动。
- 分享弹窗（助手/大屏）复制行为不变（AssistantShareModal 仅删除无效兼容链，创建响应字段为 `sharePassword`，行为等价）。

## 验证

- `apps/abi`：`npx tsc --noEmit`，改动文件（share.ts / ShareRecordList.tsx / AssistantShareModal.tsx）零错误（存量错误为 router/elegant、locales 等历史问题，与本次无关）。
- `apps/dashboard`：`npx tsc --noEmit`，改动文件（BaseApi.ts / ShareRecordList.tsx）零错误。

## 回归检查

- 2026-08-28 分享记录页签：列表接口调用、分页、映射其余字段未动。
- 2026-08-31 追加四：固定文案「复制链接和密码」恢复。
- 2026-09-01 分享 token 语义、chat 端分享页：未涉及。
- 大屏分享弹窗（MyScreenItem/ProjectItem）：未改动，仍为参照物。

## 未解决事项

- 195 环境手工验证：有密码记录复制含密码行、无密码记录仅链接、详情失败 warning 降级。
