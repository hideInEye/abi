import React from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { KNOWLEDGE_DATA_TYPE_OPTIONS } from '../constants/metricModeling.constants'

import { KnowledgeAtomicMappingDrawer } from './KnowledgeAtomicMappingDrawer'

const { form, messages } = vi.hoisted(() => ({
  form: { scrollToField: vi.fn(), validateFields: vi.fn() },
  messages: { error: vi.fn(), warning: vi.fn() }
}))

vi.mock('antd', () => ({ message: messages }))
vi.mock('@/components/stateless/common/CommonDrawer', () => ({
  default: ({ children, footer }: { children: ReactNode; footer: ReactNode }) => (
    <>
      {children}
      {footer}
    </>
  )
}))
vi.mock('@/components/tableSemantics', () => ({ TableSemantics: () => null }))
vi.mock('@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle', () => ({
  OntologyFormSectionTitle: ({ children }: { readonly children: ReactNode }) => <div>{children}</div>
}))
vi.mock('@/pages/workbench/ontology-kg/utils/form-scroll', () => import('../../../../utils/form-scroll'))
vi.mock('@/service/request/flat-result', () => import('../../../../../../../service/request/flat-result'))
vi.mock('@/service/api/data-table-meaning', () => ({ queryTableSemanticsDetail: vi.fn() }))
vi.mock('@/service/api/knowledge-extraction', () => ({ queryKnowledgeIndicators: vi.fn() }))
vi.mock('@/service/api/ontology-name', () => ({ checkOntologyName: vi.fn() }))
vi.mock('../utils/space', () => ({ getKnowledgeSpaceId: () => 82 }))
vi.mock('../hooks/useOntologyFunctionDictionary', () => ({
  useOntologyAtomicAggregationDictionary: () => ({ loading: false, options: [{ label: '求和', value: 'SUM' }] })
}))

interface ItemProps {
  children: ReactNode
  name: string[]
  rules: unknown[]
}

const fieldRows = ['field-1', 'field-2', 'field-3'].map(key => ({
  aggregationMethods: ['SUM'],
  alias: '支付金额',
  bizName: '支付金额',
  description: '',
  englishName: key,
  fieldType: 'decimal',
  key,
  raw: { techId: key },
  tableBizName: '订单表',
  tableTechName: 'orders'
}))

const values = {
  metricFields: {
    'field-1': { dataType: 'amount', indicatorName: '订单实付金额' },
    'field-2': { dataType: undefined, indicatorName: '' },
    'field-3': { dataType: undefined, indicatorName: '' }
  },
  semanticSchemaId: 'schema-1',
  semanticsGroupId: 'semantic-group-1'
}

function renderDrawer(selectedKeys = ['field-1', 'field-3'], submitSuccess = true) {
  const stateValues: unknown[] = [fieldRows, selectedKeys, ['field-3'], false, false, false]
  const fields: ItemProps[] = []
  const selectOptions: unknown[] = []
  let save!: () => Promise<void>
  vi.stubGlobal('useState', () => [stateValues.shift(), vi.fn()])
  vi.stubGlobal('useEffect', vi.fn())
  vi.stubGlobal('useMemo', (factory: () => unknown) => factory())
  vi.stubGlobal('useCallback', (callback: unknown) => callback)
  vi.stubGlobal(
    'AForm',
    Object.assign(({ children }: { children: ReactNode }) => <div>{children}</div>, {
      Item: (props: ItemProps) => {
        fields.push(props)
        return props.children
      },
      useForm: () => [form]
    })
  )
  vi.stubGlobal('AInput', () => <input />)
  vi.stubGlobal('ASelect', ({ options }: { options: unknown }) => {
    selectOptions.push(options)
    return <select />
  })
  vi.stubGlobal('ASpace', ({ children }: { children: ReactNode }) => <div>{children}</div>)
  vi.stubGlobal('AButton', ({ children, onClick }: { children: ReactNode; onClick: () => Promise<void> }) => {
    if (children === '保存绑定并映射') save = onClick
    return <button>{children}</button>
  })
  vi.stubGlobal(
    'ATable',
    ({
      columns,
      dataSource
    }: {
      columns: Array<{ key: string; render?: (value: unknown, row: (typeof fieldRows)[number]) => ReactNode }>
      dataSource: typeof fieldRows
    }) => (
      <>
        {dataSource.map(row => (
          <div key={row.key}>
            {columns.map(column => (
              <div key={column.key}>{column.render?.(row[column.key as keyof typeof row], row)}</div>
            ))}
          </div>
        ))}
      </>
    )
  )

  const onSubmit = vi.fn().mockResolvedValue(submitSuccess)
  const onClose = vi.fn()
  renderToStaticMarkup(
    <KnowledgeAtomicMappingDrawer
      open
      groupId="group-1"
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
  return { fields, onClose, onSubmit, save, selectOptions }
}

beforeEach(() => {
  vi.clearAllMocks()
  form.validateFields.mockResolvedValue(values)
})

afterEach(() => vi.unstubAllGlobals())

describe('atomic mapping form', () => {
  it('renders metric name validation and the same required data type options as the edit form', () => {
    const { fields, selectOptions } = renderDrawer()
    expect(fields.map(field => field.name)).toEqual([
      ['metricFields', 'field-1', 'indicatorName'],
      ['metricFields', 'field-1', 'dataType'],
      ['metricFields', 'field-2', 'indicatorName'],
      ['metricFields', 'field-2', 'dataType']
    ])
    expect(fields[0].rules).toEqual([{ validator: expect.any(Function) }])
    expect(fields[1].rules).toEqual([{ message: '请选择数据类型', required: true }])
    expect(selectOptions).toContain(KNOWLEDGE_DATA_TYPE_OPTIONS)
  })

  it.each([true, false])('only validates/submits selected unmapped fields and closes on success=%s', async success => {
    const { onClose, onSubmit, save } = renderDrawer(undefined, success)
    await save()
    expect(form.validateFields).toHaveBeenCalledWith([
      'semanticSchemaId',
      'semanticsGroupId',
      'semanticGroupId',
      ['metricFields', 'field-1', 'indicatorName'],
      ['metricFields', 'field-1', 'dataType']
    ])
    expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ bizName: '订单实付金额', dataType: 'amount' })])
    expect(onClose).toHaveBeenCalledTimes(success ? 1 : 0)
  })

  it('waits for validation and never submits or closes when validation fails', async () => {
    let rejectValidation!: (reason: Error) => void
    form.validateFields.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectValidation = reject
      })
    )
    const { onClose, onSubmit, save } = renderDrawer()
    const pending = save()
    expect(onSubmit).not.toHaveBeenCalled()
    rejectValidation(new Error('指标名称已存在'))
    await pending
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('rejects duplicate names within the batch before submitting', async () => {
    form.validateFields.mockResolvedValueOnce({
      ...values,
      metricFields: { 'field-1': values.metricFields['field-1'], 'field-2': values.metricFields['field-1'] }
    })
    const { onSubmit, save } = renderDrawer(['field-1', 'field-2'])
    await save()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(messages.warning).toHaveBeenCalledWith('指标名称“订单实付金额”重复，请修改后再提交')
  })
})
