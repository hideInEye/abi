# 本体网络表单标题样式调整

## 目标
- 将本体网络下属性建模、实体定义、关系配置、图谱详情等表单/详情区域标题统一为数据准备表单的 `.ds-form-section-title` 风格。
- 指标派生第二步只保留一个“新增表达式”入口，并调整派生配置标题文案。

## 非目标
- 不调整表单字段、接口参数、校验规则和业务提交流程。
- 不运行构建、ESLint 或自动化测试。

## 影响范围
- `apps/abi/src/pages/workbench/ontology-kg/components/OntologyFormSectionTitle.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/entity/components/*`
- `apps/abi/src/pages/workbench/ontology-kg/relation/components/*`
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/components/GraphDetailPanel.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/**`

## 验证
- 已执行 `git diff --check`，通过。
- 未运行构建、ESLint、测试；本次为样式和文案收口，按用户近期要求不跑构建测试。

## 备注
- `.ai/requirements/CURRENT_REQUIREMENT.md` 仍是旧的指标自定义衍生需求，和本次样式请求不完全一致；本次按用户明确即时需求实施。
- 暂无需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/` 的内容。
