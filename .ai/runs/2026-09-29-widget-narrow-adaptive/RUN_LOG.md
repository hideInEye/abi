# 助手悬浮窗窄宽自适应 Run Log

## 基本信息

- 日期：2026-09-29
- 任务名称：widget-narrow-adaptive
- 需求文件：用户截图标注需求（悬浮窗工具栏超出被隐藏，需适应窄框；选项列表调整宽度）
- 执行 AI：Qoder
- 涉及 agent：Developer、Test
- 任务类型：UI 自适应（小范围功能调整）

## 需求摘要

助手悬浮窗（ChatWidget float 形态）拖窄后：输入工具栏（数据语义/模式/思考/工具/发送）单行溢出被面板 `overflow:hidden` 硬裁切；「工具」弹窗内技能/MCP 的右飞层（260px 菜单 + 260px 飞层）超出面板右缘被裁切。要求工具栏与选项列表随悬浮窗宽高自适应。

## 影响范围

- `apps/chat/src/components/chat-widget/ChatWidget.tsx`、`index.css`
- `apps/chat/src/index.css`
- `apps/chat-sdk/src/chat/components/chat-widget/ChatWidget.tsx`、`index.css`（平行实现同步）
- `apps/chat-sdk/src/chat/index.css`

主对话 chat-input 的 uni-popup 无 `.abi-cw-narrow` 祖先，不受影响。

## 修改文件

- 上述 6 个文件。

## 实现说明

- 面板加 ResizeObserver：宽度 < 480px 时给面板加 `abi-cw-narrow` 类并置 `narrowPanel` 状态（chat 与 chat-sdk 同逻辑）。
- 工具栏 `.abi-cw-input-toolbar` 增加 `flex-wrap: wrap; row-gap: 4px`：窄宽时整行换行而非裁切，发送/停止仍靠右。
- 窄面板下选项列表收敛宽度：`.abi-cw-narrow` 作用域内 `.uni-popup*` 260px→200px、`.abi-cw-sem-tree` 260px→200px（max-height 320→220）、`.uni-popup-list` max-height 140px。
- 窄面板下技能/MCP 飞层 `placement` 由 `rightTop` 改 `topLeft`（向上展开、左对齐菜单项）：右飞层在窄面板内水平方向必然溢出（菜单已贴右缘），向上展开可保证完整可见；宽面板保持原右飞层交互。

## 测试记录

### 执行的命令

- `pnpm --filter ai-bot typecheck`
- `pnpm --filter @abi/chat-widget type-check`

### 测试结果

两个 app 类型检查均无错误输出。

### 失败和修复过程

无。

## 回归检查

- 宽面板（≥480px）行为不变：飞层仍 rightTop、卡片仍 260px。
- 主对话「更多」菜单复用 `.uni-popup` 但无 `.abi-cw-narrow` 祖先，宽度与飞层方向不变。
- 工具栏换行仅影响窄宽场景；宽面板单行布局不变（内容未超宽不触发换行）。

## Review 结果

chat 与 chat-sdk 双份实现保持同步；改动为 CSS 作用域收敛 + 一个 ResizeObserver 与 placement 条件，未触碰会话/请求逻辑。

## 发现的问题

无。

## 本轮经验

悬浮窗内嵌套右飞层在面板贴右缘锚定下水平空间必然不足，窄容器应切换展开方向而非压缩宽度。

## 是否需要更新 AI 系统

不需要。

## 后续建议

- 用户实测窄悬浮窗（380–480px）下工具栏换行与飞层向上展开观感；若希望更紧凑可再降阈值或改图标态按钮。

## 未解决问题

无。

## 第二轮修正（用户反馈“没变化”）

### 原因

1. 悬浮窗内技能/MCP 右飞层在**任何宽度**下都会超出面板右缘（一级菜单 topRight 锚定在贴右缘的工具按钮，飞层再向右展开 260px 必然溢出），上一轮仅窄态换方向未解决宽态裁切；且用户实测窗宽约 546px 未触发 480 阈值。
2. ABI 工作台悬浮窗加载的是构建产物 `/chat-ui/abi-assistant-widget.js/css`（`apps/chat/public` 内的 chat-sdk dist 副本），只改源码不重建产物页面不会变化。

### 修正内容

- 技能/MCP 取消嵌套 hover 右飞层，改为工具弹窗内**点击内联展开**（搜索 + 列表沿菜单宽度展开，`.uni-popup-inline`，列表限高 120px，箭头旋转 90° 指示展开）；任何窗宽都不会横向裁切。chat 与 chat-sdk 双份同步。
- 移除 `narrowPanel` 状态与 placement 条件；ResizeObserver 仅保留 `abi-cw-narrow` 类切换（收敛菜单/语义树宽度）；工具弹窗关闭时重置 `toolExpand`。
- 重建 chat-sdk 产物并覆盖 `apps/chat/public/abi-assistant-widget.{js,css}`。

