# 项目实例版：新增 ABI 本体知识图谱实体颜色预设

## 功能名称

本体实体颜色预设选择。

## 背景

`apps/abi/src/pages/workbench/ontology-kg/entity` 管理本体实体，领域类型位于 `apps/abi/src/pages/workbench/ontology-kg/shared-network-types.ts`，其中 `OntologyEntity.color` 已存在。当前 ABI 使用 Ant Design、UnoCSS 和 `apps/abi/src/styles/css/global.css` 中的 ABI v5 变量。

## 用户价值

用户创建或编辑本体实体时，可以从统一颜色预设中选择颜色，避免图谱节点颜色不一致。

## 目标

- 在实体编辑抽屉中增加颜色预设选择。
- 保持提交参数中的 `color` 字段兼容。
- 补充颜色映射或表单默认值的 Vitest 测试。

## 非目标

- 不修改图谱渲染引擎。
- 不新增后端字段。
- 不影响 `apps/chat` 和 `apps/dashboard`。

## 入口和用户流程

进入 ABI 工作台的本体知识图谱实体管理页面，创建或编辑实体，选择颜色预设，保存后颜色字段随现有接口提交。

## 页面 / 组件影响

- `apps/abi/src/pages/workbench/ontology-kg/entity/`
- 可能涉及同域 `components`、`utils`、`types`

## API / 数据影响

沿用现有 `OntologyEntity.color` 和实体创建/更新 API。API 调用应通过 `apps/abi/src/service/api/ontology-network.ts` 或现有同域 API 文件。

## 状态管理影响

优先使用页面局部 form state，不新增 Redux slice。

## 权限 / 鉴权影响

不修改权限。路由权限仍由 `apps/abi/src/router/guard/index.ts` 和动态路由控制。

## UI / 样式要求

- 使用 Ant Design 表单控件。
- 色值按钮/色块应符合 ABI v5 视觉，优先复用 `#3366ff`、`#5B7CF7` 等已有色值或 `@sa/color` 生成色板。
- 不引入 Tailwind；ABI 使用 UnoCSS/SCSS/CSS variables。

## 边界条件

- `color` 为空时使用现有默认值。
- 编辑已有实体时保持原色值。
- ID 不强制转 number。

## 验收标准

- 创建/编辑实体时颜色字段可选、可回显、可提交。
- `pnpm test -- apps/abi/src/pages/workbench/ontology-kg` 相关测试通过。
- `pnpm test` 通过。

## 测试要求

新增或更新同域 `*.test.ts`，覆盖默认颜色、已有颜色回显、非法/空色值 fallback。

## 回归范围

- 本体实体列表和编辑抽屉。
- 本体图谱节点颜色展示。
- ABI 构建：`pnpm --filter chatbi build`。

## 风险和限制

ABI 构建当前有 UnoCSS 图标加载 warning，不能把既有 warning 误判为本需求失败。

---

# 空白模板版

## 功能名称

## 背景

## 用户价值

## 目标

## 非目标

## 入口和用户流程

## 页面 / 组件影响

## API / 数据影响

## 状态管理影响

## 权限 / 鉴权影响

## UI / 样式要求

## 边界条件

## 验收标准

## 测试要求

## 回归范围

## 风险和限制
