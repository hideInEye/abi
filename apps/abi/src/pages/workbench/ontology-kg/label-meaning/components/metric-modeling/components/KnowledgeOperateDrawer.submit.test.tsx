import React from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { addKnowledgeIndicator, editKnowledgeIndicator, queryKnowledgeIndicators } from '@/service/api/knowledge-extraction'

import { useKnowledgeExtraction } from '../hooks/useKnowledgeExtraction'
import type { KnowledgeFormValues, KnowledgeIndicatorItem, KnowledgeTechField } from '../types/metricModeling.types'

import { KnowledgeOperateDrawer } from './KnowledgeOperateDrawer'

const { messages } = vi.hoisted(() => ({ messages: { error: vi.fn(), success: vi.fn() } }))
vi.mock('antd', () => ({ message: messages, Modal: { confirm: vi.fn() } }))
vi.mock('ahooks', () => ({ useDebounceFn: () => ({ cancel: vi.fn(), run: vi.fn() }) }))
vi.mock('@/components/stateless/common/CommonDrawer', () => ({
  default: ({ children, footer }: { children: ReactNode; footer: ReactNode }) => (
    <>
      {children}
      {footer}
    </>
  ),
}))
vi.mock('@/service/api/knowledge-extraction', () => ({
  addKnowledgeIndicator: vi.fn(),
  deleteKnowledgeIndicator: vi.fn(),
  deleteKnowledgeIndicatorBatch: vi.fn(),
  editKnowledgeIndicator: vi.fn(),
  queryKnowledgeIndicatorDetail: vi.fn(),
  queryKnowledgeIndicators: vi.fn(),
  syncAtomicIndicators: vi.fn(),
}))
vi.mock('@/service/api/data-table-meaning', () => ({ queryTableSemanticsDetail: vi.fn() }))
vi.mock('../utils/space', () => ({ getKnowledgeSpaceId: () => 82 }))
vi.mock('../utils/knowledgeOperateDrawer.validators', () => ({ createKnowledgeOperateValidators: () => ({}) }))
vi.mock('./knowledgeOperateDrawer.BusinessStep', () => ({ KnowledgeOperateBusinessStep: () => null }))
vi.mock('./knowledgeOperateDrawer.TechnicalStep', () => ({ KnowledgeOperateTechnicalStep: () => null }))
vi.mock('./knowledgeOperateDrawer.DimensionStep', () => ({ KnowledgeOperateDimensionStep: () => null }))
vi.mock('./knowledgeOperateDrawer.SimpleAtomicTechnicalSection', () => ({ KnowledgeOperateSimpleAtomicTechnicalSection: () => null }))
vi.mock('@/pages/workbench/ontology-kg/label-meaning/components/rule-expression', async () => ({
  ...(await import('@/pages/workbench/ontology-kg/label-meaning/components/rule-expression/utils')),
  ...(await import('@/pages/workbench/ontology-kg/label-meaning/components/rule-expression/apiTemplateAdapter')),
}))

const sourceField: KnowledgeTechField = {
  bizName: '支付金额',
  fieldName: 'payment_amount',
  tableName: 'orders',
  techId: 'field-1',
}
const indicators: KnowledgeIndicatorItem[] = [
  { indId: 101, indicatorClass: 'atomic', relSchemaId: '9007199254740993123', techId: [sourceField] },
  { indId: 102, indicatorClass: 'atomic', relSchemaId: 202, techId: [{ techId: 'field-2' }] },
  { indId: 103, indicatorClass: 'derived', relSchemaId: 303 },
  { indId: 104, indicatorClass: 'atomic', relSchemaId: '9007199254740993123' },
]

function renderSave(fields: KnowledgeFormValues, options = indicators, editingItem: KnowledgeIndicatorItem | null = null) {
  const values: KnowledgeFormValues = {
    bizName: '测试指标',
    dataType: 'num',
    indicatorCode: 'derived_metric',
    techName: 'composite_metric',
    ...fields,
  }
  const form = {
    getFieldsValue: () => values,
    getFieldValue: (name: keyof KnowledgeFormValues) => values[name],
    validateFields: vi.fn().mockResolvedValue(values),
  }
  // 实际调用抽屉保存和请求适配器，仅隔离与参数组装无关的渲染、加载 effect。
  const { handleSubmit } = useKnowledgeExtraction({ groupId: 'group-1', groupName: '测试分组' })
  const onClose = vi.fn()
  const state = [fields.indicatorClass === 'atomic' ? 1 : 2, fields.indicatorClass, [sourceField], false, false, options, [], false, false]
  vi.stubGlobal('useState', () => [state.shift(), vi.fn()])
  vi.stubGlobal(
    'AForm',
    Object.assign(({ children }: { children: ReactNode }) => <>{children}</>, {
      useForm: () => [form],
      useWatch: (name: keyof KnowledgeFormValues) => values[name],
    }),
  )
  vi.stubGlobal('ASteps', () => null)
  vi.stubGlobal('ASpace', ({ children }: { children: ReactNode }) => <>{children}</>)
  let save!: () => Promise<void>
  vi.stubGlobal('AButton', ({ children, onClick }: { children: ReactNode; onClick: () => Promise<void> }) => {
    if (children === '确认') save = onClick
    return <button>{children}</button>
  })
  renderToStaticMarkup(<KnowledgeOperateDrawer open editingItem={editingItem} groupId="group-1" onClose={onClose} onSubmit={handleSubmit} />)
  return { onClose, save, values }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('useState', (value: unknown) => [value, vi.fn()])
  vi.stubGlobal('useEffect', vi.fn())
  vi.stubGlobal('useMemo', (factory: () => unknown) => factory())
  vi.stubGlobal('useCallback', (callback: unknown) => callback)
  vi.stubGlobal('useRef', (value: unknown) => ({ current: value }))
  vi.mocked(addKnowledgeIndicator).mockResolvedValue({ error: null } as never)
  vi.mocked(editKnowledgeIndicator).mockResolvedValue({ error: null } as never)
  vi.mocked(queryKnowledgeIndicators).mockResolvedValue({ data: { list: [], total: 0 }, error: null } as never)
})

