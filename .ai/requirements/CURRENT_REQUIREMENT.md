# 2026-07-09 ABI 系统待完成事项

## 需求类型

前端缺陷修复与 UI 文案/样式微调

## 背景

需求来源：`/Users/juvenile/Documents/Obsidian Vault/芯盾/7.9-abi系统待完成事项.md`。

当前待处理事项包含 chat 对话界面入口加载反馈，以及 ABI 主应用/系统模块的分组组件文案、滚动条颜色、空间角色管理弹窗树形层级首次展示问题。

2026-07-10 追加：按用户明确指令，恢复提交 `f059c829fea6ae5080d9efddd7497065bf697042` 中被改回的 ABI 系统加载相关改动。

## 目标

- 跳转到 chat 对话界面时避免短暂空白，在 chat 入口加载阶段提供加载动画。
- ABI 分组组件标题统一改为“分组目录”，不再由外部传入新的标题文案；相关字段先保留不删除。
- 滚动条背景颜色与鼠标悬浮颜色统一为图标背景色。
- 空间角色管理编辑或新建角色弹窗第一次打开时，即可正常展示二级、三级层级。
- 恢复 ABI 入口 HTML 启动占位与 ABI `RouterProvider` fallback loading。

## 非目标

- 不做大范围 UI 重构。
- 不删除暂时保留的分组标题字段。
- 不修改与 7.9 待办无关的业务流程。
- 不重构角色权限、菜单权限或路由权限体系。

## 影响范围预期

- `apps/chat/index.html`、`apps/chat/src/main.tsx`、`apps/chat/src/index.css` 或对话界面入口加载相关文件。
- `apps/abi/src/pages/component/**` 中分组组件相关页面与组件。
- ABI 系统/组件模块中滚动条样式文件。
- `apps/abi/src/pages/**` 中空间角色管理、角色新建/编辑弹窗、权限树相关组件。
- `.ai/runs/2026-07-10-abi-system-pending-items/`

## 验收标准

- 跳转到 chat 对话界面或 chat 入口加载过程中不再出现无反馈的短暂空白，能看到加载动画。
- 分组组件标题显示为“分组目录”，调用方不再需要传入新的标题文案。
- 相关滚动条默认背景色和 hover 色与图标背景色一致。
- 空间角色管理新建/编辑角色弹窗首次打开就能展示已有的二级、三级权限/菜单层级。
- 不覆盖用户已有未说明改动。

## 2026-07-13 追加：效果评审页面迁移

### 需求类型

前端功能迁移与页面新增

### 背景

用户提供的截图显示，需将原先「助手配置」抽屉中的「效果评估/效果评审」tab 页，迁移到「组件 > 数据资产」菜单下。当前代码中该 tab 实际命名为「记忆管理」，位于 `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/config/memory-management.tsx`。

### 目标

- 在「组件 > 数据资产」菜单下新增独立「效果评审」页面。
- 复用原「记忆管理」的列表、搜索、人工评估、模型评估、删除等核心能力。
- 从「助手配置」抽屉中移除「记忆管理」tab。
- 新页面视觉风格对齐数据源列表页，使用 v5 统一样式类（`abi-searchbar`、`abi-data-area`、`assistant-table-scroll`、`btn-accent-gradient` 等）。

### 非目标

- 不修改后端 API 协议。
- 不改动其他助手配置 tab。
- 不删除原 `memory-management.tsx` 文件，仅移除其在抽屉中的引用。
- 不处理后端菜单动态加载配置，仅完成前端路由与页面实现；菜单显示需后端在「门户管理→菜单管理」中配置。

### 影响范围预期

- 新增：`apps/abi/src/pages/component/data/effect-evaluation/`
- 修改：`apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-config-drawer.tsx`
- 修改：`apps/abi/src/router/elegant/routes.ts`、`imports.ts`、`transform.ts`
- 修改：`apps/abi/src/types/elegant-router.d.ts`
- 修改：`apps/abi/src/locales/langs/zh-cn/route.ts`、`en-us/route.ts`
- 新增 run log：`.ai/runs/2026-07-13-effect-evaluation-migration/`

