# RUN LOG — API Key 页「分享助手」入口与助手列表抽屉

日期：2026-09-30
需求来源：用户截图标注（API Key 管理页 /component/applications/api-key）

## 目标

1. API Key 卡片三点菜单（及列表视图「更多」菜单）新增「分享助手」入口。
2. 点击后右侧打开「助手列表」抽屉，**仅展示当前 API Key 绑定的助手**（绑定关系取自分享记录 apiKeys 字段）；
   字段：助手ID、助手名称、分享链接、创建人、创建时间；底部分页器；无空间选择器/列设置/卡片切换。
3. 列表内「分享」动作复用 AssistantShareModal，并默认预选触发入口的 API Key（与分享弹窗 ApiKey 多选需求闭环）。

## 非目标

- 不改分享接口后端字段约定（沿用 apiKeys）。
- 不改我的助手页（my-assistant）既有交互。

## 修改文件

1. `apps/abi/src/pages/component/applications/api-key/components/ShareAssistantDrawer.tsx`（新增）
   - 抽屉主体：单表格列表（助手ID/助手名称/分享链接/创建人/创建时间 + 操作列）+ data-source-pagination 前端分页。
   - 数据：fetchProjectShareListApi({ type:'workflow', size:999 }) 过滤 apiKeys 含当前 accessKey 的记录，
     按 projectId 去重取最近一条的 shareUrl（normalizeShareUrl 归一）；名称/创建人/创建时间从
     fetchAppListApi 助手列表映射，缺失回退分享记录字段。
   - 分享动作：setShareAgent → AssistantShareModal（defaultApiKeys=[当前 API Key accessKey]），分享成功后重拉列表。
2. `apps/abi/src/pages/component/applications/api-key/components/ApiKeyTable.tsx`
   - props 新增 onShareAssistant；卡片三点菜单与列表「更多」菜单均在「删除」后追加「分享助手」项（divider 分隔）。
3. `apps/abi/src/pages/component/applications/api-key/index.tsx`
   - 新增 shareAssistantRecord state；ApiKeyTable 传 onShareAssistant；渲染 ShareAssistantDrawer。
   - 顺带修复既有隐式 any：spaceList().then((res: any))。
4. `apps/abi/src/pages/workbench/app-workshop/my-assistant/AssistantShareModal.tsx`
   - Props 新增 defaultApiKeys?: string[]；open 时 setApiKeys(defaultApiKeys ?? [])，关闭仍重置为空。

## 验证

- `npx tsc --noEmit -p tsconfig.json`（apps/abi）定向过滤 ShareAssistantDrawer|ApiKeyTable|api-key/index|AssistantShareModal：零错误。
- 全量错误清单核对：其余错误均为仓库既有问题（node_modules 类型、packages/*、无关页面），与本次无关。
- chat 应用无测试脚本；abi 应用未运行单测（无相关用例）。

## 已知边界 / 约定

- 绑定关系前端推导：分享记录 apiKeys（兼容数组/逗号串）含当前 accessKey 即视为绑定；后端如提供直接查询接口可替换。
- 同一助手多条绑定记录时去重为一行，分享链接取最近一条。
- 助手名称/创建人/创建时间依赖当前空间助手列表映射，跨空间助手回退分享记录字段或 '-'.
- 抽屉内「分享」入口为推断的交互闭环（截图未标注后续动作）；若只需纯查看可移除操作列。

## .ai 更新判断

- 无需更新 prompts/agents/skills/mcp/context/checklists/decisions。
- MODULE_MAP 可选补充：api-key 模块新增 ShareAssistantDrawer 组件（非必需）。
