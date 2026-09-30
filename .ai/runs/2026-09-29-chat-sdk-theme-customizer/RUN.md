# RUN: chat-sdk 悬浮窗外观自定义（替换黑白切换）

## 背景

- 悬浮窗头部原为蓝/黑预设切换按钮，产品要求改为「自定义」入口，支持访客定制页面背景、标题栏、字体、图表四维样式，并由分享接口下发 / 回传持久化。
- 后端下发 / 保存接口尚未实现，前端需可端到端使用并对接口缺省优雅降级。

## 修改

- `apps/chat-sdk/src/theme.ts`：新增 `ThemeConfig` 四维模型（background/titleBar/font/chart）与纯函数 `normalizeThemeConfig`（校验兜底）、`mergeThemeOverride`（深合并）、`resolveFullConfig`（预设基准 + override）、`themeConfigToStyle`（→ CSS 变量）、`chartStyleFromConfig`（→ 图表 token）、`presetToThemeConfig`；原 blue/light/dark 预设变量表与 `resolveThemeStyle` 保持不变。
- `apps/chat-sdk/src/chat/components/chat-widget/ChartThemeContext.ts`：新增图表 token Context，`ChartCard` 用 `useChartTheme` 替代写死的模块常量。
- `ThemeCustomizer.tsx` + `ThemeCustomizer.module.css`：浮窗内覆盖抽屉（Drawer `getContainer` 指向面板 + `rootStyle={{ position: 'absolute' }}`，rc-drawer 仅在 `getContainer === false` 时加 `-inline`，传容器节点时根节点仍为 `position: fixed` 会铺满视口，故必须显式改 absolute，与 SchemaFieldsModal 同款）；预设 chips + 提示行 + 四组折叠（默认仅展开「页面背景」）+ 保存 / 恢复默认；行布局标签定宽成列，取色行常驻 hex 文本、滑杆行常驻数值，配色板为六列网格色块（删除角标悬停出现）；取色 / 下拉弹层 `getPopupContainer` 指向抽屉内容节点（`position: relative`），跟随抽屉滚动不漂移。
- `ChatWidget.tsx`：头部按钮由切换改为「自定义」入口（`IconCustomize`，显隐仍由 `showThemeSwitch` 控制）；生效配置 = 预设基准 + 宿主注入 + 接口下发 + 访客本地（后者覆盖前者）；根节点 inline style 在 `resolveThemeStyle` 上叠加 `themeConfigToStyle`；`ChartThemeContext.Provider` 包裹面板；`onChange` 实时预览并写 localStorage（key `abi-assistant-theme-config`），`onSave` 调 `saveShareTheme`，`onReset` 清本地回预设；`initCheck` / `handlePasswordSubmit` 读 `res.themeConfig`（兼容旧 `res.theme`）。
- `service.ts`：`ShareCheckResult` 增 `themeConfig`；`checkSharePassword` 经 `normalizeThemeConfig` 解析 `d.themeConfig`，无则回退 `d.theme` 字符串；新增 `saveShareTheme`（POST `/dashboard/api/v1/project/saveShareTheme`，异常 catch 返回 false 由调用方降级本地）。
- `element.ts` / `AbiAssistant.tsx`：保留 `theme` / `theme-switch` 属性，新增可选 `theme-config` 属性（宿主传 JSON 初始配置）与 `initialThemeConfig` 透传；注释更新为「外观自定义入口」。
- `index.css`：`.abi-cw-root` 消费 `--cw-font-family` / `--cw-font-scale` / `--cw-font-weight` / `--cw-text`；`.abi-cw-body` 拆分为 `background-color` + `background-image`（`--cw-body-bg-image` 承载渐变）；`.abi-cw-header-name` 用 `--cw-header-text`；正文 / 消息 / markdown / 输入 / 信息条关键字号改为 `calc(Npx * var(--cw-font-scale, 1))`。
- `apps/chat-sdk/src/theme.test.ts`：覆盖上述纯函数（22 例）。
- 蓝色系与白色系区分：`theme.ts` 新增 `BLUE_VARS`（白色系中性底 + 品牌蓝标题栏 `#5b7cf7`/白字白图标 + 浅蓝画布 `#eef3fe`），`THEME_VARS.blue` 由空表改为 `BLUE_VARS`；`DEFAULT_THEME_CONFIG`/`PRESET_CONFIG.blue` 同步为新可视基准（背景 `#eef3fe`、标题栏 `#5b7cf7`/`#ffffff`）；新增 `--cw-header-icon`/`--cw-header-icon-hover-bg` 变量，`themeConfigToStyle` 在自定义标题栏文字时同步产出 `--cw-header-icon`；`index.css` 头部操作按钮改消费这两个变量（深色标题栏下图标提亮）。
- 自定义颜色不染主题弹窗（最终方案，替代早先 rootStyle 遮变量做法）：`ThemeCustomizer.module.css` 不再读任何 `--cw-*`，改由抽屉自身类提供局部变量——`.drawer` 定义浅色固定值（surface/text/border/chip-bg 等 `--tk-*`），`.drawerDark` 按预设切深色值；`rootClassName` 挂这两个类（rc-drawer 的 `className` 落点不保证在根节点，`rootClassName` 才确定在 `.ant-drawer` 根上），抽屉四段背景/分隔线/文字全部走 `--tk-*`。面板自定义无论怎么改都物理无法渗入弹窗。
- 宿主全局 `!important` 劫持修复（“两个入口效果不一致”真因）：abi 应用 `global.css` 有 `html body .ant-drawer .ant-drawer-content { background: var(--abi-card-box-draw-pop-bg) !important }` 等规则，分享页上把抽屉内容背景锁成 #FCFDFF（5199 调试页无 abi 全局样式故正常）。修复：`.drawer`/`.drawerDark` 内遮蔽 `--abi-card-box-draw-pop-bg`/`--abi-input-bg` 为 `var(--tk-surface)`，宿主 `!important` 规则取色退化为抽屉自身色；抽屉四段背景/分隔线补 `!important` 防宿主 transparent 规则穿透；Select 下拉/输入框同被子树变量覆盖。
- 缓存根治：`apps/abi/src/main.tsx` 加载 widget css/js 带 `?v=` 参数（dev 时间戳每次拉新，生产固定版本号发新产物后 bump）；手动 link 加 `id="abi-assistant-widget-styles"` 与 SDK `loadStyles` 去重对齐，防止其再插一条不带 `?v` 的旧缓存 CSS；`apps/chat/dist` 内 9/22 旧拷贝已同步为新产物。
- 定制体验：抽屉 `mask={false}`（压暗面板导致取色实时预览看不清）；`ChatWidget` 在抽屉打开时临时把面板加宽到 ≥760px（embed/放大态跳过，关闭/转放大时还原），给左侧留预览区。
- 蓝色系调色定稿：品牌蓝标题栏 `#5b7cf7` + 浅蓝画布 `#e9f0fc`/输入区 `#dfe9fa`/边框 `#d3e0f5`，与蓝紫头像同色系；白色系保持素白。实测（dev 源码）：黑色系下抽屉整体深色协调（content rgb(31,34,48)、标题 rgb(232,236,245)）；面板宽度 480→760→480 可逆；无遮罩节点。
- `apps/abi/src/main.tsx`：分享页接入注释更新（`theme-switch` 语义改为外观自定义入口）。
- 图表缩略图实时渲染（替代静态白底图片）：新增 `ChartTypeThumb.tsx`，按 17 种图表类型实时绘制 SVG 迷你图（折线/面积/堆叠/百分比/饼/环/柱/条形/分组/百分比堆叠/雷达/漏斗/仪表/玫瑰/玉珏/散点/词云），配色取 `ChartThemeContext`（palette + textColor 低透明度轴线），透明底适应任意背景；`ChartTypeModal` 卡片 img 换为该组件，弹层面板/导航栏/卡片/搜索框/滚动条硬编码浅色全部改吃 `--cw-*` 变量；`chartTypeCatalog` 删除 `thumbnail` 字段与 17 个图片 import（bundle 减约 413KB）；`ChatWidget` 未接入图表的占位预览同换实时渲染。

