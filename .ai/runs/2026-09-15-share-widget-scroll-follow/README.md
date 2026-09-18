# Run Log：助手分享悬浮窗探索模式执行过程滚动条锁定底部修复

## 基本信息

- 日期：2026-09-15
- 任务名称：share-widget-scroll-follow
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-15 追加段）
- 任务类型：Bug 修复

## 需求摘要

助手分享悬浮窗（ChatWidget）探索模式执行过程中，消息区滚动条被流式更新的无条件滚底逻辑锁定在底部，用户无法上滑查看执行步骤。补齐与主对话一致的“用户上滑暂停自动滚底”守卫。

## 根因

`ChatWidget.tsx` 的自动滚底 effect 依赖 `exploreController.items` 等流式数据源，每个 SSE 事件都执行 `el.scrollTop = el.scrollHeight`；探索执行过程事件密集，用户上滑后立即被拽回底部。主对话 `useConversationController` 已有 userScrolled 守卫（上滑 >100px 暂停、距底 ≤50px 恢复），分享悬浮窗缺失该守卫。

## 修改文件

- `apps/chat/src/components/chat-widget/scrollFollow.ts`（新增）：纯函数 `nextUserScrolled`，阈值对齐主对话。
- `apps/chat/src/components/chat-widget/scrollFollow.test.ts`（新增）：7 个回归用例（上滑暂停、回底恢复、程序化滚底、内容增长不误暂停、阈值间保持等）。
- `apps/chat/src/components/chat-widget/ChatWidget.tsx`：body 容器接 `onScroll` 采样维护 `userScrolledRef`；自动滚底 effect 增加 `!userScrolledRef.current` 守卫；`dispatchSend` 发送新提问时重置跟随。
- `.ai/requirements/CURRENT_REQUIREMENT.md`：尾部追加需求段（字节安全追加，既有 GBK 段落字节零改动）。

## 测试记录

### 执行的命令

- `pnpm exec vitest run src/components/chat-widget`
- `cd apps/chat; npx tsc --noEmit -p tsconfig.app.json`
- `cd apps/chat; pnpm exec eslint <改动文件>`（基线即失败，见下）

### 测试结果

- Vitest：4 个测试文件 42 用例全部通过（含新增 scrollFollow 7 用例）。
- tsc：仅存量错误 `src/components/conversation/autoChart/multi-measure-pie-chart.ts`（.ts 内含 JSX 的语法错误，未改动文件），改动文件无新增错误。
- eslint：apps/chat 的 flat config 基线即报 `env` key 不支持错误（未改动文件同样报错），属存量配置问题，无法对比；改用 tsc + Vitest 验证。

### 失败和修复过程

- 首次用 SearchReplace 追加需求段时，工具整文件重写导致既有 GBK 编码段落字节有损转换。处理：`git checkout-index -f` 还原该文件原字节后，用字节级拼接（原始字节 + UTF-8 追加段）重写，`git diff` 验证为 42 行纯新增、0 删除。

## 回归检查

- 未上滑时流式更新仍自动滚底（守卫默认 false，行为不变）。
- 交互模式仅 `messages` 变化触发滚底，行为不变。
- 主对话滚动守卫逻辑未改动。
- 发送新提问后重置跟随，三模式统一。

## Review 结果

- 守卫阈值（100/50）与主对话 `useConversationController` 一致；内容增长不触发 scroll 事件，不会误暂停。
- 程序化滚底触发的 scroll 事件距底 0，保持跟随态，无自锁风险。

## 发现的问题

- `apps/chat` eslint flat config 存量损坏（`env` key），任何文件都跑不了 eslint。
- `CURRENT_REQUIREMENT.md` 存在 GBK 编码段落（2026-09-11 API Key 段），后续编辑该文件需字节安全方式追加，避免整文件重写。

## 本轮经验

