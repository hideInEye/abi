import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

function getFormItemSource(source: string, fieldName: string) {
  const fieldIndex = source.indexOf(`name="${fieldName}"`)
  const startIndex = source.lastIndexOf('<AForm.Item', fieldIndex)
  const endIndex = source.indexOf('</AForm.Item>', fieldIndex)

  return source.slice(startIndex, endIndex)
}

describe('metric aggregation UI contract', () => {
  it('only makes the business definition optional when editing an atomic indicator', () => {
    const businessSource = readSource('./knowledgeOperateDrawer.BusinessStep.tsx')
    const drawerSource = readSource('./KnowledgeOperateDrawer.tsx')
    expect(drawerSource).toContain('businessDefinitionRequired: !isAtomicEditing')
    expect(drawerSource).toContain('businessDefinitionRequired={!isAtomicEditing}')
    expect(getFormItemSource(businessSource, 'businessDefinition')).toContain('required={businessDefinitionRequired}')
    expect(businessSource).toContain('businessDefinitionRequired = true')
  })

  it('labels only the tag semantics data selector as data semantics', () => {
    const source = readSource('../../../module/TagModal.tsx')
    expect(source).toMatch(/<TableSemantics[\s\S]*?label="数据语义"/)
  })
  it('uses a multi-select for one-click atomic mapping aggregations', () => {
    const source = readSource('./KnowledgeAtomicMappingDrawer.tsx')
    expect(source).toMatch(/dataIndex: 'aggregationMethods'[\s\S]*?mode="multiple"/)
    expect(source).toMatch(/selectedRows\.some\(item => !item\.aggregationMethods\.length\)/)
  })

  it('loads every aggregation option from the atomic system dictionary', () => {
    const constantsSource = readSource('../constants/metricModeling.constants.ts')
    const mappingSource = readSource('./KnowledgeAtomicMappingDrawer.tsx')
    const simpleAtomicSource = readSource('./knowledgeOperateDrawer.SimpleAtomicTechnicalSection.tsx')
    const technicalSource = readSource('./knowledgeOperateDrawer.TechnicalStep.tsx')
    const sources = [mappingSource, simpleAtomicSource, technicalSource]

    expect(constantsSource).not.toContain('AGG_METHOD_OPTIONS')
    expect(constantsSource).not.toContain('AGG_METHOD_LABEL_MAP')
    expect(sources.every(source => source.includes('useOntologyAtomicAggregationDictionary()'))).toBe(true)
    expect(mappingSource).toContain('options={aggregationOptions}')
    expect(simpleAtomicSource).toContain('options={aggregationOptions}')
    expect(technicalSource).toContain('aggregationOptions={aggregationOptions}')
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
    const functionExpressionSource = readSource('./knowledgeOperateDrawer.FunctionExpressionField.tsx')
    const drawerSource = readSource('./KnowledgeOperateDrawer.tsx')

    expect(businessSource).not.toContain('name="techName"')
    expect(atomicTechnicalSource).toContain('name="techName"')
    expect(atomicTechnicalSource).toContain('name="atomicSourceFieldId"')
    expect(atomicTechnicalSource).toContain('fieldName="atomicAggregationExpression"')
    expect(functionExpressionSource).toContain('name={fieldName}')
    expect(drawerSource).toContain("return ['techName', 'semanticSchemaId', 'atomicSourceFieldId', 'atomicAggregationExpression']")
  })

  it('moves simple atomic technical maintenance into the only edit step', () => {
    const drawerSource = readSource('./KnowledgeOperateDrawer.tsx')
    const simpleTechnicalSource = readSource('./knowledgeOperateDrawer.SimpleAtomicTechnicalSection.tsx')

    expect(drawerSource).toContain("getAtomicAggregationType(editingItem || undefined) === 'simple'")
    expect(drawerSource).toContain('getStepItems(!isAtomicMode, isSimpleAtomicEditing)')
    expect(drawerSource).toContain('atomicTechnicalSection=')
    expect(simpleTechnicalSource).not.toContain('技术定义')
    expect(simpleTechnicalSource).toContain('label="数据语义"')
    expect(simpleTechnicalSource).toContain('isEdit')
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
    const functionExpressionSource = readSource('./knowledgeOperateDrawer.FunctionExpressionField.tsx')
    const labelSource = readSource('./knowledgeOperateDrawer.FormItemLabel.tsx')
    const precomputeSource = readSource('./knowledgeOperateDrawer.PrecomputeConfig.tsx')

    expect(labelSource).toContain('<Tooltip title={helpText}>')
    expect(labelSource).toContain('aria-label="查看字段说明"')
    expect(functionExpressionSource).toContain('可直接输入或组合表达式；点击下方函数会在光标位置插入当前来源字段。')
    expect(functionExpressionSource).toContain('输入字母或字段名称可搜索已选来源字段')
    expect(businessSource).toContain('helpText="用于 ChatBI 对业务术语的识别与召回"')
    expect(derivedSource).toContain('helpText={getStatisticalDateRangeHint')
    expect(derivedSource).toContain('title="派生聚合方式"')
    expect(derivedSource).toContain('title="主体维度"')
    expect(derivedSource).toContain('title="时段范围"')
    expect(derivedSource).toContain('helpText="如需多个维度组合分析指标，请勾选"')
    expect(extendedSource).toContain("helpText={EXTENDED_TEMPLATE_DESC_MAP[templateTypeVal] || '请选择指标模版'}")
    expect(precomputeSource).toContain('helpText="按当前空间时区执行。"')
    expect(
      [atomicSource, businessSource, derivedSource, extendedSource, precomputeSource].every(
        source => !source.includes('extra=')
      )
    ).toBe(true)
  })

  it('uses system dictionaries and semantic field groups for custom metric expressions', () => {
    const atomicSource = readSource('./knowledgeOperateDrawer.AtomicTechnicalStep.tsx')
    const customDerivativeSource = readSource('./knowledgeOperateDrawer.DerivativeCustomTechnicalSection.tsx')
    const drawerSource = readSource('./KnowledgeOperateDrawer.tsx')
    const extendedSource = readSource('./knowledgeOperateDrawer.ExtendedTemplateParams.tsx')
    const functionSource = readSource('./knowledgeOperateDrawer.FunctionExpressionField.tsx')

    expect(atomicSource).toContain('dictionaryKind="atomic"')
    expect(extendedSource).toContain('<KnowledgeOperateDerivativeCustomTechnicalSection')
    expect(customDerivativeSource).toContain('createRuleFieldOptions(allFields)')
    expect(customDerivativeSource).toContain('buildRuleFieldTree(')
    expect(customDerivativeSource).toContain('treeCheckable')
    expect(customDerivativeSource).toContain('name="customSourceFieldIds"')
    expect(customDerivativeSource).toContain('completionFields={selectedFields}')
    expect(customDerivativeSource).toContain('placeholder="请选择来源字段"')
    expect(customDerivativeSource).toContain('fieldName="expr"')
    expect(customDerivativeSource).toContain('dictionaryKind="composite"')
    expect(functionSource).toContain('useOntologyFunctionDictionary(dictionaryKind)')
    expect(drawerSource).toContain("templateFields.push('semanticSchemaId', 'expr')")
    expect(drawerSource).toContain('getCustomExpressionSourceFields(values.expr, allFields)')
    expect(drawerSource).toContain('selectedTechObject = derivativeCustomSourceFields')
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

  it('uses compound wording and the composite enum for every composite metric label', () => {
    const constantsSource = readSource('../constants/metricModeling.constants.ts')
    const drawerSource = readSource('./KnowledgeOperateDrawer.tsx')
    const payloadSource = readSource('../utils/knowledgeSubmitPayload.ts')
    const technicalSource = readSource('./knowledgeOperateDrawer.TechnicalStep.tsx')
    const runtimeSources = [
      constantsSource,
      readSource('../MetricModeling.tsx'),
      readSource('./knowledgeOperateDrawer.ExpressionEditor.tsx'),
      readSource('./knowledgeOperateDrawer.ExtendedTemplateParams.tsx'),
      technicalSource
    ]

    expect(runtimeSources.join('\n')).not.toContain('衍生')
    expect(constantsSource).toContain("{ label: '复合指标', value: 'composite' }")
    expect(constantsSource).toContain("composite: '复合指标'")
    expect(constantsSource).not.toContain("value: 'derivative'")
    expect(drawerSource).toContain("type IndicatorType = 'atomic' | 'composite' | 'derived'")
    expect(technicalSource).toContain("indicatorClass === 'composite'")
    expect(payloadSource).toContain("indicatorClass === 'composite'")
  })

  it('locks immutable metric fields only while editing', () => {
    const atomicSource = readSource('./knowledgeOperateDrawer.AtomicTechnicalStep.tsx')
    const businessSource = readSource('./knowledgeOperateDrawer.BusinessStep.tsx')
    const customSource = readSource('./knowledgeOperateDrawer.DerivativeCustomTechnicalSection.tsx')
    const drawerSource = readSource('./KnowledgeOperateDrawer.tsx')
    const extendedSource = readSource('./knowledgeOperateDrawer.ExtendedTemplateParams.tsx')
    const technicalSource = readSource('./knowledgeOperateDrawer.TechnicalStep.tsx')

    expect(drawerSource).toContain('indicatorTypeDisabled={isEditing}')
    expect(drawerSource).toContain('editing={isEditing}')
    expect(getFormItemSource(businessSource, 'indicatorClass')).toContain('disabled={indicatorTypeDisabled}')

    expect(atomicSource).toContain('!editing ? <OntologyFormSectionTitle')
    expect(getFormItemSource(atomicSource, 'techName')).toContain('disabled={editing}')
    expect(atomicSource).toMatch(/<TableSemantics[\s\S]*?isEdit=\{editing\}[\s\S]*?label="数据语义"/)
    expect(getFormItemSource(atomicSource, 'atomicSourceFieldId')).toContain('disabled={editing}')

    expect(getFormItemSource(technicalSource, 'indicatorCode')).toContain('disabled={editing}')
    expect(getFormItemSource(technicalSource, 'techId')).toContain('disabled={editing}')
    expect(getFormItemSource(technicalSource, 'techName')).toContain('disabled={editing}')
    expect(getFormItemSource(technicalSource, 'templateType')).toContain('label="指标模版"')
    expect(getFormItemSource(technicalSource, 'templateType')).toContain('disabled={editing}')

    for (const field of [
      'ratioNumeratorId',
      'ratioDenominatorId',
      'cumulativeMetricId',
      'compareMetricId',
      'compareType',
      'comparisonOutputType',
      'volatilityMetricId',
      'volatilityMethod',
      'volatilityDataRange'
    ]) {
      expect(getFormItemSource(extendedSource, field)).toContain('disabled={editing}')
    }
    for (const field of ['ratioPrecision', 'cumulativeTimeRange', 'comparePeriod', 'rollingWindowSize']) {
      expect(getFormItemSource(extendedSource, field)).not.toContain('disabled={editing}')
    }
    expect(extendedSource).toContain('editing={editing}')
    expect(customSource).toMatch(/<TableSemantics[\s\S]*?isEdit=\{editing\}[\s\S]*?label="数据语义"/)
    expect(customSource).toMatch(/<ATreeSelect[\s\S]*?disabled=\{editing\}/)
  })
})
