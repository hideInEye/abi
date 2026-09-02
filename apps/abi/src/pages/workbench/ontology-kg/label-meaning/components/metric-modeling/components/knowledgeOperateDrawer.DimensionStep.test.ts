import { Button, Checkbox, Form, Input } from 'antd'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { KnowledgeOperateDimensionStep } from './knowledgeOperateDrawer.DimensionStep'
import { getDimensionTreeSelectionChange, getSelectableDimensionLeafKeys } from './knowledgeOperateDrawer.DimensionStep.utils'
import type { DimensionSelectionTreeNode } from './knowledgeOperateDrawer.DimensionStep.utils'

vi.mock('../hooks/useKnowledgeDimensions', () => ({
  useKnowledgeDimensions: () => ({
    error: false,
    loading: false,
    options: [
      {
        groupId: 'customer',
        groupName: '客户维度',
        key: 'customer_id',
        name: '客户编号',
        techName: 'customer_id',
        title: '客户编号 customer_id',
      },
    ],
    retry: vi.fn(),
    treeData: [
      {
        children: [{ isLeaf: true, title: '客户编号 customer_id', value: 'customer_id' }],
        selectable: false,
        title: '客户维度',
        value: 'group-customer',
      },
    ],
  }),
}))

vi.stubGlobal('AButton', Button)
vi.stubGlobal('ACheckbox', Checkbox)
vi.stubGlobal('AForm', Form)
vi.stubGlobal('AInput', Input)

afterAll(() => vi.unstubAllGlobals())

const dimensionTree: DimensionSelectionTreeNode[] = [
  {
    children: [
      { key: 'customer_id' },
      { disabled: true, key: 'region_id' },
      {
        children: [{ key: 'city_id' }, { key: 'district_id' }],
        key: 'group-location-detail',
      },
    ],
    key: 'group-customer',
  },
  {
    children: [{ key: 'product_id' }],
    key: 'group-product',
  },
]

describe('KnowledgeOperateDimensionStep selection', () => {
  it('renders the Transfer select-all controls and a checkable parent group', () => {
    const Harness = () => {
      const [form] = Form.useForm()
      return React.createElement(Form, { form }, React.createElement(KnowledgeOperateDimensionStep, { form }))
    }
    const html = renderToStaticMarkup(React.createElement(Harness))

    expect(html.match(/ant-transfer-list-checkbox/g)).toHaveLength(2)
    expect(html.match(/ant-tree-checkbox/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('collects every selectable leaf for one-click select all and excludes transferred dimensions', () => {
    expect(getSelectableDimensionLeafKeys(dimensionTree)).toEqual(['customer_id', 'city_id', 'district_id', 'product_id'])
  })

  it('turns a parent check into a child cascade selection', () => {
    expect(getDimensionTreeSelectionChange(dimensionTree[0], true)).toEqual({
      checked: true,
      keys: ['customer_id', 'city_id', 'district_id'],
    })
  })

  it('turns a parent uncheck into a child cascade cancellation', () => {
    expect(getDimensionTreeSelectionChange(dimensionTree[0], false)).toEqual({
      checked: false,
      keys: ['customer_id', 'city_id', 'district_id'],
    })
  })

  it('keeps a leaf selection scoped to that leaf', () => {
    expect(getDimensionTreeSelectionChange({ key: 'product_id' }, true)).toEqual({
      checked: true,
      keys: ['product_id'],
    })
  })
})
