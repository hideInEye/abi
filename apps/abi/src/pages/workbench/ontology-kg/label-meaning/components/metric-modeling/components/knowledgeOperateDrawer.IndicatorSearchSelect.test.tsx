import { readFileSync } from 'node:fs'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { KnowledgeIndicatorSearchSelect } from './knowledgeOperateDrawer.IndicatorSearchSelect'

function renderSelect(props: React.ComponentProps<typeof KnowledgeIndicatorSearchSelect>) {
  let selectProps!: React.ComponentProps<typeof KnowledgeIndicatorSearchSelect> & {
    filterOption: boolean
    showSearch: boolean
    onDropdownVisibleChange: (visible: boolean) => void
    onPopupScroll: (event: { currentTarget: { clientHeight: number; scrollHeight: number; scrollTop: number } }) => void
  }
  vi.stubGlobal('ASelect', (receivedProps: typeof selectProps) => {
    selectProps = receivedProps
    return null
  })
  renderToStaticMarkup(<KnowledgeIndicatorSearchSelect {...props} />)
  return { props: selectProps }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('KnowledgeIndicatorSearchSelect', () => {
  it('uses remote fuzzy search instead of local option filtering', () => {
    const onSearch = vi.fn()
    const element = renderSelect({
      loading: true,
      onSearch,
      options: [{ label: '支付金额', value: '1' }],
      placeholder: '请选择指标'
    })

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

  it('requests the shared default list when opened without searching on close', () => {
    const onSearch = vi.fn()
    const element = renderSelect({ onSearch, options: [] })

    element.props.onDropdownVisibleChange(false)
    expect(onSearch).not.toHaveBeenCalled()

    element.props.onDropdownVisibleChange(true)
    expect(onSearch).toHaveBeenCalledWith('')
  })

  it('debounces load-more only when the dropdown reaches the bottom threshold', async () => {
    const onLoadMore = vi.fn()
    const element = renderSelect({
      onLoadMore,
      onSearch: vi.fn(),
      options: [],
    })

    element.props.onPopupScroll({
      currentTarget: { clientHeight: 100, scrollHeight: 300, scrollTop: 150 },
    })
    expect(onLoadMore).not.toHaveBeenCalled()

    element.props.onPopupScroll({
      currentTarget: { clientHeight: 100, scrollHeight: 300, scrollTop: 190 },
    })
    expect(onLoadMore).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('cancels pending load-more when the dropdown closes', async () => {
    const onLoadMore = vi.fn()
    const element = renderSelect({ onLoadMore, onSearch: vi.fn(), options: [] })
    element.props.onPopupScroll({ currentTarget: { clientHeight: 100, scrollHeight: 300, scrollTop: 190 } })
    element.props.onDropdownVisibleChange(false)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('passes load-more handling to every indicator-backed selector', () => {
    const technicalStepSource = readFileSync(
      new URL('./knowledgeOperateDrawer.TechnicalStep.tsx', import.meta.url),
      'utf8'
    )
    const templateSource = readFileSync(
      new URL('./knowledgeOperateDrawer.ExtendedTemplateParams.tsx', import.meta.url),
      'utf8'
    )

    expect(technicalStepSource).toMatch(/name="techId"[\s\S]*?onLoadMore=\{onIndicatorLoadMore\}/)
    expect(templateSource.match(/onLoadMore=\{onIndicatorLoadMore\}/g)).toHaveLength(5)
  })
})