### 验收标准

- 可通过 `/component/data/effect-evaluation` 访问效果评审页面。
- 页面列表、搜索、重置、分页、人工评估、模型评估、删除功能可用。
- 助手配置抽屉中不再显示「记忆管理」tab。
- 构建与类型检查不引入新错误。

## 测试要求

- 优先运行与 chat 和 ABI 相关的类型检查、测试或构建命令；如项目门禁本身不可用，需说明原因。
- 对受影响文件进行代码级回归检查。
- 完成后生成 run log，记录修改、验证、风险和是否需要更新 `.ai/` 长期文档。

## 2026-07-16 追加：图谱筛选列表搜索与折叠

### 目标

- 实体筛选和关系筛选标题后分别增加名称搜索框，仅过滤对应筛选项。
- 实体筛选和关系筛选的名称搜索框均使用 300ms 防抖后再执行本地过滤。
- 两类筛选项默认展示前 5 条，超过 5 条时展示“点击查看更多”。
- 展开后保持筛选区域高度稳定，通过局部滚动展示全部匹配项，并将操作文案改为“收起更多内容”。
- 保持现有全选、半选和图谱本地过滤行为不变。

### 非目标

- 不修改图谱查询接口、查询参数和 X6 画布逻辑。
- 不修改实体、关系配置及属性建模模块。
- 不引入全局样式。

### 验收标准

- 实体名称搜索与关系名称搜索互不影响，空关键词恢复完整列表。
- 实体名称搜索与关系名称搜索输入后 300ms 再更新筛选结果。
- 选项不超过 5 条时不展示展开文案；超过 5 条默认仅显示 5 条。
- 展开后列表容器高度不增长，可滚动查看全部匹配项；收起后恢复前 5 条。
- 构建和相关测试通过，不覆盖既有改动。

## 2026-07-16 追加：全系统批量删除按钮危险态统一

### 目标

- 全系统所有列表的批量删除按钮在未选择数据时继续保持禁用灰色。
- 选择数据、按钮可用后，统一展示为与本体网络一致的红色危险按钮。
- 所有批量删除按钮统一在文案前展示删除图标。
- 选中数据后，按钮文案统一追加当前选中数量，如“批量删除(2)”。
- 所有批量删除按钮文案统一为“批量删除”，不再使用“批量删除数据”“批量取消授权”等变体。

### 非目标

- 不修改列表选择、删除确认、接口调用及删除结果处理逻辑。
- 不修改单条删除按钮和其他普通操作按钮样式。

### 验收标准

- 所有包含批量删除操作的列表按钮均具备 `danger` 外观。
- 所有批量删除按钮均具备删除图标，且文案统一为“批量删除”。
- 所有批量删除按钮均在选中数据后展示选中数量。
- 原有 `disabled` 条件和点击事件保持不变。
- 批量删除按钮不再被普通幽灵按钮或主按钮样式覆盖危险色。

## 2026-07-16 追加：ABI 列表切卡片清空批量选中态

### 目标

- ABI 应用中所有支持列表/卡片视图切换的列表页，在从列表切换到卡片视图或切换视图时清空表格选中数据。
- 避免切到卡片视图后批量删除按钮仍因旧的 `selectedRowKeys` / `checkedRowKeys` 可点击。
- 保持原有批量删除接口、确认弹窗和列表数据逻辑不变。

### 非目标

- 不修改单条删除、分页、搜索、接口请求逻辑。
- 不修改非 ABI 应用。
- 不重构表格/卡片组件布局样式。

### 验收标准

- ABI 中所有包含批量删除和列表/卡片切换的页面，切换到卡片视图后批量删除按钮不可点击。
- 切回列表后需要重新选择数据才能执行批量删除。
- 没有批量选择能力的视图切换页面不受影响。

## 2026-07-16 追加：属性建模维度时间维配置调整

### 目标

