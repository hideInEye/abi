import React from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RelationDrawer } from './RelationDrawer'

interface ItemProps {
  children: ReactNode
  dependencies?: string[]
  name: string
  rules?: Array<{ message?: string; required?: boolean; validator?: () => Promise<void> }>
}

const { fields, form } = vi.hoisted(() => ({
  fields: {} as Record<string, ItemProps>,
  form: { getFieldValue: vi.fn() },
}))

vi.mock('antd', () => ({
  Form: Object.assign(({ children }: { children: ReactNode }) => <div>{children}</div>, {
    Item: (props: ItemProps) => {
      fields[props.name] = props
      return props.children
    },
    useForm: () => [form],
  }),
  Input: Object.assign(() => <input />, { TextArea: () => <textarea /> }),
  Select: () => <select />,
  Switch: () => <input type="checkbox" />,
}))
vi.mock('@ant-design/icons', () => ({ BranchesOutlined: () => null }))
vi.mock('@/components/stateless/common/CommonDrawer', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle', () => ({
  OntologyFormSectionTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/pages/workbench/ontology-kg/utils/form-scroll', () => ({ scrollToFirstFormError: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(fields).forEach(name => delete fields[name])
  vi.stubGlobal('AButton', () => null)
  renderToStaticMarkup(
    <RelationDrawer entities={[]} loading={false} open relation={null} onClose={vi.fn()} onSave={vi.fn()} />,
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('RelationDrawer node validation', () => {
  it('renders the relation name before the start and end nodes', () => {
    expect(Object.keys(fields)).toEqual(['relation', 'startEntityId', 'endEntityId', 'inverseFlag', 'remark'])
  })

  it.each([
    ['startEntityId', 'endEntityId', '请选择开始节点'],
    ['endEntityId', 'startEntityId', '请选择结束节点'],
  ])('%s revalidates when %s changes and keeps its required rule', (name, dependency, message) => {
    expect(fields[name].dependencies).toEqual([dependency])
    expect(fields[name].rules).toContainEqual({ message, required: true })
  })

  it.each(['startEntityId', 'endEntityId'])('%s uses current node values after the other node changes', async name => {
    const otherName = name === 'startEntityId' ? 'endEntityId' : 'startEntityId'
    const values: Record<string, string | number> = { startEntityId: '123', endEntityId: 123 }
    form.getFieldValue.mockImplementation(field => values[field])
    const validate = fields[name].rules!.find(rule => rule.validator)!.validator!

    await expect(validate()).rejects.toThrow('开始节点和结束节点不能相同')
    values[otherName] = '9007199254740993'
    await expect(validate()).resolves.toBeUndefined()
    values[otherName] = '123'
    await expect(validate()).rejects.toThrow('开始节点和结束节点不能相同')
  })

  it.each(['startEntityId', 'endEntityId'])('%s does not report a same-node error after the other node is cleared', async name => {
    form.getFieldValue.mockImplementation(field => field === name ? '123' : undefined)
    const validate = fields[name].rules!.find(rule => rule.validator)!.validator!

    await expect(validate()).resolves.toBeUndefined()
  })
})
