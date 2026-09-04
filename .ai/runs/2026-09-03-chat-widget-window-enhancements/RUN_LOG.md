# Run Log：分享悬浮窗四块交互增强

## 基本信息

- 日期：2026-09-03
- 任务名称：chat-widget-window-enhancements
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-03 追加节）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Planner、Developer、Test、Regression、Review（角色化阶段模拟）
- 任务类型：功能增强（仅分享悬浮窗 ChatWidget）

## 需求摘要

产品截图四块标注，全部落在 `apps/chat` 分享悬浮窗（分享路由页 page 形态 + 第三方嵌入 float 形态共用）：

1. 头部右上角加放大/缩小按钮，图标与交互同归因分析全屏按钮（AttributionDashboard fsBtn）。
2. 点击信息条"数据语义"chip：窗体自动放大，Schema 详情以抽屉在窗内右侧滑出（复用 SchemaFieldsModal）。
3. 窗体边框支持拖拽改大小，上下左右四边都支持。
4. 输入工具栏在数据语义选择器旁补"模式 / 思考 / 工具"三个入口：
   - 模式=交互/报告/探索三选下拉（标签同主对话；报告/探索发送协议与专属渲染暂不对接，仅切换展示 + message 提示）；
   - 思考=开关，透传 `extra.extra_body.enable_thinking`（缺省开，保持现状）；
   - 工具=更多菜单（查看语义 / 技能 / MCP），技能与 MCP 候选从 getProjectInfo 同响应提取（不新增接口调用），选中后随发送透传 `skills_source_version_ids` / `sse_mcp_source_version_ids` / `mcp_streamable_source_version_ids`（context 顶层，字段名同主对话探索模式协议，MCP 按 protocol 分流）。

## 影响范围

- 仅分享悬浮窗链路；主对话与大屏 AiChatPanel 既有交互不变。
- 消重例外：`MessageList` 本地 `parseFieldsFromModelDetail` 移入 `SchemaFieldsModal` 导出为 `parseSchemaFieldsFromModelDetail`，两处共用（行为逐行一致）。

## 修改文件

- `apps/chat/src/components/chat-widget/history.ts`：WidgetChart/WidgetMessage 增加 `semanticSchemaId`；parseViewChart 提取 `semantic_id`。
- `apps/chat/src/components/chat-widget/service.ts`：
  - `WidgetAssistantInfo` 增加 `skills`/`mcps`；新增 `mapAssistantBoundToolResources`（规则同主对话 mapAssistantBoundResources，config 兼容 JSON 字符串复用 toSchemaConfigList）；
  - 新增 `API.semanticDetail` + `fetchSemanticDetail(cfg, schemaId)`（GET /api/copilot/v1/schema/{id}，shareCode 随 query）；
  - `sendChatStream` 增加第 9 参 `extras?: WidgetSendExtras`：enable_thinking 受开关控制（缺省 true）；选中技能/MCP 非空时 context 顶层下发三个 id 字段（normalizeIdList 去重过滤，未选中不下发避免污染后端默认行为）。
- `apps/chat/src/components/chat-widget/ChatWidget.tsx`：
  - 块1：头部放大/缩小按钮（fsBtn 同款 SVG），放大=快照 inline style 后铺满视口，还原=恢复快照（保留拖拽/resize 自定义位置尺寸）；放大态禁用头部拖拽、隐藏 resize 把手；
  - 块3：四边 resize 把手（n/s/e/w），按下固化 left/top/width/height，最小 380×420、视口 16px 安全边距；page 面板 overflow 改 visible 以露出把手；
  - 块2：semanticMetaOf/load 历史 enrichment/backfillFromView/handleSend 新消息全链路透传 semanticSchemaId；chip 带 schemaId 时可点 → openSchemaDrawer（自动放大 + fetchSemanticDetail + parseSchemaFieldsFromModelDetail 填表）；SchemaFieldsModal 经 getContainer 挂载到面板内实现窗内抽屉；
  - 块4：工具栏加模式下拉（WIDGET_MODES 三选 + ✓ + 已切换到XX模式提示）、思考开关（on 态高亮）、工具更多菜单（查看语义→openSchemaDrawer；技能/MCP 子视图多选，选中数角标）；浮层外部点击收起（同语义下拉套路），与语义下拉互斥。
- `apps/chat/src/components/chat-widget/index.css`：新增 resize 把手、chip clickable、工具栏按钮/浮层/模式项/菜单项/勾选项、窗内抽屉圆角裁剪等样式（全 abi-cw- 前缀）。
- `apps/chat/src/components/conversation-analysis/SchemaFieldsModal.tsx`：导出 `parseSchemaFieldsFromModelDetail`；Props 增加可选 `getContainer` 透传 Drawer。
- `apps/chat/src/components/conversation/components/MessageList.tsx`：删除本地 parser，改导入共用版（行为不变）。

## 实现说明

