import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TableSemantics } from '@/components/tableSemantics'
import { queryTableSemanticsDetail } from '@/service/api/data-table-meaning'
import { queryKnowledgeIndicators } from '@/service/api/knowledge-extraction'
import { checkOntologyName } from '@/service/api/ontology-name'

import { KNOWLEDGE_DATA_TYPE_OPTIONS } from '../constants/metricModeling.constants'

import { KnowledgeAtomicMappingDrawer } from './KnowledgeAtomicMappingDrawer'

const { form, messages } = vi.hoisted(() => ({
  form: { scrollToField: vi.fn(), setFieldValue: vi.fn(), setFieldsValue: vi.fn(), validateFields: vi.fn() },
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
vi.mock('@/components/tableSemantics', () => ({ TableSemantics: vi.fn(() => null) }))
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
  rules: Array<{ message?: string; required?: boolean; validator?: (rule: unknown, value?: string) => Promise<void> }>
}

const fieldRows = ['field-1', 'field-2', 'field-3'].map(key => ({
  aggregationMethods: ['SUM'],
  alias: '支付金额',
  bizName: '支付金额',
  fieldDesc: '当前字段描述',
  englishName: key,
  fieldType: 'decimal',
  key,
  raw: { techId: key },
  tableBizName: '订单表',
  tableTechName: 'orders'
}))

const values = {
  metricFields: {
    'field-1': { bizName: '实付金额', dataType: 'amount' },
    'field-2': { bizName: '', dataType: undefined },
    'field-3': { bizName: '', dataType: undefined }
  },
  semanticSchemaId: 'schema-1',
  semanticsGroupId: 'semantic-group-1'
}

interface MappingColumn {
  dataIndex?: string
  key: string
  render?: (value: unknown, row: (typeof fieldRows)[number]) => ReactNode
}

function renderDrawer(selectedKeys = ['field-1', 'field-3'], submitSuccess = true, rows = fieldRows) {
  const stateValues: unknown[] = [rows, selectedKeys, ['field-3'], false, false, false]
  const fields: ItemProps[] = []
  const selectOptions: unknown[] = []
  const setFieldRows = vi.fn()
  let tableColumns: MappingColumn[] = []
  let save!: () => Promise<void>
  vi.stubGlobal('useState', () => {
    const setter = stateValues.length === 6 ? setFieldRows : vi.fn()
    return [stateValues.shift(), setter]
  })
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
      columns: MappingColumn[]
      dataSource: typeof fieldRows
    }) => {
      tableColumns = columns
      return (
        <>
          {dataSource.map(row => (
            <div key={row.key}>
              {columns.map(column => (
                <div key={column.key}>
                  {column.render?.(row[(column.dataIndex || column.key) as keyof typeof row], row)}
                </div>
              ))}
            </div>
          ))}
        </>
      )
    }
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
  return { fields, onClose, onSubmit, save, selectOptions, setFieldRows, tableColumns }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkOntologyName).mockReset()
  vi.mocked(checkOntologyName).mockResolvedValue({ data: false, error: null } as never)
  form.validateFields.mockResolvedValue(values)
})

afterEach(() => vi.unstubAllGlobals())