- 时间维的时间粒度枚举调整为：年/year、半年/half_year、年季/quarter、年月/month、年周/week、年月日/day。
- 维度新增/编辑基础信息中删除独立的时间字段、时间格式表单项。
- 时间格式改为关联字段表格列，默认值为 `yyyy-MM-dd`，并随对应关联字段一起提交给后端。
- 关联字段表格固定高度，内容超出后内部滚动。
- 时间维层级配置删除快捷生成时间层级入口和相关自动生成逻辑，左侧改为展示已选时间粒度并支持拖拽生成层级结构。

### 非目标

- 不调整维度列表、分组、预览数据、相关指标逻辑。
- 不修改层级编辑接口协议。
- 不运行构建或完整测试，只做静态路径和关键逻辑检查。

### 验收标准

- 时间维基础信息只保留时间粒度，不再出现时间字段、时间格式两个独立字段。
- 关联字段表格在时间维下展示时间格式列，且保存时每个关联字段对象包含 `timeFormat`。
- 层级配置弹窗不再出现“快捷生成时间层级”及生成按钮。
- 时间维层级配置左侧显示时间粒度选项，而不是关联字段。

## 2026-07-17 追加：会话消息导航条（千问式定位）

### 需求类型

前端交互功能新增（纯前端）。

### 背景

参考千问对话界面：在会话区右侧提供一条消息导航条（minimap），支持快速定位到历史提问。

### 目标

- 在 chat 会话区右侧新增贴边导航条，每根横杠对应一轮用户提问（不含 AI 回答）。
- 默认低透明度；鼠标进入导航区域时整体提亮，并在其左侧弹出问题预览列表（截断问题文本）。
- 预览项与横杠一一对应，hover 某项高亮对应横杠，点击平滑滚动定位到该条用户消息。
- 跟随滚动实时高亮当前所在轮次。

### 非目标

- 不改动消息渲染、批量删除、重新生成、分享等既有逻辑。
- 不涉及后端接口。
- 不接入虚拟列表（`virtualized`）分支。

### 影响范围预期

- 新增：`apps/chat/src/components/conversation/components/MessageNavRail.tsx`
- 修改：`apps/chat/src/components/conversation/components/MessageList.tsx`
- 新增 run log：`.ai/runs/2026-07-17-message-nav-rail/`

### 验收标准

- 多轮对话右侧出现横杠，数量等于用户提问轮数；单轮对话与分享模式不显示。
- 悬停弹出预览列表，问题文本正确截断。
- 点击横杠或预览项平滑定位到对应用户消息。
- 上下滚动时当前横杠/预览项高亮实时跟随。
- 批量删除、重新生成版本切换、发送后自动滚底等既有行为不受影响。

## 2026-07-22 追加：ABI 列表页搜索栏统一为「输入框 + 高级筛选」

### 需求类型

前端 UI 统一重构（纯前端，不改接口协议）。

### 背景

用户要求将 ABI 应用中「主页更多空间、工作台、组件」下所有列表页的搜索栏统一为：搜索输入框占满一行自适应 + 右侧「高级筛选」按钮（风格参考图谱探索工具栏按钮，但增加文字）。除搜索输入框外的其他筛选项（下拉、时间范围）全部收进高级筛选弹出面板，面板内一行两个筛选项，底部为重置/查询按钮（参考图谱探索的高级搜索面板）。开始时间/结束时间独立选择改为单个时间范围 RangePicker（日期精确到天，弹出双日历面板，不再出现时间列）。

### 目标

- 新增共享组件 `SearchFilterBar`（搜索行 + 高级筛选 Popover 面板）。
- 改造页面：space-list、app-workshop(my-collect/my-share/recently-used)、assistant-config、data-collection、data-source、data-table-meaning、job(time/log/email)、ontology-kg(relation/entity/technical-jargon/recommended-inquiries/label-meaning 两个搜索栏)、component(api-key/data-dictionary/effect-review/model/plugin/skills/tools)。
- 时间范围统一为 `RangePicker`（format YYYY-MM-DD，无 showTime）；对需要提交时间的接口按 startOf('day')/endOf('day') 映射，保持查询语义。

### 非目标

