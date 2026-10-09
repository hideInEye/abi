# 2026-09-30 widget illegal_query 修复移植到 chat-sdk 副本并重建产物

## 需求来源

用户反馈：分享浮窗对 illegal_query（闲聊/超范围屏蔽）再次显示"请求异常，请稍后重试"，而主对话与此前修复预期为显示温馨提示。附截图：AI 卡片信息条正常、描述分析区为"请求异常，请稍后重试"。

## 根因

`apps/chat-sdk/src/chat` 是 `apps/chat/src` 的**实体副本**（非软链），两树已双向漂移：

- illegal_query 修复（commit `bf5b4cf`，2026-09-28）只落在 `apps/chat/src/components/chat-widget/service.ts`（+ onIllegalQuery 回调、parse 前拦截、SyntaxError 排除）与 `ChatWidget.tsx`（接线），**从未同步进 chat-sdk 副本**。
- chat-sdk 副本反而有主树没有的主题代码（ThemeCustomizer、saveShareTheme 等，未提交）。
- SDK 产物 `abi-assistant-widget.js`（dist + `apps/chat/public`，2026-09-29 18:30 构建）经全文件检索**不含 illegal_query 任何痕迹**，证实分享/嵌入运行时走的是旧逻辑：JSON.parse 抛 SyntaxError → catch `instanceof Error` 上抛 → onError → "请求异常"。

用户未提交的改动（chat 树 ChatWidget 工具飞层、chat-sdk 树主题等）与本次修复无冲突，全部保留未动。

## 修改内容（仅 chat-sdk 副本，保留其主题代码）

1. `apps/chat-sdk/src/chat/components/chat-widget/service.ts`
   - `StreamChatCallbacks` 新增 `onIllegalQuery?`；新增 `ILLEGAL_QUERY_FALLBACK_TIP`
   - `onmessage`：`!event.data` 守卫补 `|| done`；JSON.parse 前拦截 illegal_query（闭合法则提取，否则兜底文案），置 done 收尾
   - catch 改为 `err.name !== 'SyntaxError'` 才上抛
2. `apps/chat-sdk/src/chat/components/chat-widget/ChatWidget.tsx`
   - `sendChatStream` 回调补 `onIllegalQuery`：提示语转两空格硬换行后作为正文、清 thinking、streaming:false

## 验证

- `pnpm --filter @abi/chat-widget build` 通过；新 dist 与 `apps/chat/public` 同步副本均检索到 `illegal_query` 与兜底文案（旧产物为 0）。
- 副本树全量 tsc 存在主树同类的既有类型缺口（`@sa/axios` 解析、`window.APP_CONFIG` 严格模式等，均在 conv.ts/request/auth/utils，非本次改动文件）；该包 type-check 脚本本身即 `--noCheck`，不作为门禁。
- 未新增测试：chat-sdk 副本树按同步惯例不含 `*.test.ts`；主树 `service.test.ts` 修复当时也未覆盖 illegal_query，如需回归测试应在主树补。

## 遗留风险（记录，未顺手修）

1. **历史回填缺口**：`mapShareHistory`（两树同）对 ai 消息原文保留，illegal_query 轮次落库的原始流文本刷新后会原样展示；主对话 `useConversationController` 有 displayMessage 剥离兜底，widget 无。
2. **双树漂移**：副本缺 `AssistantSharePanel.tsx`、`shareUrl.ts` 及全部测试文件；主题代码仅存在于副本。建议明确同步方向（单向 chat→chat-sdk 或改构建期引用），避免再次"修了一边另一边回退"。
