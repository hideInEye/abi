import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

describe('metric aggregation UI contract', () => {
  it('uses a multi-select for one-click atomic mapping aggregations', () => {
    const source = readSource('./KnowledgeAtomicMappingDrawer.tsx')
    expect(source).toMatch(/dataIndex: 'aggregationMethods'[\s\S]*?mode="multiple"/)
    expect(source).toMatch(/selectedRows\.some\(item => !item\.aggregationMethods\.length\)/)
  })

  it('uses one derived aggregation selector backed by the selected atomic methods', () => {
    const source = readSource('./knowledgeOperateDrawer.DerivedLogicBuilder.tsx')
    const aggregationField = source.match(/<AForm\.Item[\s\S]*?title="派生聚合方式"[\s\S]*?<\/AForm\.Item>/)?.[0]
    expect(aggregationField).toContain('name="projectionFunc"')
    expect(aggregationField).toContain('options={aggregationOptions}')
    expect(aggregationField).not.toContain('mode="multiple"')
  })

  it('keeps the atomic metric code out of business configuration and validates technical fields', () => {
    const businessSource = readSource('./knowledgeOperateDrawer.BusinessStep.tsx')
    const atomicTechnicalSource = readSource('./knowledgeOperateDrawer.AtomicTechnicalStep.tsx')
    const drawerSource = readSource('./KnowledgeOperateDrawer.tsx')

    expect(businessSource).not.toContain('name="techName"')
    expect(atomicTechnicalSource).toContain('name="techName"')
    expect(atomicTechnicalSource).toContain('name="atomicSourceFieldId"')
    expect(atomicTechnicalSource).toContain('name="atomicAggregationExpression"')
    expect(drawerSource).toContain("return ['techName', 'semanticSchemaId', 'atomicSourceFieldId', 'atomicAggregationExpression']")
  })

  it('moves simple atomic technical maintenance into the only edit step', () => {
    const drawerSource = readSource('./KnowledgeOperateDrawer.tsx')
    const simpleTechnicalSource = readSource('./knowledgeOperateDrawer.SimpleAtomicTechnicalSection.tsx')

    expect(drawerSource).toContain("getAtomicAggregationType(editingItem || undefined) === 'simple'")
    expect(drawerSource).toContain('getStepItems(!isAtomicMode, isSimpleAtomicEditing)')
    expect(drawerSource).toContain('atomicTechnicalSection=')
    expect(simpleTechnicalSource).toContain('>技术定义</OntologyFormSectionTitle>')
    expect(simpleTechnicalSource).toContain('name="atomicAggregationMethods"')
    expect(simpleTechnicalSource).toContain('mode="multiple"')
  })

  it('shows a custom aggregation label while keeping the expression as the select value', () => {
    const source = readSource('./knowledgeOperateDrawer.DerivedLogicBuilder.tsx')

    expect(source).toContain('label: CUSTOM_AGGREGATION_EXPRESSION_LABEL, value: customAggregationExpression')
    expect(source).toContain('查看表达式')
    expect(source).toContain('{customAggregationExpression}</pre>')
  })

  it('shows checkbox dimension options in a dedicated statistical-caliber row', () => {
    const source = readSource('./knowledgeOperateDrawer.DerivedLogicBuilder.tsx')

    expect(source).toMatch(
      /name=\{\['statisticalCaliber', 'subjectDimensionIds'\]\}[\s\S]*?<ATreeSelect[\s\S]*?treeCheckable/
    )
    expect(source).toContain('className={styles.subjectDimensionRow}')
    expect(source).toMatch(/className=\{`mb-0! \$\{styles\.crossDimensionField\}`\}/)
    expect(source.indexOf('className={styles.subjectDimensionRow}')).toBeLessThan(source.indexOf('title="时段范围"'))
  })

  it('moves metric form help text into title tooltips', () => {
    const atomicSource = readSource('./knowledgeOperateDrawer.AtomicTechnicalStep.tsx')
    const businessSource = readSource('./knowledgeOperateDrawer.BusinessStep.tsx')
    const derivedSource = readSource('./knowledgeOperateDrawer.DerivedLogicBuilder.tsx')
    const extendedSource = readSource('./knowledgeOperateDrawer.ExtendedTemplateParams.tsx')
    const labelSource = readSource('./knowledgeOperateDrawer.FormItemLabel.tsx')
    const precomputeSource = readSource('./knowledgeOperateDrawer.PrecomputeConfig.tsx')

    expect(labelSource).toContain('<Tooltip title={helpText}>')
    expect(labelSource).toContain('aria-label="查看字段说明"')
    expect(atomicSource).toContain('helpText="可直接输入或组合表达式；点击下方函数会在光标位置插入当前来源字段。"')
    expect(businessSource).toContain('helpText="用于 ChatBI 对业务术语的识别与召回"')
    expect(derivedSource).toContain('helpText={getStatisticalDateRangeHint')
    expect(derivedSource).toContain('title="派生聚合方式"')
    expect(derivedSource).toContain('title="主体维度"')
    expect(derivedSource).toContain('title="时段范围"')
    expect(derivedSource).toContain('helpText="如需多个维度组合分析指标，请勾选"')
    expect(extendedSource).toContain("helpText={EXTENDED_TEMPLATE_DESC_MAP[templateTypeVal] || '请选择复合模板'}")
    expect(precomputeSource).toContain('helpText="按当前空间时区执行。"')
    expect(
      [atomicSource, businessSource, derivedSource, extendedSource, precomputeSource].every(
        source => !source.includes('extra=')
      )
    ).toBe(true)
  })

  it('keeps derived business constraints optional while validating configured conditions', () => {
    const builderSource = readSource('../../rule-expression/RuleExpressionBuilder.tsx')
    const derivedSource = readSource('./knowledgeOperateDrawer.DerivedLogicBuilder.tsx')

    expect(builderSource).toContain('optional && !hasConfiguredRuleConditions(layers)')
    expect(derivedSource).toContain('if (!hasConfiguredRuleConditions(value))')
    expect(derivedSource).toMatch(/<RuleExpressionBuilder[\s\S]*?optional[\s\S]*?validationRequested=/)
    expect(derivedSource).toContain('const baseValidation = validateRuleLayers(value, ruleFields)')
    expect(derivedSource).toContain('const logicValidation = validateRuleLogicUniformity(value)')
  })

  it('uses compound wording for every derivative metric label', () => {
    const constantsSource = readSource('../constants/metricModeling.constants.ts')
    const runtimeSources = [
      constantsSource,
      readSource('../MetricModeling.tsx'),
      readSource('./knowledgeOperateDrawer.ExpressionEditor.tsx'),
      readSource('./knowledgeOperateDrawer.ExtendedTemplateParams.tsx'),
      readSource('./knowledgeOperateDrawer.TechnicalStep.tsx'),
    ]

    expect(runtimeSources.join('\n')).not.toContain('衍生')
    expect(constantsSource).toContain("{ label: '复合指标', value: 'derivative' }")
    expect(constantsSource).toContain("derivative: '复合指标'")
  })
})
