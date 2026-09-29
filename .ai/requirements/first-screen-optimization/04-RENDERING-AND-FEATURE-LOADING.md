# 04：组件、渲染与功能级加载

## 阶段目标

让关闭状态、非当前内容类型和用户尚未触发的重型能力不参与首屏下载、解析或渲染；同时保持布局稳定和交互响应。

## 通用规则

1. 路由是第一层边界，内容类型和交互打开状态是第二层边界。
2. `React.lazy()` 必须配套固定尺寸 Suspense fallback 和可重试 ErrorBoundary。
3. 一个模块不能同时被首屏静态 import 和可选分支动态 import；否则动态拆分无效。
4. 预加载只能由 hover、focus、可见性或浏览器空闲触发；不得在首页无条件预取所有可选功能。
5. `useMemo`、`React.memo` 等只用于性能记录证明有成本的组件，不能替代正确的依赖边界。

## ABI

1. `apps/abi/src/pages/home/index.tsx` 中 `SpaceEdit` 改为在 `drawerOpen` 首次为 true 时加载；关闭后保留或卸载以实际内存测试决定，行为必须一致。
2. 登录和首页引用链中的宽泛 barrel/命名空间 import 改为可静态分析的直接 import 或显式注册表。
3. `MenuUtil.tsx`、`global-sider/index.tsx`、`utils/router.ts` 的图标解析只映射真实使用的小图标，不导入整个图标集合。
4. 导出、富文本、图谱、编辑器等功能在按钮点击或对应工作台路由后才动态加载。
5. DashboardMicroApp 可在导航 hover/focus 后预取子应用入口；离开页面后保留现有 qiankun 缓存/卸载约定。
6. 首页各区域使用独立 skeleton，失败区可单独重试，不以整页 loading 替换完整布局。

## Chat

### 关闭状态组件

- `ScheduleTaskDrawer`：点击日程入口后加载。
- `ModelDebugModal`：消息存在调试数据且用户打开时加载。
- 上传、历史等大型 Drawer：首次打开时加载。
- 工坊 `AssistantDetailDrawer`：打开详情后再加载 Explore 预览能力。

### 内容类型组件

- `AutoChart` 及 G2/AVA：消息解析确认存在图表后加载。
- `ReportPreviewPane`：报告预览进入 mounted/opening 状态后加载。
- `ExplorePreviewPane`：存在 active explore item 后加载。
- `ExploreCodeEditorPane`、CodeMirror：用户点击编辑代码后加载。
- html2canvas、录音、下载或导出库：仅在对应用户操作中动态 import。
- ChatWidget 分享首屏遵循相同规则，不因静态 import 携带所有消息内容渲染器。

### 消息列表

1. 第一阶段对屏外历史消息使用 `content-visibility: auto` 和合理的 intrinsic size，验证滚动锚点、搜索定位和流式追加。
2. 只有当长会话性能基线仍不达标时，第二阶段引入支持动态高度的虚拟列表。
3. 虚拟列表启用阈值由阶段 01/04 实测确定并写入常量；短会话不得承担虚拟化复杂度。
4. 必测：首次定位底部、流式增长、加载更早历史、报告/图表高度变化、预览开关和窗口缩放。

### CSS

1. 路由或大型功能专用样式与对应异步模块同边界加载。
2. 审计 Tailwind content 范围和全局 `index.css`，删除无调用证明的规则前必须做页面回归。
3. 不因拆 CSS 破坏 ChatWidget 的 `abi-cw-` 前缀隔离。

## Dashboard

1. `ProjectList.tsx` 中 New/Clone/Delete Dialog 在对应状态首次打开时加载。
2. `json-schema/ui/index.ts` 的 CodeEditor 注册改为异步 loader；UIMap 查询端支持同步组件和异步组件两种注册项。
3. `MonacoEditor.tsx` 的 loader、环境、语言和 Worker 全部移动到异步模块内部；只加载实际使用的语言。
4. 设计器组件面板可以展示轻量元数据和云端缩略图，不得为了展示列表初始化组件运行时。
5. `/view` 和分享页只加载渲染所需 manager；编辑手柄、属性面板、蓝图、Undo/Redo 和热键保持设计器专属。
6. GlobalMessage/GlobalModal 不能成为整个 Router 的 Suspense 门禁；其初始化错误也不能白屏。

## 预加载策略

- 路由导航项 hover/focus：允许预取目标路由模块。
- 打开抽屉/编辑器的按钮 hover/focus：允许预取对应组件。
- 浏览器 idle：只允许预取高概率的下一步模块，并受 `navigator.connection.saveData` 和弱网条件约束。
- 分享页、低流量管理页和大型设计器模块不得由首页 idle 全量预取。

## 测试与验收

- 静态检查确保同一重型模块不存在首屏静态 import 和动态 import 双路径。
- 组件测试覆盖 lazy 模块 loading、成功、失败、重试和快速开关。
- 网络检查确认关闭状态的抽屉、Monaco、G2/AVA、报告/Explore 不发起资源请求。
- ABI 首页、Chat 新会话、Dashboard 项目页的 CLS ≤ 0.1。
- Chat 100、500、1000 条混合高度消息的滚动与流式追加回归通过。
- Dashboard 设计器、预览、分享、qiankun 卸载行为无回归。

## 下一阶段门禁

首屏功能依赖图已经稳定，且可选功能能在触发时正常加载后，才替换大型本地静态资源为云存储 URL。

## 实施结果（2026-09-23）

- ABI 的空间编辑、Dashboard 微应用预取、首页分区骨架/失败重试和首屏图标显式注册表已经落地；源码入口不再静态导入整套 Ant Design 图标。
- Chat 的日程、上传、调试、图表、报告、Explore、代码编辑器、录音和截图能力均按内容类型或用户操作加载；消息列表使用 `content-visibility`，100/500/1000 条混合高度场景测试通过，当前没有引入虚拟列表。
- Dashboard 项目弹窗、CodeEditor 注册和 Monaco 运行时形成异步边界；View/Share 使用轻量运行时，不加载 DesignerPage、HotKey 或 Monaco。
- 三端生产浏览器 CLS 分别为 ABI `0.02845`、Chat `0.00017`、Dashboard Projects `0`，均满足 `≤ 0.1`；懒加载失败注入后的第二次请求恢复成功。
- ABI 现有手工 `manualChunks` 仍会让首页下载 `vendor-antv`、`vendor-export`、`vendor-quill`。源码功能边界已经稳定，该构建产物问题作为阶段 06 的强制验收项处理，不在阶段 04 提前改写 Chunk 策略。
- 最终收口与回归结果统一记录于 `.ai/runs/2026-09-24-first-screen-scope-cleanup/RUN_LOG.md`。

## 2026-09-24 合并后复审补充

- Chat 助手分享页再次拆出 `ExploreControllerBridge`、`ReportControllerBridge` 和 `WidgetInteractionMessage`；页面初始只加载静态分享内容，模式控制器在首次切换时加载，Markdown/表格/图表等交互消息渲染器在已有消息或输入框 focus 后加载。
- 真实浏览器交互回归确认：ABI `SpaceEdit`、Chat 高级日期筛选/交互消息/Explore/Report、Dashboard 日期筛选/分享/取消发布块均不在首屏请求，用户操作后才下载。
- 专项浏览器生成文件已在收口时删除；最终结论见统一运行记录。