- 不改造大屏（screen-manage）与本体网络图谱探索（kggraph）。
- 不修改 manage/、space/ 等门户管理页面。
- 不修改后端接口、查询参数含义、表格/分页逻辑。
- 不改造抽屉/弹窗内部的次级搜索。

### 验收标准

- 各页面搜索行为一行：输入框自适应占满剩余宽度 + 高级筛选按钮（漏斗图标+文字）。
- 高级筛选面板筛选项一行两个，底部重置/查询，交互与原查询/重置一致。
- 时间范围为单控件双日历，精确到天。
- 类型检查/构建不引入新错误。

## 2026-07-23 追加：搜索输入框停止输入自动查询（防抖，去回车）

### 需求类型

前端交互调整（纯前端，不改接口协议）。

### 背景

用户要求 ABI 项目所有搜索输入框改为：停止输入 2s 后自动发起查询接口，不再需要回车触发。

### 目标

- 共享搜索栏 `SearchFilterBar`（abi 与 dashboard 两份）默认输入框停止输入 2s 后自动查询。
- 使用自定义 `searchSlot` 输入框的页面（api-key、job/email、job/time、job/log、effect-review、ontology-kg/entity）同样具备停止输入 2s 后自动查询。
- 保留回车立即查询（并取消未触发的防抖定时器，避免重复请求）。
- 清空输入框（allowClear 或删空）时立即查询，不等待 2s。
- 高级筛选面板内的下拉/时间范围仍仅在点击「查询」时生效，不参与自动查询。

### 非目标

- 不修改查询接口、查询参数含义、分页与表格逻辑。
- 不改造抽屉/弹窗内部次级搜索。
- 不改造大屏图谱探索（kggraph）等未使用统一搜索栏的输入。

### 影响范围

- `apps/abi/src/components/SearchFilterBar.tsx`
- `apps/dashboard/src/pages/home/project-list/SearchFilterBar.tsx`
- `apps/abi/src/pages/component/applications/api-key/index.tsx`
- `apps/abi/src/pages/workbench/job/{email,time,log}/index.tsx`
- `apps/abi/src/pages/component/data/effect-review/index.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/entity/components/EntitySearch.tsx`
- `.ai/runs/2026-07-23-search-input-debounce/`

### 验收标准

- 各搜索输入框停止输入约 2s 后自动发起查询，无需回车。
- 回车仍可立即查询；清空输入框立即查询。
- 高级筛选下拉/时间选择不触发自动查询，仍由「查询」按钮生效。
- 类型检查不引入新错误（沿用仓库既有 pre-existing 报错）。

## 2026-07-28 追加：ABI 外层大背景与毛玻璃侧边栏对齐 chat

### 需求类型

前端样式微调（纯 CSS，不改逻辑）。

### 背景

chat 应用外层 Layout 有一层大背景渐变（#d5daf5 → #dfe6f8 → #e2d9f3），侧边栏为半透明毛玻璃透出该背景；ABI 没有这层外层背景，侧边栏为不透明 `--abi-card-bg`。用户要求给 ABI 也加上这层外层大背景，使两应用侧边栏视觉一致。

### 目标

- ABI `body` 增加与 chat 一致的外层大背景渐变。
- ABI 左侧 72px 导航栏保持半透明毛玻璃（透出 body 渐变），背景声明需 `!important` 压住 antd Sider 默认背景。

### 非目标

- 不修改各页面内容区的 `--abi-card-bg` 不透明底色。
- 不修改卡片/抽屉/弹窗背景。

### 验收标准

- ABI 侧边栏透出蓝紫渐变，视觉与 chat 侧边栏一致。
- 内容区、卡片、弹窗等其他区域视觉不变。

## 2026-07-30 追加：数据集编辑页右侧维度/指标栏跨浏览器消失修复

### 需求类型

前端缺陷修复（纯前端布局/样式，不改业务逻辑）。

### 背景

数据集编辑页（`data-collection-operate/[id].tsx`）在三个浏览器上表现不一致，最严重时右侧 40px「维度/指标」导航条整体消失。根因有二：

