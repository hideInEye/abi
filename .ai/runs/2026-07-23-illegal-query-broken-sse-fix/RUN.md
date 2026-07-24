# 2026-07-23 闲聊屏蔽（illegal_query）思考态不停 + 展示与数据不一致修复

## 现象

后端下发闲聊屏蔽提示语：

```
data: <think>"illegal_query": "温馨提示：您的问题有点超出我当前的理解范围了。
～可能是我掌握的"词汇量"还不够，暂时无法与我数据库语义信息匹配😊"</think> [DONE]
```

- 展示只到「温馨提示：您的问题有点超出我当前的理解范围了。」，与后端原始数据不一致。
- 「思考中 X 秒」一直计时不停。

## 根因

提示语文本中含**真实换行符**，破坏了 SSE 分帧：

- 第二物理行 `～可能是…</think> [DONE]` 既无 `data:` 前缀，也无 ASCII 冒号（`：` 为全角，不计），
  `@microsoft/fetch-event-source` 会将该行**整行丢弃**。
- 因此 `onmessage` 只收到首行 `<think>"illegal_query": "温馨提示：…理解范围了。`，
  永远拿不到闭合 `</think>` 与 `[DONE]`。
- 原严格正则 `…"([\s\S]*?)"\s*<\/think>` 因缺 `</think>` 匹配失败 → 屏蔽分支不触发 →
  `smLoading` 恒为 `true` → 计时器（AiEle.tsx L281-L293）一直累加。
- 展示走 currentMessage 截取路径，只到首行 → 与后端完整数据不一致。

被丢弃的第二行在 `onmessage` 之前已丢失，前端无法还原；完整修复需后端不要在 SSE data 里放裸换行
（转义为 `\n` 或每行加 `data:` 前缀）。

## 修改

`apps/chat/src/components/conversation/hooks/useConversationController.ts`
（illegal_query 分支，约 L1318-L1348）：

- 保留严格正则 `closedRegex`（正常整段场景取全文，行为不变）。
- 新增开放式回退正则 `openRegex = /<think>"illegal_query":\s*"([\s\S]*?)"?\s*(?:\[DONE\])?\s*$/`，
  在缺失闭合 `</think>` 时用已到达文本立即结束流、关闭思考态（`smLoading:false / isDone:true / isIllegalQuery:true`）。
- `context` 统一做 `.replace(/\\n/g, '\n')`，与展示路径一致，避免字面 `\n` 造成展示与落库不一致。

## 验证

- 用 Node 脚本复现三种数据：
  - A 整段闭合：取全文（含内嵌引号与换行）。
  - B 拆帧丢尾：取已到达首行文本并结束思考态（修掉「秒数不停」）。
  - C 无闭合但整段带 [DONE]：取全文。
- `GetProblems`：该文件 11 条告警均为既有「声明未使用」，本次改动未引入新错误。

## 回归

- 正常闭合（case A）走 `closedRegex`，与原逻辑一致，无行为变化。
- intent_clarify、round_index、sub_chat_mode、[DONE]、onclose 等其它分支未改动。

## 遗留 / 建议

- 后端应修复 SSE 帧：闲聊屏蔽提示语内的换行需转义为 `\n` 或每行加 `data:` 前缀，
  否则被丢弃行的文本无法送达前端，展示仍会截断（前端已保证不再卡「思考中」）。

## .ai 长期文档

- 无需更新 context/checklists/decisions；本次为局部缺陷修复。