afterEach(() => vi.unstubAllGlobals())

describe('indicator source schema submission', () => {
  it.each([
    { indicatorClass: 'derived', techId: '101' },
    { indicatorClass: 'composite', templateType: 'ratio', ratioNumeratorId: '101', ratioDenominatorId: '104' },
    { indicatorClass: 'composite', templateType: 'cumulative', cumulativeMetricId: 101 },
    { indicatorClass: 'composite', templateType: 'comparison', compareMetricId: '101' },
    { indicatorClass: 'composite', templateType: 'volatility', volatilityMetricId: '101' },
    { indicatorClass: 'composite', templateType: 'percentile', techId: '101' },
  ] satisfies KnowledgeFormValues[])('puts the selected schema at request root: %j', async (fields) => {
    const { save, onClose } = renderSave(fields)
    await save()
    const request = vi.mocked(addKnowledgeIndicator).mock.calls[0][0]
    expect(request).toMatchObject({ groupId: 'group-1', indicatorClass: fields.indicatorClass, relSchemaId: '9007199254740993123', spaceId: 82 })
    expect(request).not.toHaveProperty('semanticSchemaId')
    expect(request.calcLogic).not.toHaveProperty('relSchemaId')
    if (fields.indicatorClass === 'derived') expect(request.techId).toEqual([sourceField])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses the latest selection and ignores stale semantic fields', async () => {
    const { save, values } = renderSave({ indicatorClass: 'derived', techId: '101', relSchemaId: 'stale', semanticSchemaId: 'stale' })
    values.techId = '102'
    await save()
    expect(vi.mocked(addKnowledgeIndicator).mock.calls[0][0].relSchemaId).toBe(202)
  })

  it('only reads the active composite template and supports selected derived indicators', async () => {
    const { save } = renderSave({ indicatorClass: 'composite', templateType: 'comparison', compareMetricId: 103, cumulativeMetricId: 101, techId: '102' })
    await save()
    expect(vi.mocked(addKnowledgeIndicator).mock.calls[0][0].relSchemaId).toBe(303)
  })

  it.each(['semanticSchemaId', 'schemaId'])('supports source metadata alias %s', async (key) => {
    const { save } = renderSave({ indicatorClass: 'derived', techId: '101' }, [{ indId: 101, indicatorClass: 'atomic', [key]: 404 }])
    await save()
    expect(vi.mocked(addKnowledgeIndicator).mock.calls[0][0].relSchemaId).toBe(404)
  })

  it.each(['atomic', 'composite'])('keeps explicitly selected data semantics for %s custom creation', async (indicatorClass) => {
    const { save } = renderSave({ indicatorClass, templateType: 'custom', semanticSchemaId: 'custom-schema', atomicSourceFieldId: 'field-1', expr: 'SUM(payment_amount)', techId: '101' })
    await save()
    expect(vi.mocked(addKnowledgeIndicator).mock.calls[0][0].relSchemaId).toBe('custom-schema')
  })

  it('does not substitute stale semantics or metric ids when source metadata is absent', async () => {
    const { save } = renderSave({ indicatorClass: 'derived', techId: 'missing', relSchemaId: 'stale', semanticSchemaId: 'stale' }, [])
    await save()
    expect(vi.mocked(addKnowledgeIndicator).mock.calls[0][0]).not.toHaveProperty('relSchemaId')
  })

  it('preserves detail schema when editing before selected source options are restored', async () => {
    const { save } = renderSave({ indicatorClass: 'derived', techId: '101' }, [], { indId: 555, indicatorClass: 'derived', relSchemaId: 'stored-schema' })
    await save()
    expect(vi.mocked(editKnowledgeIndicator).mock.calls[0][0].relSchemaId).toBe('stored-schema')
  })

  it('still waits for the response and keeps the drawer open on failure', async () => {
    let respond!: (value: never) => void
    vi.mocked(addKnowledgeIndicator).mockReturnValueOnce(
      new Promise((resolve) => {
        respond = resolve
      }),
    )
    const { save, onClose } = renderSave({ indicatorClass: 'derived', techId: '101' })
    const pending = save()
    await vi.waitFor(() => expect(addKnowledgeIndicator).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
    expect(queryKnowledgeIndicators).not.toHaveBeenCalled()
    respond({ error: new Error('保存失败') } as never)
    await pending
    expect(onClose).not.toHaveBeenCalled()
    expect(queryKnowledgeIndicators).not.toHaveBeenCalled()
    expect(messages.success).not.toHaveBeenCalled()
  })
})
