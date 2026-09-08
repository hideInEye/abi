import { readFileSync } from 'node:fs'

import type React from 'react'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { KnowledgeIndicatorSearchSelect } from './knowledgeOperateDrawer.IndicatorSearchSelect'

vi.stubGlobal('ASelect', 'a-select')

afterAll(() => vi.unstubAllGlobals())

describe('KnowledgeIndicatorSearchSelect', () => {
  it('uses remote fuzzy search instead of local option filtering', () => {
    const onSearch = vi.fn()
    const element = KnowledgeIndicatorSearchSelect({
      loading: true,
      onSearch,
      options: [{ label: '支付金额', value: '1' }],
      placeholder: '请选择指标'
    }) as React.ReactElement

    expect(element.props.showSearch).toBe(true)
    expect(element.props.filterOption).toBe(false)
    expect(element.props.loading).toBe(true)
    expect(element.props.onSearch).toBe(onSearch)
  })

  it('is used by the derived selector and every indicator-backed derivative template selector', () => {
    const technicalStepSource = readFileSync(
      new URL('./knowledgeOperateDrawer.TechnicalStep.tsx', import.meta.url),
      'utf8'
    )
    const templateSource = readFileSync(
      new URL('./knowledgeOperateDrawer.ExtendedTemplateParams.tsx', import.meta.url),
      'utf8'
    )
    const templateFields = [
      'ratioNumeratorId',
      'ratioDenominatorId',
      'cumulativeMetricId',
      'compareMetricId',
      'volatilityMetricId'
    ]

    expect(technicalStepSource).toMatch(/name="techId"[\s\S]*?<KnowledgeIndicatorSearchSelect/)
    expect(templateSource.match(/<KnowledgeIndicatorSearchSelect/g)).toHaveLength(5)
    templateFields.forEach(field => {
      expect(templateSource).toMatch(new RegExp(`name="${field}"[\\s\\S]*?<KnowledgeIndicatorSearchSelect`))
    })
  })

  it('reloads the default list whenever a metric dropdown opens', () => {
    const onSearch = vi.fn()
    const element = KnowledgeIndicatorSearchSelect({ onSearch, options: [] }) as React.ReactElement

    element.props.onDropdownVisibleChange(false)
    expect(onSearch).not.toHaveBeenCalled()

    element.props.onDropdownVisibleChange(true)
    expect(onSearch).toHaveBeenCalledWith('')
  })
})