- 放大/还原与拖拽/resize 均走 inline style（同既有 handleDragStart 套路），不引第三方拖拽库；还原用 `setAttribute('style', 快照)` 完整恢复。
- antd Drawer 默认 portal 到 body，窗内展示必须传 `getContainer={() => panelRef.current}`；Drawer 自身 rootStyle position:absolute 已具备，配合面板 position:fixed（resize 固化后）/CSS 定位正常铺满。
- 技能/MCP 数据不新增接口：从 getProjectInfo 同响应的 version.skills[].skillConfig / version.tools[toolType==='2'].toolConfig 提取。
- 模式仅 UI 三选 + 切换提示，chat_mode 仍固定 'chat_with_assistant_share'（用户确认报告/探索暂不对接）。

## 测试记录

### 执行的命令

- `npx tsc -b --pretty false`（apps/chat）
- `npx tsc -p tsconfig.app.json --noEmit --pretty false`（apps/chat）
- `npx vitest run src/components/chat-widget`（apps/chat）

### 测试结果

- tsc：本次改动的 5 个文件零错误；仅存量错误（`multi-measure-pie-chart.ts` 为 .ts 却含 JSX、`vite.config.ts` TS6133 未使用参数），均非本次引入且未被 git 标记修改。
- vitest：chat-widget 3 个测试文件 34/34 通过（service.test.ts 19、history.test.ts 8、shareUrl.test.ts 7）。
- GetProblems：语言服务未就绪，以 tsc 结果为准。

### 失败和修复过程

- service.ts 编辑时正则 `/\/+$/` 被转义丢失为 `//+$/` 触发语法错误，随即修复。

## 回归检查

- 发送协议：未选技能/MCP 时 body 与改动前逐字段一致（enable_thinking 缺省 true）；service.test.ts 全绿。
- 主对话 MessageList 查看语义抽屉：parser 行为逐行一致，仅改导入来源。
- 头部拖拽、语义下拉、密码表单、图表卡等既有交互未改动逻辑。

## Review 结果

重点核对：sendChatStream body 增量仅在 hasToolSelection 时生效；放大快照/还原不丢失用户自定义尺寸；chip 无 schemaId 时保持不可点（降级同现状）。

## 发现的问题

- 存量：`multi-measure-pie-chart.ts` 扩展名应为 `.tsx`（含 JSX），导致 apps/chat `tsc -b` 恒失败，非本任务范围未修。
- `AiEle.tsx` 工作区存在非本次任务的未提交改动（未触碰）。

## 本轮经验

分享悬浮窗无 store/纯 CSS 前缀约束下，antd 组件进窗必须处理 portal（getContainer）与样式隔离；协议透传字段直接对齐主对话探索模式可避免后端二次约定。

## 是否需要更新 AI 系统

- context：`.ai/context/MODULE_MAP.md` 如维护 chat-widget 条目可补充"支持放大/resize/语义抽屉/工具栏"，非必须。
- prompts/agents/skills/mcp/checklists/decisions：无需更新。

## 后续建议

- 报告/探索模式对接发送协议与专属渲染时，扩展 WIDGET_MODES 与 sendChatStream 的 chat_mode 映射（集中一处）。
- float 形态（第三方嵌入）建议真机验证 resize 把手与放大态表现。

## 未解决问题

- 无 E2E；四边拖拽与窗内抽屉的视觉验证需浏览器手工回归。

---

# 第二轮：用户反馈四项修复（2026-09-03）

## 反馈与修复

1. **默认选择语义丢失**：load() 补齐主对话同款默认选中逻辑（findFirstSchemaLeaf 深度优先首个叶子，`prev ?? {...}` 已选中不覆盖）。
2. **工具打开方式与 chat 统一**：自定义子视图切换（toolsView）整体替换为主对话同款 antd Popover（trigger click / placement topRight / overlayClassName="uni-popover" / destroyTooltipOnHide）+ uni-popup 菜单结构；技能/MCP 为 hover 右飞层（placement rightTop，getPopupContainer 挂父级 .ant-popover），飞层顶部搜索 + CheckOutlined 多选；外层 Popover getPopupContainer 挂面板内（float 形态 z-index 2147483000 不被遮挡），float 面板补 position:relative；图标改用 @ant-design/icons（EyeOutlined/ToolOutlined/ApiOutlined 等），删除 IconEye/IconZap/IconServer。
3. **图表不随面板拖拽自适应**：EChart autoResize 仅监听 window resize，面板拖拽改宽不触发；ChartCard 对图表容器加 ResizeObserver → echartRef.current?.resize()。
4. **shareCode 传参收敛**：仅 checkSharePassword（body）与 getProjectInfo（query）显式传；postJson/getJson 不再自动附加；sendChatStream 删 body 顶层 shareCode 与 extra.share_code（鉴权靠 Authorization token）；getJson 无参时不再拼空 `?`。

## 修改文件

