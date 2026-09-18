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
    const aggregationField = source.match(/<AForm\.Item[\s\S]*?label="派生聚合方式"[\s\S]*?<\/AForm\.Item>/)?.[0]
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
})