1. Splitter 外层只写了 `flex: 1; minHeight: 0`，缺少 `minWidth: 0`。flex 子项默认 `min-width: auto`，antd Splitter 面板在测量后 flex-basis 被写死为像素值，导致窄窗口/缩放下 Splitter 拒绝收缩，把右侧导航条顶出 `.container { overflow: hidden }` 的可视区。各浏览器对 min-content contribution 的实现差异造成三种表现。
2. `defaultSize="220"` / `defaultSize="300"` 传字符串，antd 首帧生成非法 CSS `flex-basis: 220`（无单位），首帧布局各浏览器不一致。
3. 右侧导航条竖排文字依赖 `writing-mode: vertical-lr + text-orientation: upright + SimHei`，老内核浏览器渲染不稳定。

### 目标

- Splitter 增加 `minWidth: 0`，保证任何窗口宽度下右侧导航条保住 40px。
- `defaultSize` 改为数字，消除首帧非法 flex-basis。
- 左面板增加 `min` 约束，避免拖拽压烂表单。
- 竖排文字改为逐字块排列，不再依赖 `writing-mode`。

### 非目标

- 不修改数据集保存/预览/拖拽等业务逻辑。
- 不修改 antd Splitter 组件本身。
- 不重构页面布局结构。

### 影响范围预期

- `apps/abi/src/pages/workbench/data-preparation/data-collection-operate/[id].tsx`
- `apps/abi/src/pages/workbench/data-preparation/data-collection-operate/modules/DesignerRightPanel.tsx`
- `.ai/runs/2026-07-30-dataset-designer-right-rail-fix/`

### 验收标准

- 任意浏览器、任意窗口宽度/缩放下，右侧「维度/指标」导航条始终可见且文字正常显示。
- 窄窗口时中间画布/左面板内部滚动，不把导航条顶出可视区。
- 维度/指标面板展开、字段互转、保存等既有功能不受影响。
- 类型检查不引入新错误。

## 2026-07-30 追加：页面内容区右间距跨浏览器不一致修复

### 需求类型

前端缺陷修复（纯 CSS，不改逻辑）。

### 背景

ABI 页面内容区 `.page-content-area` 右侧间距在 Chrome/Edge 上正常、在联想浏览器上贴死右边缘。

（订正，以真机数据为准）初步归因为“联想老内核不支持 scrollbar-gutter”错误：联想 SLBrowser 实为 Chromium 141，`CSS.supports('scrollbar-gutter: stable')` 返回 `true`，完全支持该属性。真正根因：`.page-content-area` 无设计 padding，右间距完全来自 `scrollbar-gutter: stable` 预留的滚动条槽；该槽仅在“经典滚动条”（占布局宽度）时才有宽度，联想用 overlay 覆盖式滚动条（槽宽 0）故无间距，Chrome/Edge 经典滚动条槽宽 ~15px 故有间距。与内核新旧无关，取决于滚动条类型。

### 目标

- 删除 `scrollbar-gutter` 与错误的 `@supports not` 块，`.page-content-area` 直接用 `padding-right: 12px`，保证 Chrome/Edge/联想右间距恒为 12px、三浏览器一致。
- 已知代价（用户确认接受）：去掉 scrollbar-gutter 后 Chrome/Edge 内容滚动页面会有一次 ~15px 横向跳动。

### 非目标

- 不修改页面内容布局与业务逻辑。
- 不去掉 scrollbar-gutter（保留新内核防滚动条跳动）。

### 影响范围预期

- `apps/abi/src/layouts/modules/global-content/style.css`（全局内容区，仅影响不支持 scrollbar-gutter 的老内核浏览器）
- `.ai/runs/2026-07-30-dataset-designer-right-rail-fix/`

### 验收标准

- 联想浏览器下页面内容区右侧出现间距，不再贴死右边缘。
- Chrome/Edge 下视觉无变化。

## 2026-07-30 追加：助手编辑页扩展能力工具选择改为抽屉 + 按需加载 + MCP 参数修复

### 需求类型

前端交互重构 + 接口参数缺陷修复。