- `apps/chat/src/components/chat-widget/ChatWidget.tsx`：默认语义选中、ChartCard ResizeObserver、工具 Popover 化（新增 filteredSkills/filteredMcps useMemo + skillFlyoutContent/mcpFlyoutContent/toolsPopoverContent）、删 toolsView state 加 skillSearch/mcpSearch。
- `apps/chat/src/components/chat-widget/service.ts`：shareCode 收敛（见上）。
- `apps/chat/src/components/chat-widget/index.css`：删除工具子视图废弃类（tb-menu-item/tb-item-*/tb-sub-head/tb-check-*/tb-empty，约 137 行）；float 面板加 position:relative。

## 测试记录

- `npx tsc -p tsconfig.app.json --noEmit --pretty false`：零新增错误（仅存量 multi-measure-pie-chart.ts）。
- `npx vitest run src/components/chat-widget`：34/34 通过（service.test.ts 未断言 shareCode 附加行为，无固化旧行为）。

## 回归检查

- 发送协议：除删除 shareCode/share_code 两字段外与第一轮一致；工具选中透传链路（handleSend extras）未动。
- 模式弹窗（abi-cw-tb-popover）与语义下拉仍用原自定义结构，未受影响；外部点击收起逻辑收窄为仅 mode（tools 由 Popover 自管）。
- uni-popup 样式为 chat 应用全局 CSS（src/index.css），分享页同应用直接可用，未新增样式依赖。

## 本轮经验

- 分享悬浮窗内 antd 浮层（Popover/Drawer）统一需 getPopupContainer/getContainer 挂面板内 + 面板 positioned，否则 float 形态被 z-index 遮挡或 portal 到 body 脱窗。
- 免登录链路的凭证传参范围应以后端实际鉴权为准（token 下发后仅校验/详情两接口需 shareCode），避免通用封装自动附加造成冗余。

---

# 第三轮：语义详情路径双前缀 + 放大/默认尺寸百分比化（2026-09-03）

## 反馈与修复

1. **`/api/api/copilot/v1/schema/394` 双前缀**：分享页 apiBase=VITE_BASE_API（`/api`），widget 内路径均不含 `/api` 前缀，唯独 semanticDetail 照抄主对话 url 时带入了 `/api` → 改为 `/copilot/v1/schema`，其余路径逐一核对无同类问题。
2. **放大不占满全屏**：handleToggleMaximize 由 100vw/100vh+borderRadius:0 改为视口百分比留边（left 6% / top 7% / width 88% / height 85%，对齐产品红框标注），保留 16px 圆角；right/bottom 置 auto 防过约束。
3. **默认宽高百分比等比**：page 面板 `width: max(420px, 27vw)`、`height: max(560px, 72vh)`（1920×1080 下≈原 520×780）；float 根 `width: max(420px, 25vw)`（1920 下≈原 480）；max() 兜底小屏最小可用尺寸，原有 max-width/max-height 安全上限保留。

## 修改文件

- `apps/chat/src/components/chat-widget/service.ts`：semanticDetail 去 `/api` 前缀 + 注释更新。
- `apps/chat/src/components/chat-widget/ChatWidget.tsx`：handleToggleMaximize 百分比留边、删 borderRadius:0。
- `apps/chat/src/components/chat-widget/index.css`：page/float 默认宽高改 vw/vh + max() 兜底。

## 测试记录

- tsc：零新增错误（仅存量 multi-measure-pie-chart.ts）；vitest：34/34 通过。

## 回归检查

- 放大快照/还原链路不变（还原仍 setAttribute('style', 快照)）；拖拽/resize 固化为 px 的逻辑不变，与百分比默认值互不干扰（resize 按下时读 getBoundingClientRect 固化）。
- 放大态仍禁头部拖拽、隐藏 resize 把手；窗内抽屉/Popover 挂面板内不受尺寸策略影响。

---

# 第四轮：工具栏贴左 + 对话背景改白（2026-09-03）

## 反馈与修复

1. **交互/思考/工具三按钮贴左**：工具栏原 `justify-content: space-between` 把按钮摊满整行 → 去掉 space-between，发送/停止加 `margin-left: auto` 靠右；用户复测仍偏右，根因是 `.abi-cw-sem-selector` 的 `flex: 1` 撑满剩余宽度把按钮顶右 → 改 `flex-shrink: 0`，语义选择器与三按钮顺序贴左。
2. **对话背景改白**：`.abi-cw-body` 浅薰衣草渐变（#e4e9f9→#eaeefb）先改纯白，用户反馈太刺眼后定稿浅灰白 `#f7f8fa`（中间值）；气泡配色来自主对话组件自带样式，未另改。

## 修改文件

- `apps/chat/src/components/chat-widget/index.css`：仅上述两处布局/背景调整（+发送/停止 margin-left:auto）。

## 测试记录

- tsc：零新增错误（仅存量）；vitest：34/34 通过。纯 CSS 改动，无逻辑影响。
