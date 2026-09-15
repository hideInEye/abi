# Run Log: HTTP 转 MCP 协议转化配置增/改/明细对齐 nacos 控制台

## 基本信息

- 日期：2026-09-09
- 任务名称：mcp-protocol-template-align
- 需求来源：用户反馈（协议转化配置与 nacos 控制台不一致，需对齐；分多轮演进）
- 执行 AI：Qoder
- 任务类型：缺陷修复 + UI 对齐

## 需求摘要

1. `CreateToolModal.tsx` 五类模板预设值对齐 nacos `generateTemplateByType`（请求体四选一互斥字段、headers 为 {key,value} 数组、argsPosition 顶层；参数位置-Path 按当前参数名动态生成）。
2. 编辑已发布版本（版本号已在版本历史中）：抽屉顶部红字两行提示，描述/协议/开关/端点/地址/端口/传输协议禁用，对齐 nacos NewMcpServer。
3. 工具区布局对齐 nacos 主从结构：左侧工具卡片列表 + 右侧选中工具明细（名称大标题、描述、参数配置(共N项)、协议转化配置），新增共享组件 ToolsPanel。
4. 工具新建/编辑弹窗样式完全一致，唯一差异为编辑时锁定名称（对齐 nacos BasicInfo name isPreview）；编辑已发布版本时进入受限模式（仅 Tool/参数描述与启用开关可改，对齐 nacos onlyEditRuntimeInfo）。
5. 修复编辑抽屉回填 bug：协议模板优先读 toolsMeta[name].templates['json-go-template']（与提交写入 key 一致），旧 key 回退。
6. 抽屉宽度统一为 960（原 720）：先做过「工具 tab 有数据时加宽」的动态宽度，用户反馈通用 tab 变窄后红字不适配，撤销动态逻辑改为固定 960。
7. 修复协议转化明细 headers 渲染 bug：nacos 模板 headers 为 {key,value} 数组，旧实现当对象渲染出现 `0 = [object Object]`。
8. 新增/编辑工具后协议转化配置立即展示：ToolsPanel templateOf 优先解析本地 tools 状态的 protocolTemplate（未保存值），回退已保存的 toolSpec。
9. 修复 MCP 列表分页「共 N 条」右侧页大小选择器空白：PluginTable 中 ASelect/AInput 被别名为原生 select/input，不认 antd 的 options/onPressEnter 属性；改为真实 antd Select/Input。
10. 恢复编辑已发布版本的工具受限模式（用户核对 nacos 后确认需要）：工具弹窗仅 Tool/参数描述与启用开关可改 + 橙色提示条 + 模板只读盒；工具列表卡片隐藏删除链接；隐藏添加工具/导入按钮（用户二次确认后恢复）。参数默认值不禁用（用户点名保持可编辑）；参数详情默认关闭、点击参数行切换开/关。
11. 编辑已有 MCP 服务时服务名称输入框禁用（对齐 nacos BasicInfo name isPreview），新建时仍可输入。

## 影响范围

- `apps/abi/src/pages/component/system/plugin/components/CreateToolModal.tsx`
- `apps/abi/src/pages/component/system/plugin/components/PlugUpdate.tsx`
- `apps/abi/src/pages/component/system/plugin/components/ToolsPanel.tsx`（新增）
- `apps/abi/src/pages/component/system/plugin/components/PluginDetail.tsx`（用户后续自行迭代，本次未再触碰）

## 修改文件

- `CreateToolModal.tsx`：五类模板值对齐 + 文件内 `buildArgsPositionTpl`；编辑模式仅锁定名称（`disabled={!!initial}`），其余与新建完全一致。
- `PlugUpdate.tsx`：`publishedEdit` 判定（Form.useWatch 版本号 ∈ allVersions）；红字两行提示；服务端字段禁用；协议模板回填改读 json-go-template；工具列表替换为 ToolsPanel 主从布局；抽屉宽度固定 `960`（曾做动态加宽后应用户反馈撤销）。
- `ToolsPanel.tsx`（新增）：左侧工具卡片（启用状态/N 个参数/编辑・删除链接）+ 右侧明细（名称/描述/参数配置递归行/协议转化配置 ProtocolTemplateView）；headers 兼容对象与 {key,value} 数组两种形式。
- `PluginTable.tsx`：分页 ASelect/AInput 别名从原生元素改为 antd Select/Input。
- `.ai/requirements/CURRENT_REQUIREMENT.md`：追加需求记录。

## 实现说明

- 模板值、红字文案、主从布局、名称锁定均取自 nacos develop 分支源码（AdvancedConfig.js / NewMcpServer.js / BasicInfo.js / ShowTools.js+css）。
- 按用户反馈回退又恢复的改动（重要）：
  1. 工具弹窗受限模式（onlyEditRuntimeInfo）：先按用户「新建编辑样式应一致」回退；用户核对 nacos 截图后确认受限模式正确，已恢复（仅 publishedEdit 时生效）。
  2. 编辑已发布版本隐藏删除工具链接：同样先回退后恢复。
  3. 隐藏添加/导入按钮：先回退；用户二次确认「编辑的时候没有新增和导入」后恢复（仅 publishedEdit 时隐藏），并连同「N 个工具」计数整行隐藏。

## 测试记录

### 执行的命令

- `pnpm --filter chatbi typecheck`（后台重定向 + 过滤本次四个文件）

### 测试结果

- typecheck exit:2 与仓库既有基线一致；输出中 PluginTable/PlugUpdate/ToolsPanel/CreateToolModal/PluginDetail 五个文件零报错（四轮均验证）。

### 失败和修复过程

- 首版方案（新模块+测试）超出用户预期范围，回退为单文件修改。
- 工具弹窗受限模式（onlyEditRuntimeInfo 禁用/只读化）被用户指出乱改，回退为仅锁名称。
- 自行隐藏已发布版本编辑时的添加/删除工具入口，被用户指出未要求，回退。
- PlugUpdate 与本地编辑器存在并发修改（antd 导入行/工具卡片区块变化），SearchReplace 部分失败后重新读取当前内容再改。

## 回归检查

- 提交链路（plugin/index.tsx 写入 toolsMeta.templates['json-go-template']）未改；回填读取 key 已与写入侧对齐。
- 工具弹窗除编辑锁名外与新建完全同样式；添加工具/导入/删除入口在所有模式下可见（与改动前一致）。
- 未触碰用户既有未提交改动及用户自行迭代的 PluginDetail.tsx。

## 发现的问题

- 仓库 typecheck 基线报错较多，沿用既有「对比基线」口径。
- PlugUpdate.tsx 存在与本地编辑器的并发修改，后续编辑前必须重新读取最新内容。

## 是否需要更新 AI 系统

已更新长期记忆「改动范围最小化」：补充「对齐外部参考系统时只实现用户点名部分，不得自行附加参考系统的其他限制行为」。
