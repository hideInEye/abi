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

## 2026-07-23 追加：定位为传输层丢数据 + 兜底文案方案

### 反馈

首版修复后用户反馈“还是不对”：思考秒数仍在跑 / 展示仍被截断。

### 定位（已拿到库源码铁证）

读 `@microsoft/fetch-event-source@2.0.1` 的 `lib/cjs/parse.js`：

- `getLines`：`fieldLength` = 行内首个 ASCII 冒号（字节 58）的下标；无冒号的行 `fieldLength = -1`。
- `getMessages`：`else if (fieldLength > 0)` 才会当作字段处理；`fieldLength === -1`（无冒号）的行
  被**完全忽略，不会拼接到 message.data**。

提示语含真实换行，第二物理行 `～可能是…匹配😊"</think> [DONE]` 无 ASCII 冒号（`：` 为全角），
被解析器**整行丢弃**。因此 `onmessage` 永远只能拿到首行；尾部文本、`</think>`、`[DONE]`
在到达业务代码之前已不可恢复。前端无法重建丢失的字节。

### 修改（在首版基础上升级）

- 新增模块级常量 `ILLEGAL_QUERY_FALLBACK_TIP`（完整闲聊屏蔽提示语）。
- illegal_query 分支区分两种命中：
  - `closedMatch`（完整 `</think>` 到达，单行下发或正常框架）→ 用后端原文；
  - 仅 `openMatch`（尾部被 SSE 丢弃）→ 用 `ILLEGAL_QUERY_FALLBACK_TIP` 补全，展示不再截断。
- 两种命中均 `updateAiMessage({ smLoading:false, isDone:true, isIllegalQuery:true })` 并同步
  `setCurrentMessage(illegalText)`，彻底停掉计时器并防止 effect 回写旧流式文本。

### 验证

- 铁证解析器行丢弃行为（parse.js 源码）。
- `GetProblems`：该文件 11 条告警均为既有“声明未使用”，本次未引入新错误。

### 遗留 / 建议

- 兜底文案为前端硬编码，若后端改提示文案需同步更新（或后端修复 SSE 分帧：将提示语内
  换行转义为 `\n`，或每行加 `data:` 前缀，则可直接用后端原文，不再需兜底）。
- 若用户仍看到旧行为，需确认 `apps/chat` （微应用）已重新构建/热更新，非旧 dist 产物。

## 2026-07-23 追加（第三轮）：展示变空 → 拦截点上移到 reasoning 过滤之前

### 反馈

第二版后用户反馈“直接全没了”：思考秒数已停（`已完成思考`），但内容整块为空。

### 根因（第二版拦截点太靠后）

原 illegal_query 分支在 `messageRef.current += chunk` **之后**，而 `chunk` 由
`processContentWithInlineThinking` 产出。当**未启用深度思考**（或正处于 reasoning 段）时，
该函数会把含 `<think>` 的 illegal_query 内容过滤为 `''`，随后 `if (!chunkText) return`
在累加前就提前返回 → `messageRef` 永远拿不到 `illegal_query` → 分支不触发。
此时只有 `onclose` 兜底把 `smLoading` 置 false（秒数停了），但 `context` 从未被写入 → 展示为空。

### 修改

把 illegal_query 拦截**上移到 `onmessage` 顶部**（紧跟 `[DONE]` 分支之后、`let chunk` 之前），
直接读取**原始** `event.data`（含其 JSON `choices[0].delta.content`），在任何 reasoning /
深度思考过滤发生之前判定：

- 命中 `illegal_query`（原始内容或已累积的 messageRef 任一）即结束流；
- `combined = messageRef + rawIllegalSource` 优先按 `closedRegex` 取后端原文，否则用
  `ILLEGAL_QUERY_FALLBACK_TIP` 兜底；
- 同样 `updateAiMessage({ smLoading:false, isDone:true, isIllegalQuery:true })` +
  `setCurrentMessage(illegalText)`，停计时器并防回写。
- 删除原累加后的 illegal_query 分支，避免重复。

### 验证

- `GetProblems`：该文件 11 条告警均为既有“声明未使用”，本次未引入新错误。
- 逻辑覆盖：深度思考开/关、单行完整下发、拆帧丢尾三种路径均在过滤前拦截，不再出现空展示或秒数不停。

### 待用户实测确认

- `apps/chat` 为微应用，务必重新构建/热更新后再验证（此前多轮行为变化说明确有生效，但仍建议确认）。

## 2026-07-23 追加（第四轮，实测定案）：onmessage 零触发，修复点在 onclose

