# 实体属性配置校验与标题样式优化

## 基本信息

- 日期：2026-08-10
- 范围：`apps/abi` 本体网络实体属性配置
- 类型：Bug fix + 局部 UI 优化

## 需求来源

- 用户本轮明确要求：
  - 新增属性校验中，维度属性按 `dimId + 当前属性类型` 区分。
  - 指标属性使用 `indId`，标签属性使用 `tagId`。
  - 使用 `frontend-design` 优化属性配置中“已绑定属性列表”和“新增属性绑定”标题样式。
  - 保存实体属性时，`attributes` 下每个字段增加 `attributeId`，按属性类型分别取 `dimId` / `indId` / `tagId`。
  - 点击保存时，保存接口或刷新接口失败都不关闭弹窗；只有保存和刷新都成功后才提示成功并关闭弹窗。
- `.ai/requirements/CURRENT_REQUIREMENT.md` 当前仍是聊天报告/会话分组需求，与本轮 ABI 本体网络需求不一致；本轮按用户当前消息作为执行依据。

## 修改文件

- `apps/abi/src/pages/workbench/ontology-kg/shared-network-types.ts`
- `apps/abi/src/pages/workbench/ontology-kg/components/OntologyFormSectionTitle.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/entity/components/AttributeDrawer.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/entity/hooks/useAttributeAssets.ts`
- `apps/abi/src/pages/workbench/ontology-kg/entity/hooks/useEntityAttributeManagement.ts`
- `apps/abi/src/pages/workbench/ontology-kg/entity/types/index.ts`
- `apps/abi/src/pages/workbench/ontology-kg/entity/utils/entity.ts`
- `apps/abi/src/pages/workbench/ontology-kg/entity/utils/entity.test.ts`
- `apps/abi/src/styles/scss/table.scss`

## 变更内容

1. 属性资产归一化时保留来源 ID：维度 `dimId`、指标 `indId`、标签 `tagId`。
2. 新增 `getEntityAttributeIdentity` / `isSameEntityAttribute`，统一新增重复校验、删除和表格 `rowKey`。
3. 具体资产下拉值改为来源 ID，避免同编码不同资产时选择和校验混淆。
4. 保存接口 payload 仍使用原有 `attributeCode`、`attributeName`、`attributeType`、`dataType`、`relateDictId`、`remark`，不额外透传来源 ID。
5. 属性配置两处标题增加局部样式，改为对齐属性建模表单标题：左侧蓝色定位轨、蓝色图标、14px 加粗标题和统一下间距。
6. `OntologyFormSectionTitle` 增加文本 span 包裹，便于标题底纹和文字层级稳定。
7. 保存实体属性 payload 时新增 `attributeId` 字段，维度取 `dimId`，指标取 `indId`，标签取 `tagId`。
8. 保存成功提示和关闭弹窗动作移动到 `saveAttributes` 与 `onSaved` 都成功之后，避免接口失败时误关弹窗。

## 验证命令

```bash
pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/entity/utils/*.test.ts
```

结果：通过，2 个测试文件、6 个用例通过。

```bash
git diff --check -- apps/abi/src/pages/workbench/ontology-kg/shared-network-types.ts apps/abi/src/pages/workbench/ontology-kg/components/OntologyFormSectionTitle.tsx apps/abi/src/pages/workbench/ontology-kg/entity apps/abi/src/styles/scss/table.scss
```

结果：通过。

```bash
pnpm --filter chatbi build
```

结果：通过。构建过程中仍有既有 warning，包括 UnoCSS `selector-popover` / `selector-trigger` 图标加载失败、动态/静态导入 chunk 提示和部分 chunk size 提示；没有构建失败。

## 回归检查

- 维度/指标/标签三类属性新增重复校验不再只依赖 `attributeCode`。
- 老详情数据缺少来源 ID 时仍 fallback 到 `attributeCode`，避免历史数据无法删除或保存。
- 保存接口参数在原结构基础上新增 `attributeId`，其它字段保持不变。
- 保存接口失败时 `saveAttributes` 返回 `false`，弹窗保持打开且不提示成功。
- 刷新实体列表失败时弹窗保持打开且不提示成功，方便用户重试。
- 标题样式通过 `ontology-attribute-drawer-content` 限定在属性配置抽屉内，不影响其它业务抽屉。

## 长期文档更新判断

- `.ai/prompts/`：不需要更新。
- `.ai/agents/`：不需要更新。
- `.ai/skills/`：不需要更新。
- `.ai/mcp/`：不需要更新。
- `.ai/context/`：暂不更新；本轮为局部业务规则。
- `.ai/checklists/`：不需要更新。
- `.ai/decisions/`：不需要更新。