### 背景

助手编辑页（assistant-edit-drawer）「扩展能力 > MCP」当前在组件挂载时一次性调用 `queryMcpList` 与 `queryToolListApi`，列表平铺在折叠行内。后续还要接入更多能力接口，挂载时全量调用请求过多；且 `queryMcpList` 调用相比 MCP 服务页少传了 `search: 'blur'` 与 `namespaceId`（MCP 按分组存储，namespaceId = `s_分组ID`）。

### 目标

- 移除挂载时的工具列表全量请求，改为点击「MCP」折叠行的 + 号打开工具选择抽屉时按需加载。
- 新增工具选择抽屉：内含「MCP工具」「内置工具」两个 tab，均按需（首次进入时）加载并缓存。
- MCP tab 内先加载 MCP 分组列表（`tableSemanticsGroupList`，groupType=mcp），左侧切换分组，选中分组后才调用 `queryMcpList`，并补齐参数 `search: 'blur'`、`namespaceId: s_分组ID`，按分组缓存结果。
- 折叠行内不再平铺全量列表，改为展示已选工具（可移除）。
- 勾选状态与保存 payload（tools/toolType/toolConfig）逻辑保持不变。

### 非目标

- 不修改 MCP 服务页（plugin）现有逻辑。
- 不修改保存/上线接口协议。
- 不改动技能、示例、数据语义等其他折叠分组。

### 影响范围预期

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`
- 新增：`apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/tool-picker-drawer.tsx`
- `.ai/runs/2026-07-30-assistant-tool-picker-drawer/`

### 验收标准

- 打开助手编辑页时不再请求 `register/list` 与 `tool/list`。
- 点击 MCP 行 + 号打开抽屉后才按 tab/分组懒加载，重复打开命中缓存不再重复请求。
- `queryMcpList` 请求带 `search: 'blur'` 与 `namespaceId: s_分组ID`。
- 已选工具在折叠行内可见、可移除，编辑回显正常，保存 payload 结构不变。
- 类型检查不引入新错误。

## 2026-07-30 追加：助手编辑页数据语义/本体网络/技能同样改为抽屉选择 + 按需加载

### 需求类型

前端交互重构 + 新接口对接（只读列表）。

### 背景

延续 MCP 抽屉化方案，助手编辑页「数据语义」「本体网络」「技能」三行同样改为整行点击弹各自选择抽屉，抽屉内按需加载。

### 目标

- 通用能力选择抽屉（配置驱动 tabs + 可选分组目录），与 MCP 抽屉同样式同缓存策略。
- 数据语义：分组（groupType='shema'）+ `schemalist` 列表。
- 本体网络：语义标签（'tag'+`queryTag`）、维度（'ontology-dimension'+`queryDimensionList`）、指标（'ontology'+`queryKnowledgeIndicators`）、实体语义（`queryOntologyEntityList`）、关系配置（`queryOntologyRelationList`）五个 tab。
- 技能：`querySkillListApi({})` 列表。

### 非目标

- 勾选结果暂不随保存提交、不做编辑回显（后端字段结构未确认）。
- 不改各能力管理页。

### 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/capability-picker-drawer.tsx`（新增）
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/capability-picker-configs.ts`（新增）
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/tool-picker-drawer.tsx`（导出子组件供复用）
- `.ai/runs/2026-07-30-assistant-tool-picker-drawer/`（同一 run log 追加）

### 验收标准

- 三行均不在挂载时请求，整行点击才弹抽屉并按 tab/分组懒加载，重复打开命中缓存。
- 接口参数与各自管理页一致。
- 行右侧展示「已选 N 项」；保存 payload 结构不变。
- 类型检查不引入新错误。

## 2026-07-30 追加：分组树脏数据（游离分组）改为可见

### 需求类型

前端缺陷修复（分组树构建逻辑）。

### 背景

分组数据中存在脏数据：父分组已被删除、子分组 `parentId` 指向不存在的分组（游离分组）。`buildGroupTree` 从 `parentId='0'` 递归建树，游离分组挂不到任何节点被静默丢弃，页面上完全不可见，用户无法管理或删除它们。用户决定改为直接显示脏数据。