## 验证

- `npx vitest run apps/chat-sdk/src/theme.test.ts`：22/22 通过。
- `pnpm --filter @abi/chat-widget type-check`：通过。
- `pnpm --filter @abi/chat-widget build`：通过，dist 输出 `abi-assistant-widget.js` + `.css` 并同步至 `apps/chat/public`。
- `tsc --noEmit` 全量：本次改动文件 0 错误（其余为复用的 `conversation/*` 组件既有告警，与本任务无关）。
- 浏览器实测（dev server + DOM 测量）：抽屉 / 遮罩 rect ≈ 面板 rect（父节点 `.abi-cw-panel`）；切「黑色系」后面板头部 / 正文 / 输入区全部转深且 `data-cw-theme="dark"`；点「背景色」色块取色弹层在抽屉内该行附近弹出；改色后 hex 文本与 `--cw-body-bg`、正文背景同步变为 `#ff4444`；关闭后遮罩消失、面板恢复可交互。截图见 `.ai/runs/checkpoint_A.png`、`checkpoint_B.png`。
- 浏览器实测（图表缩略图实时渲染，分享页黑色系）：弹层内 img 0 个/svg 缩略图 17 个；卡片容器与弹层面板背景均 rgb(31,34,48)；缩略图取 palette 首色 #2FA4FF 系、轴线 #e8ecf5；分类栏文字 rgb(166,178,200) 可读；滚动全列表无白底残留。
- 浏览器实测（分享页 9527 真实链路，宿主劫持修复后）：黑色系 content rgb(31,34,48)/标题 rgb(232,236,245)/chip rgb(38,42,58)/Select 选择框 rgb(31,34,48)；蓝色系 content rgb(255,255,255)；自定义背景 #1a1a2e 只染 .abi-cw-body 不染抽屉；`?v=` 参数每次刷新变化（缓存根治生效）。
- 浏览器实测（双向隔离，dev 源码）：黑色系下抽屉根含 drawer+drawerDark 双类，content rgb(31,34,48)/标题 rgb(232,236,245)/chip rgb(38,42,58) 整体深色协调，改背景 #ffe066 面板变黄而抽屉数值不变；蓝色系下改背景 #1a1a2e+文字 #e0e0e0 面板转深而抽屉保持浅色协调（content rgb(255,255,255)/标题 rgb(31,39,51)）且 drawerDark 类已移除；无遮罩节点、面板加宽 760。
- 浏览器实测（预设区分 + 弹窗隔离，历史轮次）：蓝色系头部 rgb(91,124,247)/正文 rgb(238,243,254)/操作图标纯白，白色系头部 rgb(255,255,255)/正文 rgb(247,248,250)，区分明显；自定义背景红 + 文字绿后，面板正文变红但抽屉内容区背景与标签色改色前后完全一致，表单 hex 同步显示 #ff0000/#00ff00。

## 回归

- `theme="dark"` / `light` 预设仍生效：`data-cw-theme` 原子类覆盖层未改动，与自定义 CSS 变量叠加应用。
- 未自定义时 override 为空即纯预设基准；blue 观感按需求调整为品牌蓝（与白色系区分），light/dark 预设变量表未动。
- `theme-switch` 属性继续控制入口显隐；分享页 `main.tsx` 加载链路不变。
- 抽屉与 ColorPicker 弹层挂载面板内，不逃逸 `.abi-cw-root`、不污染宿主。

## 前端对接契约（后端待实现）

- 读：`checkSharePassword` 响应 `data.themeConfig`（缺省回退 `data.theme` 字符串）。
- 写：POST `/dashboard/api/v1/project/saveShareTheme`，body `{ shareCode, themeConfig }`，Bearer 鉴权。
- 降级：后端未就绪时读回退预设、写失败仅本地保存并提示可重试，功能完整可用。

## 知识更新建议

- 「ABI 助手浮窗 SDK 接入规范」可补充 `theme-config` 属性与外观自定义四维契约。
- 可评估在 `.ai/decisions/` 记录「主题配置 ↔ Token 映射」接口契约与降级策略（待后端明确每分享全局生效 or 每 Token 生效）。
