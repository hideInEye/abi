# 语义名单新建表单移除默认值

## 基本信息

- 日期：2026-09-21
- 模块：ABI / 组件 / 数据 / 语义名单
- 需求：移除新建规则表单的全部业务默认值。

## 实施结果

1. 新建草稿中的名单类型、业务类别、优先级、可见性、匹配目标和匹配方式全部改为空值。
2. 删除业务类别及匹配目标字典加载后自动选择第一项的逻辑。
3. 未选择匹配方式时不再以精确匹配作为展示回退，也不展示依赖匹配目标与方式的智能提示。
4. 为可见性和匹配方式补充空状态占位文案；编辑规则继续通过 `semanticRuleToDraft` 完整回显。
5. 表单草稿类型允许未填写状态，现有字段级校验继续拦截必填项；提交报文与默认启用状态未改动。

## 变更文件

- `apps/abi/src/pages/component/data/semantic-list/components/SemanticRuleDrawer.tsx`
- `apps/abi/src/pages/component/data/semantic-list/constants.ts`
- `apps/abi/src/pages/component/data/semantic-list/semantic-list-model.ts`
- `apps/abi/src/pages/component/data/semantic-list/semantic-list-model.test.ts`
- `apps/abi/src/pages/component/data/semantic-list/types.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 验证记录

- `pnpm exec vitest run apps/abi/src/pages/component/data/semantic-list/semantic-list-model.test.ts`：通过，1 个测试文件、16 个用例全部通过。
- 改动 TS/TSX 文件 ESLint：通过，无 error。
- `git diff --check`：通过。
- 未运行全量测试或构建；按项目规则仅验证本次修改的语义名单小模块。

## 回归检查

- 编辑抽屉仍从规则详情映射类型、类别、优先级、可见性、目标和方式。
- 新建保存仍执行原有必填校验，接口参数和成功后关闭流程未修改。
- 筛选条件、列表、卡片、详情及批量操作未修改。
- 保留语义名单目录内用户已有的可见性和顶部更多操作改动。

## AI 资产更新结论

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 与本运行记录。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
