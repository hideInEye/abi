# 分享复制按钮对齐大屏分享弹窗口径 Run Log

> 2026-09-03 更新：本方案已被取代。用户确认列表接口不返回密码字段，后端改为详情单查 `GET /project/share/{shareCode}`，密码改在点击复制时单查获取，按钮文案恢复固定「复制链接和密码」。见 `.ai/runs/2026-09-03-share-detail-password/RUN_LOG.md`。

## 基本信息

- 日期：2026-09-02
- 任务名称：share-copy-password-align
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-02 追加二）
- 执行 AI：Qoder
- 任务类型：Bug 修复 + 文案一致性

## 问题

用户反馈：「已发布助手 → 分享记录」中对分享记录点「复制链接和密码」，剪贴板内容只有分享链接、没有访问密码（截图标注「复制信息，没有密码」）；要求大屏分享记录按钮、助手分享按钮、助手分享记录按钮三处对齐大屏分享弹窗按钮的口径（密码有无决定按钮文案与复制内容）。

## 根因

1. 分享记录列表接口 `/project/share/list` 返回字段无文档（2026-08-28 run log 已记录「待联调验证真实返回字段」），前端 `mapShareRecord` 仅读 `sharePassword`；后端列表密码字段名未统一时取值为空 → 复制走无密码分支、按钮却固定文案「复制链接和密码」，造成「承诺复制密码却没有密码」的观感。
2. 2026-08-31 追加四将两端记录按钮文案固定为「复制链接和密码」，与大屏分享弹窗「按密码有无切换文案」的口径不一致，无密码记录也展示含密码文案。

## 修改文件

| 文件 | 修改 |
| --- | --- |
| `apps/abi/src/pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx` | 密码映射兼容 `sharePassword \|\| password \|\| sharePwd`；按钮文案按密码有无切换「复制链接和密码 / 复制链接」 |
| `apps/dashboard/src/pages/my-screen/ShareRecordList.tsx` | 同上两处（链接格式转换沿用既有大屏规则，未动） |
| `apps/abi/src/pages/workbench/app-workshop/my-assistant/AssistantShareModal.tsx` | 创建响应密码读取兼容 `sharePassword ?? password ?? sharePwd`（链接保持后端哈希路径原样，chat 应用 `dashboard_share_page/{code}` 哈希路由直接渲染后端路径，不做大屏式转换） |

## 行为等价性说明

- 后端返回 `sharePassword` 时映射结果与改动前完全一致（`||` 链首项命中）；仅当首项为空时才回退别名或空串。
- 有密码记录的复制内容、提示文案不变（`分享链接：{url}\n访问密码：{pwd}`）；无密码记录复制内容不变（仅链接），仅按钮文案改为「复制链接」，与大屏分享弹窗一致。
- 未新增/删除任何接口调用；分页、空态、状态标签、切空间重拉均未触碰。

## 测试与验证

- `apps/abi`：`npx tsc --noEmit`，改动文件（ShareRecordList / AssistantShareModal）零错误（输出仅存量 `router/elegant/routes.ts`、`locales/**` 自动生成问题，与本次无关）。
- `apps/dashboard`：`npx tsc --noEmit`，改动文件（ShareRecordList）零错误（存量 dayjs TS2307 等与本次无关）。
- 无既有单测覆盖复制交互（依赖 clipboard 运行时），未新增回归测试；手动验证路径：我的助手 → 分享记录 / 我的大屏 → 分享记录，分别对有密码、无密码记录点复制按钮，核对剪贴板内容与按钮文案。

## 回归检查

- 大屏分享弹窗（参照物）、chat 端分享页、分享校验链路未改动。
- 大屏记录复制的链接格式转换（`/#/`→`/`、`/dr/`→`/dashboard-share-page/`）保持原样。
- 2026-08-31 追加四的状态标签口径（当前启用/已过期/已停用）未触碰，仅按钮文案口径按本次需求覆盖。

## Review 结果

- 改动仅限三处复制/映射点与需求文件，未牵连无关模块；未新增接口调用。

## 是否需要更新 AI 系统

### 需要更新的 context / prompts / agents / skills / mcp / checklists

- 不需要。

## 未解决事项

- 若后端列表响应实际不返回任何密码字段（`sharePassword/password/sharePwd` 均无），前端无法凭空复制密码：按钮将显示「复制链接」且复制仅链接（与弹窗口径一致的诚实行为），此时需后端在 `/project/share/list` 响应中补充密码字段才能恢复「复制链接和密码」。待联调确认字段名后可收敛兼容链。