### 实测铁证（用项目实际安装的 @microsoft/fetch-event-source 解析器喂入原始字节）

- 末尾有空行：只派发被截断的首行（`温馨提示：…理解范围了。`）。
- 末尾无空行（`</think> [DONE]` 后直接关流）：**零事件，onmessage 完全不触发**。
  SSE 解析器仅在遇到空行时才派发事件；第二行被丢弃后若无后续空行，首行也永不派发。

因此前三轮在 onmessage 内的所有拦截在该场景下都是死代码；只有 onclose 执行，
而旧 onclose 只翻 smLoading（所以显示“已完成思考”）、从不写 context → 气泡全空（“直接全没了”）。

### 修改

`onclose` 内的 setConvContent map：对仍处 `smLoading` 的 ai 消息，若
`messageRef 含 illegal_query`，或 `context 为空且 messageRef 为空`（零事件场景），
则写入 `ILLEGAL_QUERY_FALLBACK_TIP` 并标 `isIllegalQuery:true`；否则保持原逻辑。
正常回答到 onclose 时 context 必非空，不会误伤。

### 两层防线分工

- 末尾有空行（首行截断事件能到达）→ onmessage 顶部拦截（第三轮）；
- 末尾无空行（零事件）→ onclose 兜底（本轮，用户实际命中的场景）。

### 验证

- Node 脚本喂入真实解析器实测两种分帧变体（已删除临时脚本）。
- `GetProblems`：11 条均为既有“声明未使用”告警，无新增错误。

## 2026-07-23 追加（第五/六轮，最终定案）：真凶是 CSS `p:has(> br:only-child)` 误隐藏

### 反馈与取证过程

第四轮后用户仍反馈空白。插入 `[illegal-debug]` 临时诊断日志逐层取证：

1. 模块版本标记确认浏览器运行的是新代码；
2. onmessage 收到截断首行事件、顶部拦截命中，兜底文案（58 字）成功写入消息状态；
3. AiEle 渲染日志：context/isIllegalQuery/isCollapsed/markdownText 全部正确 —— 数据与组件层均正常；
4. DOM 自检：`textContent 含文案 = true`，`innerText（仅可见）含文案 = false`，
   文案所在 `<p>` 的 computed style 为 `display: none`。

### 最终根因（铁证）

`apps/chat/src/components/conversation/index.module.css` 中 `.markdown-content` 的规则：

```css
/* 隐藏只包含空白或 <br> 的段落 */
& p:has(> br:only-child) { display: none !important; }
```

`:only-child` 只统计**元素**子节点、不统计文本节点。兜底文案经 toThinkingMarkdown
（硬换行）渲染为 `<p>温馨提示…<br>～可能是…</p>`，唯一元素子节点恰为那个 `<br>`，
整段被误判为“空段落”`display:none`。任何“含单个硬换行的单段落”都会整段消失，
闲聊文案（两行 + 一个换行）恰好是这种结构 —— 这解释了前几轮无论状态层怎么修页面都空白。

### 修改

- 删除 `p:has(> br:only-child) { display:none !important }` 规则（`p:empty` 规则保留，
  真正的空段落仍会隐藏），并留注释说明不可再用该选择器及原因。
- 清理全部 `[illegal-debug]` 临时诊断日志（useConversationController.ts 5 处 + AiEle.tsx 2 处）。
- 删除遗留临时脚本 `_tmp_sse_ground_truth.mjs`、`apps/chat/tmp-sse-ground-truth.cjs`。

### 回归风险

- 受影响面：所有经 `.markdown-content` 渲染的内容。变化仅为：此前被误隐藏的
  “文本+单硬换行”段落恢复显示（本就应该显示）；只含 `<br>` 无文本的段落会多一个空行，
  但 processContent 已压缩连续空行，出现概率极低且仅为视觉空行，可接受。

### 验证

- 全仓 `grep br:only-child` 仅剩注释；`grep illegal-debug` 0 命中。
- `GetProblems`：均为既有“声明未使用”告警，无新增错误。
- 待用户页面实测：闲聊提问应展示完整两行兜底文案且思考态正常结束。

### 经验沉淀

- 前四轮全部在数据/状态层找原因，而真凶在 CSS；排查“数据对但不显示”时应尽早用
  `textContent vs innerText` 对比 + computed style 二分，而非反复修状态逻辑。
- `:only-child`/`:empty` 类选择器对文本节点不可见，用它们隐藏“空段落”时极易误伤含文本的段落。
