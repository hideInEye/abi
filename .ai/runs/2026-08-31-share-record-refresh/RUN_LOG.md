# RUN LOG：助手分享成功后分享记录立即刷新

- 日期：2026-08-31
- 类型：Bug fix
- 分支：当前工作分支（未提交）

## 问题

「我的助手」页点击助手卡片「分享」并成功生成分享链接后，「分享记录」tab 不会立刻出现新记录，必须跳转其他菜单（页面卸载重挂载）才能看到。

## 根因

`ShareRecordList` 只在挂载时（`useEffect` 依赖 `spaceId`）拉取一次。antd `Tabs`（ATabs）不卸载非激活页签，分享弹窗成功后没有任何信号触发分享记录重拉；只有整页卸载重挂载（跳转菜单）才会重新请求。

## 修改文件

| 文件 | 修改 |
| --- | --- |
| `apps/abi/src/pages/workbench/app-workshop/my-assistant/AssistantShareModal.tsx` | 新增可选 `onShared` 回调，在拿到分享链接（分享成功）后调用 |
| `apps/abi/src/pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx` | 新增可选 `refreshToken` prop，数值变化时回到第一页重拉 |
| `apps/abi/src/pages/workbench/app-workshop/my-assistant/index.tsx` | 新增 `shareRefreshToken` 状态；分享弹窗 `onShared` 自增该值并透传给 `ShareRecordList` |

## 行为等价性说明

- 未新增接口调用：仅在已有的分享成功路径上追加一次回调，触发的仍是分享记录既有查询接口。
- 弹窗失败路径（`error` 或无 `shareUrl`）不触发回调，行为不变。
- `refreshToken` 默认 0，不影响组件首次挂载拉取逻辑。

## 测试与验证

- `apps/abi` 执行 `tsc --noEmit --skipLibCheck`：本次修改文件无错误（输出中的错误均为 `src/router/elegant/routes.ts`、`src/locales/**` 自动生成的存量问题，与本次改动无关）。
- 无既有单测覆盖该交互（依赖弹窗 + Tabs 运行时），未新增回归测试；手动验证路径：我的助手 → 分享 → 生成分享链接 → 切到「分享记录」tab 立即可见新记录。

## 风险 / 未解决事项

- 无。
- 未更新 `.ai/context`、`.ai/prompts` 等（一次性缺陷修复，无长期规则价值）。