- 流式对话 UI 的自动滚底必须带“用户上滑暂停”守卫，否则密集流式更新会锁死滚动条；守卫逻辑提为纯函数便于回归测试。
- 混合编码的历史文档文件只能用字节级追加修改。

## 是否需要更新 AI 系统

- context：不需要。
- prompts/agents/skills/mcp/checklists：不需要。
- decisions：不需要。

## 后续建议

- 修复 apps/chat eslint flat config；统一 `CURRENT_REQUIREMENT.md` 为 UTF-8。

## 未解决问题

- 分享悬浮窗滚动行为依赖手工验证（分享页运行探索任务上滑/回底），本环境未执行浏览器验证。

## 第二轮调整（同日手工复核反馈）

### 反馈

- 用户复核：上滑需滑两次才生效；且内部跟随滚动不应影响外层消息区滚动条。

### 根因

1. 上滑暂停阈值沿用主对话 100px，滚轮单档约 100px 不超阈值，首次上滑被下一次流式事件拽回。
2. `ExploreMessageRow` 步骤跟随用 `scrollIntoView({ block: 'nearest' })`，会连带滚动祖先容器（外层消息区），绕过滚动守卫把外层滚动条拽回底部。

### 修改

- `scrollFollow.ts`：上滑暂停阈值降为离开底部区（距底 >50px），单档滚轮立即生效；`scrollFollow.test.ts` 用例同步更新（8 用例）。
- `ExploreMessageRow.tsx`：新增 `scrollStepIntoListView`，只改 `.skillList` 容器自身 scrollTop（容器 CSS 已有 scroll-behavior: smooth），运行跟随与历史选中两处替换 scrollIntoView。
- `.ai/requirements/CURRENT_REQUIREMENT.md`：字节安全追加「追加二」段（git diff 验证 81 行纯新增、0 删除）。

### 验证

- `pnpm exec vitest run src/components/chat-widget`：4 文件 43 用例通过。
- apps/chat `tsc --noEmit -p tsconfig.app.json`：仅存量 multi-measure-pie-chart.ts 错误，无新增。

### 回归检查

- 步骤跟随仍在 .skillList 内平滑滚动（block:'nearest' 等价：下方超出对齐底边、上方超出对齐顶边）。
- 主对话共用该组件：步骤跟随不再连带滚动对话容器，主对话自身滚底守卫逻辑未动。

## 第三轮调整（同日二次复核反馈）

### 反馈

- 用户复核：仍需一直滑（小幅度上滑不生效）；且仍影响正常滚动阅读。

### 根因

1. 暂停阈值 50px 仍偏大：小幅度上滑（触控板/滚动条小拖）距底未超 50 不暂停，被下一次流式更新拽回。
2. 旧恢复条件不限方向：内容折叠（待办执行完自动收起、思考区自动折叠）使 scrollHeight 缩水、浏览器被动钳制 scrollTop 后距底进入 ≤50，误恢复跟随，下一次流式更新再拽回底部。

### 修改

- `scrollFollow.ts`：底部区阈值降为 16px（BOTTOM_ZONE）；暂停=主动上滑且距底 >16；恢复=仅主动下滚且距底 ≤16；被动钳制/内容增长均保持原状态。
- `scrollFollow.test.ts`：用例同步更新（9 用例，含被动钳制不误恢复）。
- `.ai/requirements/CURRENT_REQUIREMENT.md`：字节安全追加「追加三」段（git diff 累计 118 行纯新增、0 删除）。

### 验证

- `pnpm exec vitest run src/components/chat-widget`：4 文件 44 用例通过。
- apps/chat `tsc --noEmit -p tsconfig.app.json`：仅存量 multi-measure-pie-chart.ts 错误，无新增。

### 待确认

- 需用户在包含第三轮改动的构建上复核；若仍复现，需明确复现表面（分享悬浮窗/主对话）、操作方式（滚轮/滚动条拖拽/触控板）与卡住的容器（外层消息区/卡片内代码块区）。