### 目标

- `buildGroupTree` 在根级构建时，把 `parentId` 指向不存在分组的游离节点提升到根级展示。
- 覆盖所有调用点：分组树、初始选中、编辑弹窗父级下拉、推荐问/行业术语分组下拉。
- 补充单元测试覆盖游离节点提升场景。

### 非目标

- 不修改后端接口，不做数据清洗。
- 不移除「存在子分组时拦截删除」的前端拦截。
- 不改动分组增删改查其他逻辑。

### 影响范围预期

- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.ts`
- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.test.ts`
- `.ai/runs/2026-07-30-group-orphan-visible/`

### 验收标准

- 父分组不存在的游离分组显示在分组树根级，可选中、编辑、删除。
- 正常层级结构、folderFirst 排序行为不变，既有测试全部通过。
- 类型检查不引入新错误。

## 2026-07-30 追加：分组空状态插图多 tab 下样式不一致修复

### 需求类型

前端缺陷修复（SVG 渐变 ID 冲突）。

### 背景

属性建模页的指标建模/标签语义 tab 下，分组空状态插图与其他页面样式不一致（文件夹发深、加号徽标发灰）。根因：`GroupContentGate` 插图 SVG 渐变用写死 ID，多 tab 页面中隐藏面板（display:none）里的同 ID 渐变被优先解析且不参与绘制，可见实例渐变填充失效。

### 目标

- 插图渐变 ID 改为 `useId` 每实例唯一，消除多实例 ID 冲突。

### 非目标

- 不改插图构图与配色，不改门控逻辑。

### 验收标准

- 属性建模三个 tab 与其他分组页的空状态插图样式完全一致。
- 类型检查不引入新错误。

## 2026-07-30 追加：数据集 SQL 模式「选择表」抽屉（表/字段勾选，前端先行）

### 需求类型

前端功能新增（先纯前端实现，勾选记录保存/回显接口就绪后再对接）。

### 背景

数据集 SQL 创建页编辑器顶栏右侧已有「选择表」图标但无点击行为。用户要求点击后打开抽屉，展示当前数据源下可勾选的表，支持复选；每张表为折叠面板，默认收起只显示表级勾选与表名，展开后显示「字段选择 (已选/总数)」、字段名搜索、物理字段名/字段备注两列的可勾选表格。历史勾选记录需保存并在下次打开时回显（需要后端接口，本轮不做）。

### 目标

- 新增选择表抽屉：表级复选 + 折叠展开字段级复选，表/字段勾选联动（全选/半选/取消）。
- 字段按需加载（首次展开或勾选表头时请求），复用 SqlModeEditor 已有的 `getFieldByDataSource` 字段缓存。
- 勾选结果暂存于前端状态（SqlModeEditor 内），切换数据源时清空；「选择表」图标在有勾选时高亮。
- 抽屉取消不影响已确认的勾选（打开时快照草稿）。

### 非目标

- 不对接勾选记录的保存/回显接口（接口就绪后追加）。
- 不改动 SQL 执行、保存、格式化、自动补全逻辑。
- 不做字段禁用（锁定不可取消）逻辑，等接口定义禁用标记后再加。

### 影响范围预期

- 新增：`apps/abi/src/pages/workbench/data-preparation/data-collection-operate/modules/TableFieldPickerDrawer.tsx`
- 修改：`apps/abi/src/pages/workbench/data-preparation/data-collection-operate/modules/SqlModeEditor.tsx`
- `.ai/runs/2026-07-30-sql-table-field-picker/`

### 验收标准

- 点击「选择表」图标弹出抽屉，表列表可复选；展开表后字段可勾选、可搜索，计数正确。
- 勾选表头等于全选该表字段，部分勾选表头半选，字段全部取消后表头取消勾选。
- 确定后关闭抽屉并保留勾选（图标高亮）；取消不改变已确认勾选；切换数据源后勾选清空。
- 类型检查不引入新错误。
