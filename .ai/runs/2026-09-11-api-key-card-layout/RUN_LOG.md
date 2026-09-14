# API Key 卡片视图布局优化

## 需求

API Key 管理页卡片视图按 UI 标注优化：

1. 卡片去掉「创建时间」显示项。
2. 卡片高度/结构与其他模块卡片保持一致。
3. 「查看」「停用」两个操作从 hover「更多」下拉中移出，放到卡片底部常显，不隐藏。

## 现状排查

- 卡片 body 含 5 行（业务空间/Access Key/IP限制/过期时间/创建时间），比其他模块卡片多一行。
- 操作入口为绝对定位在卡片右下角的 hover Dropdown（查看/重置SK/停用/删除），与其他模块的 `abi-data-card-footer` 常显按钮模式不一致，且更多按钮与卡片内容重叠。

## 修改内容

- `apps/abi/src/pages/component/applications/api-key/components/ApiKeyTable.tsx`（仅卡片视图分支）
  - 删除「创建时间」行。
  - 移除绝对定位的 hover Dropdown 与卡片上的内联 `position: relative`。
  - 新增标准 `abi-data-card-footer`：「查看」「停用/启用」为常显 `abi-card-act` 按钮；「重置SK」「删除」保留在 footer 右侧 `abi-card-more` 下拉（trigger 由 hover 改为 click，与数据源/工具/MCP 卡片一致），删除项标记 danger。
  - 顺带清理原菜单中无对应菜单项的死分支 `copyAk`。
- 复用 `apps/abi/src/styles/scss/table.scss` 既有 `.abi-data-card-footer` / `.abi-card-act` / `.abi-card-more` 样式，无新增样式。

## 验证

- `apps/abi` 下 `npx tsc --noEmit --skipLibCheck`：`ApiKeyTable.tsx` 无错误；仅存量错误（`api-key/index.tsx` 隐式 any、`router/elegant/routes.ts` 类型不匹配），未触碰。
- `eslint ApiKeyTable.tsx`：无新增 error（存量 error 均在分页代码：no-plusplus、parseInt/isNaN）；新增行仅 prettier 格式化 warning，与该文件及 PluginTable/tools 等模块 footer 按钮的既有写法一致。
- 未运行 UI 自动化：纯 UI 布局调整，无对应测试脚本，建议手工回归：
  1. API Key 页卡片视图：卡片无「创建时间」行，底部常显「查看」「停用/启用」。
  2. 「查看」打开详情抽屉；「停用/启用」切换状态并刷新；行为与原菜单项一致。
  3. footer 右侧「更多」点击展开，仅「重置SK」「删除」，行为不变。
  4. 列表视图字段与操作不受影响。

## 回归检查

- 列表视图分支、分页、批量删除、抽屉逻辑均未改动。
- `onView` / `onToggleStatus` / `onResetSk` / `onDelete` 回调调用链不变，仅触发入口从 Dropdown 菜单迁移到 footer 按钮/精简后的菜单。

## 是否需要更新其他 .ai 资产

- context / decisions / prompts / skills：无需变更。
- 可沉淀经验：abi 应用卡片视图统一为 head/body/footer 三段结构，操作按钮常显于 footer，低频危险操作收进 `abi-card-more` 下拉。