### 验证

- `pnpm --filter ai-bot typecheck`、`pnpm --filter @abi/chat-widget type-check` 无错误。
- `pnpm --filter @abi/chat-widget build` 成功；新产物 grep 到 `uni-popup-inline`（js/css 均含）。
- 主对话 chat-input 的 hover 右飞层未改动（页面宽度充足，不受影响）。

## 第三轮修正（用户反馈“不要改原来的格式”）

### 原因

第二轮的内联手风琴改变了原有交互格式（hover 右飞层卡片），用户要求保留原格式。

### 修正内容

- 恢复嵌套 hover Popover 飞层原格式（搜索 + 列表卡片、hover 触发、右箭头指示）；仅将级联方向由 rightTop 改 leftTop（悬浮窗内菜单贴右缘锚定，右级联任何宽度都必然超出面板右缘，左级联才能完整可见），并加 `autoAdjustOverflow={false}` 防止 rc-trigger 因容器窄自动翻回右侧。
- hover 过渡桥随方向镜像：`.abi-cw-panel .ant-popover .ant-popover.uni-popover` padding-left 0 / padding-right 8px，保证菜单↔飞层移动无死区。
- 宽度按面板阈值两档收敛（ResizeObserver）：<580px 加 `abi-cw-narrow`（卡片 200px）、<460px 加 `abi-cw-narrow-xs`（卡片 160px），覆盖最小窗宽 380px 的左级联空间需求；语义树同档收敛。
- 飞层列表限高（180px / xs 140px）避免超出面板底缘垂直裁切。
- 移除第二轮的 `toolExpand` 内联展开与 `.uni-popup-inline` 样式。
- 重建 chat-sdk 产物并再次覆盖 `apps/chat/public/abi-assistant-widget.{js,css}`。

### 验证

- `pnpm --filter ai-bot typecheck`、`pnpm --filter @abi/chat-widget type-check` 无错误；sdk build 成功，产物已更新。
- 主对话 chat-input 飞层未受影响（无 `.abi-cw-panel` 祖先，桥与宽度规则不生效）。

## 第四轮修正（解决面板 overflow 裁切根因）

### 原因

第三轮虽然把飞层改向左，但二级 Popover 仍挂载在一级 `.ant-popover` 内，最终仍属于 `.abi-cw-panel` 的后代；面板 `overflow: hidden` 会同时裁切左右两侧超出的内容，换方向不能解决根因。

### 修正内容

- 保持原有 `rightTop`、hover、搜索与列表卡片格式不变。
- 技能/MCP 二级 Popover 改为 `getPopupContainer={() => document.body}`，真正脱离 `.abi-cw-panel` 的裁剪上下文；Ant Design 可依据浏览器视口自动调整左右方向。
- 增加 `abi-cw-tool-flyout-*` 独立尺寸类，使 body portal 仍能随面板宽度使用 260/200/160px 三档宽度。
- body 飞层设置高于悬浮窗的 z-index，并保留 8px hover 过渡桥；列表按窄态限高。
- chat 与 chat-sdk 同步修改，重新构建并覆盖 `apps/chat/public/abi-assistant-widget.{js,css}`。

### 验证

- chat-sdk type-check、build 通过；`git diff --check` 无格式错误（仅构建产物换行符提示）。
- 源码确认无 `leftTop` 和 `autoAdjustOverflow={false}` 残留。

## 第五轮修正（恢复飞层主题样式）

### 原因

二级飞层直接挂到 `document.body` 后脱离了 `.abi-cw-root`，导致悬浮窗主题变量和组件作用域无法继承，出现样式退化。

### 修正内容

- 二级飞层改挂到 `panelRef.current.parentElement`（即 `.abi-cw-root`），成为 `.abi-cw-panel` 的兄弟节点：避开 panel 的 `overflow: hidden`，同时保留完整主题变量与组件样式。
- 保持原 `rightTop` hover 飞层格式；Ant Design 继续根据视口空间自动翻转。
- portal 飞层继续使用独立宽度类 260/200/160px、列表限高和高层级。
- 同步 chat/chat-sdk，重新构建并覆盖实际加载的 widget 产物。

### 验证

- `pnpm --filter ai-bot typecheck`、`pnpm --filter @abi/chat-widget type-check` 无错误；sdk build 成功。
