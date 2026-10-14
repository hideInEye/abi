# 2026-10-13 分享悬浮窗历史列表与助手切换下拉样式协调

## 文档状态

- 状态：已完成。
- 需求类型：助手分享悬浮窗 UI 样式调整（无逻辑改动）。
- 影响范围：chat-sdk `HistoryDrawer`（历史对话抽屉列表）、`ChatWidget` 头部助手切换下拉与通用菜单面板（`.abi-cw-menu*`）。

## 目标

1. 历史对话列表：选中/hover 底色从"标题块 + ⋮ 块"两块割裂改为整行单一圆角面；行距收紧（行 padding 9px、行间隔 2px）；分组标签与会话标题文字左对齐（24px）。
2. 列表与菜单文字显式给定 `font-size/font-weight/line-height`，并用 `.drawer .xxx`、`.abi-cw-menu .abi-cw-menu-item` 双类名抬特异性，宿主页面按钮全局样式不再撑破行高或加粗标题。
3. 助手切换下拉：当前项加 `abi-cw-menu-item-active`（浅靛底 + 主题色文字，同历史对话选中行口径）；面板加 `abi-cw-switch-panel`（min-width 200px）；重名助手 shareCode 尾注改为小标签chip，去掉裸 monospace 调试感。

## 非目标

- 不改会话切换/重命名/置顶/删除逻辑与接口。
- 不改抽屉形态（右锚左拉、透明遮罩、宽度规则）与主题定制器。
- 不改 apps/chat 旧版 chat-widget（无切换下拉与历史抽屉）。

## 验收标准

1. 历史列表选中行整行统一浅靛底，⋮ 落在行面内不再单独成块。
2. 切换下拉当前项有浅靛底 + 主题色文字 + 勾选图标同色。
3. 宿主（abi 分享页/第三方页）全局按钮样式不改变列表与菜单的字号字重行高。

## 测试要求与执行

- 纯样式/类名调整，无单测覆盖点；`pnpm run type-check` 通过。
- `pnpm run build` 成功（18.5s），dist CSS 已含 `rowActive`、`abi-cw-menu-item-active`、`abi-cw-switch-panel` 与双类名菜单规则。
- 交付提醒：分享页加载部署产物，需将 `apps/chat-sdk/dist/abi-assistant-widget.{js,css}` + `index.html` 部署到网关 `/chat-sdk/` 后刷新验证（用户截图仍为旧包渲染）。

## 回归检查

- 更多菜单（历史对话/主题设置/关闭页面）与行内 ⋮ 菜单复用同一 `.abi-cw-menu-panel`，仅 typography 抬特异性，视觉口径一致。
- 行内重命名输入框左内边距同步为 12px，与标题文字对齐。

## 二轮修订（用户反馈）

1. 历史行去掉两层高亮：`.rowMore:hover` 不再自带底色（叠在行选中底上成第二层），hover 仅加深图标颜色。
2. 助手切换下拉换选中方式：当前项去掉整行底色，改为主题色文字 + 勾选；新增 `.abi-cw-switch-check` 每行常驻 12px 占位槽，shareCode 尾注右缘逐行对齐（消除“不整齐”）。
3. 同步重构建 dist（26.6s）；用户本地 5199 dev server 经 HMR 直接生效。

## 三轮修订（用户反馈 + 浏览器实测）

1. 切换下拉去掉对钩：选中仅主题色文字 + 500 字重；删除 `.abi-cw-switch-check` 占位槽与渲染；顺带删除误伤菜单图标尺寸的 `.anticon svg 12px` 规则（恢复 15px）。
2. 主题切换只剩输入框变化的根因：分享记录保存过的自定义配置（apiThemeConfig）经 themeConfigToStyle 把 --cw-header-bg/--cw-body-bg 等建模变量钉死在旧基准值，预设切换只剩未建模变量生效。修复：新增 apiConfigDropped 态，访客切预设后本次会话丢弃接口下发旧配置；「恢复默认」同时清 userTheme 与丢弃标记，回到后端基准。
3. 弹窗兼容主题：HistoryDrawer/ThemeCustomizer 两个抽屉的 --hd-*/--tk-* 局部变量改为派生自 --cw-*，另加 [data-cw-theme='dark'] 覆盖块转深色玻璃标题栏/行高亮/chip 底；antd 控件在黑色系下切 darkAlgorithm；菜单面板边框/hover/选中色改读 --cw-border/--accent。
4. 验证：type-check 通过；build 24.3s；Browser 实测 5199：三预设下 --cw-header-bg/--cw-body-bg 均变化、抽屉 content 黑色系 rgba(48,52,68,0.82)/浅色标题、切换下拉当前行无对钩仅主题色文字——A/B/C 全过。

## 四轮修订（历史对话三问题 + 窗内提示）

1. 切换下拉加回选中背景高亮：浅靛底 0.1（黑色系 0.16 亮靛），无对钩后各行结构一致不再错位。
2. 重命名“用户ID不能为空”：updateSession 补 userId: getCurrentUserId()（同 ensureSession 口径）；实测两次 rename 均 200。
3. 重命名行内编辑去确认勾：输入框占满整行，回车/失焦提交、Esc 取消；空标题或未改动视为取消不发请求；删除 renameOk 样式与 IconCheck。
4. 提示改窗内：新增 widgetToast.tsx（showWidgetToast + WidgetToastHost，面板内标题栏下方居中浮层 3s 自消，含黑色系变体）；ChatWidget/ChartCard 及 FileTag、request/index、auth、HumanEle、ExploreCodeBlock、ExploreMessageRow、useExploreConversation、StatisticsAnalysis 全部 body 级 antd message 替换为窗内通知，antd message 导入清零。
5. 验证：type-check/build（32.1s）通过；Browser 实测：重命名态 0 按钮 0 svg、rename 接口 200 无“用户ID不能为空”、无 body 级 .ant-message；成功不弹 toast（列表刷新即反馈），失败/警告/信息类走窗内通知条。
