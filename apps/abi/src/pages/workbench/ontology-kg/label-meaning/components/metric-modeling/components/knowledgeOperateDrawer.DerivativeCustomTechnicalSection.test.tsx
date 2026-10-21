import React from 'react'
import type { ReactNode } from 'react'
import type { FormInstance } from 'antd'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { KnowledgeFormValues } from '../types/metricModeling.types'
import type { ExpressionFieldOption } from '../utils/expressionCompletion'
import { KnowledgeOperateDerivativeCustomTechnicalSection } from './knowledgeOperateDrawer.DerivativeCustomTechnicalSection'

interface TreeProps {
  disabled?: boolean
  dropdownRender: (menu: ReactNode) => ReactNode
  multiple: boolean
  onSelect?: unknown
  treeCheckable: boolean
  treeExpandAction: string
  treeData: Array<{ title: string; checkable: boolean; children: Array<{ value: string; searchText: string; label: string }> }>
  treeNodeFilterProp: string
}

const captured = vi.hoisted(() => ({ fields: [] as ExpressionFieldOption[] }))
vi.mock('@/components/tableSemantics', () => ({ TableSemantics: () => null }))
vi.mock('./knowledgeOperateDrawer.FunctionExpressionField', () => ({
  KnowledgeOperateFunctionExpressionField: ({ completionFields }: { completionFields: ExpressionFieldOption[] }) => {
    captured.fields = completionFields
    return null
  },
}))

const formValues: Record<string, unknown> = {}
let tree: TreeProps
const form = { getFieldValue: (name: string) => formValues[name], setFieldValue: vi.fn() }
const allFields = [
  { techId: 'city', originName: 'city', fieldName: '城市', semanticType: 'categorical', tfieldType: 'dimensions', fieldType: 'varchar' },
  { techId: 'pay', originName: 'payment_amount', fieldName: '支付金额', semanticType: 'measure', tfieldType: 'measures', fieldType: 'decimal' },
  { techId: 'date', originName: 'pay_date', fieldName: '支付日期', semanticType: 'datetime', tfieldType: 'dates', fieldType: 'datetime' },
]

function renderSection(editing = false) {
  return renderToStaticMarkup(
    <KnowledgeOperateDerivativeCustomTechnicalSection
      allFields={allFields}
      editing={editing}
      form={form as unknown as FormInstance<KnowledgeFormValues>}
      onSchemaChange={vi.fn()}
      validateSqlExpression={vi.fn()}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  formValues.customSourceFieldIds = ['city']
  vi.stubGlobal('AForm', {
    Item: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    useWatch: (name: string) => formValues[name],
  })
  vi.stubGlobal('ATreeSelect', (props: TreeProps) => {
    tree = props
    return <div>{props.dropdownRender(<div />)}</div>
  })
  vi.stubGlobal('AButton', ({ children, onClick, disabled }: { children: ReactNode; disabled?: boolean; onClick: () => void }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ))
})
afterEach(() => vi.unstubAllGlobals())

describe('custom composite source field picker', () => {
  it('renders grouped checkbox multi-selection and only offers checked fields for expression completion', () => {
    const html = renderSection()
    expect(tree.multiple).toBe(true)
    expect(tree.treeCheckable).toBe(true)
    expect(tree.treeExpandAction).toBe('click')
    expect(tree.onSelect).toBeUndefined()
    expect(tree.treeData.map((group) => group.title)).toEqual(['维度', '度量', '日期'])
    expect(tree.treeData.every((group) => group.checkable === false)).toBe(true)
    expect(captured.fields).toEqual([{ category: '维度', id: 'city', label: '城市', name: 'city' }])
    expect(html).toContain('已选择 1 个字段')
  })

  it('keeps the selected set when the technical section remounts and updates suggestions after selecting more fields', () => {
    renderSection()
    formValues.customSourceFieldIds = ['city', 'pay']
    renderSection()
    expect(captured.fields.map((field) => field.name)).toEqual(['city', 'payment_amount'])
    renderSection()
    expect(captured.fields.map((field) => field.name)).toEqual(['city', 'payment_amount'])
    expect(form.setFieldValue).not.toHaveBeenCalled()
  })

  it('provides a visible search box and searchable English/Chinese labels without losing checked fields', () => {
    const html = renderSection()
    expect(html).toContain('搜索来源字段')
    expect(tree.treeNodeFilterProp).toBe('searchText')
    const fields = tree.treeData.flatMap((group) => group.children)
    expect(fields.find((field) => field.value === 'pay')).toMatchObject({ label: 'payment_amount', searchText: 'payment_amount 支付金额 度量' })
    expect(formValues.customSourceFieldIds).toEqual(['city'])
  })

  it('keeps source fields locked in edit mode', () => {
    renderSection(true)
    expect(tree.disabled).toBe(true)
  })
})
