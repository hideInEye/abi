import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  tree: null as null | Array<{ id: number; children?: Array<{ id: number }> }>,
  checkedKeys: [] as number[],
  values: { menuIds: [2] },
  submit: undefined as undefined | (() => Promise<void>),
  warning: vi.fn(),
}))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useImperativeHandle: (ref: React.MutableRefObject<unknown>, create: () => unknown) => { ref.current = create() },
}))
vi.mock('@sa/hooks', () => ({ useRequest: () => ({ data: state.tree, run: vi.fn() }) }))
vi.mock('@/service/api/role', () => ({ getMenuTreeApi: vi.fn() }))
vi.mock('@/constants/business', () => ({ enableStatusOptions: [] }))
vi.mock('@/components/stateless/common/CommonDrawer', () => ({ default: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => <>{children}{footer}</> }))

beforeEach(() => {
  state.tree = [{ id: 1, children: [{ id: 2 }, { id: 3 }] }]
  state.values = { menuIds: [2] }
  state.submit = undefined
  state.warning.mockClear()
  vi.stubGlobal('memo', React.memo)
  vi.stubGlobal('useRef', React.useRef)
  vi.stubGlobal('useEffect', React.useEffect)
  vi.stubGlobal('useTranslation', () => ({ t: (key: string) => key }))
  vi.stubGlobal('window', { $message: { warning: state.warning } })
  const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>
  vi.stubGlobal('AForm', Object.assign(Pass, {
    Item: ({ children, name }: { children: React.ReactElement; name: string }) => name === 'menuIds' ? React.cloneElement(children, { value: state.values.menuIds } as any) : children,
  }))
  vi.stubGlobal('AInput', Object.assign(() => null, { TextArea: () => null }))
  vi.stubGlobal('AInputNumber', () => null)
  vi.stubGlobal('ARadio', Object.assign(Pass, { Group: Pass }))
  vi.stubGlobal('ATree', (props: { checkedKeys: number[] }) => { state.checkedKeys = props.checkedKeys; return null })
  vi.stubGlobal('AButton', ({ children, onClick }: { children: string; onClick: () => Promise<void> }) => {
    if (children === 'common.confirm') state.submit = onClick
    return null
  })
})
afterEach(() => vi.unstubAllGlobals())

async function renderDrawer() {
  const { default: Drawer } = await import('./role-operate-drawer')
  const handleSubmit = vi.fn()
  const validateFields = vi.fn().mockResolvedValue({ ...state.values, roleName: '管理员', roleKey: 'admin' })
  renderToStaticMarkup(<Drawer {...{ form: { validateFields }, handleSubmit, onClose: vi.fn(), open: true, operateType: 'edit', rowId: 1 } as any} />)
  return { handleSubmit, validateFields }
}

describe('RoleOperateDrawer menu submission', () => {
  it('submits unchanged selected children and parents, without adding siblings', async () => {
    const { handleSubmit } = await renderDrawer()
    await state.submit?.()
    expect(state.checkedKeys).toEqual([2])
    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ menuIds: [2, 1], roleName: '管理员', roleKey: 'admin' }))
  })
  it('restores parent IDs as half-checked and saves them without widening permissions', async () => {
    state.values.menuIds = [1, 2]
    const { handleSubmit } = await renderDrawer()
    await state.submit?.()
    expect(state.checkedKeys).toEqual([2])
    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ menuIds: [2, 1] }))
  })
  it('does not submit incomplete permissions when the menu request has not succeeded', async () => {
    state.tree = null
    const { handleSubmit } = await renderDrawer()
    await state.submit?.()
    expect(handleSubmit).not.toHaveBeenCalled()
    expect(state.warning).toHaveBeenCalledOnce()
  })
})