describe('atomic mapping form', () => {
  it.each([false, true])('loads fieldDesc for display from semantic fields (JSON=%s)', async asJson => {
    const modelDetail = {
      measures: [
        { techId: 'field-1', fieldDesc: '接口字段描述', description: '旧描述' },
        { techId: 'field-2', fieldDesc: '', description: '旧描述' },
        { techId: 'field-3', description: '旧描述' }
      ]
    }
    vi.mocked(queryTableSemanticsDetail).mockResolvedValueOnce({
      data: { modelDetail: asJson ? JSON.stringify(modelDetail) : modelDetail },
      error: null
    } as never)
    vi.mocked(queryKnowledgeIndicators).mockResolvedValueOnce({ data: { list: [] }, error: null } as never)
    const { setFieldRows, tableColumns } = renderDrawer()
    await vi.mocked(TableSemantics).mock.calls[0][0].getSchemaId!({
      semanticGroupId: 'semantic-group-1',
      semanticSchemaId: 'schema-1',
      semanticsGroupId: 'semantic-group-1',
      viewId: 'view-1'
    })
    const loadedRows = setFieldRows.mock.calls[0][0] as typeof fieldRows
    expect(loadedRows.map(row => row.fieldDesc)).toEqual(['接口字段描述', '', ''])
    const column = tableColumns.find(item => item.key === 'fieldDesc')!
    expect(column.dataIndex).toBe('fieldDesc')
    const input = column.render!(loadedRows[0].fieldDesc, loadedRows[0]) as ReactElement<{ value: string }>
    expect(input.props.value).toBe('接口字段描述')
  })

  it.each(['更新后的描述', ''])('keeps the displayed, edited and submitted fieldDesc consistent: %j', async fieldDesc => {
    const { setFieldRows, tableColumns } = renderDrawer()
    const column = tableColumns.find(item => item.key === 'fieldDesc')!
    const input = column.render!(fieldRows[0].fieldDesc, fieldRows[0]) as ReactElement<{
      onChange: (event: { target: { value: string } }) => void
      value: string
    }>
    expect(input.props.value).toBe('当前字段描述')
    input.props.onChange({ target: { value: fieldDesc } })
    const updatedRows = setFieldRows.mock.calls[0][0](fieldRows) as typeof fieldRows
    expect(updatedRows[1]).toBe(fieldRows[1])
    expect(fieldRows[0].fieldDesc).toBe('当前字段描述')
    const { onSubmit, save } = renderDrawer(['field-1'], true, updatedRows)
    await save()
    expect(onSubmit.mock.calls[0][0][0].techId[0].fieldDesc).toBe(fieldDesc)
    expect(onSubmit.mock.calls[0][0][0].techId[0]).not.toHaveProperty('description')
  })

  it('validates Chinese names and data types without restoring a separate indicator name field', () => {
    const { fields, selectOptions } = renderDrawer()
    expect(fields.map(field => field.name)).toEqual([
      ['metricFields', 'field-1', 'bizName'],
      ['metricFields', 'field-1', 'dataType'],
      ['metricFields', 'field-2', 'bizName'],
      ['metricFields', 'field-2', 'dataType'],
      ['metricFields', 'field-3', 'bizName']
    ])
    expect(fields[0].rules).toEqual([{ validator: expect.any(Function) }])
    expect(fields[1].rules).toEqual([{ message: '请选择数据类型', required: true }])
    expect(fields[4].rules).toEqual([])
    expect(selectOptions).toContain(KNOWLEDGE_DATA_TYPE_OPTIONS)
  })

  it.each(['', '12345', '指标-金额', 'a'.repeat(51), '订单_#_金额'])(
    'applies indicator creation validation to Chinese name %s',
    async value => {
      const { fields } = renderDrawer()
      await expect(fields[0].rules[0].validator!(undefined, value)).rejects.toThrow()
      expect(checkOntologyName).not.toHaveBeenCalled()
    }
  )

  it('checks uniqueness using the same mapped Chinese name as the payload', async () => {
    const { fields } = renderDrawer()
    await expect(fields[0].rules[0].validator!(undefined, '实付金额')).resolves.toBeUndefined()
    expect(checkOntologyName).toHaveBeenCalledWith({
      groupId: 'group-1',
      name: '订单表_#_实付金额',
      nameType: 'bizName',
      objectType: 'indicator',
      spaceId: 82
    })
    vi.mocked(checkOntologyName).mockResolvedValueOnce({ data: true, error: null } as never)
    await expect(fields[0].rules[0].validator!(undefined, '实付金额')).rejects.toThrow('指标名称已存在')
    vi.mocked(checkOntologyName).mockResolvedValueOnce({ data: false, error: new Error('校验失败') } as never)
    await expect(fields[0].rules[0].validator!(undefined, '实付金额')).rejects.toThrow('校验失败')
  })

  it.each([true, false])('only validates/submits selected unmapped fields and closes on success=%s', async success => {
    const { onClose, onSubmit, save } = renderDrawer(undefined, success)
    await save()
    expect(form.validateFields).toHaveBeenCalledWith([
      'semanticSchemaId',
      'semanticsGroupId',
      'semanticGroupId',
      ['metricFields', 'field-1', 'bizName'],
      ['metricFields', 'field-1', 'dataType']
    ])
    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ techId: [expect.objectContaining({ bizName: '订单表_#_实付金额', dataType: 'amount' })] })
    ])
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

  it('submits fields with identical source names without checking a separate indicator name', async () => {
    form.validateFields.mockResolvedValueOnce({
      ...values,
      metricFields: { 'field-1': values.metricFields['field-1'], 'field-2': values.metricFields['field-1'] }
    })
    const { onSubmit, save } = renderDrawer(['field-1', 'field-2'])
    await save()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toHaveLength(2)
    expect(messages.warning).not.toHaveBeenCalled()
  })
})
